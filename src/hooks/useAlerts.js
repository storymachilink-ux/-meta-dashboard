// ============================================================
// src/hooks/useAlerts.js
// Feed de alertas com polling automático
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import { fetchAlerts, dismissAlert, markAlertRead } from '../lib/api.js'

export function useAlerts({ autoRefresh = true } = {}) {
  const [alerts, setAlerts]       = useState([])
  const [summary, setSummary]     = useState({ critical: 0, warning: 0, info: 0 })
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [lastFetch, setLastFetch] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAlerts({ limit: 100 })
      setAlerts(data.alerts || [])
      setSummary(data.summary || { critical: 0, warning: 0, info: 0 })
      setLastFetch(new Date())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    if (!autoRefresh) return
    // Recarrega a cada 10 minutos
    const interval = setInterval(load, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [load, autoRefresh])

  const dismiss = useCallback(async (id) => {
    await dismissAlert(id)
    setAlerts(prev => prev.filter(a => a.id !== id))
    setSummary(prev => {
      const alert = alerts.find(a => a.id === id)
      if (!alert) return prev
      return { ...prev, [alert.severity]: Math.max(0, (prev[alert.severity] || 0) - 1) }
    })
  }, [alerts])

  const markRead = useCallback(async (id) => {
    await markAlertRead(id)
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a))
  }, [])

  const unreadCount = alerts.filter(a => !a.is_read).length
  const criticalCount = summary.critical || 0

  return { alerts, summary, loading, error, lastFetch, unreadCount, criticalCount, reload: load, dismiss, markRead }
}
