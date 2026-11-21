// Customer session helpers (JWT stored in localStorage).

export function getLoggedInCustomer() {
  try {
    return JSON.parse(localStorage.getItem('customer') || 'null')
  } catch {
    return null
  }
}

export function loginCustomer(data) {
  localStorage.setItem(
    'customer',
    JSON.stringify({
      token: data.token,
      username: data.username,
      email: data.email || null,
      customerId: data.customerId,
      role: 'Customer',
    })
  )
}

export function logoutCustomer() {
  localStorage.removeItem('customer')
}

export function customerFetch(url, options = {}) {
  const customer = getLoggedInCustomer()
  const headers = {
    ...(options.headers || {}),
  }
  if (customer?.token) {
    headers.Authorization = `Bearer ${customer.token}`
  }
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }
  return fetch(url, { ...options, headers })
}
