import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL

export const hasRealApi = !!API_BASE_URL

const axiosInstance = hasRealApi
  ? axios.create({
      baseURL: API_BASE_URL,
      timeout: 8000,
    })
  : null

/** @type {string | null} */
let authToken = import.meta.env.VITE_API_TOKEN || null

if (hasRealApi && axiosInstance) {
  axiosInstance.interceptors.request.use((config) => {
    const tokenFromStorage =
      typeof window !== 'undefined' ? window.localStorage.getItem('leave_auth_token') : null
    const token = authToken || tokenFromStorage
    if (token) {
      config.headers = config.headers ?? {}
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (typeof window !== 'undefined') {
        const message = error?.response?.data?.error?.message || error?.message || 'Request failed'
        window.dispatchEvent(
          new CustomEvent('app:api-error', {
            detail: {
              message,
              status: error?.response?.status,
              code: error?.response?.data?.error?.code,
            },
          }),
        )
      }
      return Promise.reject(error)
    },
  )
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function normalizeAxiosError(err) {
  const status = err?.response?.status
  const serverMessage = err?.response?.data?.error?.message
  const message = serverMessage || err?.message || 'Request failed'
  return Object.assign(new Error(message), { status })
}

function shouldRetry(err) {
  const status = err?.response?.status
  return (
    status === 429 ||
    (status !== undefined && status >= 500) ||
    err?.code === 'ECONNABORTED' ||
    err?.code === 'ERR_NETWORK'
  )
}

/**
 * @param {'get'|'post'|'patch'} method
 * @param {string} url
 * @param {{ params?: Record<string, unknown>; headers?: Record<string, string>; data?: unknown; retries?: number }} [options]
 */
async function requestWithRetry(method, url, options = {}) {
  if (!axiosInstance) {
    throw new Error('API_NOT_CONFIGURED')
  }
  const { params, headers, data, retries = 2 } = options

  let lastErr
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await axiosInstance.request({ method, url, params, headers, data })
      return res
    } catch (e) {
      lastErr = e
      if (!shouldRetry(e) || attempt === retries) throw normalizeAxiosError(e)
      await sleep(200 * 2 ** attempt)
    }
  }
  throw normalizeAxiosError(lastErr)
}

export function setApiAuthToken(token) {
  authToken = token || null
  if (typeof window !== 'undefined') {
    if (token) window.localStorage.setItem('leave_auth_token', token)
    else window.localStorage.removeItem('leave_auth_token')
  }
}

export async function apiGet(url, { params, headers, retries = 2 } = {}) {
  return requestWithRetry('get', url, { params, headers, retries })
}

export async function apiPost(url, body, { headers, retries = 1 } = {}) {
  return requestWithRetry('post', url, { data: body, headers, retries })
}

export async function apiPatch(url, body, { headers, retries = 1 } = {}) {
  return requestWithRetry('patch', url, { data: body, headers, retries })
}
