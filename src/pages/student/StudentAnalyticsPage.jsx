import { lazy, Suspense, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLeave } from '../../context/LeaveContext'
import { AppShell } from '../../components/layout/AppShell'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card'
import { analyzeLeavePatterns, computeLeaveRiskScore } from '../../services/leaveIntelligence'

const StudentAnalyticsCharts = lazy(() => import('../../components/analytics/StudentAnalyticsCharts.jsx'))

export function StudentAnalyticsPage() {
  const { user } = useAuth()
  const { requests, balances } = useLeave()
  const studentId = user?.id

  const mine = useMemo(
    () => requests.filter((r) => r.studentId === studentId),
    [requests, studentId],
  )

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
                Heuristic based on volume vs remaining balance (demo).
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
              <p className="text-xs text-[var(--color-text-muted)]">All time in demo dataset.</p>
            </CardContent>
          </Card>
        </div>

        <Suspense
          fallback={
            <div className="h-48 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] animate-pulse" />
          }
        >
          <StudentAnalyticsCharts requests={mine} />
        </Suspense>
      </div>
    </AppShell>
  )
}
