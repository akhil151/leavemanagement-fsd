import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
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
  const { user, login, authError, isAuthLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname

  const [email, setEmail] = useState('ananya.krishnan@college.edu')
  const [password, setPassword] = useState('password')
  const [role, setRole] = useState(/** @type {'student' | 'teacher' | 'admin'} */ ('student'))
  const [fieldErrors, setFieldErrors] = useState(/** @type {Record<string, string>} */ ({}))

  useEffect(() => {
    if (!user) return
    if (from && from !== '/login') {
      navigate(from, { replace: true })
      return
    }
    if (user.role === 'student') navigate('/student', { replace: true })
    else if (user.role === 'teacher') navigate('/teacher', { replace: true })
    else navigate('/admin', { replace: true })
  }, [user, from, navigate])

  const onSubmit = async (e) => {
    e.preventDefault()
    const eErr = validateEmail(email)
    const pErr = validatePassword(password)
    const next = {}
    if (eErr) next.email = eErr
    if (pErr) next.password = pErr
    setFieldErrors(next)
    if (Object.keys(next).length) return

    await login({ email, password, role })
  }

  if (user) return null

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
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Choose your role and enter your credentials.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <Label className="mb-2">Role</Label>
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
              </div>

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
                autoComplete="current-password"
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={fieldErrors.password}
                placeholder="••••••••"
              />

              {authError ? <ErrorBanner message={authError} /> : null}

              <Button type="submit" className="w-full" loading={isAuthLoading} disabled={isAuthLoading}>
                Continue
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-[var(--color-text-muted)]">
          Demo: any password with 6+ characters works. Sample student email is pre-filled.
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
