import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useLeave } from '../../context/LeaveContext'
import { AppShell } from '../../components/layout/AppShell'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { ErrorBanner } from '../../components/feedback/ErrorBanner'
import { Badge } from '../../components/ui/Badge'
import { LeaveDatePicker } from '../../components/leave/LeaveDatePicker'
import { rangeToIso } from '../../utils/date'
import {
  computeDeductUnits,
  countBusinessDaysInclusive,
  suggestLeaveWindows,
  suggestExtendedBreaks,
  countCalendarDaysInclusive,
} from '../../services/leaveCalendar'
import {
  analyzeLeavePatterns,
  computeLeaveRiskScore,
  estimateApprovalProbability,
} from '../../services/leaveIntelligence'
import { getLeavePrediction } from '../../services/leavePredictionApi'
import { sickLeaveNeedsProof, validateApplyLeave } from '../../utils/validators'
import { leaveTypeLabel } from '../../utils/leaveLabels'

export function ApplyLeavePage() {
  const { user } = useAuth()
  const { applyLeave, requests, balances, holidays } = useLeave()
  const navigate = useNavigate()

  const [range, setRange] = useState(/** @type {import('react-day-picker').DateRange | undefined} */ (undefined))
  const { start, end } = useMemo(() => rangeToIso(range), [range])

  const [type, setType] = useState(/** @type {'sick' | 'casual' | 'onDuty'} */ ('casual'))
  const [halfDay, setHalfDay] = useState(/** @type {'none' | 'am' | 'pm'} */ ('none'))
  const [priority, setPriority] = useState(/** @type {'normal' | 'urgent'} */ ('normal'))
  const [reason, setReason] = useState('')
  const [file, setFile] = useState(/** @type {File | null} */ (null))
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(/** @type {string | null} */ (null))

  const [touched, setTouched] = useState(false)
  const [live, setLive] = useState(false)

  const [modelPrediction, setModelPrediction] = useState(null)
  const [modelLoading, setModelLoading] = useState(false)
  const [predictionError, setPredictionError] = useState(false)
  const [predictionRefreshKey, setPredictionRefreshKey] = useState(0)

  const studentId = user?.id
  const balance = studentId ? balances[studentId] : null

  const myRequests = useMemo(
    () => requests.filter((r) => r.studentId === studentId),
    [requests, studentId],
  )

  const blockedRanges = useMemo(() => {
    return myRequests
      .filter((r) => r.status === 'pending' || r.status === 'approved')
      .map((r) => ({ start: r.start, end: r.end }))
  }, [myRequests])

  const businessDays = useMemo(
    () => countBusinessDaysInclusive(start, end, holidays),
    [start, end, holidays],
  )

  const calendarDays = useMemo(() => {
    if (!start || !end) return null
    return countCalendarDaysInclusive(start, end)
  }, [start, end])

  const effectiveHalf = start && end && start === end ? halfDay : 'none'

  const deductUnits = useMemo(
    () => computeDeductUnits(businessDays, effectiveHalf, start, end),
    [businessDays, effectiveHalf, start, end],
  )

  const requireProof = useMemo(() => {
    return type === 'sick' && sickLeaveNeedsProof(start, end)
  }, [type, start, end])

  const leaveTypeForApi = type === 'onDuty' ? 'on_duty' : type

  useEffect(() => {
    const apiBaseUrl = import.meta.env.VITE_API_URL
    if (!apiBaseUrl) return
    if (!user || user.role !== 'student') return
    if (!studentId || !start || !end || !calendarDays) return

    let cancelled = false
    const handle = setTimeout(async () => {
      setModelLoading(true)
      try {
        setPredictionError(false)
        const data = await getLeavePrediction({
          studentId,
          leaveType: leaveTypeForApi,
          startDate: start,
          endDate: end,
          numberOfDays: calendarDays,
        })
        if (!cancelled) setModelPrediction(data)
      } catch {
        if (!cancelled) {
          setModelPrediction(null)
          setPredictionError(true)
        }
      } finally {
        if (!cancelled) setModelLoading(false)
      }
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [user, studentId, start, end, calendarDays, leaveTypeForApi, predictionRefreshKey])

  const fieldErrors = useMemo(() => {
    const base = validateApplyLeave(
      { start, end, type, reason, file },
      requireProof,
    )
    if (start && end && studentId) {
      const overlap = myRequests.some(
        (r) =>
          (r.status === 'pending' || r.status === 'approved') &&
          start <= r.end &&
          end >= r.start,
      )
      if (overlap) base.range = 'Selected dates overlap an existing leave request'
    }
    if (balance && type) {
      const key = type === 'sick' ? 'sick' : type === 'casual' ? 'casual' : 'onDuty'
      const avail = balance[key] ?? 0
      if (deductUnits > avail) {
        base.balance = `Insufficient ${leaveTypeLabel(type)} balance (${avail} day(s) available)`
      }
    }
    return base
  }, [start, end, type, reason, file, requireProof, myRequests, balance, deductUnits, studentId])

  const patterns = useMemo(() => analyzeLeavePatterns(myRequests), [myRequests])
  const risk = useMemo(
    () => (balance ? computeLeaveRiskScore(myRequests, balance) : 0),
    [myRequests, balance],
  )
  const approval = useMemo(
    () => estimateApprovalProbability(requests, type),
    [requests, type],
  )

  const approvalProbability = modelPrediction?.approvalProbability ?? approval.probability
  const riskLevel =
    modelPrediction?.riskLevel ??
    (risk >= 70 ? 'High' : risk >= 40 ? 'Medium' : 'Low')
  const riskBadgeVariant = riskLevel === 'High' ? 'danger' : riskLevel === 'Medium' ? 'warning' : 'success'

  const suggestions = useMemo(() => {
    if (!start) return []
    return suggestLeaveWindows(start, Math.max(1, businessDays || 1), holidays, 2)
  }, [start, businessDays, holidays])
  const recommendedPlans = useMemo(() => {
    if (!start) return []
    return suggestExtendedBreaks(start, Math.max(1, businessDays || 1), holidays)
  }, [start, businessDays, holidays])

  const showErr = (key) => {
    if (!touched && !live) return null
    return fieldErrors[key] ?? null
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setTouched(true)
    if (Object.keys(fieldErrors).length) {
      setFormError('Please fix the highlighted fields.')
      return
    }
    if (!user || user.role !== 'student') return

    setFormError(null)
    setSubmitting(true)
    await new Promise((r) => setTimeout(r, 400))

    applyLeave({
      studentId: user.id,
      studentName: user.name,
      leaveType: type,
      start,
      end,
      reason: reason.trim(),
      fileName: file?.name ?? null,
      businessDays,
      deductDays: deductUnits,
      halfDay: effectiveHalf,
      priority,
    })

    setSubmitting(false)
    navigate('/student', { replace: true })
  }

  if (!user || user.role !== 'student') return null

  return (
    <AppShell role="student">
      <div className="space-y-8 max-w-6xl">
        <PageHeader
          title="Apply for leave"
          description="Select dates on the calendar, review business-day counts, and submit to your mentor."
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-5 sm:p-6">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-[var(--color-text)] dark:text-white">
                Date Range
              </CardTitle>
              <CardDescription>
                Weekends and holidays are disabled. Overlapping active leave is blocked.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LeaveDatePicker
                range={range}
                onSelect={(r) => {
                  setRange(r)
                  setLive(true)
                }}
                holidays={holidays}
                blockedRanges={blockedRanges}
                suggestedDates={recommendedPlans}
              />
              {showErr('range') ? (
                <p className="text-sm text-red-600 mt-2" role="alert">
                  {showErr('range')}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <div className="space-y-6 lg:col-span-1">
            <Card className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-5 sm:p-6">
              <CardHeader className="!mb-2">
                <CardTitle className="text-lg font-semibold text-[var(--color-text)] dark:text-white">
                  Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Business days</span>
                  <span className="text-base font-semibold tabular-nums text-[var(--color-text)] dark:text-white">
                    {start && end ? businessDays : '—'}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Deduct from balance</span>
                  <span className="text-base font-semibold tabular-nums text-[var(--color-text)] dark:text-white">
                    {start && end ? deductUnits : '—'}
                  </span>
                </div>
                {balance ? (
                  <div className="pt-3 border-t border-[var(--color-border)] space-y-3">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Remaining after approval (estimate)</p>
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Sick</span>
                      <span className="text-base font-semibold tabular-nums text-[var(--color-text)] dark:text-white">
                        {Math.max(0, (balance.sick ?? 0) - (type === 'sick' ? deductUnits : 0)).toFixed(
                          deductUnits % 1 !== 0 ? 1 : 0,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Casual</span>
                      <span className="text-base font-semibold tabular-nums text-[var(--color-text)] dark:text-white">
                        {Math.max(0, (balance.casual ?? 0) - (type === 'casual' ? deductUnits : 0)).toFixed(
                          deductUnits % 1 !== 0 ? 1 : 0,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-sm text-gray-500 dark:text-gray-400">On Duty</span>
                      <span className="text-base font-semibold tabular-nums text-[var(--color-text)] dark:text-white">
                        {Math.max(0, (balance.onDuty ?? 0) - (type === 'onDuty' ? deductUnits : 0)).toFixed(
                          deductUnits % 1 !== 0 ? 1 : 0,
                        )}
                      </span>
                    </div>
                  </div>
                ) : null}
                {showErr('balance') ? (
                  <p className="text-sm text-red-600" role="alert">
                    {showErr('balance')}
                  </p>
                ) : null}
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-5 sm:p-6">
              <CardHeader className="!mb-2">
                <CardTitle className="text-lg font-semibold text-[var(--color-text)] dark:text-white">
                  Insights
                </CardTitle>
                <CardDescription className="text-sm text-gray-500 dark:text-gray-400">
                  Statistical model signals (fallback to heuristics when API is unavailable).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Approval Probability</span>
                  <span className="text-base font-semibold text-blue-500 dark:text-blue-400">
                    {Math.round(approvalProbability * 100)}%
                    {modelLoading ? (
                      <span className="text-gray-500 dark:text-gray-400 text-xs ml-1">(estimating...)</span>
                    ) : null}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Risk Level</span>
                  <Badge
                    variant={riskBadgeVariant}
                    className={
                      riskLevel === 'High'
                        ? 'dark:bg-red-900/40 dark:text-red-200'
                        : riskLevel === 'Medium'
                          ? 'dark:bg-yellow-900/40 dark:text-yellow-200'
                          : 'dark:bg-emerald-900/40 dark:text-emerald-200'
                    }
                  >
                    {riskLevel}
                  </Badge>
                </div>
                {predictionError ? (
                  <div className="flex items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-900/20 px-3 py-2">
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      Prediction API failed, using local heuristic.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setPredictionRefreshKey((x) => x + 1)}
                    >
                      Retry
                    </Button>
                  </div>
                ) : null}
                {patterns.flag ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 border-l-2 border-amber-400 pl-2">
                    {patterns.flag.message}
                  </p>
                ) : null}
                {suggestions.length > 0 ? (
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text)] dark:text-white mb-1">
                      Suggested windows
                    </p>
                    <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                      {suggestions.map((s) => (
                        <li key={s.start + s.end}>
                          {s.start} → {s.end}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {recommendedPlans.length > 0 ? (
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text)] dark:text-white mb-1">
                      Recommended Leave Plan
                    </p>
                    <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                      {recommendedPlans.map((p) => (
                        <li key={`${p.start}_${p.end}`}>
                          {p.start} → {p.end} ({p.leaveDays} leave day(s), {p.totalBreakDays} total break)
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-5 sm:p-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[var(--color-text)] dark:text-white">
              Details
            </CardTitle>
            <CardDescription>Leave type, half-day option, and supporting documents.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-5" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  name="type"
                  label="Leave type"
                  value={type}
                  onChange={(e) => {
                    setType(/** @type {typeof type} */ (e.target.value))
                    setLive(true)
                  }}
                  onBlur={() => setTouched(true)}
                  error={showErr('type')}
                >
                  <option value="casual">Casual</option>
                  <option value="sick">Sick</option>
                  <option value="onDuty">On duty</option>
                </Select>

                <Select
                  name="halfDay"
                  label="Half day (single day only)"
                  value={halfDay}
                  onChange={(e) => {
                    setHalfDay(/** @type {typeof halfDay} */ (e.target.value))
                    setLive(true)
                  }}
                  onBlur={() => setTouched(true)}
                  hint={start !== end ? 'Available when start and end are the same date' : undefined}
                  disabled={!start || !end || start !== end}
                >
                  <option value="none">Full day(s)</option>
                  <option value="am">Morning</option>
                  <option value="pm">Afternoon</option>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  name="priority"
                  label="Priority"
                  value={priority}
                  onChange={(e) => {
                    setPriority(/** @type {typeof priority} */ (e.target.value))
                    setLive(true)
                  }}
                >
                  <option value="normal">Standard</option>
                  <option value="urgent">Urgent</option>
                </Select>
                {priority === 'urgent' ? (
                  <div className="flex items-end">
                    <Badge variant="danger">Mentor will see urgent flag</Badge>
                  </div>
                ) : null}
              </div>

              <Textarea
                name="reason"
                label="Reason"
                placeholder="Describe the purpose and any classes or labs affected."
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value)
                  setLive(true)
                }}
                onBlur={() => setTouched(true)}
                error={showErr('reason')}
                hint="Minimum 10 characters."
              />

              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">
                  Supporting document (medical proof / certificate)
                </label>
                <label className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors">
                  <input
                    type="file"
                    className="sr-only"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      setFile(e.target.files?.[0] ?? null)
                      setTouched(true)
                      setLive(true)
                    }}
                  />
                  <div className="text-sm text-[var(--color-text)]">
                    {file ? (
                      <span className="font-medium">{file.name}</span>
                    ) : (
                      <span className="text-[var(--color-text-muted)]">
                        PDF or image — {requireProof ? 'required for this sick leave' : 'optional'}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[var(--color-accent)] font-medium sm:ml-auto">Browse</span>
                </label>
                {showErr('file') ? (
                  <p className="text-xs text-red-600 mt-1" role="alert">
                    {showErr('file')}
                  </p>
                ) : null}
              </div>

              {formError ? <ErrorBanner message={formError} onDismiss={() => setFormError(null)} /> : null}

              <div className="flex flex-wrap gap-2 pt-2">
                <Button type="submit" variant="accent" loading={submitting} disabled={submitting}>
                  Submit request
                </Button>
                <Button type="button" variant="secondary" onClick={() => navigate(-1)} disabled={submitting}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
