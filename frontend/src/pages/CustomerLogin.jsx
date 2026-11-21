import { Navigate } from 'react-router'

// Old /customer-login URL — everyone uses /login now.
function CustomerLogin() {
  return <Navigate to="/login" replace />
}

export default CustomerLogin
