// ============================================================
// jobs/syncStructure.js
// Sync da estrutura: campaigns, adsets, ads, creatives
// Roda separado dos insights — atualiza status, budgets, etc.
// ============================================================

import { fetchCampaigns, fetchAdsets, fetchAds, delay } from './fetchMeta.js'
import { transformCampaign, transformAdset, transformAd, chunk } from './transform.js'

const BATCH_SIZE = 50

// ============================================================
// Upsert genérico
// ============================================================
async function upsertBatch(supabase, table, rows, onConflict) {
  if (!rows.length) return 0
  const batches = chunk(rows, BATCH_SIZE)
  let count     = 0

  for (const batch of batches) {
    const { data, error } = await supabase
      .from(table)
      .upsert(batch, { onConflict, ignoreDuplicates: false })
      .select('id')

    if (error) {
      console.error(`[syncStructure] Erro em ${table}:`, error.message)
    } else {
      count += data?.length || batch.length
    }
  }

  return count
}

// ============================================================
// Sync de campanhas
// ============================================================
export async function syncCampaigns(supabase, accountId, token, tenantId) {
  console.log(`[syncStructure] Campanhas → ${accountId}`)
  const rows      = await fetchCampaigns(accountId, token)
  const normalized = rows.map(r => transformCampaign(r, accountId, tenantId))
  const count     = await upsertBatch(supabase, 'campaigns', normalized, 'id')
  console.log(`[syncStructure] ${count} campanhas upserted`)
  return count
}

// ============================================================
// Sync de adsets
// ============================================================
export async function syncAdsets(supabase, accountId, token, tenantId) {
  console.log(`[syncStructure] Adsets → ${accountId}`)
  const rows       = await fetchAdsets(accountId, token)
  const normalized = rows.map(r => transformAdset(r, accountId, tenantId))
  const count      = await upsertBatch(supabase, 'adsets', normalized, 'id')
  console.log(`[syncStructure] ${count} adsets upserted`)
  return count
}

// ============================================================
// Sync de ads + creatives
// ============================================================
export async function syncAds(supabase, accountId, token, tenantId) {
  console.log(`[syncStructure] Ads → ${accountId}`)
  const rows = await fetchAds(accountId, token)

  const adRows       = []
  const creativeRows = []

  for (const row of rows) {
    const { adRow, creativeRow } = transformAd(row, accountId, tenantId)
    adRows.push(adRow)
    if (creativeRow) creativeRows.push(creativeRow)
  }

  // Primeiro upsert creatives (FK de ads)
  if (creativeRows.length) {
    const deduped = dedupeById(creativeRows)
    await upsertBatch(supabase, 'creatives', deduped, 'id')
    console.log(`[syncStructure] ${deduped.length} creatives upserted`)
  }

  const count = await upsertBatch(supabase, 'ads', adRows, 'id')
  console.log(`[syncStructure] ${count} ads upserted`)
  return count
}

// ============================================================
// Sync completo de estrutura para uma conta
// ============================================================
export async function syncAccountStructure(supabase, account, token, tenantId) {
  const { id: accountId, name } = account
  console.log(`[syncStructure] Iniciando estrutura completa para ${name}`)

  await syncCampaigns(supabase, accountId, token, tenantId)
  await delay(300)

  await syncAdsets(supabase, accountId, token, tenantId)
  await delay(300)

  await syncAds(supabase, accountId, token, tenantId)
}

// ============================================================
// Helper: deduplica por id (evita conflito no batch de creatives)
// ============================================================
function dedupeById(rows) {
  const seen = new Set()
  return rows.filter(r => {
    if (seen.has(r.id)) return false
    seen.add(r.id)
    return true
  })
}
