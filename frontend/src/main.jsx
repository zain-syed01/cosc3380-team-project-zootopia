import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { ClerkProvider } from '@clerk/react'
import './index.css'
import App from './App.jsx'

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!publishableKey) {
  console.warn('VITE_CLERK_PUBLISHABLE_KEY is missing. Customer Clerk auth will not work until it is set.')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={publishableKey || 'pk_test_missing'}
      afterSignOutUrl="/"
      signInFallbackRedirectUrl="/checkout"
      signUpFallbackRedirectUrl="/checkout"
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ClerkProvider>
  </StrictMode>,
)
