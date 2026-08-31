import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, Flame, Lock, Mail } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { AuthShell, Spinner } from '../components/ui'

/** Google's official four-color "G" mark, inlined so no extra dependency is needed. */
function GoogleG({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.859-3.0477.859-2.344 0-4.3282-1.5831-5.036-3.7104H.9574v2.3318C2.4382 15.9832 5.4818 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71c-.18-.54-.2822-1.1168-.2822-1.71s.1023-1.17.2823-1.71V4.9582H.9573C.3477 6.1732 0 7.5477 0 9s.3477 2.8268.9573 4.0418L3.964 10.71z"
      />
      <path
        fill="#EA4335"
        d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.426 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1627 6.656 3.5795 9 3.5795z"
      />
    </svg>
  )
}

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from ?? '/'

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const update = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }))

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message ?? 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to stoke the forge.">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Redirect notice after being bounced by a protected route */}
        {location.state?.from ? (
          <p className="rounded-lg border border-steel-500/30 bg-steel-500/10 px-3 py-2.5 text-xs text-steel-300">
            Please sign in to continue to <span className="font-mono">{location.state.from}</span>.
          </p>
        ) : null}

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
              autoComplete="current-password"
              placeholder="••••••••"
              value={form.password}
              onChange={update('password')}
              className="nf-input pl-10"
            />
          </div>
        </div>

        <button type="submit" disabled={loading} className="nf-btn-primary w-full">
          {loading ? (
            <>
              <Spinner /> Signing in…
            </>
          ) : (
            <>
              <Flame className="h-4 w-4" aria-hidden /> Sign in
            </>
          )}
        </button>
      </form>

      {/* OAuth placeholder — enable once the backend supports Google sign-in */}
      <div className="mt-6 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-forge-700" />
        <span className="font-mono text-[10px] uppercase tracking-wider text-forge-faint">or</span>
        <span className="h-px flex-1 bg-forge-700" />
      </div>

      <button
        type="button"
        disabled
        title="Google sign-in is coming soon"
        className="relative mt-4 flex w-full items-center justify-center gap-2.5 rounded-lg border border-forge-600 px-4 py-2.5 text-sm font-medium text-forge-text transition hover:bg-forge-850 focus:outline-none focus-visible:ring-2 focus-visible:ring-forge-600 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <GoogleG className="h-4 w-4" />
        Sign in with Google
        <span className="absolute right-3 rounded-full border border-signal-warning/30 bg-signal-warning/10 px-2 py-0.5 font-mono text-[10px] font-medium leading-none text-signal-warning">
          Coming soon
        </span>
      </button>

      <p className="mt-8 text-center text-sm text-forge-muted">
        New to the forge?{' '}
        <Link
          to="/register"
          className="font-semibold text-ember-400 underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </AuthShell>
  )
}
