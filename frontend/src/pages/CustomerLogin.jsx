import { useEffect } from 'react'
import { Link } from 'react-router'

// Hosted Clerk Account Portal (Development instance)
const CLERK_SIGN_IN_URL =
  import.meta.env.VITE_CLERK_SIGN_IN_URL ||
  'https://settled-liger-9602.accounts.dev/sign-in'

function CustomerLogin() {
  useEffect(() => {
    const redirectUrl = encodeURIComponent(`${window.location.origin}/checkout`)
    window.location.replace(`${CLERK_SIGN_IN_URL}?redirect_url=${redirectUrl}`)
  }, [])

  return (
    <div className="login-page">
      <div className="login-box">
        <h2>Customer Sign In</h2>
        <p>Redirecting you to secure sign in…</p>
        <p>
          If nothing happens,{' '}
          <a href={`${CLERK_SIGN_IN_URL}?redirect_url=${encodeURIComponent(typeof window !== 'undefined' ? `${window.location.origin}/checkout` : '/checkout')}`}>
            continue to Clerk sign in
          </a>
          .
        </p>
        <p>Staff should use the <Link to="/login">staff login page</Link>.</p>
        <p><Link to="/">← Back to Zootopia Zoo</Link></p>
      </div>
    </div>
  )
}

export default CustomerLogin
