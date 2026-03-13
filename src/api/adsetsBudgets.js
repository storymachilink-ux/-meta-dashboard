export async function handleAdsetsBudgets(req, res, supabase, tenantId) {
  try {
    const [campsResult, adsetsResult] = await Promise.all([
      supabase.from('campaigns')
        .select('id, name, daily_budget, lifetime_budget')
        .eq('tenant_id', tenantId),
      supabase.from('adsets')
        .select('id, name, campaign_id, daily_budget, lifetime_budget')
        .eq('tenant_id', tenantId),
    ])

    const camps  = campsResult.data  || []
    const adsets = adsetsResult.data || []

    const adsetsByCampaign = {}
    adsets.forEach(a => {
      if (!adsetsByCampaign[a.campaign_id]) adsetsByCampaign[a.campaign_id] = []
      adsetsByCampaign[a.campaign_id].push(a)
    })

    const campaigns = camps.map(c => {
      const isCBO   = (Number(c.daily_budget) > 0 || Number(c.lifetime_budget) > 0)
      const cAdsets = adsetsByCampaign[c.id] || []
      return {
        campaign_id:   c.id,
        campaign_name: c.name,
        budget_type:   isCBO ? 'CBO' : 'ADSET',
        daily_budget:  isCBO ? (Number(c.daily_budget) || 0) : null,
        adsets: cAdsets.map(a => ({
          adset_id:     a.id,
          adset_name:   a.name,
          daily_budget: Number(a.daily_budget) || 0,
        })),
      }
    })

    res.json({ campaigns })
  } catch (err) {
    console.error('[adsetsBudgets]', err)
    res.json({ campaigns: [] })
  }
}
