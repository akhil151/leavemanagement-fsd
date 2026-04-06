/**
 * Shared copy for mentor + parent emails (plain text + minimal HTML).
 * Keeps messaging consistent and testable without SMTP.
 */

/**
 * @param {{
 *   studentName: string
 *   leaveType: string
 *   startDate: string
 *   endDate: string
 *   reason: string
 *   audience: 'mentor' | 'parent'
 * }} p
 */
export function buildLeaveSubmittedEmail(p) {
  const greeting =
    p.audience === 'mentor'
      ? 'You have a new leave request from a mentee.'
      : 'A student has submitted a leave request.'

  const subject = `Leave request — ${p.studentName} (${p.startDate} to ${p.endDate})`

  const text = [
    greeting,
    '',
    `Student: ${p.studentName}`,
    `Type: ${p.leaveType}`,
    `Dates: ${p.startDate} → ${p.endDate}`,
    '',
    'Reason:',
    p.reason,
    '',
    '— Campus Leave Portal',
  ].join('\n')

  const html = `
  <div style="font-family:system-ui,Segoe UI,sans-serif;line-height:1.5;color:#111">
    <p>${p.audience === 'mentor' ? 'You have a new leave request from a mentee.' : 'A student has submitted a leave request.'}</p>
    <table style="border-collapse:collapse;margin-top:8px">
      <tr><td style="padding:4px 12px 4px 0;color:#555">Student</td><td><strong>${escapeHtml(p.studentName)}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#555">Type</td><td>${escapeHtml(p.leaveType)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#555">Dates</td><td>${escapeHtml(p.startDate)} → ${escapeHtml(p.endDate)}</td></tr>
    </table>
    <p style="margin-top:12px"><strong>Reason</strong></p>
    <p style="white-space:pre-wrap">${escapeHtml(p.reason)}</p>
    <p style="margin-top:16px;color:#888;font-size:12px">Campus Leave Portal</p>
  </div>`.trim()

  return { subject, text, html }
}

/**
 * @param {{ studentName: string; leaveType: string; startDate: string; endDate: string; reason: string; decision: 'approved'|'rejected'; comment?: string | null }} p
 */
export function buildLeaveDecisionEmail(p) {
  const action = p.decision === 'approved' ? 'approved' : 'rejected'
  const subject = `Leave ${action} — ${p.studentName} (${p.startDate} to ${p.endDate})`
  const text = [
    `Your leave request has been ${action}.`,
    '',
    `Student: ${p.studentName}`,
    `Type: ${p.leaveType}`,
    `Dates: ${p.startDate} → ${p.endDate}`,
    '',
    'Reason:',
    p.reason,
    '',
    p.comment ? `Mentor note: ${p.comment}` : '',
    '',
    '— Campus Leave Portal',
  ]
    .filter(Boolean)
    .join('\n')

  const html = `
  <div style="font-family:system-ui,Segoe UI,sans-serif;line-height:1.5;color:#111">
    <p>Your leave request has been <strong>${action}</strong>.</p>
    <table style="border-collapse:collapse;margin-top:8px">
      <tr><td style="padding:4px 12px 4px 0;color:#555">Student</td><td><strong>${escapeHtml(p.studentName)}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#555">Type</td><td>${escapeHtml(p.leaveType)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#555">Dates</td><td>${escapeHtml(p.startDate)} → ${escapeHtml(p.endDate)}</td></tr>
    </table>
    <p style="margin-top:12px"><strong>Reason</strong></p>
    <p style="white-space:pre-wrap">${escapeHtml(p.reason)}</p>
    ${p.comment ? `<p style="margin-top:12px"><strong>Mentor note</strong></p><p style="white-space:pre-wrap">${escapeHtml(p.comment)}</p>` : ''}
    <p style="margin-top:16px;color:#888;font-size:12px">Campus Leave Portal</p>
  </div>`.trim()

  return { subject, text, html }
}

/** @param {string} s */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
