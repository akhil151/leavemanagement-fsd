import * as leavePredictionService from '../services/leavePrediction.service.js'

/**
 * GET /leave/prediction/:studentId
 * Predict probability that a leave request will be approved and compute a risk band.
 */
export async function predictLeaveApproval(req, res, next) {
  try {
    const studentId = req.params.studentId
    const leaveType = req.query.leave_type
    const startDate = req.query.start_date
    const endDate = req.query.end_date
    const numberOfDays = req.query.number_of_days

    const data = await leavePredictionService.predictLeaveApproval({
      studentId,
      leaveType,
      startDate,
      endDate,
      numberOfDays,
    })

    res.json({ success: true, data })
  } catch (e) {
    next(e)
  }
}

