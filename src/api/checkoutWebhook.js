// ============================================================
// POST /api/webhook/checkout — recebe eventos de venda do checkout
// Compatível com Kiwify, Hotmart, Yampi, Braip, Ticto, CartPanda
// ============================================================

const APPROVED_STATUSES = new Set([
  'approved', 'paid', 'complete', 'completed', 'success',
  'active', 'APPROVED', 'PAID', 'COMPLETE', 'COMPLETED',
  'aprovado', 'pago', 'concluido', 'order_approved',
])

function extractField(obj, ...keys) {
  for (const key of keys) {
    const parts = key.split('.')
    let v = obj
    for (const p of parts) { v = v?.[p] }
    if (v != null && v !== '') return v
  }
  return null
}

function normalizePayload(body) {
  // UTMs — podem vir na raiz, em tracking_data, utm_params, etc.
  const src  = extractField(body, 'utm_source',   'tracking_parameters.utm_source',   'utm.source',  'tracking.utm_source')
  const med  = extractField(body, 'utm_medium',   'tracking_parameters.utm_medium',   'utm.medium',  'tracking.utm_medium')
  const camp = extractField(body, 'utm_campaign', 'tracking_parameters.utm_campaign', 'utm.campaign','tracking.utm_campaign')
  const cont = extractField(body, 'utm_content',  'tracking_parameters.utm_content',  'utm.content', 'tracking.utm_content')
  const term = extractField(body, 'utm_term',     'tracking_parameters.utm_term',     'utm.term',    'tracking.utm_term')

  // Revenue — múltiplos formatos
  const rawRev = extractField(body,
    'amount', 'total', 'revenue', 'value', 'price',
    'transaction.amount', 'order.total', 'purchase.price',
    'product.price', 'order.amount', 'commission.amount',
    'purchase.original_offer_price',
  )
  const revenue = rawRev != null ? parseFloat(String(rawRev).replace(/[^\d.]/g, '')) || 0 : 0

  // Order ID
  const order_id = String(
    extractField(body, 'id', 'order_id', 'transaction_id', 'transaction.id',
      'purchase.transaction', 'order.id') || ''
  ).slice(0, 100)

  // Email
  const customer_email = String(
    extractField(body, 'email', 'customer.email', 'buyer.email',
      'purchase.buyer.email', 'buyer_email', 'client.email') || ''
  ).slice(0, 200).toLowerCase()

  // Produto
  const product_name = String(
    extractField(body, 'product_name', 'product.name', 'offer.name',
      'plan.name', 'order.product', 'item.name', 'product.title') || ''
  ).slice(0, 200)

  // Status
  const status = String(
    extractField(body, 'status', 'event', 'payment_status',
      'transaction.status', 'purchase.status', 'order.status') || ''
  )

  return { src, med, camp, cont, term, revenue, order_id, customer_email, product_name, status }
}

export async function handleCheckoutWebhook(req, res, supabase, tenantId, webhookSecret) {
  try {
    // Verificar secret se configurado
    if (webhookSecret) {
      const incomingSecret = req.headers['x-webhook-secret']
        || req.headers['x-secret']
        || req.headers['authorization']?.replace('Bearer ', '')
        || req.query.secret
      if (incomingSecret !== webhookSecret) {
        return res.status(401).json({ error: 'Invalid secret' })
      }
    }

    const body = req.body || {}
    const { src, med, camp, cont, term, revenue, order_id, customer_email, product_name, status } = normalizePayload(body)

    // Filtrar apenas vendas aprovadas (ignorar cancelamentos, chargebacks)
    if (status && !APPROVED_STATUSES.has(status)) {
      return res.status(200).json({ ok: true, ignored: true, reason: `status: ${status}` })
    }

    // Inserir no Supabase
    if (supabase) {
      const { error } = await supabase.from('checkout_events').insert({
        tenant_id:      tenantId,
        order_id:       order_id || null,
        customer_email: customer_email || null,
        product_name:   product_name || null,
        revenue,
        utm_source:     src   || null,
        utm_medium:     med   || null,
        utm_campaign:   camp  || null,
        utm_content:    cont  || null,
        utm_term:       term  || null,
        raw_payload:    body,
        event_at:       new Date().toISOString(),
      })
      if (error) throw new Error(error.message)
    }

    res.status(200).json({ ok: true, revenue, utm_source: src, utm_campaign: camp })
  } catch (err) {
    console.error('[checkoutWebhook]', err.message)
    res.status(500).json({ error: err.message })
  }
}
