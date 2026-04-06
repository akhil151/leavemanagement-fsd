import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'

const COLORS = ['#1e3a5f', '#2563eb', '#64748b']

/**
 * @param {{ requests: import('../../data/seedData').LeaveRequest[] }} props
 */
export default function StudentAnalyticsCharts({ requests }) {
  const byType = [
    { name: 'Sick', value: requests.filter((r) => r.type === 'sick').length },
    { name: 'Casual', value: requests.filter((r) => r.type === 'casual').length },
    { name: 'On duty', value: requests.filter((r) => r.type === 'onDuty').length },
  ].filter((x) => x.value > 0)

  const byMonth = /** @type {Record<string, number>} */ ({})
  for (const r of requests) {
    const m = r.submittedAt.slice(0, 7)
    byMonth[m] = (byMonth[m] ?? 0) + 1
  }
  const trend = Object.entries(byMonth)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month))

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Leaves by type</CardTitle>
        </CardHeader>
        <CardContent className="h-[280px]">
          {byType.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}>
                  {byType.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Submission trend</CardTitle>
        </CardHeader>
        <CardContent className="h-[280px]">
          {trend.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">No submissions yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} width={32} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="var(--color-accent)" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Status mix</CardTitle>
        </CardHeader>
        <CardContent className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { name: 'Pending', v: requests.filter((r) => r.status === 'pending').length },
                { name: 'Approved', v: requests.filter((r) => r.status === 'approved').length },
                { name: 'Rejected', v: requests.filter((r) => r.status === 'rejected').length },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} width={32} />
              <Tooltip />
              <Bar dataKey="v" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
