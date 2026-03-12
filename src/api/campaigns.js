// ============================================================
// src/api/campaigns.js
// GET /api/campaigns — campanhas agregadas do período (do banco)
// ============================================================

export async function handleCampaigns(req, res, supabase, tenantId) {
  try {
    const { since, until, account, level = 'campaign' } = req.query

    if (!since || !until) {
      return res.status(400).json({ error: 'Parâmetros since e until são obrigatórios' })
    }

    let query = supabase
      .from('insight_daily')
      .select('entity_id, entity_name, account_id, spend, impressions, clicks, reach, ctr, cpc, cpm, frequency, purchases, purchase_value, roas, cpa, link_clicks, date')
      .eq('tenant_id', tenantId)
      .eq('level', level)
      .gte('date', since)
      .lte('date', until)
      .order('date', { ascending: true })

    if (account && account !== 'all') {
      query = query.eq('account_id', account)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)

    // Agrega por entity_id (soma os dias do período)
    const map = {}
    for (const row of data) {
      if (!map[row.entity_id]) {
        map[row.entity_id] = {
          id:           row.entity_id,
          name:         row.entity_name,
          account_id:   row.account_id,
          spend:        0,
          impressions:  0,
          clicks:       0,
          reach:        0,
          purchases:    0,
          purchase_value: 0,
          link_clicks:  0,
          days:         0,
          _ctr_sum:     0,
          _cpc_sum:     0,
          _cpm_sum:     0,
          _freq_sum:    0,
        }
      }
      const c = map[row.entity_id]
      c.spend          += row.spend || 0
      c.impressions    += row.impressions || 0
      c.clicks         += row.clicks || 0
      c.reach          += row.reach || 0
      c.purchases      += row.purchases || 0
      c.purchase_value += row.purchase_value || 0
      c.link_clicks    += row.link_clicks || 0
      c.days           += 1
      c._ctr_sum       += row.ctr || 0
      c._cpc_sum       += row.cpc || 0
      c._cpm_sum       += row.cpm || 0
      c._freq_sum      += row.frequency || 0
    }

    const campaigns = Object.values(map).map(c => {
      const roas = c.spend > 0 ? c.purchase_value / c.spend : 0
      const cpa  = c.purchases > 0 ? c.spend / c.purchases : null
      return {
        id:             c.id,
        name:           c.name,
        account_id:     c.account_id,
        spend:          c.spend,
        impressions:    c.impressions,
        clicks:         c.clicks,
        reach:          c.reach,
        purchases:      c.purchases,
        revenue:        c.purchase_value,
        link_clicks:    c.link_clicks,
        // médias do período
        ctr:            c.days > 0 ? c._ctr_sum / c.days : 0,
        cpc:            c.days > 0 ? c._cpc_sum / c.days : 0,
        cpm:            c.days > 0 ? c._cpm_sum / c.days : 0,
        frequency:      c.days > 0 ? c._freq_sum / c.days : 0,
        roas,
        cpa,
        days:           c.days,
        _source:        'db',
      }
    })

    // Ordena por spend desc
    campaigns.sort((a, b) => b.spend - a.spend)

    res.json({ campaigns, since, until, total: campaigns.length })
  } catch (err) {
    console.error('[/api/campaigns]', err.message)
    res.status(500).json({ error: err.message })
  }
}
