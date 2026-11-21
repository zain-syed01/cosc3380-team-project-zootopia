import { RedirectToSignIn } from '@clerk/react'
import { Link } from 'react-router'

// Sends customers to Clerk's hosted Account Portal, then back to /checkout.
function CustomerLogin() {
  return (
    <div className="login-page">
      <div className="login-box">
        <h2>Customer Sign In</h2>
        <p>Redirecting you to secure sign in…</p>
        <RedirectToSignIn forceRedirectUrl="/checkout" signUpForceRedirectUrl="/checkout" />
        <p>Staff should use the <Link to="/login">staff login page</Link>.</p>
        <p><Link to="/">← Back to Zootopia Zoo</Link></p>
      </div>
    </div>
  )
}

export default CustomerLogin
