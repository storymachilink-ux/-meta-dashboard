// ============================================================
// rules/noSalesAlert.js
// Detecta campanhas que gastaram acima do mínimo sem gerar vendas
// ============================================================

export async function checkNoSalesAlerts(supabase, tenantId, accountId, config) {
  const since = daysAgo(parseInt(config.no_sales_days))

  const { data, error } = await supabase
    .from('insight_daily')
    .select('entity_id, entity_name, purchases, spend, date')
    .eq('tenant_id', tenantId)
    .eq('account_id', accountId)
    .eq('level', 'campaign')
    .gte('date', since)

  if (error || !data.length) return []

  const byEntity = groupBy(data, 'entity_id')
  const alerts   = []

  for (const [entityId, rows] of Object.entries(byEntity)) {
    const totalSpend     = rows.reduce((s, r) => s + (r.spend || 0), 0)
    const totalPurchases = rows.reduce((s, r) => s + (r.purchases || 0), 0)

    if (totalPurchases === 0 && totalSpend >= config.min_spend_for_alert) {
      alerts.push({
        tenant_id:       tenantId,
        account_id:      accountId,
        entity_id:       entityId,
        entity_type:     'campaign',
        entity_name:     rows[0].entity_name,
        alert_type:      'no_sales',
        severity:        totalSpend >= config.min_spend_for_alert * 3 ? 'critical' : 'warning',
        title:           `Sem vendas: ${rows[0].entity_name}`,
        message:         `R$${totalSpend.toFixed(2)} investidos nos últimos ${rows.length} dias sem nenhuma compra registrada.`,
        metric_value:    totalPurchases,
        threshold_value: config.min_spend_for_alert,
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
