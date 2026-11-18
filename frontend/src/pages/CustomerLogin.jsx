import { SignIn } from '@clerk/react'
import { Link } from 'react-router'

function CustomerLogin() {
  return (
    <div className="login-page">
      <div className="login-box">
        <h2>Customer Sign In</h2>
        <p>Use the email and password for your visitor account.</p>
        <SignIn
          routing="hash"
          signUpUrl="/signup"
          forceRedirectUrl="/checkout"
        />
        <p>Need an account? <Link to="/signup">Sign up</Link></p>
        <p>Staff should use the <Link to="/login">staff login page</Link>.</p>
        <p><Link to="/">← Back to Zootopia Zoo</Link></p>
      </div>
    </div>
  )
}

export default CustomerLogin
