import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  FolderKanban,
  Gauge,
  HeartPulse,
  Percent,
  ShieldCheck,
  Timer,
  TrendingUp,
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import {
  fetchProjects,
  fetchProjectPipelines,
  fetchPipelineHealth,
  fetchProjectCicdStats,
  fetchPipelineMetrics,
  fetchCoverageTrend,
} from '../api/client'
import { EmptyState, PageHeader, StatCard } from '../components/ui'

/**
 * Milestone 4 — Monitoring.
 *
 * There is no HealthMetric model on the backend — monitoring is computed
 * live from Pipeline/Build/Deployment data via HealthMetricsController.
 * This page is therefore pipeline-health-centric rather than a generic
 * infra dashboard: per project, per pipeline, showing live health status,
 * a build success-rate trend, and a test-coverage trend.
 *
 * Chart colors are approximate hex equivalents of the forge design tokens
 * (ember/steel/success) since recharts needs literal color values, not
 * Tailwind classes — swap these for exact hex if you have the real palette.
 */

const CHART_COLORS = {
  ember: '#f97316',
  steel: '#38bdf8',
  success: '#22c55e',
  danger: '#ef4444',
}

const HEALTH_STYLES = {
  HEALTHY: 'border-signal-success/25 bg-signal-success/10 text-signal-success',
  DEGRADED: 'border-signal-warning/25 bg-signal-warning/10 text-signal-warning',
  WARNING: 'border-signal-warning/25 bg-signal-warning/10 text-signal-warning',
  CRITICAL: 'border-signal-danger/25 bg-signal-danger/10 text-signal-danger',
  UNKNOWN: 'border-forge-600 bg-forge-800 text-forge-muted',
}

function HealthPill({ status }) {
  const key = String(status || 'UNKNOWN').toUpperCase()
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wider ${
        HEALTH_STYLES[key] ?? HEALTH_STYLES.UNKNOWN
      }`}
    >
      <HeartPulse className="h-3 w-3" aria-hidden />
      {status ?? 'UNKNOWN'}
    </span>
  )
}

const relativeTime = (iso) => {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return String(iso)
  const minutes = Math.round((Date.now() - date.getTime()) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

function MonitoringSkeleton() {
  return (
    <div aria-hidden>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <div key={key} className="nf-card h-28 animate-pulse" />
        ))}
      </div>
      <div className="nf-card mt-8 h-40 animate-pulse" />
    </div>
  )
}

/* ── Trend chart wrapper ──────────────────────────────────────── */

function TrendChart({ data, dataKey, label, color, unit = '%' }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-forge-700/60 bg-forge-850/40 text-xs text-forge-faint">
        No {label.toLowerCase()} data yet
      </div>
    )
  }
  return (
    <div className="h-40 rounded-lg border border-forge-700/60 bg-forge-850/40 p-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a30" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#8b8b93' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#8b8b93' }} axisLine={false} tickLine={false} width={36} />
          <Tooltip
            contentStyle={{
              background: '#1a1a1f',
              border: '1px solid #2a2a30',
              borderRadius: 8,
              fontSize: 11,
            }}
            formatter={(value) => [`${value}${unit}`, label]}
          />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ── Single pipeline health card ─────────────────────────────── */

function PipelineHealthCard({ pipeline, health, metrics, coverage, isSelected, onSelect }) {
  const metricsData = (metrics || []).map((m) => ({
    date: m.date,
    successRate: Math.round(m.successRate ?? 0),
  }))
  const coverageData = (coverage || []).map((c) => ({
    date: c.date,
    coveragePercent: Math.round(c.coveragePercent ?? 0),
  }))

  return (
    <section className="nf-card overflow-hidden">
      <button
        type="button"
        onClick={onSelect}
        aria-expanded={isSelected}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-forge-850/60"
      >
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-forge-faint transition-transform ${isSelected ? '' : '-rotate-90'}`}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-sm font-semibold text-forge-text">
            {health?.pipelineName || pipeline.name || pipeline.id}
          </span>
          <span className="block truncate font-mono text-[11px] text-steel-400">
            build #{health?.buildNumber ?? '—'} · updated {relativeTime(health?.lastUpdated)}
          </span>
        </span>
        <HealthPill status={health?.healthStatus} />
      </button>

      {isSelected ? (
        <div className="space-y-4 border-t border-forge-700/60 px-5 py-4">
          <div className="flex flex-wrap items-center gap-4 font-mono text-[11px] text-forge-muted">
            <span>
              Latest build status:{' '}
              <span className="text-forge-text">{health?.latestBuildStatus ?? '—'}</span>
            </span>
          </div>

          <div>
            <p className="mb-2 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-forge-faint">
              <TrendingUp className="h-3 w-3" aria-hidden />
              Build success rate (recent)
            </p>
            <TrendChart data={metricsData} dataKey="successRate" label="Success rate" color={CHART_COLORS.success} />
          </div>

          <div>
            <p className="mb-2 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-forge-faint">
              <ShieldCheck className="h-3 w-3" aria-hidden />
              Test coverage trend
            </p>
            <TrendChart
              data={coverageData}
              dataKey="coveragePercent"
              label="Coverage"
              color={CHART_COLORS.steel}
            />
          </div>
        </div>
      ) : null}
    </section>
  )
}

/* ── Expandable per-project section ─────────────────────────── */

function ProjectSection({ project, isExpanded, onToggle, pipelines, stats, healthByPipeline, metricsByPipeline, coverageByPipeline, selectedPipelineId, onSelectPipeline }) {
  const pId = project.id || project._id

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
          <span>{pipelines.length} pipelines</span>
          {stats ? <span>{Math.round(stats.successRate ?? 0)}% success</span> : null}
        </span>
      </button>

      {isExpanded ? (
        <div className="space-y-4 border-t border-forge-700/60 px-5 py-4">
          {stats ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-forge-700/60 bg-forge-850/50 p-3">
                <p className="font-mono text-[10px] uppercase tracking-wider text-forge-faint">Builds/day</p>
                <p className="mt-1 font-display text-lg font-semibold text-forge-text">
                  {stats.buildsPerDay ?? 0}
                </p>
              </div>
              <div className="rounded-lg border border-forge-700/60 bg-forge-850/50 p-3">
                <p className="font-mono text-[10px] uppercase tracking-wider text-forge-faint">Success rate</p>
                <p className="mt-1 font-display text-lg font-semibold text-forge-text">
                  {Math.round(stats.successRate ?? 0)}%
                </p>
              </div>
              <div className="rounded-lg border border-forge-700/60 bg-forge-850/50 p-3">
                <p className="font-mono text-[10px] uppercase tracking-wider text-forge-faint">Avg deploy</p>
                <p className="mt-1 font-display text-lg font-semibold text-forge-text">
                  {(stats.avgDeployMinutes ?? 0).toFixed(1)}m
                </p>
              </div>
              <div className="rounded-lg border border-forge-700/60 bg-forge-850/50 p-3">
                <p className="font-mono text-[10px] uppercase tracking-wider text-forge-faint">Trend</p>
                <p className="mt-1 font-display text-lg font-semibold text-forge-text">
                  {stats.deployTrendPercent ?? '—'}
                </p>
              </div>
            </div>
          ) : null}

          {pipelines.length === 0 ? (
            <p className="py-4 text-center text-sm text-forge-muted">
              No pipelines found for this project.
            </p>
          ) : (
            <div className="space-y-3">
              {pipelines.map((pipeline) => {
                const plId = pipeline.id || pipeline._id
                return (
                  <PipelineHealthCard
                    key={plId}
                    pipeline={pipeline}
                    health={healthByPipeline[plId]}
                    metrics={metricsByPipeline[plId]}
                    coverage={coverageByPipeline[plId]}
                    isSelected={selectedPipelineId === plId}
                    onSelect={() => onSelectPipeline(pId, plId)}
                  />
                )
              })}
            </div>
          )}
        </div>
      ) : null}
    </section>
  )
}

/* ── Page ───────────────────────────────────────────────────── */

export default function Monitoring() {
  const [projects, setProjects] = useState(null)
  const [pipelinesByProject, setPipelinesByProject] = useState({})
  const [statsByProject, setStatsByProject] = useState({})
  const [healthByPipeline, setHealthByPipeline] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedIds, setExpandedIds] = useState(() => new Set())
  const [selectedPipeline, setSelectedPipeline] = useState({}) // { [projectId]: pipelineId }
  const [metricsByPipeline, setMetricsByPipeline] = useState({})
  const [coverageByPipeline, setCoverageByPipeline] = useState({})

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const projectData = (await fetchProjects()) || []
        const entries = await Promise.all(
          projectData.map(async (p) => {
            const pId = p.id || p._id
            const [pipelines, stats] = await Promise.all([
              fetchProjectPipelines(pId).catch(() => []),
              fetchProjectCicdStats(pId).catch(() => null),
            ])
            const healthEntries = await Promise.all(
              (pipelines || []).map(async (pipeline) => {
                const plId = pipeline.id || pipeline._id
                const health = await fetchPipelineHealth(plId).catch(() => null)
                return [plId, health]
              }),
            )
            return { pId, pipelines: pipelines || [], stats, health: Object.fromEntries(healthEntries) }
          }),
        )
        if (cancelled) return
        setProjects(projectData)
        setPipelinesByProject(Object.fromEntries(entries.map((e) => [e.pId, e.pipelines])))
        setStatsByProject(Object.fromEntries(entries.map((e) => [e.pId, e.stats])))
        setHealthByPipeline(Object.assign({}, ...entries.map((e) => e.health)))

        if (projectData.length > 0) {
          const firstId = projectData[0].id || projectData[0]._id
          setExpandedIds(new Set([firstId]))
          const firstEntry = entries.find((e) => e.pId === firstId)
          const firstPipeline = firstEntry?.pipelines?.[0]
          if (firstPipeline) {
            const plId = firstPipeline.id || firstPipeline._id
            setSelectedPipeline({ [firstId]: plId })
          }
        }
      } catch (err) {
        if (!cancelled) setError(err.message ?? 'Failed to load monitoring data.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  // Lazily fetch metrics/coverage trend only for whichever pipeline is expanded.
  useEffect(() => {
    const pipelineIds = Object.values(selectedPipeline).filter(Boolean)
    pipelineIds.forEach((plId) => {
      if (!(plId in metricsByPipeline)) {
        fetchPipelineMetrics(plId, 14)
          .then((data) => setMetricsByPipeline((prev) => ({ ...prev, [plId]: data || [] })))
          .catch(() => setMetricsByPipeline((prev) => ({ ...prev, [plId]: [] })))
      }
      if (!(plId in coverageByPipeline)) {
        fetchCoverageTrend(plId, 20)
          .then((data) => setCoverageByPipeline((prev) => ({ ...prev, [plId]: data || [] })))
          .catch(() => setCoverageByPipeline((prev) => ({ ...prev, [plId]: [] })))
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPipeline])

  const orgHealth = useMemo(() => {
    const all = Object.values(healthByPipeline).filter(Boolean)
    const healthy = all.filter((h) => String(h.healthStatus).toUpperCase() === 'HEALTHY').length
    const critical = all.filter((h) => String(h.healthStatus).toUpperCase() === 'CRITICAL').length
    return { total: all.length, healthy, critical }
  }, [healthByPipeline])

  function toggleProject(pId) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(pId)) next.delete(pId)
      else next.add(pId)
      return next
    })
  }

  function selectPipeline(projectId, pipelineId) {
    setSelectedPipeline((prev) => ({
      ...prev,
      [projectId]: prev[projectId] === pipelineId ? null : pipelineId,
    }))
  }

  const safeProjects = projects || []

  return (
    <div>
      <PageHeader title="Monitoring" subtitle="Live pipeline health and build trends across the forge." />

      {error ? (
        <EmptyState icon={AlertTriangle} title="Couldn't load monitoring data" message={error} />
      ) : loading ? (
        <MonitoringSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard icon={Activity} label="Pipelines Monitored" value={orgHealth.total} hint="across all projects" accent="ember" />
            <StatCard icon={ShieldCheck} label="Healthy" value={orgHealth.healthy} hint="reporting HEALTHY" accent="success" />
            <StatCard icon={AlertTriangle} label="Critical" value={orgHealth.critical} hint="need attention" accent="danger" />
          </div>

          <h2 className="mb-4 mt-8 font-display text-lg font-semibold text-forge-text">
            Pipeline health by project
          </h2>

          {safeProjects.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="No projects yet"
              message="Create a project first — its pipeline health will show up here."
            />
          ) : (
            <div className="space-y-4">
              {safeProjects.map((project) => {
                const pId = project.id || project._id
                return (
                  <ProjectSection
                    key={pId}
                    project={project}
                    isExpanded={expandedIds.has(pId)}
                    onToggle={toggleProject}
                    pipelines={pipelinesByProject[pId] ?? []}
                    stats={statsByProject[pId]}
                    healthByPipeline={healthByPipeline}
                    metricsByPipeline={metricsByPipeline}
                    coverageByPipeline={coverageByPipeline}
                    selectedPipelineId={selectedPipeline[pId]}
                    onSelectPipeline={selectPipeline}
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
