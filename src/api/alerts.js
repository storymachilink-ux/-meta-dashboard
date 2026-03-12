// ============================================================
// src/api/alerts.js
// GET /api/alerts — alertas ativos do banco
// PATCH /api/alerts/:id — marca como lido ou dismissado
// ============================================================

export async function handleGetAlerts(req, res, supabase, tenantId) {
  try {
    const { severity, entity_type, dismissed = 'false', limit = 50 } = req.query

    let query = supabase
      .from('alerts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_dismissed', dismissed === 'true')
      .order('generated_at', { ascending: false })
      .limit(parseInt(limit))

    if (severity) query = query.eq('severity', severity)
    if (entity_type) query = query.eq('entity_type', entity_type)

    const { data, error } = await query
    if (error) throw new Error(error.message)

    // Conta por severidade
    const summary = { critical: 0, warning: 0, info: 0 }
    data.forEach(a => { summary[a.severity] = (summary[a.severity] || 0) + 1 })

    res.json({ alerts: data, summary, total: data.length })
  } catch (err) {
    console.error('[/api/alerts GET]', err.message)
    res.status(500).json({ error: err.message })
  }
}

export async function handlePatchAlert(req, res, supabase, tenantId) {
  try {
    const { id } = req.params
    const { is_read, is_dismissed } = req.body

    const updates = {}
    if (is_read      !== undefined) updates.is_read      = is_read
    if (is_dismissed !== undefined) updates.is_dismissed = is_dismissed

    const { error } = await supabase
      .from('alerts')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) throw new Error(error.message)
    res.json({ success: true })
  } catch (err) {
    console.error('[/api/alerts PATCH]', err.message)
    res.status(500).json({ error: err.message })
  }
}
