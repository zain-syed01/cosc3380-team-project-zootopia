import { SignUp } from '@clerk/react'
import { Link } from 'react-router'

function Signup() {
  return (
    <div className="login-page">
      <div className="login-box">
        <h2>Customer Sign Up</h2>
        <p>Create a visitor account with email and password.</p>
        <SignUp
          routing="hash"
          signInUrl="/customer-login"
          forceRedirectUrl="/checkout"
        />
        <p>Already have an account? <Link to="/customer-login">Sign in</Link></p>
        <p>Staff? <Link to="/login">Staff login</Link></p>
        <p><Link to="/">← Back to Zootopia Zoo</Link></p>
      </div>
    </div>
  )
}

export default Signup
