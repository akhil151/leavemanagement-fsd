import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLeave } from '../../context/LeaveContext'
import { AppShell } from '../../components/layout/AppShell'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card'
import { apiGet, hasRealApi } from '../../services/api'

const StudentAnalyticsCharts = lazy(() => import('../../components/analytics/StudentAnalyticsCharts.jsx'))

export function TeacherAnalyticsPage() {
  const { user } = useAuth()
  const { requests, mentorMap } = useLeave()
  const tid = user?.id

  const [apiCounts, setApiCounts] = useState(/** @type {{ pending: number; approved: number; rejected: number } | null} */ (null))
  const [loading, setLoading] = useState(hasRealApi)

  const fetchAnalytics = () => {
    if (!hasRealApi) return
    setLoading(true)
    apiGet('/teacher/analytics')
      .then((res) => { if (res?.data?.data) setApiCounts(res.data.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchAnalytics() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch after approve/reject — debounced to coalesce bulk actions
  useEffect(() => {
    if (!hasRealApi) return
    let timer = null
    const handler = () => {
      clearTimeout(timer)
      timer = setTimeout(fetchAnalytics, 400)
    }
    window.addEventListener('leave:updated', handler)
    return () => {
      window.removeEventListener('leave:updated', handler)
      clearTimeout(timer)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const menteeRequests = useMemo(
    () => requests.filter((r) => mentorMap[r.studentId] === tid),
    [requests, mentorMap, tid],
  )

  const pending = hasRealApi && apiCounts ? apiCounts.pending : menteeRequests.filter((r) => r.status === 'pending').length
  const approved = hasRealApi && apiCounts ? apiCounts.approved : menteeRequests.filter((r) => r.status === 'approved').length

  if (!user || user.role !== 'teacher') return null

  return (
    <AppShell role="teacher">
      <div className="space-y-8 max-w-[var(--layout-max)]">
        <PageHeader
          title="Mentor analytics"
          description="Aggregated leave activity for your mentees only."
        />
        <Card>
          <CardHeader>
            <CardTitle>Queue snapshot</CardTitle>
            <CardDescription>Pending items need action.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-6 text-sm">
            {loading ? (
              <div className="h-8 w-32 rounded animate-pulse bg-[var(--color-border)]" />
            ) : (
              <>
                <div>
                  <p className="text-[var(--color-text-muted)]">Pending</p>
                  <p className="text-2xl font-semibold tabular-nums">{pending}</p>
                </div>
                <div>
                  <p className="text-[var(--color-text-muted)]">Approved</p>
                  <p className="text-2xl font-semibold tabular-nums">{approved}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        {loading ? (
          <div className="h-48 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] animate-pulse" />
        ) : (
          <Suspense
            fallback={
              <div className="h-48 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] animate-pulse" />
            }
          >
            <StudentAnalyticsCharts requests={menteeRequests} />
          </Suspense>
        )}
      </div>
    </AppShell>
  )
}
