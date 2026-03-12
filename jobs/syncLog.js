// ============================================================
// jobs/syncLog.js
// Registra início, progresso e fim de cada job de ingestão
// ============================================================

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ tenantId: string, accountId?: string, syncType: string, dateFrom?: string, dateTo?: string }} opts
 * @returns {Promise<number>} id do registro criado
 */
export async function syncStart(supabase, { tenantId, accountId, syncType, dateFrom, dateTo }) {
  const { data, error } = await supabase
    .from('sync_log')
    .insert({
      tenant_id:   tenantId,
      account_id:  accountId || null,
      sync_type:   syncType,
      status:      'running',
      date_from:   dateFrom || null,
      date_to:     dateTo   || null,
      started_at:  new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    console.error('[syncLog] Erro ao criar log:', error.message)
    return null
  }
  return data.id
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {number} logId
 * @param {{ rowsInserted?: number, rowsUpdated?: number }} stats
 */
export async function syncFinish(supabase, logId, { rowsInserted = 0, rowsUpdated = 0 } = {}) {
  if (!logId) return
  const { error } = await supabase
    .from('sync_log')
    .update({
      status:        'success',
      rows_inserted: rowsInserted,
      rows_updated:  rowsUpdated,
      finished_at:   new Date().toISOString(),
    })
    .eq('id', logId)

  if (error) console.error('[syncLog] Erro ao finalizar log:', error.message)
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {number} logId
 * @param {string} errorMessage
 */
export async function syncFail(supabase, logId, errorMessage) {
  if (!logId) return
  const { error } = await supabase
    .from('sync_log')
    .update({
      status:        'failed',
      error_message: errorMessage,
      finished_at:   new Date().toISOString(),
    })
    .eq('id', logId)

  if (error) console.error('[syncLog] Erro ao registrar falha:', error.message)
}
