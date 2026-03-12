// ============================================================
// jobs/upsertInsights.js
// Upsert em batch no Supabase com controle de conflito
// ============================================================

import { chunk } from './transform.js'

const BATCH_SIZE = 100

// ============================================================
// Upsert de insight_daily
// Conflict key: (date, level, entity_id)
// ============================================================
export async function upsertDailyInsights(supabase, rows) {
  if (!rows.length) return { inserted: 0, errors: 0 }

  const batches = chunk(rows, BATCH_SIZE)
  let inserted  = 0
  let errors    = 0

  for (const batch of batches) {
    const { data, error } = await supabase
      .from('insight_daily')
      .upsert(batch, {
        onConflict:        'date,level,entity_id',
        ignoreDuplicates:  false,   // atualiza se já existe
      })
      .select('id')

    if (error) {
      console.error('[upsertInsights] Erro daily:', error.message)
      errors += batch.length
    } else {
      inserted += data?.length || batch.length
    }
  }

  return { inserted, errors }
}

// ============================================================
// Upsert de insight_hourly
// Conflict key: (date, hour, level, entity_id)
// ============================================================
export async function upsertHourlyInsights(supabase, rows) {
  if (!rows.length) return { inserted: 0, errors: 0 }

  const batches = chunk(rows, BATCH_SIZE)
  let inserted  = 0
  let errors    = 0

  for (const batch of batches) {
    const { data, error } = await supabase
      .from('insight_hourly')
      .upsert(batch, {
        onConflict:       'date,hour,level,entity_id',
        ignoreDuplicates: false,
      })
      .select('id')

    if (error) {
      console.error('[upsertInsights] Erro hourly:', error.message)
      errors += batch.length
    } else {
      inserted += data?.length || batch.length
    }
  }

  return { inserted, errors }
}
