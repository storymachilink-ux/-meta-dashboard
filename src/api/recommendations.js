// ============================================================
// src/api/recommendations.js
// GET /api/recommendations — recomendações ativas
// ============================================================

export async function handleRecommendations(req, res, supabase, tenantId) {
  try {
    const { action, entity_type, applied = 'false', limit = 30 } = req.query

    let query = supabase
      .from('recommendations')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_applied', applied === 'true')
      .order('generated_at', { ascending: false })
      .limit(parseInt(limit))

    if (action)      query = query.eq('action', action)
    if (entity_type) query = query.eq('entity_type', entity_type)

    // Filtra expiradas
    query = query.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())

    const { data, error } = await query
    if (error) throw new Error(error.message)

    res.json({ recommendations: data, total: data.length })
  } catch (err) {
    console.error('[/api/recommendations]', err.message)
    res.status(500).json({ error: err.message })
  }
}
