import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLeave } from '../../context/LeaveContext'
import { AppShell } from '../../components/layout/AppShell'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { TableWrap, Table, THead, TBody, Tr, Th, Td } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { useSimulatedLoading } from '../../hooks/useSimulatedLoading'
import { TableRowSkeleton } from '../../components/skeletons/Skeleton'

export function AdminPanel() {
  const { user } = useAuth()
  const { students, teachers, mentorMap, balances, setMentor, adjustBalance } = useLeave()
  const loading = useSimulatedLoading(380)

  const rows = useMemo(() => {
    return students.map((s) => ({
      student: s,
      mentorId: mentorMap[s.id] ?? '',
      bal: balances[s.id] ?? { sick: 0, casual: 0, onDuty: 0 },
    }))
  }, [students, mentorMap, balances])

  if (!user || user.role !== 'admin') return null

  return (
    <AppShell role="admin">
      <div className="space-y-8">
        <PageHeader
          title="Administration"
          description="Assign mentors and adjust leave balances. Changes apply immediately for the demo."
        />

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Directory overview</CardTitle>
              <CardDescription>Students and faculty records (sample data).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-[var(--color-text-muted)]">
              <p>
                <span className="font-medium text-[var(--color-text)]">{students.length}</span> students
              </p>
              <p>
                <span className="font-medium text-[var(--color-text)]">{teachers.length}</span> mentors
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Policies</CardTitle>
              <CardDescription>Reference for approvers (static copy).</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-[var(--color-text-muted)] space-y-2">
              <p>Balances reset at the start of each academic year.</p>
              <p>On-duty leave requires departmental endorsement for external events.</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">Students & mentors</h2>
          {loading ? (
            <TableRowSkeleton count={4} />
          ) : (
            <TableWrap>
              <Table>
                <THead>
                  <Tr>
                    <Th>Student</Th>
                    <Th>Program</Th>
                    <Th>Mentor</Th>
                    <Th className="hidden lg:table-cell">Sick</Th>
                    <Th className="hidden lg:table-cell">Casual</Th>
                    <Th className="hidden lg:table-cell">On duty</Th>
                  </Tr>
                </THead>
                <TBody>
                  {rows.map(({ student, mentorId, bal }) => (
                    <Tr key={student.id}>
                      <Td>
                        <div className="font-medium text-[var(--color-text)]">{student.name}</div>
                        <div className="text-xs text-[var(--color-text-muted)]">{student.studentId}</div>
                      </Td>
                      <Td className="text-[var(--color-text-muted)]">{student.department}</Td>
                      <Td className="min-w-[200px]">
                        <Select
                          value={mentorId}
                          onChange={(e) =>
                            setMentor({ studentId: student.id, teacherId: e.target.value })
                          }
                          aria-label={`Mentor for ${student.name}`}
                        >
                          {teachers.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </Select>
                      </Td>
                      <Td className="hidden lg:table-cell">
                        <BalanceInput
                          value={bal.sick}
                          onCommit={(v) =>
                            adjustBalance({
                              studentId: student.id,
                              sick: v,
                            })
                          }
                        />
                      </Td>
                      <Td className="hidden lg:table-cell">
                        <BalanceInput
                          value={bal.casual}
                          onCommit={(v) =>
                            adjustBalance({
                              studentId: student.id,
                              casual: v,
                            })
                          }
                        />
                      </Td>
                      <Td className="hidden lg:table-cell">
                        <BalanceInput
                          value={bal.onDuty}
                          onCommit={(v) =>
                            adjustBalance({
                              studentId: student.id,
                              onDuty: v,
                            })
                          }
                        />
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick adjust (mobile)</CardTitle>
            <CardDescription>Edit balances when the wide table is collapsed.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:hidden">
            {rows.map(({ student, bal }) => (
              <div
                key={student.id}
                className="rounded-md border border-[var(--color-border)] p-4 space-y-3 bg-white"
              >
                <p className="text-sm font-medium">{student.name}</p>
                <div className="grid grid-cols-3 gap-2">
                  <MiniBal
                    label="Sick"
                    value={bal.sick}
                    onSave={(v) => adjustBalance({ studentId: student.id, sick: v })}
                  />
                  <MiniBal
                    label="Casual"
                    value={bal.casual}
                    onSave={(v) => adjustBalance({ studentId: student.id, casual: v })}
                  />
                  <MiniBal
                    label="Duty"
                    value={bal.onDuty}
                    onSave={(v) => adjustBalance({ studentId: student.id, onDuty: v })}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}

/**
 * @param {{ value: number; onCommit: (n: number) => void }} props
 */
function BalanceInput({ value, onCommit }) {
  const [local, setLocal] = useState(String(value))
  useEffect(() => {
    setLocal(String(value))
  }, [value])
  return (
    <Input
      type="number"
      min={0}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        const n = Math.max(0, Number.parseInt(local, 10) || 0)
        setLocal(String(n))
        onCommit(n)
      }}
      className="h-9 max-w-[88px]"
    />
  )
}

/**
 * @param {{ label: string; value: number; onSave: (n: number) => void }} props
 */
function MiniBal({ label, value, onSave }) {
  const [local, setLocal] = useState(String(value))
  useEffect(() => {
    setLocal(String(value))
  }, [value])
  return (
    <div>
      <label className="text-[10px] uppercase text-[var(--color-text-subtle)]">{label}</label>
      <Input
        type="number"
        min={0}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          const n = Math.max(0, Number.parseInt(local, 10) || 0)
          setLocal(String(n))
          onSave(n)
        }}
        className="h-9"
      />
    </div>
  )
}
