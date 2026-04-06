import { apiGet, apiPatch, hasRealApi } from './api'

export async function fetchNotifications({ priority, unreadOnly, limit } = {}) {
  if (!hasRealApi) return null
  const res = await apiGet('/notifications', { params: { priority, unreadOnly, limit } })
  if (!res?.data?.success) return null
  return res.data.data
}

export async function markNotificationsRead({ ids, markAll }) {
  if (!hasRealApi) return null
  const res = await apiPatch('/notifications/read', { ids, markAll })
  if (!res?.data?.success) return null
  return res.data.data
}

