// ============================================================
// src/hooks/useSync.js
// Dispara syncs manuais e mostra status
// ============================================================

import { useState } from 'react'
import { triggerIncremental, triggerRules, fetchSyncStatus } from '../lib/api.js'

export function useSync() {
  const [syncing, setSyncing]   = useState(false)
  const [lastSync, setLastSync] = useState(null)
  const [error, setError]       = useState(null)

  async function syncNow() {
    setSyncing(true)
    setError(null)
    try {
      await triggerIncremental()
      // Aguarda 3s e dispara as regras
      setTimeout(async () => {
        try { await triggerRules() } catch {}
      }, 3000)
      setLastSync(new Date())
    } catch (err) {
      setError(err.message)
    } finally {
      setSyncing(false)
    }
  }

  async function getStatus() {
    try {
      return await fetchSyncStatus()
    } catch {
      return []
    }
  }

  return { syncing, lastSync, error, syncNow, getStatus }
}
