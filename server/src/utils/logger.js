function nowIso() {
  return new Date().toISOString()
}

/**
 * @param {'info'|'warn'|'error'} level
 * @param {string} msg
 * @param {Record<string, unknown>} [meta]
 */
function write(level, msg, meta) {
  const payload = {
    ts: nowIso(),
    level,
    msg,
    ...(meta ?? {}),
  }

  const line = JSON.stringify(payload)
  if (level === 'error') return console.error(line)
  if (level === 'warn') return console.warn(line)
  return console.log(line)
}

export const log = {
  info: (msg, meta) => write('info', msg, meta),
  warn: (msg, meta) => write('warn', msg, meta),
  error: (msg, meta) => write('error', msg, meta),
}

