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
 * @param {{ requests: import('../../data/seedData').LeaveRequest[]; students: { id: string; name: string }[] }} props
 */
export default function AdminAnalyticsCharts({ requests, students }) {
  const perStudent = students.map((s) => ({
    name: s.name.split(' ')[0] ?? s.name,
    leaves: requests.filter((r) => r.studentId === s.id).length,
  }))

  const byType = [
    { type: 'Sick', n: requests.filter((r) => r.type === 'sick').length },
    { type: 'Casual', n: requests.filter((r) => r.type === 'casual').length },
    { type: 'On duty', n: requests.filter((r) => r.type === 'onDuty').length },
  ]

  return (
    <div className="grid gap-6 lg:grid-cols-2">
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

      <Card>
        <CardHeader>
          <CardTitle>Leaves by type (global)</CardTitle>
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
    </div>
  )
}
