// ============================================================
// jobs/fetchMeta.js
// Toda a lógica de chamada à Meta Graph API
// ============================================================

const BASE = 'https://graph.facebook.com/v21.0'

const CAMPAIGN_FIELDS = [
  'campaign_id', 'campaign_name', 'impressions', 'clicks', 'spend',
  'reach', 'frequency', 'cpc', 'cpm', 'ctr', 'unique_clicks',
  'actions', 'action_values', 'date_start', 'date_stop',
].join(',')

const ADSET_FIELDS = [
  'adset_id', 'adset_name', 'campaign_id', 'campaign_name',
  'impressions', 'clicks', 'spend', 'reach', 'frequency',
  'cpc', 'cpm', 'ctr', 'unique_clicks',
  'actions', 'action_values', 'date_start', 'date_stop',
].join(',')

const AD_FIELDS = [
  'ad_id', 'ad_name', 'adset_id', 'adset_name', 'campaign_id', 'campaign_name',
  'impressions', 'clicks', 'spend', 'reach', 'frequency',
  'cpc', 'cpm', 'ctr',
  'actions', 'action_values', 'date_start', 'date_stop',
].join(',')

// ============================================================
// Paginação automática
// ============================================================
async function fetchAllPages(url) {
  const rows  = []
  let next    = url
  let pages   = 0
  while (next && pages < 30) {
    const res = await fetch(next)
    const j   = await res.json()
    if (j.error) throw new Error(`Meta API: ${j.error.message}`)
    if (j.data) rows.push(...j.data)
    next = j.paging?.next || null
    pages++
  }
  return rows
}

// ============================================================
// Delay entre requests (evita rate limit)
// ============================================================
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ============================================================
// Insights diários por nível
// level: 'campaign' | 'adset' | 'ad'
// ============================================================
export async function fetchInsights(accountId, token, since, until, level = 'campaign') {
  const fieldsMap = {
    campaign: CAMPAIGN_FIELDS,
    adset:    ADSET_FIELDS,
    ad:       AD_FIELDS,
  }

  const fields = fieldsMap[level]
  const tr     = encodeURIComponent(JSON.stringify({ since, until }))
  const url    = `${BASE}/${accountId}/insights?fields=${fields}&level=${level}&time_range=${tr}&time_increment=1&limit=500&access_token=${token}`

  return fetchAllPages(url)
}

// ============================================================
// Insights agregados (sem time_increment) — para overview
// ============================================================
export async function fetchInsightsAgg(accountId, token, since, until, level = 'campaign') {
  const fieldsMap = {
    campaign: CAMPAIGN_FIELDS,
    adset:    ADSET_FIELDS,
    ad:       AD_FIELDS,
  }

  const fields = fieldsMap[level]
  const tr     = encodeURIComponent(JSON.stringify({ since, until }))
  const url    = `${BASE}/${accountId}/insights?fields=${fields}&level=${level}&time_range=${tr}&limit=500&access_token=${token}`

  return fetchAllPages(url)
}

// ============================================================
// Estrutura de campanhas (status, budget, objetivo)
// ============================================================
export async function fetchCampaigns(accountId, token) {
  const fields = 'id,name,objective,status,effective_status,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time'
  const url    = `${BASE}/${accountId}/campaigns?fields=${fields}&limit=500&access_token=${token}`
  return fetchAllPages(url)
}

// ============================================================
// Estrutura de adsets
// ============================================================
export async function fetchAdsets(accountId, token) {
  const fields = 'id,name,campaign_id,status,effective_status,daily_budget,lifetime_budget,optimization_goal,billing_event,targeting,start_time,end_time,created_time'
  const url    = `${BASE}/${accountId}/adsets?fields=${fields}&limit=500&access_token=${token}`
  return fetchAllPages(url)
}

// ============================================================
// Estrutura de ads
// ============================================================
export async function fetchAds(accountId, token) {
  const fields = 'id,name,adset_id,campaign_id,status,effective_status,creative{id,name,title,body,image_url,video_id,thumbnail_url,call_to_action_type,object_type},created_time'
  const url    = `${BASE}/${accountId}/ads?fields=${fields}&limit=500&access_token=${token}`
  return fetchAllPages(url)
}

// ============================================================
// Insights horários (últimos 7 dias)
// Meta limita breakdown horário a ~7 dias
// ============================================================
export async function fetchHourlyInsights(accountId, token, date, level = 'campaign') {
  const fieldsMap = {
    campaign: CAMPAIGN_FIELDS,
    adset:    ADSET_FIELDS,
  }

  const fields = fieldsMap[level] || CAMPAIGN_FIELDS
  const tr     = encodeURIComponent(JSON.stringify({ since: date, until: date }))
  const url    = `${BASE}/${accountId}/insights?fields=${fields}&level=${level}&time_range=${tr}&breakdowns=hourly_stats_aggregated_by_advertiser_time_zone&limit=500&access_token=${token}`

  try {
    return await fetchAllPages(url)
  } catch (err) {
    // Nem todas as contas/campanhas suportam breakdown horário
    console.warn(`[fetchMeta] Hourly não disponível para ${accountId}: ${err.message}`)
    return []
  }
}

export { delay }
