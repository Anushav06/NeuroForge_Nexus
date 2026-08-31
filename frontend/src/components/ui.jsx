import { Flame, Hammer, Loader2, ShieldCheck, Users } from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════
   Shared UI primitives — small building blocks reused across pages.
   Every color comes from the @theme tokens in src/index.css.
   ═══════════════════════════════════════════════════════════════ */

/** Inline loading indicator. */
export function Spinner({ className = 'h-4 w-4' }) {
  return <Loader2 className={`animate-spin ${className}`} aria-hidden />
}

/** Brand logo lock-up: ember flame tile + wordmark. */
export function BrandMark({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-linear-to-br from-ember-400 to-ember-600 shadow-lg shadow-ember-500/25">
        <Flame className="h-5 w-5 text-forge-950" aria-hidden />
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block font-display text-base font-bold tracking-tight text-forge-text">
            NeuroForge
          </span>
          <span className="block font-mono text-[10px] font-medium tracking-[0.3em] text-steel-400">
            NEXUS
          </span>
        </span>
      )}
    </div>
  )
}

/** Page title block with optional right-hand action slot. */
export function PageHeader({ title, subtitle, children }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-forge-text sm:text-3xl">
          {title}
        </h1>
        {subtitle ? <p className="mt-1 text-sm text-forge-muted">{subtitle}</p> : null}
      </div>
      {children ? <div className="flex items-center gap-3">{children}</div> : null}
    </header>
  )
}

const STAT_ACCENTS = {
  ember: 'bg-ember-500/10 text-ember-400 ring-1 ring-ember-500/25',
  steel: 'bg-steel-500/10 text-steel-400 ring-1 ring-steel-500/25',
  success: 'bg-signal-success/10 text-signal-success ring-1 ring-signal-success/25',
}

/** Dashboard metric card (value rendered in JetBrains Mono). */
export function StatCard({ icon: Icon, label, value, hint, accent = 'ember' }) {
  return (
    <div className="nf-card p-5 transition hover:border-forge-600">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-forge-muted">{label}</p>
        <span className={`grid h-9 w-9 place-items-center rounded-lg ${STAT_ACCENTS[accent]}`}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <p className="mt-3 font-mono text-3xl font-semibold text-forge-text">{value ?? '—'}</p>
      {hint ? <p className="mt-1 text-xs text-forge-faint">{hint}</p> : null}
    </div>
  )
}

const STATUS_PILL_STYLES = {
  ACTIVE: 'border-signal-success/25 bg-signal-success/10 text-signal-success',
  PLANNING: 'border-signal-warning/25 bg-signal-warning/10 text-signal-warning',
  BLOCKED: 'border-signal-danger/25 bg-signal-danger/10 text-signal-danger',
  COMPLETED: 'border-steel-500/25 bg-steel-500/10 text-steel-300',
}

const STATUS_DOT_STYLES = {
  ACTIVE: 'bg-signal-success',
  PLANNING: 'bg-signal-warning',
  BLOCKED: 'bg-signal-danger',
  COMPLETED: 'bg-steel-400',
}

/** Colored status pill — green/amber/red/steel from the signal palette. */
export function StatusPill({ status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-medium tracking-wide ${
        STATUS_PILL_STYLES[status] ?? 'border-forge-600 bg-forge-800 text-forge-muted'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT_STYLES[status] ?? 'bg-forge-faint'}`} />
      {status}
    </span>
  )
}

const ROLE_BADGE_STYLES = {
  ADMIN: 'border-ember-500/30 bg-ember-500/10 text-ember-300',
  PROJECT_LEAD: 'border-steel-500/30 bg-steel-500/10 text-steel-300',
  PROJECT_MANAGER: 'border-steel-500/30 bg-steel-500/10 text-steel-300',
  TEAM_LEAD: 'border-signal-success/25 bg-signal-success/10 text-signal-success',
  EMPLOYEE: 'border-forge-600 bg-forge-800 text-forge-muted',
}

/** Small role chip (ADMIN / PROJECT_LEAD / …). */
export function RoleBadge({ role }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wide ${
        ROLE_BADGE_STYLES[role] ?? 'border-forge-600 bg-forge-800 text-forge-muted'
      }`}
    >
      {role}
    </span>
  )
}

const AVATAR_TINTS = [
  'bg-ember-500/15 text-ember-300 ring-ember-500/30',
  'bg-steel-500/15 text-steel-300 ring-steel-500/30',
  'bg-signal-success/10 text-signal-success ring-signal-success/30',
  'bg-signal-warning/10 text-signal-warning ring-signal-warning/30',
]

const tintFor = (name = '?') =>
  AVATAR_TINTS[[...String(name)].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % AVATAR_TINTS.length]

const initialsOf = (name = '?') =>
  String(name)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('')

/** Initials avatar with a deterministic tint per person. */
export function Avatar({ name, className = 'h-8 w-8 text-xs' }) {
  return (
    <span
      title={name}
      className={`grid shrink-0 select-none place-items-center rounded-full font-semibold ring-1 ${tintFor(name)} ${className}`}
    >
      {initialsOf(name)}
    </span>
  )
}

/** Overlapping avatar row with a +N overflow chip. */
export function AvatarStack({ people = [], max = 4 }) {
  const visible = people.slice(0, max)
  const overflow = people.length - visible.length
  if (!people.length) return <span className="text-xs text-forge-faint">No members</span>
  return (
    <div className="flex items-center -space-x-2">
      {visible.map((person) => (
        <Avatar
          key={person.id}
          name={person.name}
          className="h-7 w-7 text-[10px] ring-2 ring-forge-900"
        />
      ))}
      {overflow > 0 && (
        <span className="grid h-7 w-7 place-items-center rounded-full bg-forge-800 font-mono text-[10px] text-forge-muted ring-2 ring-forge-900">
          +{overflow}
        </span>
      )}
    </div>
  )
}

/** Friendly placeholder for empty lists. */
export function EmptyState({ icon: Icon, title, message, children }) {
  return (
    <div className="nf-card flex flex-col items-center justify-center px-6 py-14 text-center">
      {Icon ? (
        <span className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-forge-800 text-forge-faint">
          <Icon className="h-6 w-6" aria-hidden />
        </span>
      ) : null}
      <p className="font-display text-base font-semibold text-forge-text">{title}</p>
      {message ? <p className="mt-1 max-w-sm text-sm text-forge-muted">{message}</p> : null}
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  )
}

/**
 * Split-screen shell for the Login / Register pages:
 * brand panel on the left (desktop), auth form on the right.
 */
export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-forge-950 lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Ambient forge glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-ember-500/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-steel-500/10 blur-3xl"
      />

      {/* Brand panel (desktop only) */}
      <aside className="relative hidden flex-col justify-between border-r border-forge-700/60 p-10 lg:flex">
        <BrandMark />
        <div className="my-auto max-w-md py-10">
          <h2 className="font-display text-4xl font-bold leading-tight tracking-tight text-forge-text">
            Forge software.
            <br />
            <span className="text-ember-400">Ship with fire.</span>
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-forge-muted">
            NeuroForge Nexus keeps squads, sprints and projects smelting in one place — from first
            spark to production release.
          </p>
          <ul className="mt-8 space-y-3.5 text-sm text-forge-muted">
            <li className="flex items-center gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ember-500/10 text-ember-400 ring-1 ring-ember-500/25">
                <Hammer className="h-4 w-4" aria-hidden />
              </span>
              Plan sprints and track every workstream
            </li>
            <li className="flex items-center gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-steel-500/10 text-steel-400 ring-1 ring-steel-500/25">
                <Users className="h-4 w-4" aria-hidden />
              </span>
              Organize cross-functional teams and roles
            </li>
            <li className="flex items-center gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-signal-success/10 text-signal-success ring-1 ring-signal-success/25">
                <ShieldCheck className="h-4 w-4" aria-hidden />
              </span>
              Role-aware access out of the box
            </li>
          </ul>
        </div>
      </aside>

      {/* Form column */}
      <div className="relative flex min-h-screen items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <BrandMark />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-forge-text">{title}</h1>
          <p className="mt-1 text-sm text-forge-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  )
}



