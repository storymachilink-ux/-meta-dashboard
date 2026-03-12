// ============================================================
// src/lib/api.js
// Cliente HTTP centralizado para todos os endpoints do backend
// ============================================================

const BASE = ''  // mesmo domínio — funciona em dev e prod

async function get(path) {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${path}`)
  return res.json()
}

async function post(path, body = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${path}`)
  return res.json()
}

async function patch(path, body = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${path}`)
  return res.json()
}

// ============================================================
// Insights (legado — mantido para compatibilidade)
// ============================================================
export function fetchInsights(since, until) {
  return get(`/api/insights?since=${since}&until=${until}`)
}

// ============================================================
// Campanhas agregadas do banco
// ============================================================
export function fetchCampaigns(since, until, account) {
  const params = new URLSearchParams({ since, until })
  if (account && account !== 'all') params.set('account', account)
  return get(`/api/campaigns?${params}`)
}

// ============================================================
// Série temporal diária
// ============================================================
export function fetchDaily(since, until, { account, campaign_id, level = 'campaign' } = {}) {
  const params = new URLSearchParams({ since, until, level })
  if (account && account !== 'all') params.set('account', account)
  if (campaign_id) params.set('campaign_id', campaign_id)
  return get(`/api/daily?${params}`)
}

// ============================================================
// Dados horários
// ============================================================
export function fetchHourly(date, { account, entity_id, level = 'campaign' } = {}) {
  const params = new URLSearchParams({ date, level })
  if (account && account !== 'all') params.set('account', account)
  if (entity_id) params.set('entity_id', entity_id)
  return get(`/api/hourly?${params}`)
}

// ============================================================
// Alertas
// ============================================================
export function fetchAlerts({ severity, dismissed = false, limit = 50 } = {}) {
  const params = new URLSearchParams({ dismissed: String(dismissed), limit })
  if (severity) params.set('severity', severity)
  return get(`/api/alerts?${params}`)
}

export function dismissAlert(id) {
  return patch(`/api/alerts/${id}`, { is_dismissed: true })
}

export function markAlertRead(id) {
  return patch(`/api/alerts/${id}`, { is_read: true })
}

// ============================================================
// Recomendações
// ============================================================
export function fetchRecommendations({ action, limit = 30 } = {}) {
  const params = new URLSearchParams({ limit })
  if (action) params.set('action', action)
  return get(`/api/recommendations?${params}`)
}

// ============================================================
// Sync
// ============================================================
export function triggerBackfill(days = 90) {
  return post(`/api/sync/backfill?days=${days}`)
}

export function triggerIncremental() {
  return post('/api/sync/incremental')
}

export function triggerRules() {
  return post('/api/sync/rules')
}

export function fetchSyncStatus() {
  return get('/api/sync/status')
}

// ============================================================
// Health
// ============================================================
export function fetchHealth() {
  return get('/api/health')
}
