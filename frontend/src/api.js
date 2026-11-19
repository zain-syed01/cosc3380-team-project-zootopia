// Small fetch helper that attaches the staff JWT when present.

export function getStaffUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')
  } catch {
    return null
  }
}

export function apiFetch(url, options = {}) {
  const user = getStaffUser()
  const headers = {
    ...(options.headers || {}),
  }

  if (user?.token) {
    headers.Authorization = `Bearer ${user.token}`
  }

  if (options.body && !headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  return fetch(url, {
    ...options,
    headers,
  })
}
