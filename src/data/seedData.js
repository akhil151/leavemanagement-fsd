/** @typedef {'student' | 'teacher' | 'admin'} Role */
/** @typedef {'sick' | 'casual' | 'onDuty'} LeaveType */
/** @typedef {'pending' | 'approved' | 'rejected'} LeaveStatus */

/**
 * @typedef {Object} Person
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {string} [studentId]
 * @property {string} [department]
 */

/**
 * @typedef {Object} LeaveRequest
 * @property {string} id
 * @property {string} studentId
 * @property {string} studentName
 * @property {LeaveType} type
 * @property {string} start
 * @property {string} end
 * @property {string} reason
 * @property {LeaveStatus} status
 * @property {string} [mentorComment]
 * @property {string} submittedAt
 * @property {string} [resolvedAt]
 * @property {number} [businessDays]
 * @property {number} [deductDays]
 * @property {'none'|'am'|'pm'} [halfDay]
 * @property {'normal'|'urgent'} [priority]
 * @property {{ id: string; actionType: 'APPLY'|'APPROVE'|'REJECT'|'CANCEL'; performedBy?: string; performedByName?: string; timestamp: string }[]} [auditHistory]
 */

/**
 * @typedef {Object} Notification
 * @property {string} id
 * @property {string} recipientId
 * @property {string} [studentId] legacy mirror for student-targeted notifs
 * @property {string} title
 * @property {string} body
 * @property {'info'|'warning'|'critical'} [priority]
 * @property {string} [type]
 * @property {string} createdAt
 * @property {boolean} read
 */

/** @type {Person[]} */
export const students = [
  {
    id: 's1',
    name: 'Ananya Krishnan',
    email: 'ananya.krishnan@college.edu',
    studentId: 'CS24-1042',
    department: 'Computer Science',
  },
  {
    id: 's2',
    name: 'Rahul Mehta',
    email: 'rahul.mehta@college.edu',
    studentId: 'ME23-0891',
    department: 'Mechanical',
  },
  {
    id: 's3',
    name: 'Priya Sharma',
    email: 'priya.sharma@college.edu',
    studentId: 'EE24-0510',
    department: 'Electrical',
  },
]

/** @type {Person[]} */
export const teachers = [
  {
    id: 't1',
    name: 'Dr. Kavitha Nair',
    email: 'kavitha.nair@college.edu',
    department: 'Computer Science',
  },
  {
    id: 't2',
    name: 'Prof. Daniel Joseph',
    email: 'daniel.joseph@college.edu',
    department: 'Mechanical',
  },
]

/** Student id -> mentor (teacher) id */
export const initialMentorMap = {
  s1: 't1',
  s2: 't2',
  s3: 't1',
}

/** Student id -> balances */
export const initialBalances = {
  s1: { sick: 8, casual: 6, onDuty: 4 },
  s2: { sick: 10, casual: 5, onDuty: 3 },
  s3: { sick: 7, casual: 7, onDuty: 5 },
}

/** @type {string[]} ISO holidays (institutional) */
export const initialHolidays = [
  '2026-01-26',
  '2026-03-25',
  '2026-03-29',
  '2026-08-15',
  '2026-10-02',
]

/** @type {LeaveRequest[]} */
export const initialRequests = [
  {
    id: 'lr1',
    studentId: 's1',
    studentName: 'Ananya Krishnan',
    type: 'casual',
    start: '2026-03-18',
    end: '2026-03-19',
    reason: 'Family function out of town; informed course faculty in advance.',
    status: 'approved',
    mentorComment: 'Approved. Submit assignment summary on return.',
    submittedAt: '2026-03-10T09:00:00.000Z',
    resolvedAt: '2026-03-11T14:20:00.000Z',
    businessDays: 2,
    deductDays: 2,
    halfDay: 'none',
    priority: 'normal',
  },
  {
    id: 'lr2',
    studentId: 's1',
    studentName: 'Ananya Krishnan',
    type: 'sick',
    start: '2026-04-02',
    end: '2026-04-02',
    reason: 'Fever and flu symptoms; resting at home.',
    status: 'pending',
    submittedAt: '2026-04-02T07:15:00.000Z',
    businessDays: 1,
    deductDays: 1,
    halfDay: 'none',
    priority: 'normal',
  },
  {
    id: 'lr3',
    studentId: 's2',
    studentName: 'Rahul Mehta',
    type: 'onDuty',
    start: '2026-04-05',
    end: '2026-04-06',
    reason: 'Inter-college robotics competition — representing the department.',
    status: 'pending',
    submittedAt: '2026-04-01T11:00:00.000Z',
    businessDays: 2,
    deductDays: 2,
    halfDay: 'none',
    priority: 'urgent',
  },
  {
    id: 'lr4',
    studentId: 's3',
    studentName: 'Priya Sharma',
    type: 'casual',
    start: '2026-03-28',
    end: '2026-03-28',
    reason: 'Medical appointment in the morning.',
    status: 'rejected',
    mentorComment: 'Please reschedule; lab assessment scheduled same day.',
    submittedAt: '2026-03-22T08:30:00.000Z',
    resolvedAt: '2026-03-23T09:00:00.000Z',
    businessDays: 1,
    deductDays: 1,
    halfDay: 'none',
    priority: 'normal',
  },
]

/** @type {Notification[]} */
export const initialNotifications = [
  {
    id: 'n1',
    recipientId: 's1',
    studentId: 's1',
    title: 'Leave approved',
    body: 'Your casual leave (Mar 18–19) was approved by Dr. Kavitha Nair.',
    priority: 'info',
    type: 'leave_updated',
    createdAt: '2026-03-11T14:21:00.000Z',
    read: true,
  },
  {
    id: 'n2',
    recipientId: 's1',
    studentId: 's1',
    title: 'Action required',
    body: 'Your sick leave request is awaiting mentor review.',
    priority: 'warning',
    type: 'leave_pending',
    createdAt: '2026-04-02T07:20:00.000Z',
    read: false,
  },
  {
    id: 'n3',
    recipientId: 't1',
    title: 'New leave request',
    body: 'Rahul Mehta submitted an on-duty leave (pending).',
    priority: 'info',
    type: 'leave_applied',
    createdAt: '2026-04-01T11:05:00.000Z',
    read: false,
  },
]
