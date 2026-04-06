/** @param {'sick' | 'casual' | 'onDuty'} t */
export function leaveTypeLabel(t) {
  const m = { sick: 'Sick', casual: 'Casual', onDuty: 'On duty' }
  return m[t] ?? t
}
