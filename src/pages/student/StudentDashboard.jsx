import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useLeave } from '../../context/LeaveContext'
import { AppShell } from '../../components/layout/AppShell'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { TableWrap, Table, THead, TBody, Tr, Th, Td } from '../../components/ui/Table'
import { StatusBadge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/feedback/EmptyState'
import { BalanceCardsSkeleton, TableRowSkeleton } from '../../components/skeletons/Skeleton'
import { useSimulatedLoading } from '../../hooks/useSimulatedLoading'
import { formatDateRange } from '../../utils/date'
import { leaveTypeLabel } from '../../utils/leaveLabels'
import { cn } from '../../utils/cn'
import { computeLeaveRiskScore } from '../../services/leaveIntelligence'
import { apiGet, hasRealApi } from '../../services/api'

export function StudentDashboard() {
  const { user } = useAuth()
  const { balances: mockBalances, requests: mockRequests, notifications, markNotificationRead } = useLeave()
  const loading = useSimulatedLoading(480)

  const studentId = user?.id

  // --- Real-API state ---
  const [apiDashboard, setApiDashboard] = useState(/** @type {any | null} */ (null))
  const [apiLoading, setApiLoading] = useState(false)
  const fetchedRef = useRef(false)

  const fetchDashboard = async () => {
    if (!hasRealApi || !studentId) return
    setApiLoading(true)
    try {
      const res = await apiGet('/student/dashboard')
      const data = res?.data?.data
      if (data) setApiDashboard(data)
    } catch (e) {
      console.error('[StudentDashboard] fetch error:', e)
    } finally {
      setApiLoading(false)
    }
  }

  useEffect(() => {
    if (!hasRealApi) return
    if (fetchedRef.current) return
    fetchedRef.current = true
    fetchDashboard()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId])

  // Re-fetch when leave status is updated via socket
  useEffect(() => {
    if (!hasRealApi) return
    const handler = () => fetchDashboard()
    window.addEventListener('student:leave_updated', handler)
    return () => window.removeEventListener('student:leave_updated', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId])

  // --- Resolve which data source to use ---
  const balance = hasRealApi && apiDashboard
    ? apiDashboard.balances
    : (studentId ? mockBalances[studentId] : null)

  // Map API recent leaves to the shape the UI expects
  const myRequests = useMemo(() => {
    if (hasRealApi && apiDashboard?.recentLeaves) {
      return apiDashboard.recentLeaves.slice(0, 8).map((r) => ({
        id: String(r.id),
        studentId: String(studentId),
        type: r.type,
        start: r.startDate ?? r.start_date ?? '',
        end: r.endDate ?? r.end_date ?? '',
        status: r.status,
        submittedAt: r.submittedAt ?? r.submitted_at ?? '',
      }))
    }
    return mockRequests.filter((r) => r.studentId === studentId).slice(0, 8)
  }, [hasRealApi, apiDashboard, mockRequests, studentId])

  const allMine = useMemo(() => {
    if (hasRealApi && apiDashboard?.recentLeaves) {
      return apiDashboard.recentLeaves.map((r) => ({
        id: String(r.id),
        studentId: String(studentId),
        type: r.type,
        start: r.startDate ?? r.start_date ?? '',
        end: r.endDate ?? r.end_date ?? '',
        status: r.status,
        submittedAt: r.submittedAt ?? r.submitted_at ?? '',
      }))
    }
    return mockRequests.filter((r) => r.studentId === studentId)
  }, [hasRealApi, apiDashboard, mockRequests, studentId])

  const risk = balance ? computeLeaveRiskScore(allMine, balance) : 0

  const myNotifications = useMemo(
    () =>
      notifications
        .filter((n) => n.recipientId === studentId || (!n.recipientId && n.studentId === studentId))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 6),
    [notifications, studentId],
  )

  const pendingCount = allMine.filter((r) => r.status === 'pending').length

  const timeline = useMemo(() => {
    return [...allMine]
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
      .slice(0, 12)
  }, [allMine])

  const isLoading = hasRealApi ? (apiLoading && !apiDashboard) : loading

  if (!user || user.role !== 'student') return null

  return (
    <AppShell role="student">
      <div className="space-y-8">
        <PageHeader
          title="Student dashboard"
          description="Balances, approvals, and a quick timeline of your leave activity."
          actions={
            <Link to="/student/apply" className="hidden sm:inline-flex">
              <Button variant="accent">Apply leave</Button>
            </Link>
          }
        />

        {hasRealApi && user.role === 'student' ? (
          <Card className="border-[var(--color-border)]">
            <CardHeader className="!mb-1">
              <CardDescription>Assigned mentor</CardDescription>
              <CardTitle className="text-base">
                {user.meta?.mentorName?.trim()
                  ? user.meta.mentorName
                  : user.meta?.mentorId
                    ? `Mentor ID ${user.meta.mentorId}`
                    : 'Not assigned — ask your administrator'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-[var(--color-text-muted)]">
                Leave requests are sent to your assigned mentor for approval.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {!isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryTile label="Pending requests" value={pendingCount} hint="Awaiting mentor" />
            <SummaryTile label="Risk score" value={`${risk}/100`} hint="Heuristic (demo)" />
            <SummaryTile
              label="Next action"
              value={pendingCount ? 'Review status' : '—'}
              hint="Check notifications"
            />
            <SummaryTile
              label="Analytics"
              value="Open"
              hint={
                <Link to="/student/analytics" className="text-[var(--color-accent)] hover:underline">
                  View charts
                </Link>
              }
            />
          </div>
        ) : null}

        {isLoading ? (
          <BalanceCardsSkeleton />
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <BalanceCard label="Sick leave" value={balance?.sick ?? 0} unit="days" hint="Medical & health" />
            <BalanceCard label="Casual leave" value={balance?.casual ?? 0} unit="days" hint="Personal & short" />
            <BalanceCard label="On duty" value={balance?.onDuty ?? 0} unit="days" hint="Official representation" />
          </div>
        )}

        <div className="sm:hidden">
          <Link to="/student/apply" className="block w-full">
            <Button variant="accent" className="w-full">
              Apply leave
            </Button>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-[var(--color-text)]">Recent leave history</h2>
              {isLoading ? (
                <TableRowSkeleton count={4} />
              ) : myRequests.length === 0 ? (
                <EmptyState
                  title="No leave requests yet"
                  description="When you submit a request, it will appear here with status and dates."
                  action={
                    <Link to="/student/apply">
                      <Button variant="secondary" size="sm">
                        Apply leave
                      </Button>
                    </Link>
                  }
                />
              ) : (
                <TableWrap>
                  <Table>
                    <THead>
                      <Tr>
                        <Th>Type</Th>
                        <Th>Dates</Th>
                        <Th>Status</Th>
                        <Th className="hidden sm:table-cell">Submitted</Th>
                      </Tr>
                    </THead>
                    <TBody>
                      {myRequests.map((r) => (
                        <Tr key={r.id}>
                          <Td className="font-medium">{leaveTypeLabel(r.type)}</Td>
                          <Td className="text-[var(--color-text-muted)]">
                            {formatDateRange(r.start, r.end)}
                          </Td>
                          <Td>
                            <StatusBadge status={r.status} />
                          </Td>
                          <Td className="hidden sm:table-cell text-[var(--color-text-muted)] text-xs">
                            {new Date(r.submittedAt).toLocaleString()}
                          </Td>
                        </Tr>
                      ))}
                    </TBody>
                  </Table>
                </TableWrap>
              )}
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-[var(--color-text)]">Leave timeline</h2>
              <Card padding="sm">
                <CardContent className="!space-y-0">
                  {timeline.length === 0 ? (
                    <p className="text-sm text-[var(--color-text-muted)] py-4">No items yet.</p>
                  ) : (
                    <ul className="space-y-4">
                      {timeline.map((r) => (
                        <li
                          key={r.id}
                          className="flex gap-3 border-l-2 border-[var(--color-border)] pl-4 py-0.5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-[var(--color-text-subtle)]">
                              {new Date(r.submittedAt).toLocaleDateString()}
                            </p>
                            <p className="text-sm font-medium text-[var(--color-text)]">
                              {leaveTypeLabel(r.type)} · {formatDateRange(r.start, r.end)}
                            </p>
                            <div className="mt-1">
                              <StatusBadge status={r.status} />
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Notifications</h2>
            <Card padding="sm" className="h-full">
              <CardHeader className="!mb-3">
                <CardTitle className="text-xs uppercase tracking-wide text-[var(--color-text-subtle)]">
                  Inbox
                </CardTitle>
                <CardDescription className="text-xs">
                  Mentor decisions and system alerts. Also available in the header bell.
                </CardDescription>
              </CardHeader>
              <CardContent className="!space-y-0 divide-y divide-[var(--color-border)] max-h-[420px] overflow-y-auto -mx-4 sm:mx-0">
                {myNotifications.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-muted)] py-4 px-4 sm:px-0">
                    No notifications yet.
                  </p>
                ) : (
                  myNotifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() =>
                        markNotificationRead({ id: n.id, recipientId: studentId ?? '' })
                      }
                      className={cn(
                        'w-full text-left py-3 px-4 sm:px-0 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/60',
                        !n.read && 'bg-sky-50/50 dark:bg-sky-950/25',
                      )}
                    >
                      <p className="text-sm font-medium text-[var(--color-text)]">{n.title}</p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{n.body}</p>
                      <p className="text-[10px] text-[var(--color-text-subtle)] mt-2">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

/**
 * @param {{ label: string; value: string | number; hint: React.ReactNode }} props
 */
function SummaryTile({ label, value, hint }) {
  return (
    <Card className="border-[var(--color-border)]">
      <CardHeader className="!mb-1">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xs text-[var(--color-text-muted)]">{hint}</div>
      </CardContent>
    </Card>
  )
}

/**
 * @param {{ label: string; value: number; unit: string; hint: string }} props
 */
function BalanceCard({ label, value, unit, hint }) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-slate-900/90 dark:bg-slate-100/90" aria-hidden />
      <CardHeader className="!mb-1">
        <CardDescription>{label}</CardDescription>
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-semibold tabular-nums text-[var(--color-text)]">{value}</span>
          <span className="text-xs text-[var(--color-text-muted)]">{unit}</span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-[var(--color-text-muted)]">{hint}</p>
      </CardContent>
    </Card>
  )
}
