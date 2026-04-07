import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLeave } from '../../context/LeaveContext'
import { AppShell } from '../../components/layout/AppShell'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card'
import { analyzeLeavePatterns, computeLeaveRiskScore } from '../../services/leaveIntelligence'
import { apiGet, hasRealApi } from '../../services/api'

const StudentAnalyticsCharts = lazy(() => import('../../components/analytics/StudentAnalyticsCharts.jsx'))

export function StudentAnalyticsPage() {
  const { user } = useAuth()
  const { requests: mockRequests, balances } = useLeave()
  const studentId = user?.id

  const [apiLeaves, setApiLeaves] = useState(/** @type {any[] | null} */ (null))
  const [loading, setLoading] = useState(hasRealApi)

  const fetchLeaves = () => {
    if (!hasRealApi) return
    setLoading(true)
    apiGet('/student/my-leaves')
      .then((res) => {
        const rows = res?.data?.data
        if (rows) {
          setApiLeaves(rows.map((r) => ({
            id: String(r.id),
            studentId: String(studentId),
            type: r.type,
            start: r.startDate ?? r.start_date ?? '',
            end: r.endDate ?? r.end_date ?? '',
            status: r.status,
            submittedAt: r.submittedAt ?? r.submitted_at ?? '',
          })))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchLeaves() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch when leave status changes — debounced, single event source to avoid double-fetch.
  // student:leave_updated (socket) and leave:updated (dashboard action) are both handled;
  // the debounce ensures only one fetch fires even if both arrive together.
  useEffect(() => {
    if (!hasRealApi) return
    let timer = null
    const handler = () => {
      clearTimeout(timer)
      timer = setTimeout(fetchLeaves, 400)
    }
    window.addEventListener('student:leave_updated', handler)
    window.addEventListener('leave:updated', handler)
    return () => {
      window.removeEventListener('student:leave_updated', handler)
      window.removeEventListener('leave:updated', handler)
      clearTimeout(timer)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const mine = useMemo(() => {
    if (hasRealApi && apiLeaves) return apiLeaves
    return mockRequests.filter((r) => r.studentId === studentId)
  }, [hasRealApi, apiLeaves, mockRequests, studentId])

  const bal = studentId ? balances[studentId] : null
  const risk = bal ? computeLeaveRiskScore(mine, bal) : 0
  const patterns = useMemo(() => analyzeLeavePatterns(mine), [mine])

  if (!user || user.role !== 'student') return null

  return (
    <AppShell role="student">
      <div className="space-y-8 max-w-[var(--layout-max)]">
        <PageHeader
          title="Personal analytics"
          description="Pattern signals and submission history for your account."
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="!mb-1">
              <CardDescription>Risk score</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{risk}/100</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-[var(--color-text-muted)]">
                Heuristic based on volume vs remaining balance.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="!mb-1">
              <CardDescription>Mon / Fri share</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {Math.round(patterns.mondayFridayShare * 100)}%
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-[var(--color-text-muted)]">Starts on Monday or Friday.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="!mb-1">
              <CardDescription>Total requests</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{mine.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-[var(--color-text-muted)]">All time.</p>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="h-48 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] animate-pulse" />
        ) : mine.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No leave data yet.</p>
        ) : (
          <Suspense
            fallback={
              <div className="h-48 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] animate-pulse" />
            }
          >
            <StudentAnalyticsCharts requests={mine} />
          </Suspense>
        )}
      </div>
    </AppShell>
  )
}
