import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLeave } from '../../context/LeaveContext'
import { AppShell } from '../../components/layout/AppShell'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Textarea } from '../../components/ui/Textarea'
import { Modal } from '../../components/ui/Modal'
import { EmptyState } from '../../components/feedback/EmptyState'
import { useSimulatedLoading } from '../../hooks/useSimulatedLoading'
import { TableRowSkeleton } from '../../components/skeletons/Skeleton'
import { formatDateRange } from '../../utils/date'
import { leaveTypeLabel } from '../../utils/leaveLabels'
import { cn } from '../../utils/cn'
import { apiGet, apiPost, hasRealApi } from '../../services/api'

/** @typedef {'all' | 'pending' | 'approved'} Filter */

/**
 * Normalize a leave request from the real API response into the shape
 * the UI expects (matching the mock seedData shape).
 * @param {any} row
 * @returns {object}
 */
function normalizeApiRequest(row) {
  return {
    id: String(row.id),
    studentId: String(row.studentId ?? row.student_id),
    studentName: row.studentName ?? row.student_name ?? 'Unknown',
    type: row.type,
    start: row.startDate ?? row.start_date ?? row.start ?? '',
    end: row.endDate ?? row.end_date ?? row.end ?? '',
    reason: row.reason ?? '',
    status: row.status,
    mentorComment: row.mentorComment ?? row.mentor_comment ?? undefined,
    submittedAt: row.submittedAt ?? row.submitted_at ?? new Date().toISOString(),
    resolvedAt: row.resolvedAt ?? row.resolved_at ?? undefined,
    priority: row.priority ?? 'normal',
    auditHistory: row.auditHistory ?? [],
  }
}

export function TeacherDashboard() {
  const { user } = useAuth()

  // --- Mock-mode: read from LeaveContext (seed data) ---
  const { requests: mockRequests, mentorMap, resolveRequest, bulkResolveRequests } = useLeave()

  const loading = useSimulatedLoading(420)
  const [filter, setFilter] = useState(/** @type {Filter} */ ('pending'))

  const [activeId, setActiveId] = useState(/** @type {string | null} */ (null))
  const [decision, setDecision] = useState(/** @type {'approved' | 'rejected' | null} */ (null))
  const [historyId, setHistoryId] = useState(/** @type {string | null} */ (null))
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [selected, setSelected] = useState(/** @type {Set<string>} */ (new Set()))

  // --- Real-API mode state ---
  const [apiRequests, setApiRequests] = useState(/** @type {any[]} */ ([]))
  const [apiLoading, setApiLoading] = useState(false)
  const [apiError, setApiError] = useState(/** @type {string | null} */ (null))
  const fetchedRef = useRef(false)

  const teacherId = user?.id

  // Fetch from real API when available
  const fetchLeaveRequests = useCallback(
    async (filterStatus = 'all') => {
      if (!hasRealApi || !teacherId) return
      setApiLoading(true)
      setApiError(null)
      try {
        const res = await apiGet('/teacher/leave-requests', {
          params: filterStatus !== 'all' ? { status: filterStatus } : undefined,
        })
        const rows = res?.data?.data ?? []
        setApiRequests(rows.map(normalizeApiRequest))
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load leave requests'
        setApiError(msg)
        console.error('[TeacherDashboard] fetch error:', e)
      } finally {
        setApiLoading(false)
      }
    },
    [teacherId],
  )

  // Initial fetch
  useEffect(() => {
    if (!hasRealApi) return
    if (fetchedRef.current) return
    fetchedRef.current = true
    fetchLeaveRequests()
  }, [fetchLeaveRequests])

  // Re-fetch when filter changes (real-API mode)
  useEffect(() => {
    if (!hasRealApi) return
    fetchLeaveRequests(filter)
  }, [filter, fetchLeaveRequests])

  // Socket: merge incoming leave_applied event into local apiRequests list
  // SocketBridge only does notifications; we also need to add the request card here.
  useEffect(() => {
    if (!hasRealApi) return

    const handler = (e) => {
      const payload = e.detail
      if (!payload) return
      // Re-fetch to get the full normalized row from the API instead of patch-building it.
      fetchLeaveRequests(filter)
    }

    window.addEventListener('teacher:leave_applied', handler)
    return () => window.removeEventListener('teacher:leave_applied', handler)
  }, [fetchLeaveRequests, filter])

  // Real-API approve / reject
  const apiResolve = useCallback(
    async (requestId, actionDecision, actionComment) => {
      if (!hasRealApi) return
      const endpoint = actionDecision === 'approved' ? '/teacher/approve-leave' : '/teacher/reject-leave'
      const res = await apiPost(endpoint, {
        requestId,
        comment: actionComment ?? undefined,
      })
      const updated = res?.data?.data
      // Merge: update the status in local list
      setApiRequests((prev) =>
        prev.map((r) =>
          r.id === String(requestId)
            ? { ...r, status: updated?.status ?? actionDecision, mentorComment: actionComment || r.mentorComment }
            : r,
        ),
      )
      // Signal analytics pages to re-fetch
      window.dispatchEvent(new CustomEvent('leave:updated', { detail: { requestId, status: actionDecision } }))
    },
    [],
  )

  // --- Determine which queue to show ---
  const queue = useMemo(() => {
    if (hasRealApi) {
      // Real API: all requests in apiRequests are already filtered server-side by mentor_id
      return apiRequests
    }
    // Mock: filter by mentorMap
    return mockRequests.filter((r) => mentorMap[r.studentId] === teacherId)
  }, [hasRealApi, apiRequests, mockRequests, mentorMap, teacherId])

  const filtered = useMemo(() => {
    if (filter === 'all') return queue
    if (filter === 'pending') return queue.filter((r) => r.status === 'pending')
    return queue.filter((r) => r.status === 'approved')
  }, [queue, filter])

  const isLoading = hasRealApi ? apiLoading : loading

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllPending = () => {
    const pendingIds = filtered.filter((r) => r.status === 'pending').map((r) => r.id)
    setSelected(new Set(pendingIds))
  }

  const clearSelection = () => setSelected(new Set())

  const openModal = (id, d) => {
    setActiveId(id)
    setDecision(d)
    setComment('')
  }

  const closeModal = () => {
    setActiveId(null)
    setDecision(null)
    setComment('')
  }

  const closeHistory = () => setHistoryId(null)

  const confirm = async () => {
    if (!activeId || !decision || !teacherId) return
    setSubmitting(true)
    try {
      if (hasRealApi) {
        await apiResolve(activeId, decision, comment.trim() || undefined)
      } else {
        await new Promise((r) => setTimeout(r, 400))
        resolveRequest({
          requestId: activeId,
          status: decision,
          mentorComment: comment.trim() || undefined,
          teacherId,
        })
      }
    } catch (e) {
      console.error('[TeacherDashboard] resolve error:', e)
    } finally {
      setSubmitting(false)
      closeModal()
      setSelected((s) => {
        const n = new Set(s)
        n.delete(activeId)
        return n
      })
    }
  }

  const bulkConfirm = async (status) => {
    if (!teacherId || selected.size === 0) return
    const ids = [...selected].filter((id) => {
      const r = queue.find((x) => x.id === id)
      return r?.status === 'pending'
    })
    if (!ids.length) return
    setSubmitting(true)
    try {
      if (hasRealApi) {
        for (const id of ids) {
          await apiResolve(id, status, undefined)
        }
      } else {
        await new Promise((r) => setTimeout(r, 500))
        bulkResolveRequests({
          requestIds: ids,
          status,
          mentorComment: undefined,
          teacherId,
        })
      }
    } catch (e) {
      console.error('[TeacherDashboard] bulk resolve error:', e)
    } finally {
      setSubmitting(false)
      clearSelection()
    }
  }

  const activeReq = queue.find((r) => r.id === activeId)
  const historyReq = queue.find((r) => r.id === historyId)
  const timeline = useMemo(() => {
    if (!historyReq) return []
    if (historyReq.auditHistory?.length) {
      return [...historyReq.auditHistory].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    }
    const fallback = [
      {
        id: `${historyReq.id}_apply`,
        actionType: 'APPLY',
        performedByName: historyReq.studentName,
        timestamp: historyReq.submittedAt,
      },
    ]
    if (historyReq.status === 'approved' || historyReq.status === 'rejected') {
      fallback.push({
        id: `${historyReq.id}_${historyReq.status}`,
        actionType: historyReq.status === 'approved' ? 'APPROVE' : 'REJECT',
        performedByName: 'Mentor',
        timestamp: historyReq.resolvedAt ?? historyReq.submittedAt,
      })
    }
    return fallback
  }, [historyReq])

  if (!user || user.role !== 'teacher') return null

  return (
    <AppShell role="teacher">
      <div className="space-y-8">
        <PageHeader
          title="Mentor inbox"
          description="Review leave requests from students assigned to you. Use bulk actions for high-volume weeks."
        />

        {apiError ? (
          <div className="rounded-md border border-red-200 bg-red-50 dark:bg-red-900/20 px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-sm text-red-700 dark:text-red-300">{apiError}</p>
            <Button size="sm" variant="secondary" onClick={() => fetchLeaveRequests(filter)}>
              Retry
            </Button>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="flex flex-wrap gap-2">
            {(
              /** @type {const} */ ([
                ['pending', 'Pending'],
                ['approved', 'Approved'],
                ['all', 'All'],
              ])
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(/** @type {Filter} */ (id))}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  filter === id
                    ? 'border-slate-900 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100'
                    : 'border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] hover:bg-slate-50 dark:hover:bg-slate-800',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {filter === 'pending' && filtered.some((r) => r.status === 'pending') ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={selectAllPending}>
                Select all pending
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={clearSelection}>
                Clear
              </Button>
              <Button
                type="button"
                variant="accent"
                size="sm"
                disabled={selected.size === 0 || submitting}
                loading={submitting}
                onClick={() => bulkConfirm('approved')}
              >
                Approve selected ({selected.size})
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                disabled={selected.size === 0 || submitting}
                onClick={() => bulkConfirm('rejected')}
              >
                Reject selected
              </Button>
            </div>
          ) : null}
        </div>

        {isLoading ? (
          <TableRowSkeleton count={4} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No requests in this view"
            description="When students submit leave, they will appear here for your review."
          />
        ) : (
          <div className="grid gap-4">
            {filtered.map((r) => (
              <Card key={r.id} padding="md" className="transition-shadow hover:shadow-md">
                <CardHeader className="!mb-2 flex flex-row items-start justify-between gap-4">
                  <div className="flex gap-3 min-w-0">
                    {r.status === 'pending' ? (
                      <input
                        type="checkbox"
                        className="mt-1 size-4 rounded border-[var(--color-border)]"
                        checked={selected.has(r.id)}
                        onChange={() => toggleSelect(r.id)}
                        aria-label={`Select ${r.studentName}`}
                      />
                    ) : (
                      <span className="w-4 shrink-0" aria-hidden />
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-base">{r.studentName}</CardTitle>
                        {r.priority === 'urgent' ? (
                          <Badge variant="danger">Urgent</Badge>
                        ) : null}
                      </div>
                      <CardDescription className="mt-1 flex flex-wrap gap-2 items-center">
                        <span>{leaveTypeLabel(r.type)}</span>
                        <span className="text-[var(--color-border)]">·</span>
                        <span>{formatDateRange(r.start, r.end)}</span>
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant={
                      r.status === 'approved'
                        ? 'success'
                        : r.status === 'rejected'
                          ? 'danger'
                          : 'warning'
                    }
                  >
                    {r.status}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-[var(--color-text)] leading-relaxed">{r.reason}</p>
                  {r.mentorComment ? (
                    <p className="text-xs text-[var(--color-text-muted)] mt-3 border-l-2 border-slate-200 dark:border-slate-600 pl-3">
                      <span className="font-medium text-[var(--color-text)]">Your note: </span>
                      {r.mentorComment}
                    </p>
                  ) : null}
                  <div className="mt-3">
                    <Button size="sm" variant="secondary" onClick={() => setHistoryId(r.id)}>
                      View History
                    </Button>
                  </div>
                </CardContent>
                {r.status === 'pending' ? (
                  <CardFooter className="!mt-4 !pt-4">
                    <Button
                      size="sm"
                      variant="accent"
                      onClick={() => openModal(r.id, 'approved')}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => openModal(r.id, 'rejected')}
                    >
                      Reject
                    </Button>
                  </CardFooter>
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={!!activeId && !!decision}
        onClose={closeModal}
        title={decision === 'approved' ? 'Approve leave' : 'Reject leave'}
        description={
          activeReq
            ? `${activeReq.studentName} · ${leaveTypeLabel(activeReq.type)} · ${formatDateRange(activeReq.start, activeReq.end)}`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" type="button" onClick={closeModal} disabled={submitting}>
              Back
            </Button>
            <Button
              type="button"
              variant={decision === 'approved' ? 'accent' : 'danger'}
              loading={submitting}
              onClick={confirm}
            >
              Confirm
            </Button>
          </>
        }
      >
        <Textarea
          label="Comment to student (optional)"
          placeholder="e.g. Submit medical certificate on return, or reason for rejection."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
        />
      </Modal>

      <Modal
        open={!!historyId}
        onClose={closeHistory}
        title="Leave History"
        description={
          historyReq
            ? `${historyReq.studentName} · ${leaveTypeLabel(historyReq.type)} · ${formatDateRange(historyReq.start, historyReq.end)}`
            : undefined
        }
        footer={
          <Button variant="secondary" type="button" onClick={closeHistory}>
            Close
          </Button>
        }
      >
        {timeline.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No history available.</p>
        ) : (
          <div className="space-y-3">
            {timeline.map((item) => (
              <div key={item.id} className="rounded-md border border-[var(--color-border)] px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-[var(--color-text)]">{item.actionType}</span>
                  <span className="text-xs text-[var(--color-text-subtle)]">
                    {new Date(item.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Performed by: {item.performedByName ?? item.performedBy ?? 'System'}
                </p>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </AppShell>
  )
}
