// ============================================================
// src/api/daily.js
// GET /api/daily — série temporal diária (do banco)
// ============================================================

export async function handleDaily(req, res, supabase, tenantId) {
  try {
    const { since, until, account, campaign_id, level = 'campaign' } = req.query

    if (!since || !until) {
      return res.status(400).json({ error: 'Parâmetros since e until são obrigatórios' })
    }

    let query = supabase
      .from('insight_daily')
      .select('date, entity_id, entity_name, account_id, spend, impressions, clicks, ctr, cpc, cpm, frequency, purchases, purchase_value, roas, cpa, reach')
      .eq('tenant_id', tenantId)
      .eq('level', level)
      .gte('date', since)
      .lte('date', until)
      .order('date', { ascending: true })

    if (account && account !== 'all') {
      query = query.eq('account_id', account)
    }

    if (campaign_id) {
      query = query.eq('entity_id', campaign_id)
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)

    res.json({ daily: data, since, until, total: data.length })
  } catch (err) {
    console.error('[/api/daily]', err.message)
    res.status(500).json({ error: err.message })
  }
}
