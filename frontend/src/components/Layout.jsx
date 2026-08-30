import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { FolderKanban, LayoutDashboard, LogOut, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Avatar, BrandMark, RoleBadge } from './ui'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/projects', label: 'Projects', icon: FolderKanban, end: false },
  { to: '/teams', label: 'Teams', icon: Users, end: false },
]

const navLinkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive
      ? 'bg-ember-500/10 text-ember-400'
      : 'text-forge-muted hover:bg-forge-850 hover:text-forge-text'
  }`

const mobileNavLinkClass = ({ isActive }) =>
  `flex flex-col items-center gap-0.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition ${
    isActive ? 'text-ember-400' : 'text-forge-faint hover:text-forge-text'
  }`

/**
 * Persistent app shell: fixed left sidebar on desktop (logo, nav,
 * user card + sign out), compact top bar on mobile. Page content
 * renders through <Outlet />.
 */
export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleSignOut() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-forge-950">
      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-forge-700/70 bg-forge-900/70 backdrop-blur md:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-forge-700/70 px-5">
          <BrandMark />
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <p className="px-3 pb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-forge-faint">
            Workspace
          </p>
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={navLinkClass}>
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Current user + sign out */}
        <div className="shrink-0 border-t border-forge-700/70 p-3">
          <div className="flex items-center gap-3 rounded-lg bg-forge-850 p-3">
            <Avatar name={user.name} className="h-9 w-9 text-xs" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-forge-text">{user.name}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <RoleBadge role={user.role} />
                {user.subRole ? (
                  <span className="font-mono text-[10px] text-forge-faint">{user.subRole}</span>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              title="Sign out"
              aria-label="Sign out"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-forge-muted transition hover:bg-forge-800 hover:text-signal-danger"
            >
              <LogOut className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile top bar ──────────────────────────────────── */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-forge-700/70 bg-forge-900/85 px-4 backdrop-blur md:hidden">
        <BrandMark compact />
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={mobileNavLinkClass}>
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Sign out"
            className="ml-1 grid h-9 w-9 place-items-center rounded-md text-forge-faint transition hover:text-signal-danger"
          >
            <LogOut className="h-4 w-4" aria-hidden />
          </button>
        </nav>
      </header>

      {/* ── Page content ────────────────────────────────────── */}
      <main className="md:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
