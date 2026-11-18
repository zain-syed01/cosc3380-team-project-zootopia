// Helpers for Clerk-backed customer sessions.

export async function syncCustomer(getToken) {
  const token = await getToken()
  if (!token) {
    throw new Error('Not signed in')
  }

  const response = await fetch('/api/auth/clerk/sync', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || 'Could not sync customer account')
  }

  localStorage.setItem(
    'customer',
    JSON.stringify({
      customerId: data.customerId,
      email: data.email,
      clerkUserId: data.clerkUserId,
    })
  )

  return data
}

export function getLoggedInCustomer() {
  try {
    return JSON.parse(localStorage.getItem('customer') || 'null')
  } catch {
    return null
  }
}

export function logoutCustomer() {
  localStorage.removeItem('customer')
}

export async function customerFetch(url, options = {}, getToken) {
  const token = await getToken()
  const headers = {
    ...(options.headers || {}),
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }
  return fetch(url, { ...options, headers })
}
