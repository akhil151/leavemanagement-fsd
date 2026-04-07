import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'

/**
 * @param {{
 *   requests: import('../../data/seedData').LeaveRequest[]
 *   students: { id: string; name: string }[]
 *   apiData?: { byStatus: Record<string,number>; byType: Record<string,number> } | null
 * }} props
 */
export default function AdminAnalyticsCharts({ requests, students, apiData }) {
  const perStudent = students.map((s) => ({
    name: s.name.split(' ')[0] ?? s.name,
    leaves: requests.filter((r) => r.studentId === s.id).length,
  }))

  const byType = apiData
    ? [
        { type: 'Sick', n: Number(apiData.byType?.sick) || 0 },
        { type: 'Casual', n: Number(apiData.byType?.casual) || 0 },
        { type: 'On duty', n: Number(apiData.byType?.on_duty ?? apiData.byType?.onDuty) || 0 },
      ]
    : [
        { type: 'Sick', n: requests.filter((r) => r.type === 'sick').length },
        { type: 'Casual', n: requests.filter((r) => r.type === 'casual').length },
        { type: 'On duty', n: requests.filter((r) => r.type === 'onDuty').length },
      ]

  const byStatus = apiData
    ? [
        { name: 'Pending', v: Number(apiData.byStatus?.pending) || 0 },
        { name: 'Approved', v: Number(apiData.byStatus?.approved) || 0 },
        { name: 'Rejected', v: Number(apiData.byStatus?.rejected) || 0 },
      ]
    : [
        { name: 'Pending', v: requests.filter((r) => r.status === 'pending').length },
        { name: 'Approved', v: requests.filter((r) => r.status === 'approved').length },
        { name: 'Rejected', v: requests.filter((r) => r.status === 'rejected').length },
      ]

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {!apiData && (
        <Card>
          <CardHeader>
            <CardTitle>Leaves per student</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perStudent}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} width={28} />
                <Tooltip />
                <Bar dataKey="leaves" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Leaves by type</CardTitle>
        </CardHeader>
        <CardContent className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byType} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="type" width={72} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="n" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className={apiData ? 'lg:col-span-2' : ''}>
        <CardHeader>
          <CardTitle>Status breakdown</CardTitle>
        </CardHeader>
        <CardContent className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byStatus}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} width={32} />
              <Tooltip />
              <Bar dataKey="v" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
