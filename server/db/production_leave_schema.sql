-- =============================================================================
-- Student Leave Management — Production MySQL 8.0+ Schema
-- Charset: utf8mb4 (full Unicode). Engine: InnoDB (transactions + FK support).
-- =============================================================================
-- Relationships (high level):
--   users (1) ──< (0..1) students          [role = student]
--   users (1) ──< (0..1) teachers          [role = teacher]
--   users (1) ──< (0..1) admins            [role = admin — no extension row]
--   teachers (1) ──< (*) students         [mentor_id optional]
--   students (1) ──< (*) leave_balances   [per leave type]
--   leave_types (1) ──< (*) leave_balances
--   students (1) ──< (*) leave_requests
--   leave_types (1) ──< (*) leave_requests
--   users (1) ──< (*) notifications
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS leave_requests;
DROP TABLE IF EXISTS leave_balances;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS teachers;
DROP TABLE IF EXISTS leave_types;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- 1. Users — authentication identity for every person in the system
-- -----------------------------------------------------------------------------
CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL COMMENT 'bcrypt/argon2 hash, never store plaintext',
  role ENUM('student', 'teacher', 'admin') NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role_active (role, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Core identity; exactly one extension row (students/teachers) except admin';

-- Enforce lowercase emails at insert time (application should LOWER(email)); CHECK may not run on all MySQL builds for generated columns — optional app-side normalization.

-- -----------------------------------------------------------------------------
-- 2. Teachers — faculty profile (1:1 with users where role = teacher)
-- -----------------------------------------------------------------------------
CREATE TABLE teachers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  department VARCHAR(255) NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_teachers_user (user_id),
  KEY idx_teachers_dept (department),
  CONSTRAINT fk_teachers_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. Students — learner profile + mentor + parent contact
-- -----------------------------------------------------------------------------
CREATE TABLE students (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  department VARCHAR(255) NOT NULL,
  mentor_id BIGINT UNSIGNED NULL COMMENT 'FK teachers.id; NULL = not yet assigned',
  parent_email VARCHAR(255) NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_students_user (user_id),
  KEY idx_students_mentor (mentor_id),
  KEY idx_students_dept (department),
  CONSTRAINT fk_students_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_students_mentor FOREIGN KEY (mentor_id) REFERENCES teachers (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. Leave types — catalog (Sick, Casual, On duty); max_allowed = policy cap / year
-- -----------------------------------------------------------------------------
CREATE TABLE leave_types (
  id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(64) NOT NULL,
  code VARCHAR(32) NOT NULL COMMENT 'stable machine code: sick, casual, on_duty',
  max_allowed SMALLINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'institutional max per academic year (policy)',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_leave_types_code (code),
  UNIQUE KEY uq_leave_types_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. Leave balances — one row per (student, leave type); normalized buckets
-- -----------------------------------------------------------------------------
CREATE TABLE leave_balances (
  student_id BIGINT UNSIGNED NOT NULL,
  leave_type_id SMALLINT UNSIGNED NOT NULL,
  total SMALLINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Allocated for current policy window',
  used SMALLINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Consumed (approved leave days)',
  remaining SMALLINT GENERATED ALWAYS AS (CAST(total AS SIGNED) - CAST(used AS SIGNED)) STORED,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (student_id, leave_type_id),
  KEY idx_lb_type (leave_type_id),
  CONSTRAINT fk_lb_student FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE,
  CONSTRAINT fk_lb_type FOREIGN KEY (leave_type_id) REFERENCES leave_types (id) ON DELETE RESTRICT,
  CONSTRAINT chk_lb_nonneg CHECK (total >= used)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='remaining is STORED generated; keep total/used authoritative';

-- -----------------------------------------------------------------------------
-- 6. Leave requests — workflow; overlap detection uses status + date range
-- -----------------------------------------------------------------------------
CREATE TABLE leave_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id BIGINT UNSIGNED NOT NULL,
  leave_type_id SMALLINT UNSIGNED NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('pending', 'approved', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
  teacher_comment TEXT NULL,
  mentor_teacher_id BIGINT UNSIGNED NULL COMMENT 'Assigned mentor at submission (denormalized snapshot)',
  resolved_by_teacher_id BIGINT UNSIGNED NULL COMMENT 'Teacher who approved/rejected',
  submitted_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  resolved_at TIMESTAMP(3) NULL,
  attachment_uri VARCHAR(1024) NULL,
  PRIMARY KEY (id),
  KEY idx_lr_student_status (student_id, status, submitted_at),
  KEY idx_lr_mentor_pending (mentor_teacher_id, status, submitted_at),
  KEY idx_lr_type (leave_type_id),
  KEY idx_lr_dates (student_id, start_date, end_date),
  CONSTRAINT fk_lr_student FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE,
  CONSTRAINT fk_lr_type FOREIGN KEY (leave_type_id) REFERENCES leave_types (id) ON DELETE RESTRICT,
  CONSTRAINT fk_lr_mentor_snap FOREIGN KEY (mentor_teacher_id) REFERENCES teachers (id) ON DELETE SET NULL,
  CONSTRAINT fk_lr_resolved_by FOREIGN KEY (resolved_by_teacher_id) REFERENCES teachers (id) ON DELETE SET NULL,
  CONSTRAINT chk_lr_dates CHECK (end_date >= start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. Audit logs — immutable trail for leave actions
-- -----------------------------------------------------------------------------
CREATE TABLE audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  action_type ENUM('APPLY', 'APPROVE', 'REJECT', 'CANCEL') NOT NULL,
  performed_by BIGINT UNSIGNED NOT NULL,
  target_leave_id BIGINT UNSIGNED NOT NULL,
  timestamp TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_audit_leave_time (target_leave_id, timestamp),
  KEY idx_audit_actor_time (performed_by, timestamp),
  CONSTRAINT fk_audit_actor FOREIGN KEY (performed_by) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_audit_leave FOREIGN KEY (target_leave_id) REFERENCES leave_requests (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. Notifications — in-app inbox (partitioning candidate at very large scale)
-- -----------------------------------------------------------------------------
CREATE TABLE notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(64) NOT NULL DEFAULT 'leave',
  priority ENUM('info', 'warning', 'critical') NOT NULL DEFAULT 'info',
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_notif_user_unread (user_id, is_read, created_at),
  KEY idx_notif_priority (user_id, priority, created_at),
  KEY idx_notif_created (created_at),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- Seed reference data (leave types)
-- =============================================================================
INSERT INTO leave_types (name, code, max_allowed) VALUES
  ('Sick', 'sick', 15),
  ('Casual', 'casual', 12),
  ('On duty', 'on_duty', 10);
