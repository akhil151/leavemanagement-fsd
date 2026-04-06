import { useMemo, useState } from 'react'
import { useLeave } from '../../context/LeaveContext'
import { AppShell } from '../../components/layout/AppShell'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { EmptyState } from '../../components/feedback/EmptyState'

export function AdminCalendarPage() {
  const { holidays, addHoliday, removeHoliday } = useLeave()
  const [iso, setIso] = useState('')

  const sorted = useMemo(() => [...holidays].sort(), [holidays])

  return (
    <AppShell role="admin">
      <div className="space-y-8 max-w-2xl">
        <PageHeader
          title="Academic calendar"
          description="Institutional holidays excluded from business-day leave calculations (frontend demo)."
        />

        <Card>
          <CardHeader>
            <CardTitle>Add holiday</CardTitle>
            <CardDescription>Enter an ISO date (YYYY-MM-DD). Applies to all students.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full">
              <Input
                type="date"
                label="Date"
                value={iso}
                onChange={(e) => setIso(e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="accent"
              onClick={() => {
                if (!iso) return
                addHoliday(iso)
                setIso('')
              }}
            >
              Add
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">Configured holidays</h2>
          {sorted.length === 0 ? (
            <EmptyState title="No holidays" description="Add dates above to block business-day counts." />
          ) : (
            <ul className="rounded-lg border border-[var(--color-border)] divide-y divide-[var(--color-border)] bg-[var(--color-surface-elevated)]">
              {sorted.map((h) => (
                <li key={h} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="font-mono text-[var(--color-text)]">{h}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeHoliday(h)}>
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  )
}
