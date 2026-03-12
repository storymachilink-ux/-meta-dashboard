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
    const avgCpm     = rows.reduce((s, r) => s + (r.cpm || 0), 0) / rows.length
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
      // sub-scores + métricas brutas para uso nos reasons
      score_details:  {
        ...result.details,
        _meta: {
          spend:       totalSpend,
          purchases:   totalPurch,
          revenue:     totalRev,
          roas:        avgRoas,
          ctr:         avgCtr,
          cpm:         avgCpm,
          frequency:   avgFreq,
          days_active: rows.length,
          entity_name: rows[0]?.entity_name || entityId,
        },
      },
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

  // Busca campanhas com effective_status para filtrar só ativas
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name, effective_status')
    .eq('account_id', accountId)
    .in('id', scores.map(s => s.campaign_id))

  const nameMap = {}
  const activeCampaignIds = new Set()
  campaigns?.forEach(c => {
    nameMap[c.id] = c.name
    if (c.effective_status === 'ACTIVE') activeCampaignIds.add(c.id)
  })

  // Só gera recomendações para campanhas ativas
  const activeScores = scores.filter(s => activeCampaignIds.has(s.campaign_id))
  if (!activeScores.length) return 0

  // Benchmark: top 25% por ROAS
  const sorted = [...activeScores].sort((a, b) =>
    (b.score_details?._meta?.roas || 0) - (a.score_details?._meta?.roas || 0)
  )
  const topN = Math.max(1, Math.floor(sorted.length * 0.25))
  const topCampaigns = sorted.slice(0, topN)
  const avg = arr => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0
  const benchmarkROAS = avg(topCampaigns.map(s => s.score_details?._meta?.roas || 0))
  const benchmarkCTR  = avg(topCampaigns.map(s => s.score_details?._meta?.ctr  || 0))

  function fmtBRL(v) {
    return v >= 1000
      ? `R$${(v / 1000).toFixed(1)}k`
      : `R$${Number(v).toFixed(0)}`
  }

  function buildReason(s) {
    const m = s.score_details?._meta || {}
    const days   = m.days_active != null ? `${m.days_active}d ativa` : null
    const spend  = m.spend  > 0 ? `gasto ${fmtBRL(m.spend)}`      : null
    const rev    = m.revenue > 0 ? `receita ${fmtBRL(m.revenue)}`  : null
    const sales  = m.purchases > 0 ? `${m.purchases} vendas`        : 'sem vendas registradas'
    const roas   = m.roas   > 0 ? `ROAS ${Number(m.roas).toFixed(1)}x`    : null
    const ctr    = m.ctr    > 0 ? `CTR ${Number(m.ctr).toFixed(2)}%`     : null
    const bench  = benchmarkROAS > 0
      ? ` (benchmark conta: ROAS ${benchmarkROAS.toFixed(1)}x · CTR ${benchmarkCTR.toFixed(2)}%)`
      : ''

    const ctx = [days, spend, rev, sales].filter(Boolean).join(' · ')

    const map = {
      scale:         `${ctx}. ${roas || ''} consistente${bench} — performance sólida, recomendado aumentar budget.`,
      maintain:      `${ctx}. ${roas || ''} estável. Mantenha sem alterações e monitore.`,
      observe:       `${ctx}. ${roas || ''}${bench}. Performance mediana — observe por mais 2-3 dias antes de decidir.`,
      test_creative: `${ctx}. ${ctr || ''} abaixo do benchmark${bench}. Engajamento fraco — teste novos criativos.`,
      pause:         `${ctx}. ${roas || ''}${bench}. Retorno insatisfatório — considere pausar e realocar budget.`,
    }
    return map[s.classification] || map.observe
  }

  // Remove recomendações antigas (não aplicadas) desta conta antes de inserir novas
  await supabase
    .from('recommendations')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('account_id', accountId)
    .eq('source', 'rules')
    .eq('is_applied', false)

  const actionForClassification = {
    scale:         'scale',
    maintain:      'observe',
    observe:       'observe',
    test_creative: 'test_creative',
    pause:         'pause',
  }

  const recs = activeScores.map(s => ({
    tenant_id:    tenantId,
    account_id:   accountId,
    entity_id:    s.campaign_id,
    entity_type:  'campaign',
    entity_name:  nameMap[s.campaign_id] || s.campaign_id,
    action:       actionForClassification[s.classification] || 'observe',
    reason:       buildReason(s),
    confidence:   s.score / 100,
    data_context: s.score_details,
    source:       'rules',
    is_applied:   false,
    generated_at: new Date().toISOString(),
    expires_at:   expires.toISOString(),
  }))

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
