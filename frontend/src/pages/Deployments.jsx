import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Cpu,
  FolderKanban,
  Gauge,
  MemoryStick,
  Rocket,
  RotateCcw,
  Server,
  X,
} from 'lucide-react'
import { fetchProjects, fetchProjectDeployments, fetchPipelines, deployBuild, rollbackDeployment } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { EmptyState, PageHeader, StatCard } from '../components/ui'

/**
 * Milestone 4 — Deployments.
 *
 * Backed by the real cicd-service DeploymentController. The Deploy modal
 * pulls actual successful builds via fetchPipelines() (same data source as
 * the Pipelines page) instead of a raw build-ID text input.
 */

const MANAGE_ROLES = ['ADMIN', 'PROJECT_LEAD', 'PROJECT_MANAGER', 'TEAM_LEAD']
const ENVIRONMENTS = ['DEV', 'STAGING', 'PROD']

const DEPLOY_PILL_STYLES = {
  DEPLOYED: 'border-signal-success/25 bg-signal-success/10 text-signal-success',
  IN_PROGRESS: 'border-signal-warning/25 bg-signal-warning/10 text-signal-warning',
  FAILED: 'border-signal-danger/25 bg-signal-danger/10 text-signal-danger',
  ROLLED_BACK: 'border-forge-600 bg-forge-800 text-forge-muted',
}

const ENV_STYLES = {
  DEV: 'border-steel-500/30 bg-steel-500/10 text-steel-300',
  STAGING: 'border-signal-warning/25 bg-signal-warning/10 text-signal-warning',
  PROD: 'border-ember-500/30 bg-ember-500/10 text-ember-400',
}

function StatusPill({ status }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wider ${
        DEPLOY_PILL_STYLES[status] ?? 'border-forge-600 bg-forge-800 text-forge-muted'
      }`}
    >
      {status ?? 'UNKNOWN'}
    </span>
  )
}

function EnvBadge({ environment }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider ${
        ENV_STYLES[environment] ?? 'border-forge-600 bg-forge-800 text-forge-muted'
      }`}
    >
      {environment ?? '—'}
    </span>
  )
}

const relativeTime = (iso) => {
  if (!iso) return '—'
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

function DeploymentsSkeleton() {
  return (
    <div aria-hidden>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <div key={key} className="nf-card h-28 animate-pulse" />
        ))}
      </div>
      <div className="nf-card mt-8 h-24 animate-pulse" />
    </div>
  )
}

/* ── Deploy modal — real build picker, not a text input ─────── */

function DeployModal({ project, onClose, onSubmit, submitting, error }) {
  const [builds, setBuilds] = useState(null)
  const [buildsError, setBuildsError] = useState(null)
  const [selectedBuildId, setSelectedBuildId] = useState('')
  const [environment, setEnvironment] = useState('DEV')

  useEffect(() => {
    let cancelled = false
    const pId = project.id || project._id
    fetchPipelines(pId)
      .then((data) => {
        if (cancelled) return
        const successful = (data || []).filter((b) => b.status === 'SUCCESS')
        setBuilds(successful)
      })
      .catch((err) => {
        if (!cancelled) setBuildsError(err.message ?? 'Failed to load builds.')
      })
    return () => {
      cancelled = true
    }
  }, [project])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl border border-forge-700 bg-forge-900 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-base font-semibold text-forge-text">
            Deploy — {project.name}
          </h3>
          <button type="button" onClick={onClose} className="text-forge-faint hover:text-forge-text">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit({ buildId: selectedBuildId, environment })
          }}
          className="space-y-4"
        >
          <label className="block text-xs font-medium text-forge-muted">
            Build to deploy
            {buildsError ? (
              <p className="mt-1 text-xs text-signal-danger">{buildsError}</p>
            ) : builds === null ? (
              <div className="mt-1 h-9 animate-pulse rounded-lg bg-forge-850" />
            ) : builds.length === 0 ? (
              <p className="mt-1 rounded-lg border border-forge-700 bg-forge-850 px-3 py-2 text-xs text-forge-faint">
                No successful builds available for this project yet — check Pipelines first.
              </p>
            ) : (
              <select
                required
                value={selectedBuildId}
                onChange={(e) => setSelectedBuildId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-forge-700 bg-forge-850 px-3 py-2 text-sm text-forge-text outline-none focus:border-ember-500"
              >
                <option value="">— select a successful build —</option>
                {builds.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.branch} · {b.commitHash} · {relativeTime(b.startedAt)}
                  </option>
                ))}
              </select>
            )}
          </label>

          <label className="block text-xs font-medium text-forge-muted">
            Environment
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              className="mt-1 w-full rounded-lg border border-forge-700 bg-forge-850 px-3 py-2 text-sm text-forge-text outline-none focus:border-ember-500"
            >
              {ENVIRONMENTS.map((env) => (
                <option key={env} value={env}>
                  {env}
                </option>
              ))}
            </select>
          </label>

          {error ? <p className="text-sm text-signal-danger">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-forge-700 px-3 py-2 text-sm text-forge-muted hover:bg-forge-850"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedBuildId}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ember-500 px-4 py-2 text-sm font-medium text-white hover:bg-ember-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Rocket className="h-3.5 w-3.5" aria-hidden />
              {submitting ? 'Deploying…' : 'Deploy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Rollback confirm modal (reason required) ────────────────── */

function RollbackModal({ deployment, onClose, onSubmit, submitting, error }) {
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-forge-700 bg-forge-900 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-base font-semibold text-forge-text">
            Roll back {deployment.environment} deployment?
          </h3>
          <button type="button" onClick={onClose} className="text-forge-faint hover:text-forge-text">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit(reason)
          }}
          className="space-y-4"
        >
          <label className="block text-xs font-medium text-forge-muted">
            Reason for rollback
            <textarea
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. elevated error rate after deploy"
              className="mt-1 w-full rounded-lg border border-forge-700 bg-forge-850 px-3 py-2 text-sm text-forge-text outline-none focus:border-ember-500"
            />
          </label>
          {error ? <p className="text-sm text-signal-danger">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-forge-700 px-3 py-2 text-sm text-forge-muted hover:bg-forge-850"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-signal-danger/40 bg-signal-danger/10 px-4 py-2 text-sm font-medium text-signal-danger hover:bg-signal-danger/20 disabled:opacity-60"
            >
              <RotateCcw className={`h-3.5 w-3.5 ${submitting ? 'animate-spin' : ''}`} aria-hidden />
              {submitting ? 'Rolling back…' : 'Roll back'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Current-environment mini cards ──────────────────────────── */

function CurrentEnvCard({ environment, deployment }) {
  return (
    <div className="rounded-lg border border-forge-700/60 bg-forge-850/50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <EnvBadge environment={environment} />
        {deployment ? <StatusPill status={deployment.status} /> : null}
      </div>
      {deployment ? (
        <>
          <p className="truncate font-mono text-xs text-forge-text">
            {deployment.version || deployment.imageTag || '—'}
          </p>
          <p className="mt-1 font-mono text-[10px] text-forge-faint">
            {relativeTime(deployment.startedAt)}
          </p>
          {deployment.replicasDesired != null ? (
            <p className="mt-2 flex items-center gap-1 font-mono text-[10px] text-steel-300">
              <Server className="h-3 w-3" aria-hidden />
              {deployment.replicasReady ?? 0}/{deployment.replicasDesired} pods
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-xs text-forge-faint">No deployment yet</p>
      )}
    </div>
  )
}

/* ── Single deployment row ───────────────────────────────────── */

function DeploymentRow({ deployment, canManage, onRollback, rollbackPending }) {
  const canRollThisBack = canManage && deployment.status === 'DEPLOYED'
  return (
    <li className="rounded-lg border border-forge-700/60 bg-forge-850/50 p-4 transition hover:border-forge-600">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <EnvBadge environment={deployment.environment} />
        <StatusPill status={deployment.status} />
        <span className="font-mono text-xs text-forge-muted">
          {deployment.version || deployment.imageTag || deployment.id}
        </span>

        <div className="ml-auto flex items-center gap-3">
          {deployment.cpuPercent != null ? (
            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-forge-faint">
              <Cpu className="h-3 w-3" aria-hidden />
              {Math.round(deployment.cpuPercent)}%
            </span>
          ) : null}
          {deployment.memoryPercent != null ? (
            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-forge-faint">
              <MemoryStick className="h-3 w-3" aria-hidden />
              {Math.round(deployment.memoryPercent)}%
            </span>
          ) : null}
          <span className="font-mono text-[11px] text-forge-faint">
            {deployment.deployedBy ? `by ${deployment.deployedBy} · ` : ''}
            {relativeTime(deployment.startedAt)}
          </span>

          {canRollThisBack ? (
            <button
              type="button"
              onClick={() => onRollback(deployment)}
              disabled={rollbackPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-forge-600 px-2.5 py-1.5 text-xs font-medium text-forge-muted transition hover:bg-forge-850 hover:text-forge-text disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RotateCcw
                className={`h-3.5 w-3.5 ${rollbackPending ? 'animate-spin' : ''}`}
                aria-hidden
              />
              Rollback
            </button>
          ) : null}
        </div>
      </div>

      {deployment.rollbackReason ? (
        <p className="mt-3 border-t border-forge-700/50 pt-3 text-xs text-forge-muted">
          Rollback reason: {deployment.rollbackReason}
        </p>
      ) : null}
    </li>
  )
}

/* ── Expandable per-project section ─────────────────────────── */

function ProjectSection({
  project,
  deployments,
  isExpanded,
  onToggle,
  canManage,
  onDeploy,
  onRollback,
  rollingBackId,
}) {
  const pId = project.id || project._id

  const currentByEnv = useMemo(() => {
    const map = {}
    for (const env of ENVIRONMENTS) {
      const forEnv = deployments
        .filter((d) => d.environment === env && d.status === 'DEPLOYED')
        .sort((a, b) => new Date(b.startedAt ?? 0) - new Date(a.startedAt ?? 0))
      map[env] = forEnv[0] ?? null
    }
    return map
  }, [deployments])

  const sortedDeployments = useMemo(
    () => [...deployments].sort((a, b) => new Date(b.startedAt ?? 0) - new Date(a.startedAt ?? 0)),
    [deployments],
  )

  return (
    <section className="nf-card overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle(pId)}
        aria-expanded={isExpanded}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-forge-850/60"
      >
        <Gauge className="h-4 w-4 shrink-0 text-forge-faint" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-sm font-semibold text-forge-text">
            {project.name}
          </span>
          <span className="block truncate font-mono text-[11px] text-steel-400">{pId}</span>
        </span>
        <span className="hidden items-center gap-4 font-mono text-[11px] text-forge-muted sm:flex">
          <span>{deployments.length} deployments</span>
        </span>
      </button>

      {isExpanded ? (
        <div className="border-t border-forge-700/60 px-5 py-4">
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {ENVIRONMENTS.map((env) => (
              <CurrentEnvCard key={env} environment={env} deployment={currentByEnv[env]} />
            ))}
          </div>

          {canManage ? (
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={() => onDeploy(project)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-ember-500/40 bg-ember-500/10 px-3 py-1.5 text-xs font-medium text-ember-400 transition hover:bg-ember-500/20"
              >
                <Rocket className="h-3.5 w-3.5" aria-hidden />
                Deploy
              </button>
            </div>
          ) : null}

          {sortedDeployments.length === 0 ? (
            <p className="py-4 text-center text-sm text-forge-muted">
              No deployments recorded for this project yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {sortedDeployments.map((deployment) => (
                <DeploymentRow
                  key={deployment.id}
                  deployment={deployment}
                  canManage={canManage}
                  onRollback={onRollback}
                  rollbackPending={rollingBackId === deployment.id}
                />
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  )
}

/* ── Page ───────────────────────────────────────────────────── */

export default function Deployments() {
  const { hasRole } = useAuth()
  const canManage = hasRole(...MANAGE_ROLES)

  const [projects, setProjects] = useState(null)
  const [deploymentsByProject, setDeploymentsByProject] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedIds, setExpandedIds] = useState(() => new Set())

  const [deployTarget, setDeployTarget] = useState(null) // project
  const [deploySubmitting, setDeploySubmitting] = useState(false)
  const [deployError, setDeployError] = useState(null)

  const [rollbackTarget, setRollbackTarget] = useState(null) // { project, deployment }
  const [rollbackSubmitting, setRollbackSubmitting] = useState(false)
  const [rollbackError, setRollbackError] = useState(null)
  const [rollingBackId, setRollingBackId] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const projectData = (await fetchProjects()) || []
        const entries = await Promise.all(
          projectData.map(async (p) => {
            const pId = p.id || p._id
            const deployments = await fetchProjectDeployments(pId).catch(() => [])
            return [pId, deployments || []]
          }),
        )
        if (cancelled) return
        setProjects(projectData)
        setDeploymentsByProject(Object.fromEntries(entries))
        if (projectData.length > 0) {
          setExpandedIds(new Set([projectData[0].id || projectData[0]._id]))
        }
      } catch (err) {
        if (!cancelled) setError(err.message ?? 'Failed to load deployments.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const totals = useMemo(() => {
    const all = Object.values(deploymentsByProject).flat()
    return {
      total: all.length,
      live: all.filter((d) => d.status === 'DEPLOYED').length,
      failed: all.filter((d) => d.status === 'FAILED').length,
    }
  }, [deploymentsByProject])

  function toggleProject(pId) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(pId)) next.delete(pId)
      else next.add(pId)
      return next
    })
  }

  async function handleDeploySubmit({ buildId, environment }) {
    if (!deployTarget) return
    const pId = deployTarget.id || deployTarget._id
    setDeploySubmitting(true)
    setDeployError(null)
    try {
      const deployment = await deployBuild(buildId, environment)
      setDeploymentsByProject((prev) => ({
        ...prev,
        [pId]: [deployment, ...(prev[pId] || [])],
      }))
      setDeployTarget(null)
    } catch (err) {
      setDeployError(err.message ?? 'Failed to deploy build.')
    } finally {
      setDeploySubmitting(false)
    }
  }

  async function handleRollbackSubmit(reason) {
    if (!rollbackTarget) return
    const { project, deployment } = rollbackTarget
    const pId = project.id || project._id
    setRollbackSubmitting(true)
    setRollbackError(null)
    setRollingBackId(deployment.id)
    try {
      const updated = await rollbackDeployment(deployment.id, reason)
      setDeploymentsByProject((prev) => ({
        ...prev,
        [pId]: (prev[pId] || []).map((d) => (d.id === deployment.id ? { ...d, ...updated } : d)),
      }))
      setRollbackTarget(null)
    } catch (err) {
      setRollbackError(err.message ?? 'Rollback failed.')
    } finally {
      setRollbackSubmitting(false)
      setRollingBackId(null)
    }
  }

  const safeProjects = projects || []

  return (
    <div>
      <PageHeader title="Deployments" subtitle="Environment status and deployment history across the forge." />

      {error ? (
        <EmptyState icon={AlertTriangle} title="Couldn't load deployments" message={error} />
      ) : loading ? (
        <DeploymentsSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard icon={Rocket} label="Total Deployments" value={totals.total} hint="across all projects" accent="ember" />
            <StatCard icon={Server} label="Currently Live" value={totals.live} hint="active deployments" accent="success" />
            <StatCard icon={AlertTriangle} label="Failed" value={totals.failed} hint="need attention" accent="danger" />
          </div>

          <h2 className="mb-4 mt-8 font-display text-lg font-semibold text-forge-text">
            Deployments by project
          </h2>

          {safeProjects.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="No projects yet"
              message="Create a project first — its deployments will show up here."
            />
          ) : (
            <div className="space-y-4">
              {safeProjects.map((project) => {
                const pId = project.id || project._id
                return (
                  <ProjectSection
                    key={pId}
                    project={project}
                    deployments={deploymentsByProject[pId] ?? []}
                    isExpanded={expandedIds.has(pId)}
                    onToggle={toggleProject}
                    canManage={canManage}
                    onDeploy={(project) => {
                      setDeployError(null)
                      setDeployTarget(project)
                    }}
                    onRollback={(deployment) => {
                      setRollbackError(null)
                      setRollbackTarget({ project, deployment })
                    }}
                    rollingBackId={rollingBackId}
                  />
                )
              })}
            </div>
          )}
        </>
      )}

      {deployTarget ? (
        <DeployModal
          project={deployTarget}
          onClose={() => setDeployTarget(null)}
          onSubmit={handleDeploySubmit}
          submitting={deploySubmitting}
          error={deployError}
        />
      ) : null}

      {rollbackTarget ? (
        <RollbackModal
          deployment={rollbackTarget.deployment}
          onClose={() => setRollbackTarget(null)}
          onSubmit={handleRollbackSubmit}
          submitting={rollbackSubmitting}
          error={rollbackError}
        />
      ) : null}
    </div>
  )
}
