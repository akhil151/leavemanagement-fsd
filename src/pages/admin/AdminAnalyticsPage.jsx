import { lazy, Suspense } from 'react'
import { useLeave } from '../../context/LeaveContext'
import { AppShell } from '../../components/layout/AppShell'
import { PageHeader } from '../../components/layout/PageHeader'

const AdminAnalyticsCharts = lazy(() => import('../../components/analytics/AdminAnalyticsCharts.jsx'))

export function AdminAnalyticsPage() {
  const { requests, students } = useLeave()

  return (
    <AppShell role="admin">
      <div className="space-y-8 max-w-[var(--layout-max)]">
        <PageHeader
          title="Institution analytics"
          description="Aggregate leave activity across students (demo data)."
        />
        <Suspense
          fallback={
            <div className="h-64 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] animate-pulse" />
          }
        >
          <AdminAnalyticsCharts requests={requests} students={students} />
        </Suspense>
      </div>
    </AppShell>
  )
}
