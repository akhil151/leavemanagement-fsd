import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { ErrorBanner } from '../components/feedback/ErrorBanner'
import { validateEmail, validatePassword } from '../utils/validators'
import { cn } from '../utils/cn'

const roles = [
  { id: /** @type {const} */ ('student'), label: 'Student' },
  { id: /** @type {const} */ ('teacher'), label: 'Teacher (Mentor)' },
  { id: /** @type {const} */ ('admin'), label: 'Admin' },
]

export function LoginPage() {
  const { user, login, register, authError, isAuthLoading } = useAuth()
  const location = useLocation()
  const from = location.state?.from?.pathname

  const [email, setEmail] = useState('ananya.krishnan@college.edu')
  const [password, setPassword] = useState('password')
  const [role, setRole] = useState(/** @type {'student' | 'teacher' | 'admin'} */ ('student'))
  const [name, setName] = useState('New User')
  const [mode, setMode] = useState(/** @type {'login' | 'register'} */ ('login'))
  const [fieldErrors, setFieldErrors] = useState(/** @type {Record<string, string>} */ ({}))

  // Render-time redirect — no useEffect flash
  if (user) {
    if (from && from !== '/login') return <Navigate to={from} replace />
    if (user.role === 'student') return <Navigate to="/student" replace />
    if (user.role === 'teacher') return <Navigate to="/teacher" replace />
    return <Navigate to="/admin" replace />
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    const next = {}
    const eErr = validateEmail(email)
    if (eErr) next.email = eErr
    if (mode === 'register') {
      if (!name?.trim()) next.name = 'Name is required'
      if (!password) next.password = 'Password is required'
      else if (password.length < 8) next.password = 'Password must be at least 8 characters'
      else if (!/[A-Za-z]/.test(password) || !/\d/.test(password))
        next.password = 'Password must include at least one letter and one number'
    } else {
      const pErr = validatePassword(password)
      if (pErr) next.password = pErr
    }
    setFieldErrors(next)
    if (Object.keys(next).length) return

    if (mode === 'register') {
      await register({ name, email, password, role })
    } else {
      await login({ email, password, role })
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-12 bg-[var(--color-surface)]">
      <div className="w-full max-w-[420px] space-y-8">
        <div className="text-center space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-subtle)]">
            College ERP
          </p>
          <h1 className="text-2xl font-semibold text-[var(--color-text)] tracking-tight">
            Campus Leave Portal
          </h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Sign in with your institutional account
          </p>
        </div>

        <Card padding="md">
          <CardHeader>
            <CardTitle>{mode === 'register' ? 'Create account' : 'Sign in'}</CardTitle>
            <CardDescription>
              {mode === 'register'
                ? 'Register with your institutional email.'
                : 'Choose your role and enter your credentials.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <Label className="mb-2">Role</Label>
                {mode === 'register' ? (
                  <div className="rounded-md border border-[var(--color-border)] bg-white px-3 py-2">
                    <select
                      className="w-full bg-transparent text-sm text-[var(--color-text)] outline-none"
                      value={role}
                      onChange={(e) => setRole(/** @type {any} */ (e.target.value))}
                      aria-label="Role"
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2" role="group" aria-label="Role">
                    {roles.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setRole(r.id)}
                        className={cn(
                          'rounded-md border px-2 py-2 text-xs font-medium transition-colors duration-150',
                          role === r.id
                            ? 'border-[var(--color-primary)] bg-slate-900 text-white'
                            : 'border-[var(--color-border)] bg-white text-[var(--color-text-muted)] hover:bg-slate-50',
                        )}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {mode === 'register' ? (
                <Input
                  name="name"
                  type="text"
                  autoComplete="name"
                  label="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  error={fieldErrors.name}
                  placeholder="Your full name"
                />
              ) : null}

              <Input
                name="email"
                type="email"
                autoComplete="email"
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={fieldErrors.email}
                placeholder="you@college.edu"
              />

              <Input
                name="password"
                type="password"
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={fieldErrors.password}
                placeholder="••••••••"
              />

              {authError ? <ErrorBanner message={authError} /> : null}

              <Button type="submit" className="w-full" loading={isAuthLoading} disabled={isAuthLoading}>
                {mode === 'register' ? 'Create account' : 'Continue'}
              </Button>

              <div className="text-center text-xs text-[var(--color-text-muted)]">
                {mode === 'register' ? (
                  <button
                    type="button"
                    className="text-[var(--color-accent)] hover:underline font-medium"
                    onClick={() => setMode('login')}
                  >
                    Already have an account? Sign in
                  </button>
                ) : (
                  <button
                    type="button"
                    className="text-[var(--color-accent)] hover:underline font-medium"
                    onClick={() => setMode('register')}
                  >
                    Don&apos;t have an account? Register
                  </button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-[var(--color-text-muted)]">
          Demo: {mode === 'register' ? 'password must be 8+ characters with a letter + number.' : 'any password with 6+ characters works.'}{' '}
          Sample student email is pre-filled.
        </p>
        <p className="text-center text-xs">
          <Link to="/login" className="text-[var(--color-accent)] hover:underline font-medium">
            Forgot password?
          </Link>
        </p>
      </div>
    </div>
  )
}
