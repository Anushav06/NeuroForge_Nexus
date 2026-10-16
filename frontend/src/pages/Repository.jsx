import { useEffect, useState } from 'react'
import {
  CheckCircle2,
  ChevronDown,
  FolderKanban,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Radio,
  Unlink,
  X,
} from 'lucide-react'
import { fetchProjects } from '../api/client'
import { EmptyState, PageHeader } from '../components/ui'

/**
 * Repository / GitHub integration — MOCK, NO REAL BACKEND YET.
 *
 * There is no OAuth controller, no webhook receiver, and no repository
 * storage anywhere in either backend service (confirmed by a full controller
 * inventory of both user-service and cicd-service). Your trainer's ask for
 * "GitHub integration" is a real feature — OAuth App + webhook receiver +
 * REST sync — that someone on backend needs to build; it can't be faked
 * server-side from the frontend alone.
 *
 * This page follows the exact same pattern as the AI Assistant placeholder
 * in client.js (askAssistant): a fully-interactive UI running entirely on
 * fabricated, deterministic mock data, clearly marked so it's obvious what
 * to swap out once a real backend exists. Connection state lives only in
 * React state — it resets on refresh, since there's nowhere real to persist
 * it yet. When the backend ships, replace connectRepo/mockCommits/mockPRs
 * below with real fetch calls; the UI shape underneath doesn't need to change.
 */

// ── Deterministic mock data, seeded per project so it's stable within a session ──
const hashSeed = (str) => {
  let h = 2166136261
  const s = String(str)
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const mulberry32 = (seed) => {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const COMMIT_MESSAGES = [
  'fix: handle null assignee on task card',
  'feat: add coverage trend chart to monitoring',
  'chore: bump vite to latest',
  'refactor: extract release status pill',
  'fix: rollback reason now required',
  'docs: update integration notes',
  'feat: deploy modal now picks real builds',
]
const PR_TITLES = [
  'Add Milestone 4 frontend pages',
  'Fix task assignee resolution bug',
  'RBAC pass across Teams and Projects',
  'Dashboard: split manager vs contributor view',
]
const AUTHORS = ['Priya Sharma', 'Maneesh R', 'Tomiwa Okafor', 'Elena Vasquez', 'Marcus Lee']

function seedMockRepoData(projectId) {
  const rand = mulberry32(hashSeed(projectId))
  const commitCount = 4 + Math.floor(rand() * 3)
  const commits = Array.from({ length: commitCount }, (_, i) => ({
    sha: Math.floor(rand() * 0xfffffff).toString(16).padStart(7, '0'),
    message: COMMIT_MESSAGES[Math.floor(rand() * COMMIT_MESSAGES.length)],
    author: AUTHORS[Math.floor(rand() * AUTHORS.length)],
    hoursAgo: Math.round(1 + i * (4 + rand() * 10)),
  }))
  const prCount = 1 + Math.floor(rand() * 3)
  const prs = Array.from({ length: prCount }, (_, i) => ({
    number: 100 + i,
    title: PR_TITLES[Math.floor(rand() * PR_TITLES.length)],
    author: AUTHORS[Math.floor(rand() * AUTHORS.length)],
    status: rand() < 0.6 ? 'OPEN' : rand() < 0.85 ? 'MERGED' : 'CLOSED',
    daysAgo: Math.round(1 + i * (1 + rand() * 3)),
  }))
  return { commits, prs, lastWebhookMinsAgo: Math.round(2 + rand() * 40) }
}

const PR_PILL_STYLES = {
  OPEN: 'border-signal-success/25 bg-signal-success/10 text-signal-success',
  MERGED: 'border-steel-500/30 bg-steel-500/10 text-steel-300',
  CLOSED: 'border-signal-danger/25 bg-signal-danger/10 text-signal-danger',
}

function ConnectModal({ project, onClose, onConnect }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = url.trim()
    if (!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/.test(trimmed)) {
      setError('Enter a valid GitHub repo URL, e.g. https://github.com/org/repo')
      return
    }
    onConnect(trimmed)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-forge-700 bg-forge-900 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-base font-semibold text-forge-text">
            Connect GitHub — {project.name}
          </h3>
          <button type="button" onClick={onClose} className="text-forge-faint hover:text-forge-text">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-4 rounded-lg border border-signal-warning/25 bg-signal-warning/10 px-3 py-2 text-xs text-signal-warning">
          Demo mode — no real GitHub App is wired up yet. This simulates the connection so the
          frontend can be reviewed; nothing is sent to GitHub.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-xs font-medium text-forge-muted">
            Repository URL
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://github.com/neuroforge/atlas-auth-service"
              className="mt-1 w-full rounded-lg border border-forge-700 bg-forge-850 px-3 py-2 text-sm text-forge-text outline-none focus:border-ember-500"
            />
          </label>
          {error ? <p className="text-sm text-signal-danger">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-forge-700 px-3 py-2 text-sm text-forge-muted hover:bg-forge-850">
              Cancel
            </button>
            <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-ember-500 px-4 py-2 text-sm font-medium text-white hover:bg-ember-600">
              <GitBranch className="h-3.5 w-3.5" aria-hidden />
              Connect
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ProjectRepoSection({ project, isExpanded, onToggle, connection, onConnect, onDisconnect }) {
  const pId = project.id || project._id
  const [showConnectModal, setShowConnectModal] = useState(false)

  return (
    <section className="nf-card overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle(pId)}
        aria-expanded={isExpanded}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-forge-850/60"
      >
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-forge-faint transition-transform ${isExpanded ? '' : '-rotate-90'}`}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-sm font-semibold text-forge-text">
            {project.name}
          </span>
          <span className="block truncate font-mono text-[11px] text-steel-400">{pId}</span>
        </span>
        {connection ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-signal-success/25 bg-signal-success/10 px-2.5 py-1 font-mono text-[10px] font-semibold text-signal-success">
            <Radio className="h-3 w-3" aria-hidden /> CONNECTED
          </span>
        ) : (
          <span className="rounded-full border border-forge-600 bg-forge-800 px-2.5 py-1 font-mono text-[10px] font-semibold text-forge-muted">
            NOT CONNECTED
          </span>
        )}
      </button>

      {isExpanded ? (
        <div className="border-t border-forge-700/60 px-5 py-4">
          {!connection ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <GitBranch className="h-8 w-8 text-forge-faint" aria-hidden />
              <p className="text-sm text-forge-muted">No repository linked to this project yet.</p>
              <button
                type="button"
                onClick={() => setShowConnectModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-ember-500/40 bg-ember-500/10 px-3 py-1.5 text-xs font-medium text-ember-400 transition hover:bg-ember-500/20"
              >
                <GitBranch className="h-3.5 w-3.5" aria-hidden /> Connect GitHub
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between rounded-lg border border-forge-700/60 bg-forge-850/50 px-4 py-3">
                <div className="flex items-center gap-2 font-mono text-xs text-steel-300">
                  <GitBranch className="h-3.5 w-3.5 text-forge-faint" aria-hidden />
                  {connection.url.replace('https://github.com/', '')}
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 font-mono text-[11px] text-forge-faint">
                    <CheckCircle2 className="h-3 w-3 text-signal-success" aria-hidden />
                    Webhook active · last delivery {connection.lastWebhookMinsAgo}m ago
                  </span>
                  <button
                    type="button"
                    onClick={() => onDisconnect(pId)}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-forge-faint transition hover:bg-signal-danger/10 hover:text-signal-danger"
                  >
                    <Unlink className="h-3 w-3" aria-hidden /> Disconnect
                  </button>
                </div>
              </div>

              <div>
                <p className="mb-2 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-forge-faint">
                  <GitCommit className="h-3 w-3" aria-hidden /> Recent commits
                </p>
                <ul className="space-y-1.5">
                  {connection.commits.map((c) => (
                    <li key={c.sha} className="flex items-center gap-3 rounded-lg border border-forge-700/50 bg-forge-850/40 px-3 py-2 font-mono text-xs">
                      <span className="text-ember-400">{c.sha}</span>
                      <span className="min-w-0 flex-1 truncate text-forge-text">{c.message}</span>
                      <span className="shrink-0 text-forge-faint">{c.author} · {c.hoursAgo}h ago</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="mb-2 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-forge-faint">
                  <GitPullRequest className="h-3 w-3" aria-hidden /> Pull requests
                </p>
                <ul className="space-y-1.5">
                  {connection.prs.map((pr) => (
                    <li key={pr.number} className="flex items-center gap-3 rounded-lg border border-forge-700/50 bg-forge-850/40 px-3 py-2">
                      <span
                        className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold ${PR_PILL_STYLES[pr.status]}`}
                      >
                        {pr.status}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-forge-text">
                        #{pr.number} {pr.title}
                      </span>
                      <span className="shrink-0 font-mono text-[11px] text-forge-faint">
                        {pr.author} · {pr.daysAgo}d ago
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {showConnectModal ? (
        <ConnectModal
          project={project}
          onClose={() => setShowConnectModal(false)}
          onConnect={(url) => {
            onConnect(pId, url)
            setShowConnectModal(false)
          }}
        />
      ) : null}
    </section>
  )
}

export default function Repository() {
  const [projects, setProjects] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedIds, setExpandedIds] = useState(() => new Set())
  const [connections, setConnections] = useState({}) // { [projectId]: { url, commits, prs, lastWebhookMinsAgo } }

  useEffect(() => {
    let cancelled = false
    fetchProjects()
      .then((data) => {
        if (cancelled) return
        setProjects(data || [])
        if ((data || []).length > 0) setExpandedIds(new Set([data[0].id || data[0]._id]))
      })
      .catch((err) => !cancelled && setError(err.message ?? 'Failed to load projects.'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  function toggleProject(pId) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(pId)) next.delete(pId)
      else next.add(pId)
      return next
    })
  }

  function handleConnect(pId, url) {
    const mock = seedMockRepoData(pId)
    setConnections((prev) => ({ ...prev, [pId]: { url, ...mock } }))
  }

  function handleDisconnect(pId) {
    setConnections((prev) => {
      const next = { ...prev }
      delete next[pId]
      return next
    })
  }

  const safeProjects = projects || []

  return (
    <div>
      <PageHeader
        title="Repository"
        subtitle="Link a project to GitHub for commits, pull requests, and webhook activity."
      />

      <p className="mb-6 rounded-lg border border-signal-warning/25 bg-signal-warning/10 px-4 py-3 text-sm text-signal-warning">
        This page runs on mock data — there's no GitHub OAuth App or webhook receiver on the
        backend yet. Everything here is fully interactive so the flow can be reviewed now; wiring
        it to a real GitHub connection is backend work for later.
      </p>

      {error ? (
        <EmptyState icon={FolderKanban} title="Couldn't load projects" message={error} />
      ) : loading ? (
        <div aria-hidden className="space-y-4">
          {[0, 1].map((k) => (
            <div key={k} className="nf-card h-20 animate-pulse" />
          ))}
        </div>
      ) : safeProjects.length === 0 ? (
        <EmptyState icon={FolderKanban} title="No projects yet" message="Create a project first to link a repository." />
      ) : (
        <div className="space-y-4">
          {safeProjects.map((project) => {
            const pId = project.id || project._id
            return (
              <ProjectRepoSection
                key={pId}
                project={project}
                isExpanded={expandedIds.has(pId)}
                onToggle={toggleProject}
                connection={connections[pId]}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}