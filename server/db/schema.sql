-- Campus Leave Management — MySQL 8+
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS notification_log;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS leave_requests;
DROP TABLE IF EXISTS leave_balances;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('student', 'teacher', 'admin') NOT NULL,
  name VARCHAR(255) NOT NULL,
  student_code VARCHAR(64) NULL,
  department VARCHAR(255) NULL,
  parent_email VARCHAR(255) NULL,
  mentor_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role),
  KEY idx_users_mentor (mentor_id),
  CONSTRAINT fk_users_mentor FOREIGN KEY (mentor_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE leave_balances (
  user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  sick INT UNSIGNED NOT NULL DEFAULT 0,
  casual INT UNSIGNED NOT NULL DEFAULT 0,
  on_duty INT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT fk_balances_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE leave_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  student_id BIGINT UNSIGNED NOT NULL,
  mentor_id BIGINT UNSIGNED NULL,
  type ENUM('sick', 'casual', 'on_duty') NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  mentor_comment TEXT NULL,
  attachment_name VARCHAR(512) NULL,
  submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  resolved_by BIGINT UNSIGNED NULL,
  KEY idx_lr_student (student_id),
  KEY idx_lr_mentor (mentor_id),
  KEY idx_lr_status (status),
  KEY idx_lr_dates (student_id, start_date, end_date),
  CONSTRAINT fk_lr_student FOREIGN KEY (student_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_lr_mentor FOREIGN KEY (mentor_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_lr_resolved_by FOREIGN KEY (resolved_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  action_type ENUM('APPLY', 'APPROVE', 'REJECT', 'CANCEL') NOT NULL,
  performed_by BIGINT UNSIGNED NOT NULL,
  target_leave_id BIGINT UNSIGNED NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_leave_time (target_leave_id, timestamp),
  KEY idx_audit_actor_time (performed_by, timestamp),
  CONSTRAINT fk_audit_actor FOREIGN KEY (performed_by) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_audit_leave FOREIGN KEY (target_leave_id) REFERENCES leave_requests (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  type VARCHAR(64) NOT NULL DEFAULT 'leave',
  priority ENUM('info', 'warning', 'critical') NOT NULL DEFAULT 'info',
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_notif_user (user_id, is_read),
  KEY idx_notif_priority (user_id, priority, created_at),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notification_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  leave_request_id BIGINT UNSIGNED NOT NULL,
  channel ENUM('email', 'in_app') NOT NULL,
  target VARCHAR(255) NOT NULL,
  status ENUM('sent', 'failed', 'skipped') NOT NULL,
  detail TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_nl_request (leave_request_id),
  CONSTRAINT fk_nl_request FOREIGN KEY (leave_request_id) REFERENCES leave_requests (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
