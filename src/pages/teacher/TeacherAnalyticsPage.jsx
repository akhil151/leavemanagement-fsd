import { lazy, Suspense, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLeave } from '../../context/LeaveContext'
import { AppShell } from '../../components/layout/AppShell'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card'

const StudentAnalyticsCharts = lazy(() => import('../../components/analytics/StudentAnalyticsCharts.jsx'))

export function TeacherAnalyticsPage() {
  const { user } = useAuth()
  const { requests, mentorMap } = useLeave()
  const tid = user?.id

  const menteeRequests = useMemo(
    () => requests.filter((r) => mentorMap[r.studentId] === tid),
    [requests, mentorMap, tid],
  )

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
            <div>
              <p className="text-[var(--color-text-muted)]">Pending</p>
              <p className="text-2xl font-semibold tabular-nums">
                {menteeRequests.filter((r) => r.status === 'pending').length}
              </p>
            </div>
            <div>
              <p className="text-[var(--color-text-muted)]">Approved</p>
              <p className="text-2xl font-semibold tabular-nums">
                {menteeRequests.filter((r) => r.status === 'approved').length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Suspense
          fallback={
            <div className="h-48 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] animate-pulse" />
          }
        >
          <StudentAnalyticsCharts requests={menteeRequests} />
        </Suspense>
      </div>
    </AppShell>
  )
}
