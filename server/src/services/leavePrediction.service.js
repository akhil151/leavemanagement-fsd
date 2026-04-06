import { getPool } from '../config/database.js'
import { inclusiveDays } from '../utils/date.js'

const MODEL_TTL_MS = 10 * 60 * 1000 // in-process cache TTL

const FEATURE_DIM = 15
const TYPE_ORDER = ['sick', 'casual', 'on_duty']
const WEEKDAY_DIM = 7 // 0=Sun ... 6=Sat (UTC)
const PAST_WINDOW_DAYS_MS = 180 * 24 * 60 * 60 * 1000

let modelCache = {
  trainedAt: null,
  weights: null, // number[FEATURE_DIM]
  baseProbability: 0.5,
  sampleCount: 0,
}

/** @type {Promise<NonNullable<typeof modelCache['weights']>> | null} */
let trainingPromise = null

function sigmoid(z) {
  // Numerically stable sigmoid
  if (z > 35) return 1
  if (z < -35) return 0
  return 1 / (1 + Math.exp(-z))
}

function dot(weights, features) {
  let out = 0
  for (let i = 0; i < weights.length; i++) out += weights[i] * features[i]
  return out
}

function clamp01(x) {
  if (Number.isNaN(x) || !Number.isFinite(x)) return 0
  return Math.max(0, Math.min(1, x))
}

function parseUTCDate(isoDate) {
  // Avoid timezone drift by anchoring to noon UTC.
  const d = new Date(`${isoDate}T12:00:00.000Z`)
  const t = d.getTime()
  if (Number.isNaN(t)) return null
  return t
}

function getWeekdayOneHot(isoDate) {
  const ms = parseUTCDate(isoDate)
  const day = ms === null ? null : new Date(ms).getUTCDay()
  const out = new Array(WEEKDAY_DIM).fill(0)
  if (day === null) return out
  out[day] = 1
  return out
}

function getTypeOneHot(leaveType) {
  const out = new Array(TYPE_ORDER.length).fill(0)
  const idx = TYPE_ORDER.indexOf(leaveType)
  if (idx >= 0) out[idx] = 1
  return out
}

/**
 * Feature vector layout:
 * 0: intercept (1)
 * 1-3: leave_type one-hot (sick, casual, on_duty)
 * 4: number_of_days_scaled (clamped to [0,1])
 * 5: pastApprovedRatio (smoothed)
 * 6: pastRejectedRatio (smoothed)
 * 7: leave_frequency_scaled (past 180 days, smoothed via clamp)
 * 8-14: weekday one-hot for start_date (UTC; 0=Sun..6=Sat)
 * @returns {number[]}
 */
function buildFeatureVector({ leaveType, numberOfDays, pastApproved, pastRejected, frequency, startDate }) {
  const typeOneHot = getTypeOneHot(leaveType)

  const numDaysClamped = Math.max(0, Math.min(30, numberOfDays))
  const numDaysScaled = numDaysClamped / 30

  const pastResolvedTotal = pastApproved + pastRejected
  // Smoothed ratios (always in [0,1])
  const pastApprovedRatio = (pastApproved + 1) / (pastResolvedTotal + 2)
  const pastRejectedRatio = (pastRejected + 1) / (pastResolvedTotal + 2)

  const freqClamped = Math.max(0, Math.min(30, frequency))
  const frequencyScaled = freqClamped / 30

  const weekdayOneHot = getWeekdayOneHot(startDate)

  // Ensure correct dimension (FEATURE_DIM)
  return [
    1,
    ...typeOneHot,
    numDaysScaled,
    clamp01(pastApprovedRatio),
    clamp01(pastRejectedRatio),
    frequencyScaled,
    ...weekdayOneHot,
  ].slice(0, FEATURE_DIM)
}

function riskFromProbability(approvalProbability) {
  // Treat "risk" as the inverse of approval likelihood.
  // - >= 0.70 approval => Low risk
  // - 0.40..0.69 => Medium
  // - < 0.40 => High
  if (approvalProbability >= 0.7) return 'Low'
  if (approvalProbability >= 0.4) return 'Medium'
  return 'High'
}

function modelShouldRefresh() {
  if (!modelCache.trainedAt) return true
  return Date.now() - modelCache.trainedAt.getTime() > MODEL_TTL_MS
}

async function trainModel() {
  const pool = getPool()

  // Training data: use leave_requests as the real historical dataset.
  // We include pending rows in history features (frequency), but only approve/reject rows become training samples.
  const rows = /** @type {Array<{ student_id: string; type: string; start_date: string; end_date: string; status: string; submitted_at: string }>} */ (
    await pool.query(
      `SELECT student_id, type, start_date, end_date, status, submitted_at
       FROM leave_requests
       WHERE status IN ('pending','approved','rejected')
       ORDER BY student_id ASC, submitted_at ASC`,
    )
  )[0]

  // Group by student_id
  /** @type {Map<string, Array<typeof rows[number]>>} */
  const byStudent = new Map()
  for (const r of rows) {
    const sid = String(r.student_id)
    const list = byStudent.get(sid) ?? []
    list.push(r)
    byStudent.set(sid, list)
  }

  /** @type {{ features: number[]; y: 0|1 }[]} */
  const samples = []
  let approvedCount = 0

  for (const [_sid, history] of byStudent.entries()) {
    // history is already ordered by submitted_at ASC
    for (let i = 0; i < history.length; i++) {
      const cur = history[i]
      if (cur.status !== 'approved' && cur.status !== 'rejected') continue

      const cutoffMs = new Date(String(cur.submitted_at)).getTime()
      if (Number.isNaN(cutoffMs)) continue

      let pastApproved = 0
      let pastRejected = 0
      let frequency = 0

      for (let j = 0; j < i; j++) {
        const prev = history[j]
        const prevMs = new Date(String(prev.submitted_at)).getTime()
        if (Number.isNaN(prevMs)) continue

        if (prev.status === 'approved' && prev.type === cur.type) pastApproved++
        if (prev.status === 'rejected' && prev.type === cur.type) pastRejected++

        // Frequency: count any leave submissions in the trailing window.
        if (prevMs >= cutoffMs - PAST_WINDOW_DAYS_MS) frequency++
      }

      let numberOfDays = 1
      try {
        numberOfDays = inclusiveDays(String(cur.start_date), String(cur.end_date))
      } catch {
        numberOfDays = 1
      }

      const features = buildFeatureVector({
        leaveType: String(cur.type),
        numberOfDays,
        pastApproved,
        pastRejected,
        frequency,
        startDate: String(cur.start_date),
      })

      samples.push({ features, y: cur.status === 'approved' ? 1 : 0 })
      if (cur.status === 'approved') approvedCount++
    }
  }

  const total = samples.length
  if (!total) {
    modelCache = {
      trainedAt: new Date(),
      weights: null,
      baseProbability: 0.5,
      sampleCount: 0,
    }
    return null
  }

  const baseProbability = approvedCount / total

  // Train logistic regression via batch gradient descent.
  const weights = new Array(FEATURE_DIM).fill(0)
  const learningRate = 0.05
  const lambda = 0.05 // L2 regularization
  const epochs = Math.min(300, 50 + total) // cap epochs for latency

  for (let epoch = 0; epoch < epochs; epoch++) {
    const grad = new Array(FEATURE_DIM).fill(0)

    for (const s of samples) {
      const z = dot(weights, s.features)
      const p = sigmoid(z)
      const err = p - s.y
      for (let k = 0; k < FEATURE_DIM; k++) grad[k] += err * s.features[k]
    }

    for (let k = 0; k < FEATURE_DIM; k++) {
      const g = grad[k] / total
      if (k === 0) {
        // intercept (no regularization)
        weights[k] -= learningRate * g
      } else {
        weights[k] -= learningRate * (g + lambda * weights[k])
      }
    }
  }

  modelCache = {
    trainedAt: new Date(),
    weights,
    baseProbability,
    sampleCount: total,
  }

  return weights
}

async function ensureModel() {
  // If we already attempted a training run recently (even if it produced no weights),
  // keep using cached baseProbability until TTL expires.
  if (!modelShouldRefresh()) return modelCache.weights
  if (trainingPromise) return trainingPromise

  trainingPromise = (async () => {
    try {
      return await trainModel()
    } finally {
      trainingPromise = null
    }
  })()

  return trainingPromise
}

async function getStudentHistory(studentId) {
  const pool = getPool()
  const rows = await pool.query(
    `SELECT type, start_date, end_date, status, submitted_at
     FROM leave_requests
     WHERE student_id = :sid
       AND status IN ('pending','approved','rejected')
     ORDER BY submitted_at ASC`,
    { sid: studentId },
  )
  return /** @type {Array<{ type: string; start_date: string; end_date: string; status: string; submitted_at: string }>} */ (
    rows[0]
  )
}

/**
 * @param {{
 *   studentId: string
 *   leaveType?: string
 *   numberOfDays?: string | number
 *   startDate?: string
 *   endDate?: string
 * }} input
 */
export async function predictLeaveApproval({ studentId, leaveType, numberOfDays, startDate, endDate }) {
  // Ensure we have a trained model (or a base probability from training).
  await ensureModel()

  const leaveTypeNormalized = leaveType ? String(leaveType) : 'casual'
  const nDaysNum = numberOfDays === undefined || numberOfDays === null ? null : Number(numberOfDays)

  // If the client doesn't provide start_date, fall back to "today".
  const cutoffMs =
    startDate ? parseUTCDate(startDate) ?? Date.now() : Date.now()

  const studentHistory = await getStudentHistory(studentId)

  // Past outcomes: count prior resolved leaves of this type before cutoff.
  let pastApproved = 0
  let pastRejected = 0
  let frequency = 0

  for (const prev of studentHistory) {
    const prevMs = new Date(String(prev.submitted_at)).getTime()
    if (Number.isNaN(prevMs)) continue
    if (prevMs >= cutoffMs) break

    if (prev.status === 'approved' && prev.type === leaveTypeNormalized) pastApproved++
    if (prev.status === 'rejected' && prev.type === leaveTypeNormalized) pastRejected++

    if (prevMs >= cutoffMs - PAST_WINDOW_DAYS_MS) frequency++
  }

  let resolvedNumberOfDays = nDaysNum
  if (!Number.isFinite(resolvedNumberOfDays)) {
    if (startDate && endDate) {
      try {
        resolvedNumberOfDays = inclusiveDays(startDate, endDate)
      } catch {
        resolvedNumberOfDays = 1
      }
    } else {
      resolvedNumberOfDays = 1
    }
  }

  const weekdayStartDate = startDate ?? new Date().toISOString().slice(0, 10)

  const features = buildFeatureVector({
    leaveType: leaveTypeNormalized,
    numberOfDays: Number(resolvedNumberOfDays) || 1,
    pastApproved,
    pastRejected,
    frequency,
    startDate: weekdayStartDate,
  })

  const weights = modelCache.weights
  const approvalProbability = weights ? sigmoid(dot(weights, features)) : modelCache.baseProbability
  const riskLevel = riskFromProbability(approvalProbability)

  return {
    approvalProbability,
    riskLevel,
    model: {
      trainedAt: modelCache.trainedAt ? modelCache.trainedAt.toISOString() : null,
      sampleCount: modelCache.sampleCount,
      cached: !!weights,
    },
  }
}

