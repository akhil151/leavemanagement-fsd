import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const STORAGE_KEY = 'leaveportal-theme'

/** @type {'light' | 'dark'} */
function readStoredTheme() {
  if (typeof window === 'undefined') return 'light'
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'dark' || stored === 'light') return stored
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyDomTheme(theme) {
  const root = document.documentElement
  if (theme === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
}

/** @type {React.Context<{ theme: 'light' | 'dark'; setTheme: (t: 'light' | 'dark') => void; toggle: () => void } | null>} */
const ThemeContext = createContext(null)

/**
 * @param {{ children: React.ReactNode }} props
 */
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    const t = readStoredTheme()
    applyDomTheme(t)
    return t
  })

  const setTheme = useCallback((t) => {
    setThemeState(t)
    localStorage.setItem(STORAGE_KEY, t)
    applyDomTheme(t)
  }, [])

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem(STORAGE_KEY, next)
      applyDomTheme(next)
      return next
    })
  }, [])

  const value = useMemo(() => ({ theme, setTheme, toggle }), [theme, setTheme, toggle])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
