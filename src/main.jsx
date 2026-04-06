import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { LeaveProvider } from './context/LeaveContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { SocketBridge } from './components/system/SocketBridge.jsx'
import { GlobalErrorBoundary } from './components/system/GlobalErrorBoundary.jsx'
import { ToastProvider } from './context/ToastContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <LeaveProvider>
          <ThemeProvider>
            <ToastProvider>
              <GlobalErrorBoundary>
                <App />
                <SocketBridge />
              </GlobalErrorBoundary>
            </ToastProvider>
          </ThemeProvider>
        </LeaveProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
