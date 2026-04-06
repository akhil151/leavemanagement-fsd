import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { students, teachers } from '../data/seedData'
import { apiPost, hasRealApi, setApiAuthToken } from '../services/api'

/**
 * @typedef {'student' | 'teacher' | 'admin'} Role
 * @typedef {{ id: string; name: string; email: string; role: Role; meta?: Record<string, string> }} User
 */

/** @type {React.Context<{ user: User | null; login: (p: { email: string; password: string; role: Role }) => Promise<void>; logout: () => void; authError: string | null; isAuthLoading: boolean }> | null} */
const AuthContext = createContext(null)

const ADMIN_USER = {
  id: 'a1',
  name: 'Registrar Office',
  email: 'admin@college.edu',
  role: /** @type {const} */ ('admin'),
}

/**
 * @param {{ email: string; role: Role }} params
 */
function resolveUser({ email, role }) {
  const normalized = email.trim().toLowerCase()
  if (role === 'student') {
    const s = students.find((x) => x.email.toLowerCase() === normalized) ?? students[0]
    return {
      id: s.id,
      name: s.name,
      email: s.email,
      role: /** @type {const} */ ('student'),
      meta: { studentId: s.studentId ?? '', department: s.department ?? '' },
    }
  }
  if (role === 'teacher') {
    const t = teachers.find((x) => x.email.toLowerCase() === normalized) ?? teachers[0]
    return {
      id: t.id,
      name: t.name,
      email: t.email,
      role: /** @type {const} */ ('teacher'),
      meta: { department: t.department ?? '' },
    }
  }
  return { ...ADMIN_USER, email: normalized || ADMIN_USER.email }
}

/**
 * @param {{ children: React.ReactNode }} props
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(/** @type {User | null} */ (null))
  const [authError, setAuthError] = useState(/** @type {string | null} */ (null))
  const [isAuthLoading, setIsAuthLoading] = useState(false)

  const login = useCallback(async ({ email, password, role }) => {
    setAuthError(null)
    setIsAuthLoading(true)
    await new Promise((r) => setTimeout(r, 650))
    try {
      if (!email?.trim()) throw new Error('Email is required')
      if (!password || password.length < 6) throw new Error('Password must be at least 6 characters')
      if (hasRealApi) {
        const res = await apiPost('/login', {
          email: email.trim().toLowerCase(),
          password,
        })
        const data = res?.data?.data
        if (!res?.data?.success || !data?.user) throw new Error('Sign-in failed')
        setApiAuthToken(data.token || null)
        setUser({
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
          meta: {
            studentId: data.user.studentCode ?? '',
            department: data.user.department ?? '',
          },
        })
      } else {
        setUser(resolveUser({ email, role }))
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Sign-in failed'
      setAuthError(msg)
    } finally {
      setIsAuthLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    setApiAuthToken(null)
    setUser(null)
    setAuthError(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
      authError,
      isAuthLoading,
    }),
    [user, login, logout, authError, isAuthLoading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
