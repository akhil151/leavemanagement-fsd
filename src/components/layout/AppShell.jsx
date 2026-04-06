import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../ui/Button'
import { cn } from '../../utils/cn'
import { NotificationCenter } from './NotificationCenter'
import { ThemeToggle } from './ThemeToggle'
import { OfflineBanner } from '../system/OfflineBanner'

const navClass = ({ isActive }) =>
  cn(
    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150',
    isActive
      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
      : 'text-[var(--color-text-muted)] hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[var(--color-text)]',
  )

/**
 * @param {{ children: React.ReactNode; role: 'student' | 'teacher' | 'admin' }} props
 */
export function AppShell({ children, role }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const studentLinks = [
    { to: '/student', label: 'Overview', end: true },
    { to: '/student/apply', label: 'Apply leave' },
    { to: '/student/analytics', label: 'Analytics' },
  ]

  const teacherLinks = [
    { to: '/teacher', label: 'Inbox', end: true },
    { to: '/teacher/analytics', label: 'Analytics' },
  ]

  const adminLinks = [
    { to: '/admin', label: 'Directory', end: true },
    { to: '/admin/calendar', label: 'Holidays' },
    { to: '/admin/analytics', label: 'Analytics' },
  ]

  const links =
    role === 'student' ? studentLinks : role === 'teacher' ? teacherLinks : adminLinks

  return (
    <div className="min-h-dvh flex flex-col md:flex-row bg-[var(--color-surface)]">
      <aside className="w-full md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-[var(--color-border)] bg-[var(--color-surface-elevated)] flex flex-col">
        <div className="h-14 px-4 flex items-center border-b border-[var(--color-border)]">
          <Link to="/" className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-[var(--color-text)] tracking-tight">
              Campus Leave
            </span>
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-subtle)]">
              College ERP
            </span>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1" aria-label="Main">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={navClass}>
              <span>{l.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-[var(--color-border)] space-y-2">
          <div className="px-3 py-2 rounded-md bg-slate-50 dark:bg-slate-900/60 border border-[var(--color-border)]">
            <p className="text-xs font-medium text-[var(--color-text)] truncate">{user?.name}</p>
            <p className="text-[11px] text-[var(--color-text-muted)] truncate">{user?.email}</p>
            <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-subtle)] mt-1">
              {role}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => {
              logout()
              navigate('/login', { replace: true })
            }}
          >
            Sign out
          </Button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <OfflineBanner />
        <header className="h-14 px-4 sm:px-8 border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)] flex items-center justify-between gap-3">
          <p className="text-xs text-[var(--color-text-muted)] hidden sm:block">
            Academic year <span className="font-medium text-[var(--color-text)]">2025–26</span>
          </p>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[11px] px-2 py-0.5 rounded border border-[var(--color-border)] text-[var(--color-text-muted)] hidden md:inline">
              Demo environment
            </span>
            <ThemeToggle />
            <NotificationCenter />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-8 max-w-[var(--layout-max)] w-full mx-auto">{children}</main>
      </div>
    </div>
  )
}
