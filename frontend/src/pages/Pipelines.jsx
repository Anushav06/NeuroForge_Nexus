import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Check,
  ChevronDown,
  FolderKanban,
  GitBranch,
  Rocket,
  RotateCcw,
  ShieldCheck,
  Timer,
  TrendingUp,
  X,
} from 'lucide-react'
import { fetchPipelineStats, fetchPipelines, fetchProjects, triggerRollback } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { EmptyState, PageHeader, StatCard } from '../components/ui'

/**
 * Milestone 3 — CI/CD Pipelines.
 *
 * Builds, stats, and rollback are served from the real cicd-service backend
 * (see client.js). Falls back to mock data if USE_MOCK_PIPELINES is set.
 */

const ROLLBACK_ROLES = ['ADMIN', 'PROJECT_LEAD', 'PROJECT_MANAGER']

const formatDuration = (totalSeconds) => {
  const s = Number(totalSeconds) || 0
  const mins = Math.floor(s / 60)
  const secs = Math.round(s % 60)
  return mins > 0 ? `${mins}m ${String(secs).padStart(2, '0')}s` : `${secs}s`
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

function PipelinesSkeleton() {
  return (
    <div aria-hidden>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <div key={key} className="nf-card h-32 animate-pulse" />
        ))}
      </div>
      <div className="nf-card mt-8 h-24 animate-pulse" />
      <div className="nf-card mt-4 h-24 animate-pulse" />
    </div>
  )
}

/* ── Status pill ─────────────────────────────────────────────── */

const BUILD_PILL_STYLES = {
  SUCCESS: 'border-signal-success/25 bg-signal-success/10 text-signal-success',
  FAILED: 'border-signal-danger/25 bg-signal-danger/10 text-signal-danger',
  RUNNING: 'border-signal-warning/25 bg-signal-warning/10 text-signal-warning',
}

function BuildStatusPill({ status }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wider ${
        BUILD_PILL_STYLES[status] ?? 'border-forge-600 bg-forge-800 text-forge-muted'
      }`}
    >
      {status === 'RUNNING' ? (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal-warning opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-signal-warning" />
        </span>
      ) : null}
      {status}
    </span>
  )
}

/* ── Stage tracker: Build → Test → Sonar → Docker → Deploy ──── */

const STAGE_NODE_STYLES = {
  PASSED: {
    node: 'border-signal-success/40 bg-signal-success/15 text-signal-success',
    line: 'bg-signal-success/40',
    icon: Check,
  },
  FAILED: {
    node: 'border-signal-danger/40 bg-signal-danger/15 text-signal-danger',
    line: 'bg-forge-700',
    icon: X,
  },
  PENDING: {
    node: 'border-forge-600 bg-forge-800 text-forge-faint',
    line: 'bg-forge-700',
    icon: null,
  },
}

function StageTracker({ stages }) {
  const list = stages || []
  return (
    <ol className="flex items-start">
      {list.map((stage, index) => {
        const style = STAGE_NODE_STYLES[stage.status] ?? STAGE_NODE_STYLES.PENDING
        const StageIcon = style.icon
        const isLast = index === list.length - 1
        return (
          <li key={stage.name} className={`flex items-start ${isLast ? '' : 'flex-1'}`}>
            <div className="flex w-14 shrink-0 flex-col items-center gap-1.5">
              <span className={`grid h-6 w-6 place-items-center rounded-full border ${style.node}`}>
                {StageIcon ? (
                  <StageIcon className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-forge-faint" />
                )}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-wider text-forge-faint">
                {stage.name}
              </span>
            </div>
            {isLast ? null : <span className={`mt-3 h-px flex-1 ${style.line}`} aria-hidden />}
          </li>
        )
      })}
    </ol>
  )
}

/* ── Test results summary: "Tests: 247 passed | 0 failed | Coverage: 87%" ── */
/* Reads Build.testResult, populated by cicd-service but previously never
   rendered anywhere in the UI — the spec's expected M3 output explicitly
   calls for this line. Renders nothing if a build has no testResult yet
   (e.g. still RUNNING, or older seed data predating this field). */

function TestResultSummary({ testResult }) {
  if (!testResult) return null
  const { passed = 0, failed = 0, skipped = 0, coveragePercent } = testResult
  const hasCoverage = typeof coveragePercent === 'number'

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-forge-700/50 pt-3 font-mono text-[11px]">
      <span className="inline-flex items-center gap-1.5 text-signal-success">
        <Check className="h-3 w-3" aria-hidden />
        {passed} passed
      </span>
      {failed > 0 ? (
        <span className="inline-flex items-center gap-1.5 text-signal-danger">
          <X className="h-3 w-3" aria-hidden />
          {failed} failed
        </span>
      ) : null}
      {skipped > 0 ? <span className="text-forge-faint">{skipped} skipped</span> : null}
      {hasCoverage ? (
        <span className="inline-flex items-center gap-1.5 text-steel-300">
          <ShieldCheck className="h-3 w-3" aria-hidden />
          Coverage: {Math.round(coveragePercent)}%
        </span>
      ) : null}
    </div>
  )
}

/* ── Single build row ───────────────────────────────────────── */

function BuildRow({ build, canRollback, onRollback, rollbackPending }) {
  const isActive = Boolean(build.isActiveDeployment)
  const canRollThisBack = canRollback && build.status === 'SUCCESS' && !isActive

  return (
    <li className="rounded-lg border border-forge-700/60 bg-forge-850/50 p-4 transition hover:border-forge-600">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <BuildStatusPill status={build.status} />

        <span className="inline-flex items-center gap-1.5 font-mono text-xs text-steel-300">
          <GitBranch className="h-3.5 w-3.5 shrink-0 text-forge-faint" aria-hidden />
          {build.branch}
        </span>

        <span className="font-mono text-xs text-forge-muted">
          <span className="text-ember-400">{build.commitHash}</span> — {build.commitMessage}
        </span>

        {isActive ? (
          <span className="rounded-md border border-signal-success/25 bg-signal-success/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-signal-success">
            ACTIVE DEPLOYMENT
          </span>
        ) : null}

        <div className="ml-auto flex items-center gap-3">
          <span className="font-mono text-[11px] text-forge-faint">
            by {build.triggeredBy} · {relativeTime(build.startedAt)} ·{' '}
            {formatDuration(build.durationSeconds)}
          </span>

          {canRollThisBack ? (
            <button
              type="button"
              onClick={() => onRollback(build)}
              disabled={rollbackPending}
              title="Redeploy this build"
              className="inline-flex items-center gap-1.5 rounded-lg border border-forge-600 px-2.5 py-1.5 text-xs font-medium text-forge-muted transition hover:bg-forge-850 hover:text-forge-text focus:outline-none focus-visible:ring-2 focus-visible:ring-forge-600 disabled:cursor-not-allowed disabled:opacity-60"
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

      <div className="mt-4 max-w-2xl">
        <StageTracker stages={build.stages} />
      </div>

      <TestResultSummary testResult={build.testResult} />
    </li>
  )
}

/* ── Expandable per-project section ─────────────────────────── */

function ProjectSection({ project, entry, isExpanded, onToggle, canRollback, onRollback, rollingBackId }) {
  const pId = project.id || project._id
  const builds = entry?.builds ?? []
  const stats = entry?.stats
  const finished = builds.filter((b) => b.status !== 'RUNNING')
  const succeeded = finished.filter((b) => b.status === 'SUCCESS').length
  const successPct = finished.length > 0 ? Math.round((succeeded / finished.length) * 100) : null

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
        <span className="hidden items-center gap-4 font-mono text-[11px] text-forge-muted sm:flex">
          <span>{builds.length} builds</span>
          <span>{successPct === null ? '—' : `${successPct}%`} success</span>
          <span>{stats ? formatDuration(stats.avgDeploySeconds) : '—'} avg deploy</span>
        </span>
      </button>

      {isExpanded ? (
        <div className="border-t border-forge-700/60 px-5 py-4">
          {builds.length === 0 ? (
            <p className="py-4 text-center text-sm text-forge-muted">
              No pipeline runs recorded for this project yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {builds.map((build) => (
                <BuildRow
                  key={build.id}
                  build={build}
                  canRollback={canRollback}
                  onRollback={onRollback}
                  rollbackPending={rollingBackId === build.id}
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

export default function Pipelines() {
  const { hasRole } = useAuth()
  const canRollback = hasRole(...ROLLBACK_ROLES)

  const [projects, setProjects] = useState(null)
  const [buildsByProject, setBuildsByProject] = useState({})
  const [statsByProject, setStatsByProject] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedIds, setExpandedIds] = useState(() => new Set())
  const [rollingBackId, setRollingBackId] = useState(null)
  const [actionError, setActionError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        // 1. Project list is live (Milestone 1).
        const projectData = await fetchProjects()
        const safeProjects = projectData || []

        // 2. Pipeline data per project is live (Milestone 3), fetched in parallel.
        const buildEntries = await Promise.all(
          safeProjects.map(async (p) => {
            const pId = p.id || p._id
            const [builds, stats] = await Promise.all([
              fetchPipelines(pId),
              fetchPipelineStats(pId),
            ])
            return [pId, { builds: builds || [], stats }]
          }),
        )

        if (cancelled) return
        setProjects(safeProjects)
        setBuildsByProject(Object.fromEntries(buildEntries.map(([pId, e]) => [pId, e.builds])))
        setStatsByProject(Object.fromEntries(buildEntries.map(([pId, e]) => [pId, e.stats])))

        // Start with the first project expanded so the page has life.
        if (safeProjects.length > 0) {
          setExpandedIds(new Set([safeProjects[0].id || safeProjects[0]._id]))
        }
      } catch (err) {
        if (!cancelled) setError(err.message ?? 'Failed to load pipelines.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  // Org-wide stats: aggregated across every project's builds.
  const orgStats = useMemo(() => {
    const allBuilds = Object.values(buildsByProject).flat()
    const finished = allBuilds.filter((b) => b.status !== 'RUNNING')
    const succeeded = finished.filter((b) => b.status === 'SUCCESS')
    const totalDeploySeconds = succeeded.reduce((sum, b) => sum + (b.durationSeconds || 0), 0)
    return {
      buildsToday: Object.values(statsByProject).reduce((sum, s) => sum + (s?.buildsToday || 0), 0),
      successRatePercent:
        finished.length > 0 ? Math.round((succeeded.length / finished.length) * 100) : 0,
      avgDeploySeconds:
        succeeded.length > 0 ? Math.round(totalDeploySeconds / succeeded.length) : 0,
    }
  }, [buildsByProject, statsByProject])

  function toggleProject(pId) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(pId)) {
        next.delete(pId)
      } else {
        next.add(pId)
      }
      return next
    })
  }

  async function handleRollback(project, build) {
    const pId = project.id || project._id
    setActionError(null)
    setRollingBackId(build.id)
    try {
      await triggerRollback(build.id)
      // Optimistic flip: this build becomes the active deployment,
      // the previous one stands down.
      setBuildsByProject((prev) => ({
        ...prev,
        [pId]: (prev[pId] || []).map((b) =>
          b.id === build.id ? { ...b, isActiveDeployment: true } : { ...b, isActiveDeployment: false },
        ),
      }))
    } catch (err) {
      setActionError(err.message ?? 'Rollback failed.')
    } finally {
      setRollingBackId(null)
    }
  }

  const safeProjects = projects || []

  return (
    <div>
      <PageHeader title="Pipelines" subtitle="CI/CD builds and deployments across the forge." />

      {error ? (
        <EmptyState icon={AlertTriangle} title="Couldn't load pipelines" message={error} />
      ) : loading ? (
        <PipelinesSkeleton />
      ) : (
        <>
          {/* Org-wide stat cards — aggregated across projects */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              icon={Rocket}
              label="Builds Today"
              value={orgStats.buildsToday}
              hint="runs started across all projects"
              accent="ember"
            />
            <StatCard
              icon={TrendingUp}
              label="Success Rate"
              value={`${orgStats.successRatePercent}%`}
              hint="of finished builds passing"
              accent="success"
            />
            <StatCard
              icon={Timer}
              label="Avg Deploy Time"
              value={formatDuration(orgStats.avgDeploySeconds)}
              hint="successful build duration"
              accent="steel"
            />
          </div>

          {actionError ? (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-signal-danger/30 bg-signal-danger/10 px-4 py-3 text-sm text-signal-danger"
            >
              {actionError}
            </p>
          ) : null}

          <h2 className="mb-4 mt-8 font-display text-lg font-semibold text-forge-text">
            Pipelines by project
          </h2>

          {safeProjects.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="No projects yet"
              message="Create a project first — its pipelines will show up here."
            />
          ) : (
            <div className="space-y-4">
              {safeProjects.map((project) => {
                const pId = project.id || project._id
                return (
                  <ProjectSection
                    key={pId}
                    project={project}
                    entry={{ builds: buildsByProject[pId] ?? [], stats: statsByProject[pId] }}
                    isExpanded={expandedIds.has(pId)}
                    onToggle={toggleProject}
                    canRollback={canRollback}
                    onRollback={(build) => handleRollback(project, build)}
                    rollingBackId={rollingBackId}
                  />
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
