import { apiGet, hasRealApi } from './api'

/**
 * Returns:
 *  { approvalProbability: number (0..1), riskLevel: 'Low'|'Medium'|'High' }
 */
export async function getLeavePrediction({ studentId, leaveType, startDate, endDate, numberOfDays }) {
  if (!hasRealApi) return null
  if (!studentId) return null

  const params = {
    leave_type: leaveType,
    start_date: startDate,
    end_date: endDate,
    number_of_days: numberOfDays,
  }

  const res = await apiGet(`/leave/prediction/${studentId}`, { params })
  const body = res?.data

  if (!body?.success || !body?.data) return null
  return body.data
}

