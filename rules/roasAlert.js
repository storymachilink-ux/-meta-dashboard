// ============================================================
// rules/roasAlert.js
// Detecta campanhas com ROAS abaixo do limiar por N dias
// ============================================================

export async function checkRoasAlerts(supabase, tenantId, accountId, config) {
  const since = daysAgo(parseInt(config.no_sales_days) + 1)

  const { data, error } = await supabase
    .from('insight_daily')
    .select('entity_id, entity_name, roas, spend, purchases, date')
    .eq('tenant_id', tenantId)
    .eq('account_id', accountId)
    .eq('level', 'campaign')
    .gte('date', since)
    .gt('spend', config.min_spend_for_alert)

  if (error || !data.length) return []

  // Agrupa por campanha
  const byEntity = groupBy(data, 'entity_id')
  const alerts   = []

  for (const [entityId, rows] of Object.entries(byEntity)) {
    const avgRoas = rows.reduce((s, r) => s + (r.roas || 0), 0) / rows.length
    const totalSpend = rows.reduce((s, r) => s + (r.spend || 0), 0)

    if (avgRoas < config.roas_warning_threshold) {
      const severity = avgRoas < config.roas_critical_threshold ? 'critical' : 'warning'
      const name     = rows[0].entity_name

      alerts.push({
        tenant_id:       tenantId,
        account_id:      accountId,
        entity_id:       entityId,
        entity_type:     'campaign',
        entity_name:     name,
        alert_type:      'roas_low',
        severity,
        title:           `ROAS baixo: ${name}`,
        message:         `ROAS médio de ${avgRoas.toFixed(2)}x nos últimos ${rows.length} dias com R$${totalSpend.toFixed(2)} investidos. Meta: ${config.roas_warning_threshold}x.`,
        metric_value:    avgRoas,
        threshold_value: config.roas_warning_threshold,
        date_ref:        rows[rows.length - 1].date,
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
