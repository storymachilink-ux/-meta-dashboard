// ============================================================
// jobs/transform.js
// Normaliza rows brutas da Meta API para o schema do banco
// ============================================================

function valAction(arr, type) {
  return parseFloat((arr || []).find(a => a.action_type === type)?.value || '0')
}

// ============================================================
// Normaliza insight diário (campaign | adset | ad)
// ============================================================
export function transformInsightRow(row, level, accountId, tenantId) {
  const idField   = level === 'campaign' ? 'campaign_id'
                  : level === 'adset'    ? 'adset_id'
                  : 'ad_id'
  const nameField = level === 'campaign' ? 'campaign_name'
                  : level === 'adset'    ? 'adset_name'
                  : 'ad_name'

  const spend         = parseFloat(row.spend || 0)
  const purchases     = valAction(row.actions, 'purchase')
  const purchaseValue = valAction(row.action_values, 'purchase')
  const roas          = spend > 0 ? purchaseValue / spend : 0
  const cpa           = purchases > 0 ? spend / purchases : null

  return {
    date:            row.date_start,
    tenant_id:       tenantId,
    account_id:      accountId,
    level,
    entity_id:       row[idField],
    entity_name:     row[nameField] || null,

    impressions:     parseInt(row.impressions || 0),
    clicks:          parseInt(row.clicks || 0),
    reach:           parseInt(row.reach || 0),
    spend,

    ctr:             parseFloat(row.ctr || 0),
    cpc:             parseFloat(row.cpc || 0),
    cpm:             parseFloat(row.cpm || 0),
    frequency:       parseFloat(row.frequency || 0),

    link_clicks:     valAction(row.actions, 'link_click'),
    unique_clicks:   parseInt(row.unique_clicks || 0),
    page_engagement: valAction(row.actions, 'page_engagement'),
    video_views:     valAction(row.actions, 'video_view'),

    purchases,
    purchase_value:  purchaseValue,
    roas,
    cpa,

    actions:         row.actions       || null,
    action_values:   row.action_values || null,
    synced_at:       new Date().toISOString(),
  }
}

// ============================================================
// Normaliza insight horário
// Meta retorna hour_start como "00:00:00 - 01:00:00"
// Extraímos só o número da hora inicial
// ============================================================
export function transformHourlyRow(row, level, accountId, tenantId, date) {
  const idField   = level === 'campaign' ? 'campaign_id' : 'adset_id'
  const nameField = level === 'campaign' ? 'campaign_name' : 'adset_name'

  // Extrai hora do campo hourly_stats_aggregated_by_advertiser_time_zone
  // Ex: "00:00:00 - 01:00:00" → 0
  const hourRaw = row.hourly_stats_aggregated_by_advertiser_time_zone || '00:00:00 - 01:00:00'
  const hour    = parseInt(hourRaw.split(':')[0]) || 0

  const spend         = parseFloat(row.spend || 0)
  const purchases     = valAction(row.actions, 'purchase')
  const purchaseValue = valAction(row.action_values, 'purchase')
  const roas          = spend > 0 ? purchaseValue / spend : 0

  return {
    date,
    hour,
    tenant_id:      tenantId,
    account_id:     accountId,
    level,
    entity_id:      row[idField],
    entity_name:    row[nameField] || null,

    impressions:    parseInt(row.impressions || 0),
    clicks:         parseInt(row.clicks || 0),
    spend,
    reach:          parseInt(row.reach || 0),

    ctr:            parseFloat(row.ctr || 0),
    cpc:            parseFloat(row.cpc || 0),
    cpm:            parseFloat(row.cpm || 0),

    purchases,
    purchase_value: purchaseValue,
    roas,

    actions:        row.actions       || null,
    action_values:  row.action_values || null,
    synced_at:      new Date().toISOString(),
  }
}

// ============================================================
// Normaliza campanha (estrutura)
// ============================================================
export function transformCampaign(row, accountId, tenantId) {
  return {
    id:               row.id,
    account_id:       accountId,
    tenant_id:        tenantId,
    name:             row.name,
    objective:        row.objective        || null,
    status:           row.status           || null,
    effective_status: row.effective_status || null,
    daily_budget:     row.daily_budget     ? parseFloat(row.daily_budget) / 100 : null,
    lifetime_budget:  row.lifetime_budget  ? parseFloat(row.lifetime_budget) / 100 : null,
    start_time:       row.start_time       || null,
    stop_time:        row.stop_time        || null,
    created_time:     row.created_time     || null,
    updated_time:     row.updated_time     || null,
    synced_at:        new Date().toISOString(),
  }
}

// ============================================================
// Normaliza adset (estrutura)
// ============================================================
export function transformAdset(row, accountId, tenantId) {
  return {
    id:                row.id,
    campaign_id:       row.campaign_id,
    account_id:        accountId,
    tenant_id:         tenantId,
    name:              row.name,
    status:            row.status           || null,
    effective_status:  row.effective_status || null,
    daily_budget:      row.daily_budget     ? parseFloat(row.daily_budget) / 100 : null,
    lifetime_budget:   row.lifetime_budget  ? parseFloat(row.lifetime_budget) / 100 : null,
    optimization_goal: row.optimization_goal || null,
    billing_event:     row.billing_event     || null,
    targeting:         row.targeting         || null,
    start_time:        row.start_time        || null,
    end_time:          row.end_time          || null,
    created_time:      row.created_time      || null,
    synced_at:         new Date().toISOString(),
  }
}

// ============================================================
// Normaliza ad + creative (estrutura)
// ============================================================
export function transformAd(row, accountId, tenantId) {
  const creative = row.creative || null

  const adRow = {
    id:               row.id,
    adset_id:         row.adset_id,
    campaign_id:      row.campaign_id,
    account_id:       accountId,
    tenant_id:        tenantId,
    name:             row.name,
    status:           row.status           || null,
    effective_status: row.effective_status || null,
    creative_id:      creative?.id         || null,
    created_time:     row.created_time     || null,
    synced_at:        new Date().toISOString(),
  }

  const creativeRow = creative ? {
    id:                  creative.id,
    account_id:          accountId,
    tenant_id:           tenantId,
    name:                creative.name                 || null,
    title:               creative.title                || null,
    body:                creative.body                 || null,
    image_url:           creative.image_url            || null,
    video_id:            creative.video_id             || null,
    thumbnail_url:       creative.thumbnail_url        || null,
    call_to_action_type: creative.call_to_action_type  || null,
    object_type:         creative.object_type          || null,
    raw:                 creative,
    synced_at:           new Date().toISOString(),
  } : null

  return { adRow, creativeRow }
}

// ============================================================
// Quebra array em chunks para upsert em batch
// ============================================================
export function chunk(arr, size) {
  const chunks = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}
