import { RedirectToSignUp } from '@clerk/react'
import { Link } from 'react-router'

// Sends customers to Clerk's hosted Account Portal, then back to /checkout.
function Signup() {
  return (
    <div className="login-page">
      <div className="login-box">
        <h2>Customer Sign Up</h2>
        <p>Redirecting you to create an account…</p>
        <RedirectToSignUp forceRedirectUrl="/checkout" signInForceRedirectUrl="/checkout" />
        <p>Staff? <Link to="/login">Staff login</Link></p>
        <p><Link to="/">← Back to Zootopia Zoo</Link></p>
      </div>
    </div>
  )
}

export default Signup
