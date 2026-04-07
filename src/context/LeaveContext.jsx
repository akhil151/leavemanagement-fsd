import { createContext, useCallback, useContext, useMemo, useReducer } from 'react'
import {
  initialBalances,
  initialHolidays,
  initialMentorMap,
  initialNotifications,
  initialRequests,
  students,
  teachers,
} from '../data/seedData'

function daysInclusive(start, end) {
  const s = new Date(start + 'T12:00:00')
  const e = new Date(end + 'T12:00:00')
  return Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1
}

function initialState() {
  return {
    requests: structuredClone(initialRequests),
    balances: structuredClone(initialBalances),
    mentorMap: { ...initialMentorMap },
    notifications: structuredClone(initialNotifications),
    students: structuredClone(students),
    teachers: structuredClone(teachers),
    holidays: [...initialHolidays],
  }
}

function actorNameFromState(state, actorId, fallback) {
  if (!actorId) return fallback ?? 'System'
  const student = state.students.find((s) => s.id === actorId)
  if (student) return student.name
  const teacher = state.teachers.find((t) => t.id === actorId)
  if (teacher) return teacher.name
  return fallback ?? actorId
}

/**
 * @param {import('../data/seedData').LeaveRequest} req
 * @param {number} deduct
 */
function applyBalanceDeduction(balances, req, deduct) {
  const key =
    req.type === 'sick' ? 'sick' : req.type === 'casual' ? 'casual' : 'onDuty'
  const cur = balances[req.studentId]
  if (!cur) return balances
  const nb = Math.max(0, (cur[key] ?? 0) - deduct)
  return {
    ...balances,
    [req.studentId]: { ...cur, [key]: nb },
  }
}

// Use a separator that cannot appear in user-supplied text to avoid fingerprint collisions
const FP_SEP = '\x00'

function reducer(state, action) {
  switch (action.type) {
    case 'APPLY_LEAVE': {
      const {
        studentId,
        studentName,
        leaveType,
        start,
        end,
        reason,
        fileName,
        businessDays,
        deductDays,
        halfDay,
        priority,
      } = action.payload
      const id = `lr_${Date.now()}`
      const submittedAt = new Date().toISOString()
      const req = {
        id,
        studentId,
        studentName,
        type: leaveType,
        start,
        end,
        reason,
        status: /** @type {const} */ ('pending'),
        submittedAt,
        attachmentName: fileName || undefined,
        businessDays,
        deductDays,
        halfDay: halfDay ?? 'none',
        priority: priority ?? 'normal',
        auditHistory: [
          {
            id: `ah_${Date.now()}_apply`,
            actionType: 'APPLY',
            performedBy: studentId,
            performedByName: studentName,
            timestamp: submittedAt,
          },
        ],
      }
      const mentorId = state.mentorMap[studentId]
      const notifs = [...state.notifications]
      if (mentorId) {
        notifs.unshift({
          id: `n_${Date.now()}_m`,
          recipientId: mentorId,
          title: 'New leave request',
          body: `${studentName} submitted ${leaveType} leave (${start}${start !== end ? ` \u2013 ${end}` : ''}).`,
          priority: priority === 'urgent' ? 'critical' : 'info',
          type: 'leave_applied',
          createdAt: submittedAt,
          read: false,
        })
      }
      return { ...state, requests: [req, ...state.requests], notifications: notifs }
    }
    case 'RESOLVE_REQUEST': {
      return resolveOne(state, action.payload)
    }
    case 'BULK_RESOLVE_REQUESTS': {
      const { requestIds, status, mentorComment, teacherId } = action.payload
      let next = state
      for (const requestId of requestIds) {
        next = resolveOne(next, { requestId, status, mentorComment, teacherId })
      }
      return next
    }
    case 'SET_MENTOR': {
      const { studentId, teacherId } = action.payload
      return {
        ...state,
        mentorMap: { ...state.mentorMap, [studentId]: teacherId },
      }
    }
    case 'ADJUST_BALANCE': {
      const { studentId, sick, casual, onDuty } = action.payload
      const cur = state.balances[studentId]
      if (!cur) return state
      return {
        ...state,
        balances: {
          ...state.balances,
          [studentId]: {
            sick: sick ?? cur.sick,
            casual: casual ?? cur.casual,
            onDuty: onDuty ?? cur.onDuty,
          },
        },
      }
    }
    case 'SET_HOLIDAYS': {
      return { ...state, holidays: [...action.payload] }
    }
    case 'ADD_HOLIDAY': {
      const iso = action.payload
      if (state.holidays.includes(iso)) return state
      return { ...state, holidays: [...state.holidays, iso].sort() }
    }
    case 'REMOVE_HOLIDAY': {
      return {
        ...state,
        holidays: state.holidays.filter((h) => h !== action.payload),
      }
    }
    case 'MARK_NOTIFICATION_READ': {
      const { id, recipientId, studentId, read: readValue } = action.payload
      const rid = recipientId ?? studentId
      // readValue defaults to true; passing false allows rollback
      const nextRead = readValue !== false
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === id && (n.recipientId === rid || (!n.recipientId && n.studentId === rid))
            ? { ...n, read: nextRead }
            : n,
        ),
      }
    }
    case 'MARK_ALL_NOTIFICATIONS_READ': {
      const { recipientId, studentId } = action.payload
      const rid = recipientId ?? studentId
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.recipientId === rid || (!n.recipientId && n.studentId === rid) ? { ...n, read: true } : n,
        ),
      }
    }
    case 'INGEST_REALTIME_NOTIFICATION': {
      // De-dupe to prevent duplicate entries from socket + polling fallback.
      // Use null-byte separator to avoid collisions with pipe chars in content.
      const incoming = action.payload
      const incomingId = incoming?.id != null ? String(incoming.id) : null
      const incomingFP = `${incoming?.title ?? ''}${FP_SEP}${incoming?.body ?? ''}${FP_SEP}${incoming?.createdAt ?? ''}`
      const exists = state.notifications.some((n) => {
        if (incomingId != null && String(n.id) === incomingId) return true
        const fp = `${n.title ?? ''}${FP_SEP}${n.body ?? ''}${FP_SEP}${n.createdAt ?? ''}`
        return fp === incomingFP
      })
      if (exists) return state
      return { ...state, notifications: [incoming, ...state.notifications] }
    }
    default:
      return state
  }
}

/**
 * @param {typeof initialState & {}} state
 * @param {{ requestId: string; status: 'approved'|'rejected'; mentorComment?: string; teacherId: string }} input
 */
function resolveOne(state, input) {
  const { requestId, status, mentorComment, teacherId } = input
  const req = state.requests.find((r) => r.id === requestId)
  if (!req) return state

  const resolvedAt = new Date().toISOString()
  const actionType = status === 'approved' ? 'APPROVE' : 'REJECT'
  const performedByName = actorNameFromState(state, teacherId, 'Mentor')
  const nextRequests = state.requests.map((r) =>
    r.id === requestId
      ? {
          ...r,
          status,
          mentorComment: mentorComment || undefined,
          resolvedAt,
          resolvedBy: teacherId,
          auditHistory: [
            ...(r.auditHistory ?? []),
            {
              id: `ah_${Date.now()}_${actionType.toLowerCase()}`,
              actionType,
              performedBy: teacherId,
              performedByName,
              timestamp: resolvedAt,
            },
          ],
        }
      : r,
  )

  let nextBalances = state.balances
  if (status === 'approved') {
    const deduct = req.deductDays ?? daysInclusive(req.start, req.end)
    nextBalances = applyBalanceDeduction(state.balances, req, deduct)
  }

  const notif = {
    id: `n_${Date.now()}`,
    recipientId: req.studentId,
    studentId: req.studentId,
    title: status === 'approved' ? 'Leave approved' : 'Leave rejected',
    body:
      status === 'approved'
        ? `Your ${req.type} leave (${req.start}${req.start !== req.end ? ` \u2013 ${req.end}` : ''}) was approved.`
        : `Your ${req.type} leave was rejected.${mentorComment ? ` Comment: ${mentorComment}` : ''}`,
    priority: status === 'approved' ? 'info' : 'warning',
    type: 'leave_updated',
    createdAt: resolvedAt,
    read: false,
  }

  return {
    ...state,
    requests: nextRequests,
    balances: nextBalances,
    notifications: [notif, ...state.notifications],
  }
}

const LeaveContext = createContext(null)

/**
 * @param {{ children: React.ReactNode }} props
 */
export function LeaveProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)

  const applyLeave = useCallback((payload) => {
    dispatch({ type: 'APPLY_LEAVE', payload })
  }, [])

  const resolveRequest = useCallback((payload) => {
    dispatch({ type: 'RESOLVE_REQUEST', payload })
  }, [])

  const bulkResolveRequests = useCallback((payload) => {
    dispatch({ type: 'BULK_RESOLVE_REQUESTS', payload })
  }, [])

  const setMentor = useCallback((payload) => {
    dispatch({ type: 'SET_MENTOR', payload })
  }, [])

  const adjustBalance = useCallback((payload) => {
    dispatch({ type: 'ADJUST_BALANCE', payload })
  }, [])

  const markNotificationRead = useCallback((payload) => {
    dispatch({ type: 'MARK_NOTIFICATION_READ', payload })
  }, [])

  const markAllNotificationsRead = useCallback((payload) => {
    dispatch({ type: 'MARK_ALL_NOTIFICATIONS_READ', payload })
  }, [])

  const setHolidays = useCallback((list) => {
    dispatch({ type: 'SET_HOLIDAYS', payload: list })
  }, [])

  const addHoliday = useCallback((iso) => {
    dispatch({ type: 'ADD_HOLIDAY', payload: iso })
  }, [])

  const removeHoliday = useCallback((iso) => {
    dispatch({ type: 'REMOVE_HOLIDAY', payload: iso })
  }, [])

  const ingestRealtimeNotification = useCallback((payload) => {
    dispatch({ type: 'INGEST_REALTIME_NOTIFICATION', payload })
  }, [])

  const value = useMemo(
    () => ({
      ...state,
      applyLeave,
      resolveRequest,
      bulkResolveRequests,
      setMentor,
      adjustBalance,
      markNotificationRead,
      markAllNotificationsRead,
      setHolidays,
      addHoliday,
      removeHoliday,
      ingestRealtimeNotification,
    }),
    [
      state,
      applyLeave,
      resolveRequest,
      bulkResolveRequests,
      setMentor,
      adjustBalance,
      markNotificationRead,
      markAllNotificationsRead,
      setHolidays,
      addHoliday,
      removeHoliday,
      ingestRealtimeNotification,
    ],
  )

  return <LeaveContext.Provider value={value}>{children}</LeaveContext.Provider>
}

export function useLeave() {
  const ctx = useContext(LeaveContext)
  if (!ctx) throw new Error('useLeave must be used within LeaveProvider')
  return ctx
}
