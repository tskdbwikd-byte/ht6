import { useCallback, useEffect, useRef, useState } from 'react'

const INITIAL_DASHBOARD = {
  power: true,
  lastSync: '—',
  totals: { events: 0, dns: 0, tls: 0 },
  uniqueDomains: 0,
  recentEvents: [],
  timeseries: [],
  topDomains: [],
  blockedEvents: [],
  topBlockedDomains: [],
  blockedDomainTotal: 0,
  aiBlockedDomains: [],
  aiLog: [],
}

const RECONNECT_DELAY_MS = 2000

export function useLiveDashboard() {
  const [data, setData] = useState(INITIAL_DASHBOARD)
  const [connected, setConnected] = useState(false)
  const wsRef = useRef(null)
  const retryTimerRef = useRef(null)

  const fetchOnce = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard')
      if (!res.ok) return
      setData(await res.json())
    } catch {
      // WebSocket (re)connect will recover state
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
      const ws = new WebSocket(`${protocol}://${window.location.host}/ws/dashboard`)
      wsRef.current = ws

      ws.onopen = () => {
        if (!cancelled) setConnected(true)
      }
      ws.onmessage = (event) => {
        if (cancelled) return
        try {
          setData(JSON.parse(event.data))
        } catch {
          // ignore malformed frame
        }
      }
      ws.onclose = () => {
        if (cancelled) return
        setConnected(false)
        retryTimerRef.current = window.setTimeout(connect, RECONNECT_DELAY_MS)
      }
      ws.onerror = () => {
        ws.close()
      }
    }

    fetchOnce()
    connect()

    return () => {
      cancelled = true
      window.clearTimeout(retryTimerRef.current)
      wsRef.current?.close()
    }
  }, [fetchOnce])

  return { data, connected }
}
