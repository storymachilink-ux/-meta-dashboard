// ============================================================
// GET /api/checkout/sales — agrega vendas do checkout por UTM
// ============================================================

export async function handleCheckoutSales(req, res, supabase, tenantId) {
  try {
    const { days = 30 } = req.query
    const since = new Date()
    since.setDate(since.getDate() - parseInt(days))

    const { data, error } = await supabase
      .from('checkout_events')
      .select('revenue, utm_source, utm_medium, utm_campaign, utm_content, order_id, product_name, event_at')
      .eq('tenant_id', tenantId)
      .gte('event_at', since.toISOString())
      .order('event_at', { ascending: false })

    if (error) throw new Error(error.message)

    const rows = data || []

    // Totais gerais
    const totalRevenue = rows.reduce((s, r) => s + (r.revenue || 0), 0)
    const totalOrders  = rows.length

    // Por fonte UTM
    const bySource = {}
    rows.forEach(r => {
      const source = r.utm_source || 'orgânico'
      if (!bySource[source]) bySource[source] = { revenue: 0, orders: 0, campaigns: {} }
      bySource[source].revenue += r.revenue || 0
      bySource[source].orders  += 1
      if (r.utm_campaign) {
        bySource[source].campaigns[r.utm_campaign] = (bySource[source].campaigns[r.utm_campaign] || 0) + (r.revenue || 0)
      }
    })

    // Por campanha UTM
    const byCampaign = {}
    rows.forEach(r => {
      const key = r.utm_campaign || '(sem campanha)'
      if (!byCampaign[key]) byCampaign[key] = { revenue: 0, orders: 0, source: r.utm_source || 'orgânico' }
      byCampaign[key].revenue += r.revenue || 0
      byCampaign[key].orders  += 1
    })

    // Pago (Meta) vs Orgânico
    const metaSources = new Set(['facebook', 'meta', 'instagram', 'fb', 'ig', 'Facebook', 'Instagram'])
    const paid    = rows.filter(r => metaSources.has(r.utm_source))
    const organic = rows.filter(r => !r.utm_source || !metaSources.has(r.utm_source))
    const paidRevenue    = paid.reduce((s, r) => s + (r.revenue || 0), 0)
    const organicRevenue = organic.reduce((s, r) => s + (r.revenue || 0), 0)

    // Últimas 10 vendas
    const recentSales = rows.slice(0, 10).map(r => ({
      order_id:     r.order_id,
      product_name: r.product_name,
      revenue:      r.revenue,
      source:       r.utm_source || 'orgânico',
      campaign:     r.utm_campaign || '—',
      event_at:     r.event_at,
    }))

    res.json({
      totalRevenue, totalOrders, paidRevenue, organicRevenue,
      bySource: Object.entries(bySource).map(([source, v]) => ({
        source, ...v,
        campaigns: Object.entries(v.campaigns).sort((a, b) => b[1] - a[1]).slice(0, 5),
      })).sort((a, b) => b.revenue - a.revenue),
      byCampaign: Object.entries(byCampaign).map(([campaign, v]) => ({ campaign, ...v }))
        .sort((a, b) => b.revenue - a.revenue).slice(0, 20),
      recentSales,
      days: parseInt(days),
    })
  } catch (err) {
    console.error('[checkoutSales]', err.message)
    res.status(500).json({ error: err.message })
  }
}
