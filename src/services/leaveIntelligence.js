import { getDay, parseISO } from 'date-fns'

/**
 * @typedef {{ start: string; end: string; status: string; type: string }} Req
 */

/**
 * Monday=1 ... Sunday=0 from getDay()
 */
const DOW = { MON: 1, FRI: 5 }

/**
 * @param {Req[]} requests Approved + pending history for one student
 */
export function analyzeLeavePatterns(requests) {
  const mine = requests.filter((r) => r.status === 'pending' || r.status === 'approved')
  if (!mine.length) {
    return { mondayFridayShare: 0, weekdayHistogram: {}, flag: null }
  }

  let mf = 0
  const hist = /** @type {Record<number, number>} */ ({})
  for (const r of mine) {
    const start = parseISO(r.start)
    const d = getDay(start)
    hist[d] = (hist[d] ?? 0) + 1
    if (d === DOW.MON || d === DOW.FRI) mf++
  }
  const mondayFridayShare = mf / mine.length

  let flag = null
  if (mondayFridayShare >= 0.45) {
    flag = {
      level: 'info',
      message: 'Many requests start on a Monday or Friday — ensure patterns align with policy.',
    }
  }

  return { mondayFridayShare, weekdayHistogram: hist, flag }
}

/**
 * Risk score 0–100 from leave volume vs soft cap.
 * @param {Req[]} requests
 * @param {{ sick: number; casual: number; onDuty: number }} balances
 */
export function computeLeaveRiskScore(requests, balances) {
  const approved = requests.filter((r) => r.status === 'approved')
  const usedApprox = approved.length * 2
  const totalBal = balances.sick + balances.casual + balances.onDuty
  if (totalBal <= 0) return 100
  const ratio = usedApprox / (usedApprox + totalBal)
  return Math.min(100, Math.round(ratio * 80 + (approved.length > 8 ? 20 : 0)))
}

/**
 * Naive approval probability from historical mentor outcomes for similar type (demo heuristic).
 * @param {Req[]} allRequests global history
 * @param {string} leaveType
 */
export function estimateApprovalProbability(allRequests, leaveType) {
  const resolved = allRequests.filter(
    (r) => r.status === 'approved' || r.status === 'rejected',
  )
  const same = resolved.filter((r) => r.type === leaveType)
  if (!same.length) return { probability: 0.72, sampleSize: 0 }
  const approved = same.filter((r) => r.status === 'approved').length
  return {
    probability: Math.round((approved / same.length) * 100) / 100,
    sampleSize: same.length,
  }
}
