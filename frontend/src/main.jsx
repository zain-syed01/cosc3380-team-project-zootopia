import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { ClerkProvider } from '@clerk/react'
import './index.css'
import App from './App.jsx'

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!publishableKey || publishableKey === 'pk_test_missing') {
  console.error(
    'VITE_CLERK_PUBLISHABLE_KEY is missing from this build. Customer Clerk auth will not work.'
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {!publishableKey || publishableKey === 'pk_test_missing' ? (
      <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
        <h1>Clerk key missing</h1>
        <p>
          This deploy was built without <code>VITE_CLERK_PUBLISHABLE_KEY</code>.
          Add that GitHub Actions secret (your <code>pk_test_...</code> key) and redeploy.
        </p>
        <p>Staff login at <a href="/login">/login</a> can still work.</p>
      </div>
    ) : (
      <ClerkProvider
        publishableKey={publishableKey}
        afterSignOutUrl="/"
        signInFallbackRedirectUrl="/checkout"
        signUpFallbackRedirectUrl="/checkout"
      >
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ClerkProvider>
    )}
  </StrictMode>,
)
