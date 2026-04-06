import dotenv from 'dotenv'

dotenv.config()

function required(name, fallback = undefined) {
  const v = process.env[name]
  if (v === undefined || v === '') {
    if (fallback !== undefined) return fallback
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return v
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  db: {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 3306),
    user: required('DB_USER', 'root'),
    password: process.env.DB_PASSWORD ?? '',
    database: required('DB_NAME', 'leavemanage'),
    connectionLimit: Number(process.env.DB_POOL_SIZE ?? 10),
  },
  jwt: {
    secret: required('JWT_SECRET', 'dev-only-change-me-use-long-secret'),
    expiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  },
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  mail: {
    host: process.env.SMTP_HOST ?? '',
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.MAIL_FROM ?? 'Campus Leave <noreply@localhost>',
  },
}
