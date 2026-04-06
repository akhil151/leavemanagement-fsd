import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const applyLeaveSchema = z.object({
  type: z.enum(['sick', 'casual', 'on_duty']),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be YYYY-MM-DD'),
  reason: z.string().trim().min(10, 'Reason must be at least 10 characters').max(4000),
  attachmentName: z.string().max(512).optional().nullable(),
})

export const leaveActionSchema = z.object({
  requestId: z.coerce.string().min(1),
  comment: z.string().max(2000).optional(),
})

export const teacherFilterSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'all']).optional(),
})

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['student', 'teacher', 'admin']),
  name: z.string().min(1).max(255),
  studentCode: z.string().max(64).optional().nullable(),
  department: z.string().max(255).optional().nullable(),
  parentEmail: z.string().email().optional().nullable(),
  mentorId: z.string().optional().nullable(),
})

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    department: z.string().trim().max(255).optional().nullable(),
    parentEmail: z.string().trim().toLowerCase().email().optional().nullable(),
  })
  .strict()

export const userIdParamSchema = z.object({
  id: z.coerce.string().min(1),
})

export const assignMentorSchema = z.object({
  studentId: z.coerce.string().min(1),
  teacherId: z.coerce.string().min(1),
})

export const updateBalancesSchema = z.object({
  sick: z.number().int().min(0).max(365).optional(),
  casual: z.number().int().min(0).max(365).optional(),
  onDuty: z.number().int().min(0).max(365).optional(),
})

export const adminUsersQuerySchema = z.object({
  role: z.enum(['student', 'teacher', 'admin']).optional(),
})

// -----------------------------------------------------------------------------
// Leave prediction (Phase 1)
// -----------------------------------------------------------------------------
const isoDate = /^\d{4}-\d{2}-\d{2}$/

export const leavePredictionParamsSchema = z.object({
  studentId: z.coerce.string().min(1),
})

export const leaveHistoryParamsSchema = z.object({
  leaveId: z.coerce.string().min(1),
})

export const leavePredictionQuerySchema = z
  .object({
    // Client passes DB-style values (on_duty, not onDuty).
    leave_type: z.enum(['sick', 'casual', 'on_duty']).optional(),
    number_of_days: z.coerce.number().int().positive().max(365).optional(),
    start_date: z.string().regex(isoDate).optional(),
    end_date: z.string().regex(isoDate).optional(),
  })
  .partial()

export const notificationsListQuerySchema = z.object({
  priority: z.enum(['info', 'warning', 'critical']).optional(),
  unreadOnly: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

export const notificationsReadSchema = z
  .object({
    ids: z.array(z.coerce.string().min(1)).optional(),
    markAll: z.boolean().optional(),
  })
  .refine((x) => x.markAll === true || (x.ids && x.ids.length > 0), {
    message: 'Provide markAll=true or at least one id',
  })
