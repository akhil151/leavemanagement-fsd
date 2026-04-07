const TABLE_DDLS = [
  `
  CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    email VARCHAR(191) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('student', 'teacher', 'admin') NOT NULL,
    name VARCHAR(120) NOT NULL,
    student_code VARCHAR(64) NULL,
    department VARCHAR(120) NULL,
    parent_email VARCHAR(191) NULL,
    mentor_id BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email),
    UNIQUE KEY uq_users_student_code (student_code),
    KEY idx_users_role (role),
    KEY idx_users_mentor (mentor_id),
    CONSTRAINT fk_users_mentor
      FOREIGN KEY (mentor_id) REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS teachers (
    user_id BIGINT UNSIGNED NOT NULL,
    department VARCHAR(120) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    CONSTRAINT fk_teachers_user
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS students (
    user_id BIGINT UNSIGNED NOT NULL,
    student_code VARCHAR(64) NULL,
    department VARCHAR(120) NULL,
    parent_email VARCHAR(191) NULL,
    mentor_id BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    UNIQUE KEY uq_students_student_code (student_code),
    KEY idx_students_mentor (mentor_id),
    CONSTRAINT fk_students_user
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_students_mentor
      FOREIGN KEY (mentor_id) REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS leave_balances (
    user_id BIGINT UNSIGNED NOT NULL,
    sick INT NOT NULL DEFAULT 10,
    casual INT NOT NULL DEFAULT 8,
    on_duty INT NOT NULL DEFAULT 5,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    CONSTRAINT fk_leave_balances_user
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_leave_balances_sick CHECK (sick >= 0),
    CONSTRAINT chk_leave_balances_casual CHECK (casual >= 0),
    CONSTRAINT chk_leave_balances_on_duty CHECK (on_duty >= 0)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS leave_requests (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    student_id BIGINT UNSIGNED NOT NULL,
    mentor_id BIGINT UNSIGNED NULL,
    type ENUM('sick', 'casual', 'on_duty') NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    mentor_comment TEXT NULL,
    attachment_name VARCHAR(255) NULL,
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL DEFAULT NULL,
    resolved_by BIGINT UNSIGNED NULL,
    PRIMARY KEY (id),
    KEY idx_leave_requests_student (student_id),
    KEY idx_leave_requests_mentor (mentor_id),
    KEY idx_leave_requests_status (status),
    KEY idx_leave_requests_dates (start_date, end_date),
    CONSTRAINT fk_leave_requests_student
      FOREIGN KEY (student_id) REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_leave_requests_mentor
      FOREIGN KEY (mentor_id) REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_leave_requests_resolved_by
      FOREIGN KEY (resolved_by) REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT chk_leave_requests_dates CHECK (end_date >= start_date)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    type VARCHAR(64) NULL DEFAULT 'leave',
    priority ENUM('info', 'warning', 'critical') NULL DEFAULT 'info',
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_notifications_user_created (user_id, created_at),
    KEY idx_notifications_user_read (user_id, is_read),
    CONSTRAINT fk_notifications_user
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    action_type ENUM('APPLY', 'APPROVE', 'REJECT', 'CANCEL') NOT NULL,
    performed_by BIGINT UNSIGNED NOT NULL,
    target_leave_id BIGINT UNSIGNED NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_audit_target_time (target_leave_id, timestamp),
    KEY idx_audit_performed_by (performed_by),
    CONSTRAINT fk_audit_logs_actor
      FOREIGN KEY (performed_by) REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_audit_logs_leave
      FOREIGN KEY (target_leave_id) REFERENCES leave_requests(id)
      ON UPDATE CASCADE ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS notification_log (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    leave_request_id BIGINT UNSIGNED NOT NULL,
    channel ENUM('email', 'in_app') NOT NULL,
    target VARCHAR(255) NOT NULL,
    status ENUM('sent', 'failed', 'skipped') NOT NULL,
    detail TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_notification_log_leave (leave_request_id),
    CONSTRAINT fk_notification_log_leave
      FOREIGN KEY (leave_request_id) REFERENCES leave_requests(id)
      ON UPDATE CASCADE ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
]

/**
 * @param {import('mysql2/promise').Pool} pool
 */
export async function ensureTables(pool) {
  for (const ddl of TABLE_DDLS) {
    await pool.query(ddl)
  }
}
