import { lazy, Suspense, useEffect, useState } from 'react'
import { useLeave } from '../../context/LeaveContext'
import { AppShell } from '../../components/layout/AppShell'
import { PageHeader } from '../../components/layout/PageHeader'
import { apiGet, hasRealApi } from '../../services/api'

const AdminAnalyticsCharts = lazy(() => import('../../components/analytics/AdminAnalyticsCharts.jsx'))

export function AdminAnalyticsPage() {
  const { requests, students } = useLeave()
  const [apiData, setApiData] = useState(/** @type {any | null} */ (null))
  const [loading, setLoading] = useState(hasRealApi)

  useEffect(() => {
    if (!hasRealApi) return
    let cancelled = false
    setLoading(true)
    apiGet('/admin/analytics')
      .then((res) => {
        if (!cancelled && res?.data?.data) setApiData(res.data.data)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  // Re-fetch when a leave_updated event fires (approve/reject) — debounced to coalesce bulk actions
  useEffect(() => {
    if (!hasRealApi) return
    let timer = null
    const handler = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        apiGet('/admin/analytics')
          .then((res) => { if (res?.data?.data) setApiData(res.data.data) })
          .catch(() => {})
      }, 400)
    }
    window.addEventListener('leave:updated', handler)
    return () => {
      window.removeEventListener('leave:updated', handler)
      clearTimeout(timer)
    }
  }, [])

  // Build props: real API provides aggregated counts; mock uses context arrays
  const chartRequests = hasRealApi && apiData
    ? buildRequestsFromApiData(apiData)
    : requests

  return (
    <AppShell role="admin">
      <div className="space-y-8 max-w-[var(--layout-max)]">
        <PageHeader
          title="Institution analytics"
          description="Aggregate leave activity across students."
        />
        {loading ? (
          <div className="h-64 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] animate-pulse" />
        ) : (
          <Suspense
            fallback={
              <div className="h-64 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] animate-pulse" />
            }
          >
            <AdminAnalyticsCharts requests={chartRequests} students={students} apiData={hasRealApi ? apiData : null} />
          </Suspense>
        )}
      </div>
    </AppShell>
  )
}

/** Convert API aggregated data into a minimal requests array for the chart component */
function buildRequestsFromApiData(apiData) {
  if (!apiData) return []
  const { byStatus = {}, byType = {} } = apiData
  const rows = []
  // Expand byStatus into synthetic rows so existing chart logic works
  for (const [status, count] of Object.entries(byStatus)) {
    for (let i = 0; i < count; i++) rows.push({ status, type: 'sick', studentId: `_api_${i}` })
  }
  // Patch type distribution into the rows
  let idx = 0
  for (const [type, count] of Object.entries(byType)) {
    for (let i = 0; i < count && idx < rows.length; i++, idx++) rows[idx].type = type
  }
  return rows
}
