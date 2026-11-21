import { useEffect, useState } from 'react'
import { NavLink, Outlet, Link } from 'react-router'
import { useAuth, useClerk, useUser } from '@clerk/react'
import { logoutCustomer, syncCustomer } from '../customerAuth.js'

function CustomerLayout() {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const { user } = useUser()
  const { signOut } = useClerk()
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function linkCustomer() {
      if (!isLoaded) {
        return
      }
      if (!isSignedIn) {
        logoutCustomer()
        if (!cancelled) {
          setError('')
          setReady(true)
        }
        return
      }

      try {
        await syncCustomer(getToken)
        if (!cancelled) {
          setError('')
          setReady(true)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Could not link customer account')
          setReady(true)
        }
      }
    }

    setReady(false)
    linkCustomer()
    return () => {
      cancelled = true
    }
  }, [isLoaded, isSignedIn, getToken, user?.id])

  async function handleLogout() {
    logoutCustomer()
    await signOut({ redirectUrl: '/' })
  }

  if (!isLoaded || !ready) {
    return (
      <div className="login-page">
        <div className="login-box">
          <h2>Loading…</h2>
          <p>Finishing your customer sign in.</p>
        </div>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="login-page">
        <div className="login-box">
          <h2>Customer area</h2>
          <p>You need to sign in to buy tickets and use the online shop.</p>
          <p><Link className="btn gold" to="/customer-login">Customer sign in</Link></p>
          <p><Link to="/signup">Create an account</Link></p>
          <p><Link to="/">← Back to Zootopia Zoo</Link></p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="login-page">
        <div className="login-box">
          <h2>Account issue</h2>
          <p className="error">{error}</p>
          <p>Staff should use the staff login page.</p>
          <button type="button" onClick={handleLogout}>Sign out</button>
        </div>
      </div>
    )
  }

  return (
    <div className="layout">
      <header className="topbar">
        <span className="logo">Zoo Customer</span>
        <div className="user">
          <span>{user?.primaryEmailAddress?.emailAddress || user?.username}</span>
          <button type="button" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <nav className="sidebar">
        <NavLink to="/enclosures">Enclosures</NavLink>
        <NavLink to="/attractions">Attractions</NavLink>
        <NavLink to="/checkout">Buy Tickets</NavLink>
        <NavLink to="/shop">Online Shop</NavLink>
        <NavLink to="/my-transactions">My Transactions</NavLink>
      </nav>

      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}

export default CustomerLayout
