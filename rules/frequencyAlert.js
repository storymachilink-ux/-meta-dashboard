// ============================================================
// rules/frequencyAlert.js
// Detecta campanhas com frequência alta (fadiga de público)
// ============================================================

export async function checkFrequencyAlerts(supabase, tenantId, accountId, config) {
  const { data, error } = await supabase
    .from('insight_daily')
    .select('entity_id, entity_name, frequency, impressions, spend, date')
    .eq('tenant_id', tenantId)
    .eq('account_id', accountId)
    .eq('level', 'campaign')
    .eq('date', yesterday())
    .gt('impressions', 100)  // ignora campanhas com pouquíssimas impressões

  if (error || !data.length) return []

  const alerts = []

  for (const row of data) {
    const freq = row.frequency || 0

    if (freq >= config.frequency_warning) {
      const severity = freq >= config.frequency_critical ? 'critical' : 'warning'

      alerts.push({
        tenant_id:       tenantId,
        account_id:      accountId,
        entity_id:       row.entity_id,
        entity_type:     'campaign',
        entity_name:     row.entity_name,
        alert_type:      'high_frequency',
        severity,
        title:           `Frequência alta: ${row.entity_name}`,
        message:         `Frequência de ${freq.toFixed(1)} ontem. Público pode estar saturado. Considere expandir audiência ou pausar criativos.`,
        metric_value:    freq,
        threshold_value: config.frequency_warning,
        date_ref:        row.date,
        generated_at:    new Date().toISOString(),
      })
    }
  }

  return alerts
}

function yesterday() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}
