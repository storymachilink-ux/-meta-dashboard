// ============================================================
// src/api/hourly.js
// GET /api/hourly — dados horários (do banco)
// ============================================================

export async function handleHourly(req, res, supabase, tenantId) {
  try {
    const { date, account, entity_id, level = 'campaign' } = req.query

    if (!date) {
      return res.status(400).json({ error: 'Parâmetro date é obrigatório (YYYY-MM-DD)' })
    }

    let query = supabase
      .from('insight_hourly')
      .select('date, hour, entity_id, entity_name, account_id, spend, impressions, clicks, ctr, cpc, cpm, purchases, purchase_value, roas, reach')
      .eq('tenant_id', tenantId)
      .eq('level', level)
      .eq('date', date)
      .order('hour', { ascending: true })

    if (account && account !== 'all') {
      query = query.eq('account_id', account)
    }

    if (entity_id) {
      query = query.eq('entity_id', entity_id)
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)

    // Agrega por hora (soma todas as campanhas/contas)
    const byHour = {}
    for (const row of data) {
      if (!byHour[row.hour]) {
        byHour[row.hour] = {
          hour:          row.hour,
          spend:         0,
          impressions:   0,
          clicks:        0,
          purchases:     0,
          purchase_value: 0,
          reach:         0,
          _roas_num:     0,
          _count:        0,
        }
      }
      const h = byHour[row.hour]
      h.spend          += row.spend || 0
      h.impressions    += row.impressions || 0
      h.clicks         += row.clicks || 0
      h.purchases      += row.purchases || 0
      h.purchase_value += row.purchase_value || 0
      h.reach          += row.reach || 0
      h._count         += 1
    }

    const hourly = Array.from({ length: 24 }, (_, i) => {
      const h = byHour[i] || { hour: i, spend: 0, impressions: 0, clicks: 0, purchases: 0, purchase_value: 0, reach: 0 }
      return {
        hour:          h.hour,
        spend:         h.spend,
        impressions:   h.impressions,
        clicks:        h.clicks,
        purchases:     h.purchases,
        revenue:       h.purchase_value,
        reach:         h.reach,
        ctr:           h.impressions > 0 ? (h.clicks / h.impressions) * 100 : 0,
        roas:          h.spend > 0 ? h.purchase_value / h.spend : 0,
      }
    })

    res.json({ hourly, date, total: data.length, raw: data })
  } catch (err) {
    console.error('[/api/hourly]', err.message)
    res.status(500).json({ error: err.message })
  }
}
