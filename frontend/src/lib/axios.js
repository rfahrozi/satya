// frontend/src/lib/axios.js
import axios from 'axios'

/**
 * Axios wrapper with refresh-token support and request retry queue
 *
 * - Expected:
 *   - Access token stored in localStorage key 'satya_token' (or adapt)
 *   - Refresh token stored in localStorage key 'satya_refresh_token' (or adapt)
 *   - Refresh endpoint (configurable) returns { accessToken, refreshToken } or similar shape
 *
 * Security note: for production it's more secure to keep refresh tokens in httpOnly cookies.
 * If you switch to httpOnly cookie-based refresh, modify `refreshAuth()` to call the refresh endpoint
 * without sending refresh token from localStorage and adapt storage logic accordingly.
 */

const BASE_URL = process.env.REACT_APP_API_BASE_URL || '' // set to API base if needed
const REFRESH_URL = process.env.REACT_APP_AUTH_REFRESH_ENDPOINT || '/auth/refresh' // adapt if different

const instance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Accept': 'application/json',
  },
  withCredentials: true, // allow cookie flows if backend uses them
})

/* ---------- Token helpers ---------- */
export function getAccessToken() {
  try { return localStorage.getItem('satya_token') } catch { return null }
}
export function getRefreshToken() {
  try { return localStorage.getItem('satya_refresh_token') } catch { return null }
}
export function setTokens({ accessToken, refreshToken }) {
  try {
    if (accessToken) localStorage.setItem('satya_token', accessToken)
    if (refreshToken) localStorage.setItem('satya_refresh_token', refreshToken)
  } catch (e) { /* ignore storage errors */ }
}
export function clearTokens() {
  try {
    localStorage.removeItem('satya_token')
    localStorage.removeItem('satya_refresh_token')
    localStorage.removeItem('satya_user')
  } catch (e) { /* ignore */ }
}

/* ---------- Request interceptor: attach access token ---------- */
instance.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, (error) => Promise.reject(error))

/* ---------- Refresh flow state & queue ---------- */
let isRefreshing = false
let refreshPromise = null
let requestQueue = []

function processQueue(error, token = null) {
  requestQueue.forEach(({ resolve, reject, originalConfig }) => {
    if (error) {
      reject(error)
    } else {
      if (token) {
        originalConfig.headers = originalConfig.headers || {}
        originalConfig.headers.Authorization = `Bearer ${token}`
      }
      resolve(axios(originalConfig))
    }
  })
  requestQueue = []
}

/* ---------- Refresh function ---------- */
async function refreshAuth() {
  // avoid multiple simultaneous refresh requests
  if (isRefreshing) {
    return refreshPromise
  }
  isRefreshing = true
  refreshPromise = (async () => {
    try {
      // POST to refresh endpoint. Adapt body shape if backend needs refresh token in JSON
      // For cookie-based refresh, backend can read cookie; call without sending refresh token body
      const refreshToken = getRefreshToken()
      const payload = refreshToken ? { refreshToken } : {}
      const resp = await axios.post(`${BASE_URL}${REFRESH_URL}`, payload, { withCredentials: true })
      // Normalize returned tokens; common shapes: { accessToken, refreshToken } or { data: { accessToken, refreshToken } }
      const data = resp?.data ?? resp
      const accessToken = data?.accessToken ?? data?.token ?? data?.data?.accessToken
      const newRefresh = data?.refreshToken ?? data?.data?.refreshToken
      if (!accessToken) throw new Error('Refresh response did not include new access token')
      setTokens({ accessToken, refreshToken: newRefresh })
      isRefreshing = false
      refreshPromise = null
      return accessToken
    } catch (err) {
      isRefreshing = false
      refreshPromise = null
      clearTokens()
      throw err
    }
  })()
  return refreshPromise
}

/* ---------- Response interceptor: handle 401, queue requests ---------- */
instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // If no config or not 401 -> reject
    if (!originalRequest) return Promise.reject(error)
    const status = error.response?.status

    // Avoid infinite loop: if request was to refresh endpoint and it failed -> logout
    if (originalRequest.url && originalRequest.url.endsWith(REFRESH_URL)) {
      clearTokens()
      return Promise.reject(error)
    }

    // On 401: attempt refresh
    if (status === 401) {
      try {
        const newToken = await refreshAuth()
        // If we get new token, set Authorization header on original request and retry
        originalRequest.headers = originalRequest.headers || {}
        originalRequest.headers.Authorization = `Bearer ${newToken}`

        // If there are queued requests, push this request into the queue and process after refresh
        if (requestQueue.length > 0) {
          return new Promise((resolve, reject) => {
            requestQueue.push({ resolve, reject, originalConfig: originalRequest })
          })
        }
        return instance(originalRequest)
      } catch (refreshError) {
        // refresh failed -> clear tokens and reject; app should redirect to login
        clearTokens()
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

/* ---------- Exported helpers ---------- */
export function logoutAndRedirect(navigateFn) {
  clearTokens()
  if (typeof navigateFn === 'function') {
    navigateFn('/login')
  } else {
    window.location.href = '/login'
  }
}

export { refreshAuth }
export default instance