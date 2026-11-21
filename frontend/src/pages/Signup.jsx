import { useEffect } from 'react'
import { Link } from 'react-router'

// Hosted Clerk Account Portal (Development instance)
const CLERK_SIGN_UP_URL =
  import.meta.env.VITE_CLERK_SIGN_UP_URL ||
  'https://settled-liger-9602.accounts.dev/sign-up'

function Signup() {
  useEffect(() => {
    const redirectUrl = encodeURIComponent(`${window.location.origin}/checkout`)
    window.location.replace(`${CLERK_SIGN_UP_URL}?redirect_url=${redirectUrl}`)
  }, [])

  return (
    <div className="login-page">
      <div className="login-box">
        <h2>Customer Sign Up</h2>
        <p>Redirecting you to create an account…</p>
        <p>
          If nothing happens,{' '}
          <a href={`${CLERK_SIGN_UP_URL}?redirect_url=${encodeURIComponent(typeof window !== 'undefined' ? `${window.location.origin}/checkout` : '/checkout')}`}>
            continue to Clerk sign up
          </a>
          .
        </p>
        <p>Staff? <Link to="/login">Staff login</Link></p>
        <p><Link to="/">← Back to Zootopia Zoo</Link></p>
      </div>
    </div>
  )
}

export default Signup
