import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { SettingsProvider } from './context/SettingsContext.tsx'
import { AuthProvider } from './context/AuthContext.tsx'

function isSupportedBrowser(): boolean {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  return ua.includes('Edg/') || ua.includes('Edge/') || (ua.includes('Chrome/') && !ua.includes('OPR/'))
}

function BrowserGate({ children }: { children: ReactNode }) {
  if (!isSupportedBrowser()) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: 'linear-gradient(to bottom, #0f172a, #1e3a8a)',
          color: '#fff',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <p style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: 12 }}>
          EduXam works only on Google Chrome or Microsoft Edge.
        </p>
        <p style={{ fontSize: '1rem', opacity: 0.9 }}>
          Please open this page using Chrome or Edge.
        </p>
      </div>
    )
  }
  return <>{children}</>
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserGate>
      <SettingsProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </SettingsProvider>
    </BrowserGate>
  </StrictMode>,
)
