import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLeave } from '../../context/LeaveContext'
import { apiGet, apiPost, hasRealApi } from '../../services/api'
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
  const [apiDirectory, setApiDirectory] = useState(/** @type {{ students: any[]; teachers: any[] } | null} */ (null))
  const [apiMentorMap, setApiMentorMap] = useState(/** @type {Record<string, string>} */ ({}))
  const [apiError, setApiError] = useState(/** @type {string | null} */ (null))
  const [assignBusy, setAssignBusy] = useState(false)
  const [apiLoading, setApiLoading] = useState(false)

  const loadApiDirectory = useCallback(async () => {
    if (!hasRealApi) return
    setApiLoading(true)
    setApiError(null)
    try {
      const [sRes, tRes] = await Promise.all([
        apiGet('/admin/users', { params: { role: 'student' } }),
        apiGet('/admin/users', { params: { role: 'teacher' } }),
      ])
      const studentRows = sRes?.data?.data ?? []
      const teacherRows = tRes?.data?.data ?? []
      setApiDirectory({ students: studentRows, teachers: teacherRows })
      const mm = {}
      for (const s of studentRows) {
        if (s.mentorId != null && String(s.mentorId)) mm[String(s.id)] = String(s.mentorId)
      }
      setApiMentorMap(mm)
    } catch (e) {
      setApiDirectory({ students: [], teachers: [] })
      setApiError(e instanceof Error ? e.message : 'Failed to load directory')
    } finally {
      setApiLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user || user.role !== 'admin' || !hasRealApi) return
    void loadApiDirectory()
  }, [user, loadApiDirectory])

  const handleMentorChange = async (studentId, teacherId) => {
    if (!teacherId) return
    if (hasRealApi) {
      setAssignBusy(true)
      setApiError(null)
      try {
        await apiPost('/admin/assign-mentor', { studentId, teacherId })
        setApiMentorMap((prev) => ({ ...prev, [studentId]: teacherId }))
      } catch (e) {
        setApiError(e instanceof Error ? e.message : 'Assign mentor failed')
      } finally {
        setAssignBusy(false)
      }
      return
    }
    setMentor({ studentId, teacherId })
  }

  const rows = useMemo(() => {
    if (hasRealApi) {
      if (!apiDirectory) return []
      return apiDirectory.students.map((s) => ({
        student: {
          id: String(s.id),
          name: s.name,
          studentId: s.studentCode ?? '',
          department: s.department ?? '',
        },
        mentorId: apiMentorMap[String(s.id)] ?? (s.mentorId ? String(s.mentorId) : ''),
        bal: balances[String(s.id)] ?? { sick: 0, casual: 0, onDuty: 0 },
      }))
    }
    return students.map((s) => ({
      student: s,
      mentorId: mentorMap[s.id] ?? '',
      bal: balances[s.id] ?? { sick: 0, casual: 0, onDuty: 0 },
    }))
  }, [students, mentorMap, balances, hasRealApi, apiDirectory, apiMentorMap])

  const teacherOptions = useMemo(() => {
    if (hasRealApi) {
      if (!apiDirectory) return []
      return apiDirectory.teachers.map((t) => ({
        id: String(t.id),
        name: t.name,
      }))
    }
    return teachers.map((t) => ({ id: t.id, name: t.name }))
  }, [hasRealApi, apiDirectory, teachers])

  if (!user || user.role !== 'admin') return null

  return (
    <AppShell role="admin">
      <div className="space-y-8">
        <PageHeader
          title="Administration"
          description="Assign mentors and adjust leave balances. Changes apply immediately for the demo."
        />

        {hasRealApi ? (
          <Card className="border-[var(--color-border)]">
            <CardHeader>
              <CardTitle>Assign mentor (live)</CardTitle>
              <CardDescription>
                Select a student and teacher, then assign. Requires admin API access.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <MentorAssignForm
                students={apiDirectory?.students ?? []}
                teachers={apiDirectory?.teachers ?? []}
                onAssign={handleMentorChange}
                disabled={assignBusy || !apiDirectory}
              />
              {apiError ? <p className="text-sm text-red-600">{apiError}</p> : null}
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Directory overview</CardTitle>
              <CardDescription>Students and faculty records (sample data).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-[var(--color-text-muted)]">
              <p>
                <span className="font-medium text-[var(--color-text)]">{rows.length}</span> students
              </p>
              <p>
                <span className="font-medium text-[var(--color-text)]">{teacherOptions.length}</span>{' '}
                mentors
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
          {loading || (hasRealApi && apiLoading) ? (
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
                          onChange={(e) => void handleMentorChange(student.id, e.target.value)}
                          disabled={assignBusy}
                          aria-label={`Mentor for ${student.name}`}
                        >
                          <option value="">— Select mentor —</option>
                          {teacherOptions.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </Select>
                      </Td>
                      <Td className="hidden lg:table-cell">
                        <BalanceInput
                          value={bal.sick}
                          disabled={hasRealApi}
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
                          disabled={hasRealApi}
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
                          disabled={hasRealApi}
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
 * @param {{ value: number; onCommit: (n: number) => void; disabled?: boolean }} props
 */
function BalanceInput({ value, onCommit, disabled }) {
  const [local, setLocal] = useState(String(value))
  const [focused, setFocused] = useState(false)
  useEffect(() => {
    if (!focused) setLocal(String(value))
  }, [value, focused])
  return (
    <Input
      type="number"
      min={0}
      value={local}
      disabled={disabled}
      onChange={(e) => setLocal(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        if (disabled) return
        setFocused(false)
        const n = Math.max(0, Number.parseInt(local, 10) || 0)
        setLocal(String(n))
        onCommit(n)
      }}
      className="h-9 max-w-[88px]"
    />
  )
}

/**
 * @param {{
 *   students: any[]
 *   teachers: any[]
 *   onAssign: (studentId: string, teacherId: string) => void | Promise<void>
 *   disabled?: boolean
 * }} props
 */
function MentorAssignForm({ students, teachers, onAssign, disabled }) {
  const [studentId, setStudentId] = useState('')
  const [teacherId, setTeacherId] = useState('')
  return (
    <>
      <div className="flex-1 min-w-[160px]">
        <label className="text-xs text-[var(--color-text-muted)] block mb-1">Student</label>
        <Select
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          disabled={disabled}
          aria-label="Student for mentor assignment"
        >
          <option value="">— Select student —</option>
          {students.map((s) => (
            <option key={s.id} value={String(s.id)}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex-1 min-w-[160px]">
        <label className="text-xs text-[var(--color-text-muted)] block mb-1">Teacher</label>
        <Select
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
          disabled={disabled}
          aria-label="Teacher mentor"
        >
          <option value="">— Select teacher —</option>
          {teachers.map((t) => (
            <option key={t.id} value={String(t.id)}>
              {t.name}
            </option>
          ))}
        </Select>
      </div>
      <Button
        type="button"
        variant="secondary"
        disabled={disabled || !studentId || !teacherId}
        onClick={() => void onAssign(studentId, teacherId)}
      >
        Assign
      </Button>
    </>
  )
}

/**
 * @param {{ label: string; value: number; onSave: (n: number) => void }} props
 */
function MiniBal({ label, value, onSave }) {
  const [local, setLocal] = useState(String(value))
  const [focused, setFocused] = useState(false)
  useEffect(() => {
    if (!focused) setLocal(String(value))
  }, [value, focused])
  return (
    <div>
      <label className="text-[10px] uppercase text-[var(--color-text-subtle)]">{label}</label>
      <Input
        type="number"
        min={0}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false)
          const n = Math.max(0, Number.parseInt(local, 10) || 0)
          setLocal(String(n))
          onSave(n)
        }}
        className="h-9"
      />
    </div>
  )
}
