// ============================================================
// rules/engine.js
// Orquestrador do motor de regras
// Roda após cada sync e gera: alertas, scores, recomendações
// ============================================================

import { checkRoasAlerts }      from './roasAlert.js'
import { checkNoSalesAlerts }   from './noSalesAlert.js'
import { checkFrequencyAlerts } from './frequencyAlert.js'
import { checkCtrDropAlerts }   from './ctrDropAlert.js'
import { checkScalableAlerts }  from './scalable.js'
import { calcScore }            from './scorer.js'

// ============================================================
// Carrega rule_config do banco (global + overrides do tenant)
// ============================================================
async function loadConfig(supabase, tenantId) {
  const { data } = await supabase
    .from('rule_config')
    .select('rule_key, value')
    .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)

  if (!data) return {}

  // tenant-specific sobrescreve global
  const cfg = {}
  data
    .sort((a, b) => (a.tenant_id === null ? -1 : 1))  // global primeiro
    .forEach(r => { cfg[r.rule_key] = parseFloat(r.value) })

  return cfg
}

// ============================================================
// Upsert de alertas (evita duplicatas por entity + type + date)
// ============================================================
async function upsertAlerts(supabase, alerts) {
  if (!alerts.length) return 0

  const { data, error } = await supabase
    .from('alerts')
    .upsert(alerts, {
      onConflict:       'entity_id,alert_type,date_ref',
      ignoreDuplicates: false,
    })
    .select('id')

  if (error) {
    console.error('[engine] Erro ao salvar alertas:', error.message)
    return 0
  }
  return data?.length || alerts.length
}

// ============================================================
// Gera scores para campanhas do período
// ============================================================
async function computeScores(supabase, tenantId, accountId, config) {
  const since = daysAgo(30)
  const today = new Date().toISOString().slice(0, 10)

  // Busca dados agregados
  const { data: aggData } = await supabase
    .from('insight_daily')
    .select('entity_id, entity_name, roas, ctr, cpc, cpm, frequency, spend, purchases, cpa, date')
    .eq('tenant_id', tenantId)
    .eq('account_id', accountId)
    .eq('level', 'campaign')
    .gte('date', since)

  if (!aggData?.length) return 0

  // Agrupa por campanha
  const byEntity = {}
  for (const row of aggData) {
    if (!byEntity[row.entity_id]) byEntity[row.entity_id] = []
    byEntity[row.entity_id].push(row)
  }

  const scoreRows = []

  for (const [entityId, rows] of Object.entries(byEntity)) {
    // Agrega métricas do período
    const totalSpend = rows.reduce((s, r) => s + (r.spend || 0), 0)
    const totalPurch = rows.reduce((s, r) => s + (r.purchases || 0), 0)
    const totalRev   = rows.reduce((s, r) => s + ((r.roas || 0) * (r.spend || 0)), 0)
    const avgRoas    = totalSpend > 0 ? totalRev / totalSpend : 0
    const avgCtr     = rows.reduce((s, r) => s + (r.ctr || 0), 0) / rows.length
    const avgFreq    = rows.reduce((s, r) => s + (r.frequency || 0), 0) / rows.length
    const avgCpc     = rows.reduce((s, r) => s + (r.cpc || 0), 0) / rows.length
    const cpa        = totalPurch > 0 ? totalSpend / totalPurch : null

    const campaign = {
      id:        entityId,
      roas:      avgRoas,
      ctr:       avgCtr,
      cpc:       avgCpc,
      frequency: avgFreq,
      spend:     totalSpend,
      purchases: totalPurch,
      cpa,
    }

    const result = calcScore(campaign, rows, config)

    scoreRows.push({
      tenant_id:      tenantId,
      campaign_id:    entityId,
      date:           today,
      score:          result.score,
      classification: result.classification,
      score_details:  result.details,
      computed_at:    new Date().toISOString(),
    })
  }

  if (scoreRows.length) {
    const { error } = await supabase
      .from('campaign_scores')
      .upsert(scoreRows, { onConflict: 'campaign_id,date' })

    if (error) console.error('[engine] Erro ao salvar scores:', error.message)
  }

  return scoreRows.length
}

// ============================================================
// Gera recomendações baseadas nos scores
// ============================================================
async function generateRecommendations(supabase, tenantId, accountId, config) {
  const today = new Date().toISOString().slice(0, 10)
  const expires = new Date()
  expires.setDate(expires.getDate() + 2)

  const { data: scores } = await supabase
    .from('campaign_scores')
    .select('campaign_id, score, classification, score_details')
    .eq('tenant_id', tenantId)
    .eq('date', today)

  if (!scores?.length) return 0

  // Busca nome das campanhas
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name')
    .eq('account_id', accountId)
    .in('id', scores.map(s => s.campaign_id))

  const nameMap = {}
  campaigns?.forEach(c => { nameMap[c.id] = c.name })

  const recs = scores.map(s => {
    const actionMap = {
      scale:         { action: 'scale',         reason: `Score ${s.score}/100. ROAS consistente acima de ${config.roas_scale_threshold}x com frequência controlada.` },
      maintain:      { action: 'observe',        reason: `Score ${s.score}/100. Performance estável. Monitore sem alterações.` },
      observe:       { action: 'observe',        reason: `Score ${s.score}/100. Performance mediana. Observe por mais 2-3 dias antes de decidir.` },
      test_creative: { action: 'test_creative',  reason: `Score ${s.score}/100. Métricas fracas. Teste novos criativos antes de pausar.` },
      pause:         { action: 'pause',          reason: `Score ${s.score}/100. Performance abaixo do mínimo aceitável. Considere pausar.` },
    }

    const rec = actionMap[s.classification] || actionMap.observe

    return {
      tenant_id:    tenantId,
      account_id:   accountId,
      entity_id:    s.campaign_id,
      entity_type:  'campaign',
      entity_name:  nameMap[s.campaign_id] || s.campaign_id,
      action:       rec.action,
      reason:       rec.reason,
      confidence:   s.score / 100,
      data_context: s.score_details,
      source:       'rules',
      is_applied:   false,
      generated_at: new Date().toISOString(),
      expires_at:   expires.toISOString(),
    }
  })

  const { error } = await supabase.from('recommendations').insert(recs)
  if (error) console.error('[engine] Erro ao salvar recomendações:', error.message)

  return recs.length
}

// ============================================================
// Engine principal — roda todas as regras para uma conta
// ============================================================
export async function runRulesEngine(supabase, tenantId, accountId) {
  console.log(`[engine] Iniciando para conta ${accountId}`)
  const config = await loadConfig(supabase, tenantId)

  const allAlerts = []

  // Coleta alertas de todas as regras
  const [roasAlerts, noSalesAlerts, freqAlerts, ctrAlerts, scalableAlerts] = await Promise.all([
    checkRoasAlerts(supabase, tenantId, accountId, config),
    checkNoSalesAlerts(supabase, tenantId, accountId, config),
    checkFrequencyAlerts(supabase, tenantId, accountId, config),
    checkCtrDropAlerts(supabase, tenantId, accountId, config),
    checkScalableAlerts(supabase, tenantId, accountId, config),
  ])

  allAlerts.push(...roasAlerts, ...noSalesAlerts, ...freqAlerts, ...ctrAlerts, ...scalableAlerts)

  const alertsSaved = await upsertAlerts(supabase, allAlerts)
  const scoresSaved = await computeScores(supabase, tenantId, accountId, config)
  const recsSaved   = await generateRecommendations(supabase, tenantId, accountId, config)

  console.log(`[engine] ${accountId}: ${alertsSaved} alertas, ${scoresSaved} scores, ${recsSaved} recomendações`)
  return { alerts: alertsSaved, scores: scoresSaved, recommendations: recsSaved }
}

// ============================================================
// Roda engine para todas as contas do tenant
// ============================================================
export async function runRulesForAllAccounts(supabase, accounts, tenantId) {
  let total = { alerts: 0, scores: 0, recommendations: 0 }

  for (const account of accounts) {
    const result = await runRulesEngine(supabase, tenantId, account.id)
    total.alerts          += result.alerts
    total.scores          += result.scores
    total.recommendations += result.recommendations
  }

  return total
}

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}
