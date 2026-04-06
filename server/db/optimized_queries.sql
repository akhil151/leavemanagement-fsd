-- =============================================================================
-- Optimized query patterns — Student Leave Management (MySQL 8+)
-- Use prepared statements in application code; EXPLAIN ANALYZE in staging.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A) Login — single row by unique email (uses uq_users_email)
-- -----------------------------------------------------------------------------
-- SELECT id, name, email, password_hash, role FROM users WHERE email = ? LIMIT 1;

-- -----------------------------------------------------------------------------
-- B) Student leave overlap — block double-booking (pending + approved)
-- Params: :sid, :start, :end  (new request window)
-- Index used: idx_lr_dates (student_id, start_date, end_date) + filter on status
-- -----------------------------------------------------------------------------
SELECT lr.id
FROM leave_requests lr
WHERE lr.student_id = :sid
  AND lr.status IN ('pending', 'approved')
  AND lr.start_date <= :new_end
  AND lr.end_date >= :new_start
LIMIT 1;

-- -----------------------------------------------------------------------------
-- C) Mentor inbox — requests for mentees (by snapshot mentor_teacher_id)
-- Params: :tid, optional status filter
-- Index: idx_lr_mentor_pending (mentor_teacher_id, status, submitted_at)
-- -----------------------------------------------------------------------------
SELECT lr.id,
       lr.student_id,
       lr.leave_type_id,
       lr.start_date,
       lr.end_date,
       lr.reason,
       lr.status,
       lr.teacher_comment,
       lr.submitted_at
FROM leave_requests lr
WHERE lr.mentor_teacher_id = :tid
  AND lr.status = 'pending'
ORDER BY lr.submitted_at ASC;

-- -----------------------------------------------------------------------------
-- D) Unread notifications — user home / badge count
-- Index: idx_notif_user_unread (user_id, is_read, created_at)
-- -----------------------------------------------------------------------------
SELECT id, message, is_read, created_at
FROM notifications
WHERE user_id = :uid AND is_read = 0
ORDER BY created_at DESC
LIMIT 50;

-- -----------------------------------------------------------------------------
-- E) Leave balances for dashboard — join types for labels
-- PK (student_id, leave_type_id) makes this a tight lookup
-- -----------------------------------------------------------------------------
SELECT lt.code,
       lt.name,
       lb.total,
       lb.used,
       lb.remaining
FROM leave_balances lb
JOIN leave_types lt ON lt.id = lb.leave_type_id
WHERE lb.student_id = :sid
ORDER BY lt.id;

-- -----------------------------------------------------------------------------
-- F) Approve flow — transactional (pseudocode; run in one transaction)
-- 1) SELECT leave_requests WHERE id = ? FOR UPDATE;
-- 2) SELECT leave_balances WHERE student_id = ? AND leave_type_id = ? FOR UPDATE;
-- 3) Validate days_needed <= remaining (and policy max_allowed if enforced);
-- 4) UPDATE leave_balances SET used = used + :days WHERE ...;
-- 5) UPDATE leave_requests SET status='approved', resolved_by_teacher_id=?, resolved_at=NOW(3);
-- -----------------------------------------------------------------------------
-- Inclusive calendar days in app layer or:
-- SELECT DATEDIFF(:end, :start) + 1 AS inclusive_days;

-- -----------------------------------------------------------------------------
-- G) Scale-out notes (when rows grow into hundreds of millions)
-- - notifications: RANGE partitioning by YEAR(created_at) or monthly HASH
-- - leave_requests: partition by academic year if queries are year-scoped
-- - Archive cold leave_requests to history tables with batch jobs
-- -----------------------------------------------------------------------------
