// ============================================================
// jobs/ingest.js
// Orquestrador principal do pipeline de ingestão
//
// Modos:
//   backfill    → busca últimos 90 dias, todos os níveis
//   incremental → busca últimos 3 dias (Meta atualiza dados recentes)
//   hourly      → busca breakdown horário do dia especificado
// ============================================================

import { fetchInsights, fetchHourlyInsights, delay } from './fetchMeta.js'
import { transformInsightRow, transformHourlyRow }   from './transform.js'
import { upsertDailyInsights, upsertHourlyInsights } from './upsertInsights.js'
import { syncAccountStructure }                       from './syncStructure.js'
import { syncStart, syncFinish, syncFail }            from './syncLog.js'

// ============================================================
// Helpers de data
// ============================================================
function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function yesterday() {
  return daysAgo(1)
}

// ============================================================
// Ingestão de insights diários para uma conta + nível
// ============================================================
async function ingestDailyLevel(supabase, account, token, tenantId, since, until, level) {
  console.log(`[ingest] ${account.name} | ${level} | ${since} → ${until}`)

  const rows       = await fetchInsights(account.id, token, since, until, level)
  const normalized = rows.map(r => transformInsightRow(r, level, account.id, tenantId))
  const result     = await upsertDailyInsights(supabase, normalized)

  console.log(`[ingest] ${level}: ${result.inserted} upserted, ${result.errors} erros`)
  return result
}

// ============================================================
// BACKFILL
// Busca os últimos N dias para todos os níveis de todas as contas
// Usado na primeira configuração de uma conta
// ============================================================
export async function runBackfill(supabase, accounts, token, tenantId, daysBack = 90) {
  const since  = daysAgo(daysBack)
  const until  = yesterday()         // nunca inclui "hoje" — dados incompletos
  const levels = ['campaign', 'adset', 'ad']

  let totalInserted = 0
  let totalErrors   = 0

  for (const account of accounts) {
    const logId = await syncStart(supabase, {
      tenantId,
      accountId: account.id,
      syncType:  'backfill',
      dateFrom:  since,
      dateTo:    until,
    })

    try {
      // 1. Sync estrutura primeiro (campaigns, adsets, ads, creatives)
      console.log(`[ingest] Estrutura → ${account.name}`)
      await syncAccountStructure(supabase, account, token, tenantId)
      await delay(500)

      // 2. Insights diários por nível
      for (const level of levels) {
        const result = await ingestDailyLevel(supabase, account, token, tenantId, since, until, level)
        totalInserted += result.inserted
        totalErrors   += result.errors
        await delay(400)   // respeita rate limit da Meta API
      }

      await syncFinish(supabase, logId, { rowsInserted: totalInserted })
      console.log(`[ingest] Backfill concluído: ${account.name}`)

    } catch (err) {
      console.error(`[ingest] Backfill falhou: ${account.name}`, err.message)
      await syncFail(supabase, logId, err.message)
      totalErrors++
    }
  }

  return { totalInserted, totalErrors }
}

// ============================================================
// INCREMENTAL
// Busca os últimos 3 dias (Meta pode atualizar dados recentes retroativamente)
// Roda via cron a cada 6h
// ============================================================
export async function runIncremental(supabase, accounts, token, tenantId) {
  const since  = daysAgo(3)
  const until  = today()             // inclui hoje para ter dados frescos
  const levels = ['campaign', 'adset']  // ad é pesado, só no backfill

  let totalInserted = 0
  let totalErrors   = 0

  for (const account of accounts) {
    const logId = await syncStart(supabase, {
      tenantId,
      accountId: account.id,
      syncType:  'incremental',
      dateFrom:  since,
      dateTo:    until,
    })

    try {
      // Atualiza estrutura (status, effective_status podem mudar)
      await syncAccountStructure(supabase, account, token, tenantId)
      await delay(300)

      for (const level of levels) {
        const result = await ingestDailyLevel(supabase, account, token, tenantId, since, until, level)
        totalInserted += result.inserted
        totalErrors   += result.errors
        await delay(300)
      }

      await syncFinish(supabase, logId, { rowsInserted: totalInserted })

    } catch (err) {
      console.error(`[ingest] Incremental falhou: ${account.name}`, err.message)
      await syncFail(supabase, logId, err.message)
      totalErrors++
    }
  }

  console.log(`[ingest] Incremental: ${totalInserted} upserted, ${totalErrors} erros`)
  return { totalInserted, totalErrors }
}

// ============================================================
// HOURLY
// Busca breakdown horário de uma data específica
// Roda via cron 1x/dia (manhã seguinte) para fechar o dia anterior
// ============================================================
export async function runHourly(supabase, accounts, token, tenantId, date = yesterday()) {
  const levels = ['campaign', 'adset']

  let totalInserted = 0
  let totalErrors   = 0

  for (const account of accounts) {
    const logId = await syncStart(supabase, {
      tenantId,
      accountId: account.id,
      syncType:  'hourly',
      dateFrom:  date,
      dateTo:    date,
    })

    try {
      for (const level of levels) {
        console.log(`[ingest] Hourly → ${account.name} | ${level} | ${date}`)

        const rows       = await fetchHourlyInsights(account.id, token, date, level)
        const normalized = rows.map(r => transformHourlyRow(r, level, account.id, tenantId, date))

        if (normalized.length) {
          const result = await upsertHourlyInsights(supabase, normalized)
          totalInserted += result.inserted
          totalErrors   += result.errors
        }

        await delay(300)
      }

      await syncFinish(supabase, logId, { rowsInserted: totalInserted })

    } catch (err) {
      console.error(`[ingest] Hourly falhou: ${account.name}`, err.message)
      await syncFail(supabase, logId, err.message)
      totalErrors++
    }
  }

  console.log(`[ingest] Hourly: ${totalInserted} upserted, ${totalErrors} erros`)
  return { totalInserted, totalErrors }
}
