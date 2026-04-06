import nodemailer from 'nodemailer'
import { env } from '../config/env.js'

/** @type {import('nodemailer').Transporter | null} */
let transporter = null

function getTransporter() {
  if (!env.mail.host || !env.mail.user) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.mail.host,
      port: env.mail.port,
      secure: env.mail.secure,
      auth: { user: env.mail.user, pass: env.mail.pass },
    })
  }
  return transporter
}

/**
 * @param {{ to: string; subject: string; text: string; html?: string }} opts
 */
export async function sendMail(opts) {
  const t = getTransporter()
  if (!t) {
    return { skipped: true, reason: 'SMTP not configured' }
  }
  await t.sendMail({
    from: env.mail.from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html ?? opts.text.replace(/\n/g, '<br/>'),
  })
  return { skipped: false }
}
