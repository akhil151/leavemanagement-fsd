import { useEffect } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from '../../context/AuthContext'
import { useLeave } from '../../context/LeaveContext'
import { fetchNotifications } from '../../services/notificationsApi'

/**
 * Optional bridge to backend Socket.io when `VITE_WS_URL` is set.
 * Does not affect demo mode when unset. Keeps local mock state in sync via ingestRealtimeNotification.
 */
export function SocketBridge() {
  const { user } = useAuth()
  const { ingestRealtimeNotification } = useLeave()

  useEffect(() => {
    const url = import.meta.env.VITE_WS_URL
    if (!url || !user) return

    const apiToken = import.meta.env.VITE_API_TOKEN
    const canPollApi = !!apiToken

    const socket = io(url, {
      transports: ['websocket', 'polling'],
      auth: { token: import.meta.env.VITE_WS_TOKEN ?? '' },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      randomizationFactor: 0.25,
    })

    const dispatchStatus = (online) => {
      window.dispatchEvent(new CustomEvent('socket:status', { detail: { online } }))
    }

    let pollingTimer = null
    const stopPolling = () => {
      if (pollingTimer) {
        clearInterval(pollingTimer)
        pollingTimer = null
      }
    }

    const startPolling = () => {
      if (!canPollApi) return
      if (pollingTimer) return
      pollingTimer = setInterval(async () => {
        try {
          const rows = await fetchNotifications({ unreadOnly: true, limit: 30 })
          if (!rows?.length) return
          for (const r of rows) {
            ingestRealtimeNotification({
              id: `poll_${String(r.id)}`,
              recipientId: String(r.userId),
              title: r.title,
              body: r.body,
              type: r.type ?? 'leave',
              priority: r.priority ?? 'info',
              read: !!r.isRead,
              createdAt: r.createdAt,
            })
          }
        } catch {
          // Best-effort polling only; never crash the app.
        }
      }, 15000)
    }

    socket.on('connect', () => {
      dispatchStatus(true)
      stopPolling()
    })
    socket.on('disconnect', () => {
      dispatchStatus(false)
      startPolling()
    })
    socket.on('connect_error', () => {
      dispatchStatus(false)
      startPolling()
    })

    const onApplied = (payload, ack) => {
      try {
        if (user.role !== 'teacher') return
        ingestRealtimeNotification({
          id: `rt_${Date.now()}_a`,
          recipientId: user.id,
          title: 'New leave request',
          body: `${payload.studentName ?? 'Student'} submitted leave (${payload.startDate ?? ''} – ${payload.endDate ?? ''}).`,
          type: 'leave_applied',
          priority: 'info',
          read: false,
          createdAt: new Date().toISOString(),
        })
        if (ack) ack({ ok: true })
      } catch {
        if (ack) ack({ ok: false })
      }
    }

    const onUpdated = (payload, ack) => {
      try {
        if (user.role !== 'student') return
        if (payload.studentId && payload.studentId !== user.id) return
        ingestRealtimeNotification({
          id: `rt_${Date.now()}_u`,
          recipientId: user.id,
          title: payload.status === 'approved' ? 'Leave approved' : 'Leave rejected',
          body: 'Your leave request was updated.',
          type: 'leave_updated',
          priority: payload.status === 'approved' ? 'info' : 'warning',
          read: false,
          createdAt: new Date().toISOString(),
        })
        if (ack) ack({ ok: true })
      } catch {
        if (ack) ack({ ok: false })
      }
    }

    socket.on('leave_applied', onApplied)
    socket.on('leave_updated', onUpdated)

    return () => {
      socket.off('leave_applied', onApplied)
      socket.off('leave_updated', onUpdated)
      stopPolling()
      socket.close()
    }
  }, [user, ingestRealtimeNotification])

  return null
}
