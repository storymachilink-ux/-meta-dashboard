// ============================================================
// rules/scalable.js
// Detecta campanhas candidatas a escala
// Critério: ROAS >= threshold, frequência controlada, estável
// ============================================================

export async function checkScalableAlerts(supabase, tenantId, accountId, config) {
  const since = daysAgo(7)

  const { data, error } = await supabase
    .from('insight_daily')
    .select('entity_id, entity_name, roas, spend, purchases, frequency, ctr, date')
    .eq('tenant_id', tenantId)
    .eq('account_id', accountId)
    .eq('level', 'campaign')
    .gte('date', since)
    .gt('spend', 20)

  if (error || !data.length) return []

  const byEntity = groupBy(data, 'entity_id')
  const alerts   = []

  for (const [entityId, rows] of Object.entries(byEntity)) {
    if (rows.length < 3) continue  // precisa de mínimo 3 dias

    const avgRoas = rows.reduce((s, r) => s + (r.roas || 0), 0) / rows.length
    const avgFreq = rows.reduce((s, r) => s + (r.frequency || 0), 0) / rows.length
    const totalSpend = rows.reduce((s, r) => s + (r.spend || 0), 0)
    const totalPurchases = rows.reduce((s, r) => s + (r.purchases || 0), 0)

    // Critérios de escalabilidade
    const roasOk      = avgRoas >= config.roas_scale_threshold
    const freqOk      = avgFreq <= config.frequency_warning
    const hasVolume   = totalSpend >= 100 && totalPurchases >= 2

    if (roasOk && freqOk && hasVolume) {
      alerts.push({
        tenant_id:       tenantId,
        account_id:      accountId,
        entity_id:       entityId,
        entity_type:     'campaign',
        entity_name:     rows[0].entity_name,
        alert_type:      'campaign_scalable',
        severity:        'info',
        title:           `Escalável: ${rows[0].entity_name}`,
        message:         `ROAS médio de ${avgRoas.toFixed(2)}x nos últimos ${rows.length} dias com frequência controlada (${avgFreq.toFixed(1)}). Candidata a aumento de orçamento.`,
        metric_value:    avgRoas,
        threshold_value: config.roas_scale_threshold,
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
