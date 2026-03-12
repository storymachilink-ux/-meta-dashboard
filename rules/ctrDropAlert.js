// ============================================================
// rules/ctrDropAlert.js
// Detecta queda significativa de CTR (fadiga de criativo)
// ============================================================

export async function checkCtrDropAlerts(supabase, tenantId, accountId, config) {
  const since = daysAgo(14)  // janela de 14 dias para calcular média

  const { data, error } = await supabase
    .from('insight_daily')
    .select('entity_id, entity_name, ctr, impressions, spend, date')
    .eq('tenant_id', tenantId)
    .eq('account_id', accountId)
    .eq('level', 'campaign')
    .gte('date', since)
    .gt('impressions', 100)
    .order('date', { ascending: true })

  if (error || !data.length) return []

  const byEntity = groupBy(data, 'entity_id')
  const alerts   = []
  const dropPct  = config.ctr_drop_pct / 100  // ex: 30% → 0.30

  for (const [entityId, rows] of Object.entries(byEntity)) {
    if (rows.length < 4) continue  // precisa de histórico mínimo

    // Média dos primeiros 7 dias vs últimos 3 dias
    const early  = rows.slice(0, Math.min(7, rows.length - 3))
    const recent = rows.slice(-3)

    const avgEarly  = early.reduce((s, r)  => s + (r.ctr || 0), 0) / early.length
    const avgRecent = recent.reduce((s, r) => s + (r.ctr || 0), 0) / recent.length

    if (avgEarly === 0) continue

    const drop = (avgEarly - avgRecent) / avgEarly  // queda percentual

    if (drop >= dropPct && avgRecent < config.ctr_min_warning) {
      alerts.push({
        tenant_id:       tenantId,
        account_id:      accountId,
        entity_id:       entityId,
        entity_type:     'campaign',
        entity_name:     rows[0].entity_name,
        alert_type:      'ctr_drop',
        severity:        drop >= 0.5 ? 'critical' : 'warning',
        title:           `CTR em queda: ${rows[0].entity_name}`,
        message:         `CTR caiu ${(drop * 100).toFixed(0)}% — de ${avgEarly.toFixed(2)}% para ${avgRecent.toFixed(2)}% nos últimos 3 dias. Possível fadiga de criativo.`,
        metric_value:    avgRecent,
        threshold_value: avgEarly,
        date_ref:        recent[recent.length - 1].date,
        generated_at:    new Date().toISOString(),
      })
    }
  }

  return alerts
}

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    ;(acc[item[key]] = acc[item[key]] || []).push(item)
    return acc
  }, {})
}
