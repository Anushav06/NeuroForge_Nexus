import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, Check, Flame, Lock, Mail, User } from 'lucide-react'
import { EMPLOYEE_SUB_ROLES, ROLES, ROLE_LABELS } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { AuthShell, Spinner } from '../components/ui'

const INITIAL_FORM = { name: '', email: '', password: '', role: 'EMPLOYEE', subRole: 'Developer' }

/* Password policy — the strength meter and requirements list are driven by these. */
const PASSWORD_RULES = [
  { key: 'length', label: '8+ characters', test: (pw) => pw.length >= 8 },
  { key: 'uppercase', label: 'Uppercase', test: (pw) => /[A-Z]/.test(pw) },
  { key: 'lowercase', label: 'Lowercase', test: (pw) => /[a-z]/.test(pw) },
  { key: 'number', label: 'Number', test: (pw) => /\d/.test(pw) },
  { key: 'special', label: 'Special character', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
]

/* Meter coloring — red / amber / green from the theme's signal palette. */
const STRENGTH_LEVELS = {
  0: { label: '', bar: 'bg-forge-700', text: 'text-forge-faint' },
  1: { label: 'Weak', bar: 'bg-signal-danger', text: 'text-signal-danger' },
  2: { label: 'Medium', bar: 'bg-signal-warning', text: 'text-signal-warning' },
  3: { label: 'Strong', bar: 'bg-signal-success', text: 'text-signal-success' },
}

function getStrength(password) {
  const passed = PASSWORD_RULES.filter((rule) => rule.test(password)).length
  if (!password) return { level: 0, passed: 0, label: '' }
  if (passed <= 2) return { level: 1, passed, label: 'Weak' }
  if (passed <= 4) return { level: 2, passed, label: 'Medium' }
  return { level: 3, passed, label: 'Strong' }
}

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState(INITIAL_FORM)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const update = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }))

  // Live password feedback — recomputed on every keystroke.
  const strength = getStrength(form.password)
  // "Create account" gate: minimum bar is 8+ chars with a number (full strength not required).
  const isPasswordUsable = PASSWORD_RULES[0].test(form.password) && PASSWORD_RULES[3].test(form.password)

  /** EMPLOYEE is the only role with a sub-role — clear it when another role is chosen. */
  function handleRoleChange(event) {
    const role = event.target.value
    setForm((f) => ({ ...f, role, subRole: role === 'EMPLOYEE' ? f.subRole ?? 'Developer' : null }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(form)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message ?? 'Registration failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Join the forge" subtitle="Create your NeuroForge Nexus account.">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error ? (
          <p
            role="alert"
            className="flex items-center gap-2 rounded-lg border border-signal-danger/30 bg-signal-danger/10 px-3 py-2.5 text-sm text-signal-danger"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            {error}
          </p>
        ) : null}

        <div>
          <label htmlFor="name" className="nf-label">
            Full name
          </label>
          <div className="relative">
            <User
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-forge-faint"
              aria-hidden
            />
            <input
              id="name"
              type="text"
              required
              autoComplete="name"
              placeholder="Ada Lovelace"
              value={form.name}
              onChange={update('name')}
              className="nf-input pl-10"
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="nf-label">
            Email
          </label>
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-forge-faint"
              aria-hidden
            />
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@neuroforge.dev"
              value={form.email}
              onChange={update('email')}
              className="nf-input pl-10"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="nf-label">
            Password
          </label>
          <div className="relative">
            <Lock
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-forge-faint"
              aria-hidden
            />
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={form.password}
              onChange={update('password')}
              className="nf-input pl-10"
            />
          </div>

          {/* Live strength meter — one segment per rule, colored by overall level */}
          <div className="mt-2.5 flex items-center gap-3">
            <div
              className="flex h-1 flex-1 gap-1"
              role="progressbar"
              aria-label="Password strength"
              aria-valuemin={0}
              aria-valuemax={PASSWORD_RULES.length}
              aria-valuenow={strength.passed}
            >
              {PASSWORD_RULES.map((rule) => (
                <span
                  key={rule.key}
                  className={`h-full flex-1 rounded-full transition-colors duration-200 ${
                    rule.test(form.password) ? STRENGTH_LEVELS[strength.level].bar : 'bg-forge-700'
                  }`}
                />
              ))}
            </div>
            <span
              aria-live="polite"
              className={`w-16 text-right font-mono text-[10px] font-semibold uppercase tracking-wider ${
                STRENGTH_LEVELS[strength.level].text
              }`}
            >
              {strength.label || '—'}
            </span>
          </div>

          {/* Requirements — each item lights up as it is satisfied */}
          <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {PASSWORD_RULES.map((rule) => {
              const ok = rule.test(form.password)
              return (
                <li
                  key={rule.key}
                  className={`flex items-center gap-1 text-[11px] transition-colors ${
                    ok ? 'text-signal-success' : 'text-forge-faint'
                  }`}
                >
                  <Check className={`h-3 w-3 ${ok ? '' : 'opacity-40'}`} aria-hidden />
                  {rule.label}
                </li>
              )
            })}
          </ul>
        </div>

        {/* Role picker — the sub-role dropdown only appears for EMPLOYEE */}
        <div className={form.role === 'EMPLOYEE' ? 'grid grid-cols-1 gap-4 sm:grid-cols-2' : ''}>
          <div>
            <label htmlFor="role" className="nf-label">
              Role
            </label>
            <select id="role" value={form.role} onChange={handleRoleChange} className="nf-input">
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </div>

          {form.role === 'EMPLOYEE' ? (
            <div>
              <label htmlFor="subRole" className="nf-label">
                Sub-role
              </label>
              <select
                id="subRole"
                value={form.subRole ?? 'Developer'}
                onChange={update('subRole')}
                className="nf-input"
              >
                {EMPLOYEE_SUB_ROLES.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
        <p className="text-xs text-forge-faint">
          Employees choose a sub-role: Developer, Tester, Junior or Senior.
        </p>

        <button type="submit" disabled={loading || !isPasswordUsable} className="nf-btn-primary w-full">
          {loading ? (
            <>
              <Spinner /> Creating account…
            </>
          ) : (
            <>
              <Flame className="h-4 w-4" aria-hidden /> Create account
            </>
          )}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-forge-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-ember-400 underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}
