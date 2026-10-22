import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ChevronDown,
  FolderKanban,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Radio,
  RefreshCw,
  Unlink,
  X,
} from 'lucide-react'
import { beginGitHubOAuth, disconnectGitHubRepository, fetchProjects, fetchRepositoryActivity, updateProject } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { EmptyState, PageHeader } from '../components/ui'

const repoCoordinates = (url) => {
  const match = String(url || '').trim().match(/^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/?$/i)
  return match ? { owner: match[1], repo: match[2].replace(/\.git$/i, '') } : null
}

async function fetchPublicRepositoryActivity(repositoryUrl) {
  const repo = repoCoordinates(repositoryUrl)
  if (!repo) throw new Error('Enter a valid GitHub repository URL.')
  const base = `https://api.github.com/repos/${repo.owner}/${repo.repo}`
  const [commitsResponse, pullsResponse] = await Promise.all([
    fetch(`${base}/commits?per_page=6`),
    fetch(`${base}/pulls?state=all&sort=updated&direction=desc&per_page=6`),
  ])
  if (!commitsResponse.ok || !pullsResponse.ok) {
    throw new Error('This repository is private or GitHub could not load its public activity.')
  }
  const [commits, pulls] = await Promise.all([commitsResponse.json(), pullsResponse.json()])
  return {
    repositoryUrl,
    commits: commits.map((commit) => ({
      sha: commit.sha.slice(0, 7),
      url: commit.html_url,
      message: commit.commit.message.split('\n', 1)[0],
      author: commit.author?.login || commit.commit.author?.name || 'Unknown author',
      date: commit.commit.author?.date,
    })),
    prs: pulls.map((pull) => ({
      number: pull.number,
      url: pull.html_url,
      title: pull.title,
      author: pull.user?.login || 'Unknown author',
      status: pull.merged_at ? 'MERGED' : pull.state.toUpperCase(),
      updatedAt: pull.updated_at,
    })),
    events: [],
    webhookActive: false,
    webhookError: 'Authorize GitHub to enable push and pull request webhooks.',
    lastWebhookAt: null,
    syncedAt: new Date().toISOString(),
  }
}

const relativeTime = (date) => {
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60000))
  if (!date || Number.isNaN(elapsedMinutes)) return 'time unavailable'
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`
  const hours = Math.floor(elapsedMinutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

const PR_PILL_STYLES = {
  OPEN: 'border-signal-success/25 bg-signal-success/10 text-signal-success',
  MERGED: 'border-steel-500/30 bg-steel-500/10 text-steel-300',
  CLOSED: 'border-signal-danger/25 bg-signal-danger/10 text-signal-danger',
}

function ConnectModal({ project, onClose, onConnect }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = url.trim()
    if (!repoCoordinates(trimmed)) {
      setError('Enter a valid GitHub repo URL, e.g. https://github.com/org/repo')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onConnect(trimmed)
    } catch (err) {
      setError(err.message || 'Could not connect to this repository.')
    } finally {
      setSaving(false)
    }
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
        <p className="mb-4 rounded-lg border border-steel-500/25 bg-steel-500/10 px-3 py-2 text-xs text-steel-300">
          Public repositories connect immediately. Private repositories need GitHub authorization
          after the URL is saved; authorization enables private activity and webhooks.
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
            <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-forge-700 px-3 py-2 text-sm text-forge-muted hover:bg-forge-850 disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-ember-500 px-4 py-2 text-sm font-medium text-white hover:bg-ember-600 disabled:opacity-50">
              <GitBranch className="h-3.5 w-3.5" aria-hidden />
              {saving ? 'Connecting…' : 'Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ProjectRepoSection({ project, isExpanded, onToggle, connection, loadingActivity, activityError, canManage, onConnect, onAuthorize, onDisconnect, onRefresh }) {
  const pId = project.id || project._id
  const [showConnectModal, setShowConnectModal] = useState(false)
  const repoUrl = project.repositoryUrl

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
        {repoUrl ? (
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
          {!repoUrl ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <GitBranch className="h-8 w-8 text-forge-faint" aria-hidden />
              <p className="text-sm text-forge-muted">No repository linked to this project yet.</p>
              {canManage ? <button
                type="button"
                onClick={() => setShowConnectModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-ember-500/40 bg-ember-500/10 px-3 py-1.5 text-xs font-medium text-ember-400 transition hover:bg-ember-500/20"
              >
                <GitBranch className="h-3.5 w-3.5" aria-hidden /> Connect GitHub
              </button> : <p className="text-xs text-forge-faint">Ask a project manager to connect a repository.</p>}
            </div>
          ) : loadingActivity && !connection ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-forge-muted"><RefreshCw className="h-4 w-4 animate-spin" />Loading GitHub activity…</div>
          ) : activityError ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-sm text-signal-danger">{activityError}</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => onRefresh(pId, repoUrl)} className="inline-flex items-center gap-1.5 rounded-lg border border-forge-600 px-3 py-1.5 text-xs text-forge-muted hover:bg-forge-850"><RefreshCw className="h-3.5 w-3.5" />Retry</button>
                {canManage ? <button type="button" onClick={() => onAuthorize(pId, repoUrl)} className="rounded-lg border border-ember-500/40 px-3 py-1.5 text-xs text-ember-400 hover:bg-ember-500/10">Authorize GitHub</button> : null}
                {canManage ? <button type="button" onClick={() => onDisconnect(pId)} className="inline-flex items-center gap-1.5 rounded-lg border border-signal-danger/30 px-3 py-1.5 text-xs text-signal-danger hover:bg-signal-danger/10"><Unlink className="h-3.5 w-3.5" />Disconnect</button> : null}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between rounded-lg border border-forge-700/60 bg-forge-850/50 px-4 py-3">
                <div className="flex items-center gap-2 font-mono text-xs text-steel-300">
                  <GitBranch className="h-3.5 w-3.5 text-forge-faint" aria-hidden />
                  <a href={repoUrl} target="_blank" rel="noreferrer" className="hover:text-ember-400">{repoUrl.replace('https://github.com/', '')}</a>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] text-forge-faint">{connection?.webhookActive ? `Webhook active · ${connection.lastWebhookAt ? `last delivery ${relativeTime(connection.lastWebhookAt)}` : 'waiting for first delivery'}` : connection?.webhookError || 'Webhook not configured'}</span>
                  <span className="font-mono text-[11px] text-forge-faint">Synced {relativeTime(connection?.syncedAt)}</span>
                  <button type="button" onClick={() => onRefresh(pId, repoUrl)} title="Refresh GitHub activity" className="grid h-7 w-7 place-items-center rounded-md text-forge-faint hover:bg-forge-800 hover:text-forge-text"><RefreshCw className="h-3.5 w-3.5" /></button>
                  {canManage ? <button
                    type="button"
                    onClick={() => onDisconnect(pId)}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-forge-faint transition hover:bg-signal-danger/10 hover:text-signal-danger"
                  >
                    <Unlink className="h-3 w-3" aria-hidden /> Disconnect
                  </button> : null}
                </div>
              </div>

              <div>
                <p className="mb-2 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-forge-faint">
                  <GitCommit className="h-3 w-3" aria-hidden /> Recent commits
                </p>
                <ul className="space-y-1.5">
                  {connection?.commits?.length ? connection.commits.map((c) => (
                    <li key={c.sha} className="flex items-center gap-3 rounded-lg border border-forge-700/50 bg-forge-850/40 px-3 py-2 font-mono text-xs">
                      <a href={c.url} target="_blank" rel="noreferrer" className="text-ember-400 hover:underline">{c.sha}</a>
                      <span className="min-w-0 flex-1 truncate text-forge-text">{c.message}</span>
                      <span className="shrink-0 text-forge-faint">{c.author} · {relativeTime(c.date)}</span>
                    </li>
                  )) : <li className="py-2 text-xs text-forge-faint">No commits found.</li>}
                </ul>
              </div>

              <div>
                <p className="mb-2 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-forge-faint">
                  <Radio className="h-3 w-3" aria-hidden /> Webhook activity
                </p>
                <ul className="space-y-1.5">
                  {connection?.events?.length ? connection.events.map((event, index) => (
                    <li key={`${event.receivedAt}-${index}`} className="flex items-center gap-3 rounded-lg border border-forge-700/50 bg-forge-850/40 px-3 py-2 text-xs">
                      <span className="rounded-full border border-steel-500/30 bg-steel-500/10 px-2 py-0.5 font-mono text-[10px] text-steel-300">{event.event}{event.action ? ` · ${event.action}` : ''}</span>
                      {event.url ? <a href={event.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-forge-text hover:text-ember-400">{event.title}</a> : <span className="min-w-0 flex-1 truncate text-forge-text">{event.title}</span>}
                      <span className="shrink-0 font-mono text-[11px] text-forge-faint">{event.actor} · {relativeTime(event.receivedAt)}</span>
                    </li>
                  )) : <li className="py-2 text-xs text-forge-faint">No webhook deliveries received yet.</li>}
                </ul>
              </div>

              <div>
                <p className="mb-2 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-forge-faint">
                  <GitPullRequest className="h-3 w-3" aria-hidden /> Pull requests
                </p>
                <ul className="space-y-1.5">
                  {connection?.prs?.length ? connection.prs.map((pr) => (
                    <li key={pr.number} className="flex items-center gap-3 rounded-lg border border-forge-700/50 bg-forge-850/40 px-3 py-2">
                      <span
                        className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold ${PR_PILL_STYLES[pr.status]}`}
                      >
                        {pr.status}
                      </span>
                      <a href={pr.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm text-forge-text hover:text-ember-400">
                        #{pr.number} {pr.title}
                      </a>
                      <span className="shrink-0 font-mono text-[11px] text-forge-faint">
                        {pr.author} · {relativeTime(pr.updatedAt)}
                      </span>
                    </li>
                  )) : <li className="py-2 text-xs text-forge-faint">No pull requests found.</li>}
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
          onConnect={async (url) => {
            await onConnect(pId, url)
            setShowConnectModal(false)
          }}
        />
      ) : null}
    </section>
  )
}

export default function Repository() {
  const { hasRole } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const canManage = hasRole('ADMIN', 'PROJECT_LEAD', 'PROJECT_MANAGER', 'TEAM_LEAD')
  const [projects, setProjects] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedIds, setExpandedIds] = useState(() => new Set())
  const [connections, setConnections] = useState({})
  const [activityLoading, setActivityLoading] = useState({})
  const [activityErrors, setActivityErrors] = useState({})
  const [notice, setNotice] = useState('')

  const refreshRepository = useCallback(async (projectId, url) => {
    setActivityLoading((current) => ({ ...current, [projectId]: true }))
    setActivityErrors((current) => ({ ...current, [projectId]: '' }))
    try {
      let activity
      try {
        activity = await fetchRepositoryActivity(projectId)
      } catch (backendError) {
        try {
          activity = await fetchPublicRepositoryActivity(url)
        } catch {
          throw backendError
        }
      }
      setConnections((current) => ({ ...current, [projectId]: activity }))
    } catch (err) {
      setActivityErrors((current) => ({ ...current, [projectId]: err.message || 'Failed to load GitHub activity.' }))
    } finally {
      setActivityLoading((current) => ({ ...current, [projectId]: false }))
    }
  }, [])

  useEffect(() => {
    const result = searchParams.get('github')
    if (!result) return
    if (result === 'connected') setNotice('GitHub connected. Repository activity is now live.')
    else if (result === 'webhook_error') setNotice('Repository connected, but webhook setup needs attention. Check the webhook message below.')
    else setNotice(searchParams.get('message') || 'GitHub authorization did not complete.')
    setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams])

  useEffect(() => {
    let cancelled = false
    fetchProjects()
      .then((data) => {
        if (cancelled) return
        const projectList = Array.isArray(data) ? data : data?.content || []
        setProjects(projectList)
        if (projectList.length > 0) setExpandedIds(new Set([projectList[0].id || projectList[0]._id]))
      })
      .catch((err) => !cancelled && setError(err.message ?? 'Failed to load projects.'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    (projects || []).filter((project) => {
      const projectId = project.id || project._id
      return project.repositoryUrl && connections[projectId]?.repositoryUrl !== project.repositoryUrl
    }).forEach((project) => {
      const projectId = project.id || project._id
      refreshRepository(projectId, project.repositoryUrl)
    })
  }, [projects, connections, refreshRepository])

  function toggleProject(pId) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(pId)) next.delete(pId)
      else next.add(pId)
      return next
    })
  }

  async function handleConnect(pId, url) {
    await updateProject(pId, { repositoryUrl: url })
    setProjects((current) => current.map((project) => (project.id || project._id) === pId
      ? { ...project, repositoryUrl: url }
      : project))
    await refreshRepository(pId, url)
  }

  async function handleAuthorize(pId, url) {
    const response = await beginGitHubOAuth(pId, url)
    window.location.assign(response.authorizationUrl)
  }

  async function handleDisconnect(pId) {
    try {
      await disconnectGitHubRepository(pId)
      setProjects((current) => current.map((project) => (project.id || project._id) === pId ? { ...project, repositoryUrl: '' } : project))
      setConnections((prev) => {
        const next = { ...prev }
        delete next[pId]
        return next
      })
      setActivityErrors((current) => ({ ...current, [pId]: '' }))
    } catch (err) {
      setActivityErrors((current) => ({ ...current, [pId]: err.message || 'Could not disconnect repository.' }))
    }
  }

  const safeProjects = projects || []

  return (
    <div>
      <PageHeader
        title="Repository"
        subtitle="Connect GitHub repositories and browse commits, pull requests, and webhook activity."
      />

      <p className="mb-6 rounded-lg border border-forge-700 bg-forge-850/60 px-4 py-3 text-sm text-forge-muted">
        Private or public repository activity is fetched through GitHub OAuth. Push and pull request deliveries appear here when the backend webhook URL is publicly reachable.
      </p>
      {notice ? <p role="status" className="mb-4 rounded-lg border border-steel-500/25 bg-steel-500/10 px-4 py-3 text-sm text-steel-300">{notice}</p> : null}

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
                loadingActivity={activityLoading[pId]}
                activityError={activityErrors[pId]}
                canManage={canManage}
                onConnect={handleConnect}
                onAuthorize={handleAuthorize}
                onDisconnect={handleDisconnect}
                onRefresh={refreshRepository}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
