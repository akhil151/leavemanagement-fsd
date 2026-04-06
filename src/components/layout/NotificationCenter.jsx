import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLeave } from '../../context/LeaveContext'
import { Button } from '../ui/Button'
import { cn } from '../../utils/cn'
import { fetchNotifications, markNotificationsRead } from '../../services/notificationsApi'

export function NotificationCenter() {
  const { user } = useAuth()
  const { notifications, markNotificationRead, markAllNotificationsRead } = useLeave()
  const [open, setOpen] = useState(false)
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [viewFilter, setViewFilter] = useState('all')
  const [groupBy, setGroupBy] = useState('date')
  const [remote, setRemote] = useState(null)
  const [socketOnline, setSocketOnline] = useState(null)
  const uid = user?.id

  useEffect(() => {
    const onStatus = (e) => {
      setSocketOnline(!!e?.detail?.online)
    }
    window.addEventListener('socket:status', onStatus)
    return () => window.removeEventListener('socket:status', onStatus)
  }, [])

  const mineLocal = useMemo(() => {
    return notifications
      .filter((n) => n.recipientId === uid || (!n.recipientId && n.studentId === uid))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [notifications, uid])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!open || !user) return
      try {
        const rows = await fetchNotifications({
          priority: priorityFilter === 'all' ? undefined : priorityFilter,
          unreadOnly: viewFilter === 'unread' ? true : undefined,
          limit: 100,
        })
        if (!cancelled && rows) {
          setRemote(
            rows.map((r) => ({
              id: String(r.id),
              recipientId: String(r.userId),
              title: r.title,
              body: r.body,
              type: r.type ?? 'leave',
              priority: r.priority ?? 'info',
              read: !!r.isRead,
              createdAt: r.createdAt,
            })),
          )
        }
      } catch {
        if (!cancelled) setRemote(null)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [open, user, priorityFilter, viewFilter])

  const source = remote ?? mineLocal
  const filtered = useMemo(() => {
    return source.filter((n) => {
      const okPriority = priorityFilter === 'all' || (n.priority ?? 'info') === priorityFilter
      const okView = viewFilter === 'all' || !n.read
      return okPriority && okView
    })
  }, [source, priorityFilter, viewFilter])

  const unread = filtered.filter((n) => !n.read).length

  const grouped = useMemo(() => {
    /** @type {Record<string, any[]>} */
    const map = {}
    for (const n of filtered) {
      const key =
        groupBy === 'type'
          ? (n.type ?? 'other').replaceAll('_', ' ')
          : new Date(n.createdAt).toLocaleDateString()
      if (!map[key]) map[key] = []
      map[key].push(n)
    }
    return Object.entries(map)
  }, [filtered, groupBy])

  const onMarkAll = async () => {
    markAllNotificationsRead({ recipientId: uid ?? '' })
    try {
      await markNotificationsRead({ markAll: true })
    } catch {
      // Keep local UX responsive even when API is unavailable.
    }
  }

  const onMarkOne = async (id) => {
    markNotificationRead({ id, recipientId: uid ?? '' })
    try {
      await markNotificationsRead({ ids: [id] })
    } catch {
      // Fallback already applied locally.
    }
  }

  const badgeClasses = (priority) =>
    priority === 'critical'
      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
      : priority === 'warning'
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
        : 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'

  return (
    <div className="relative">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="relative"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        Alerts
        {unread > 0 ? (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-accent)] text-white text-[10px] font-semibold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </Button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
          />
          <div
            className={cn(
              'absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] rounded-lg border border-[var(--color-border)]',
              'bg-[var(--color-surface-elevated)] shadow-[var(--shadow-floating)] max-h-[min(70vh,420px)] flex flex-col',
            )}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)]">
              <span className="text-xs font-semibold text-[var(--color-text)]">Notifications</span>
              <span className="text-[10px] text-[var(--color-text-subtle)] flex items-center gap-2">
                <span
                  className={
                    socketOnline === null
                      ? 'w-2 h-2 rounded-full bg-[var(--color-border)]'
                      : socketOnline
                        ? 'w-2 h-2 rounded-full bg-emerald-500'
                        : 'w-2 h-2 rounded-full bg-red-500'
                  }
                />
                {socketOnline === null ? 'Realtime: —' : socketOnline ? 'Realtime: Online' : 'Realtime: Offline'}
              </span>
              {unread > 0 ? (
                <button
                  type="button"
                  className="text-[11px] text-[var(--color-accent)] font-medium hover:underline"
                  onClick={onMarkAll}
                >
                  Mark all read
                </button>
              ) : null}
            </div>
            <div className="px-3 py-2 border-b border-[var(--color-border)] flex flex-wrap gap-2">
              <select
                className="text-xs rounded border border-[var(--color-border)] bg-transparent px-2 py-1"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="all">All priority</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
              <select
                className="text-xs rounded border border-[var(--color-border)] bg-transparent px-2 py-1"
                value={viewFilter}
                onChange={(e) => setViewFilter(e.target.value)}
              >
                <option value="all">All</option>
                <option value="unread">Unread</option>
              </select>
              <select
                className="text-xs rounded border border-[var(--color-border)] bg-transparent px-2 py-1"
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
              >
                <option value="date">Group by date</option>
                <option value="type">Group by type</option>
              </select>
            </div>
            <div className="overflow-y-auto flex-1">
              {filtered.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)] px-3 py-6 text-center">
                  No notifications.
                </p>
              ) : (
                grouped.map(([section, items]) => (
                  <div key={section} className="border-b border-[var(--color-border)]">
                    <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-subtle)] bg-[var(--color-surface)]">
                      {section}
                    </p>
                    <div className="divide-y divide-[var(--color-border)]">
                      {items.slice(0, 20).map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => onMarkOne(n.id)}
                          className={cn(
                            'w-full text-left px-3 py-2.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/80',
                            !n.read && 'bg-sky-50/60 dark:bg-sky-950/30',
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-[var(--color-text)]">{n.title}</p>
                            <span
                              className={cn(
                                'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                                badgeClasses(n.priority ?? 'info'),
                              )}
                            >
                              {(n.priority ?? 'info').toUpperCase()}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--color-text-muted)] mt-0.5 line-clamp-2">
                            {n.body}
                          </p>
                          <p className="text-[10px] text-[var(--color-text-subtle)] mt-1">
                            {new Date(n.createdAt).toLocaleString()}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
