import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarRange, FolderKanban } from 'lucide-react'
import { fetchProjects, fetchSprints, fetchTasksBySprint, isSprintActive } from '../api/client'
import { EmptyState, PageHeader, ProgressBar } from '../components/ui'

const formatDate = (iso) =>
  iso
    ? new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : '—'

function SprintsSkeleton() {
  return (
    <div aria-hidden className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((key) => (
        <div key={key} className="nf-card h-52 animate-pulse" />
      ))}
    </div>
  )
}

function SprintCard({ sprint, progress }) {
  const active = isSprintActive(sprint)
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0
  const sId = sprint.id || sprint._id

  return (
    <Link
      to={`/sprints/${sId}`}
      className="nf-card flex flex-col p-5 text-left transition hover:border-ember-500/50 hover:shadow-lg hover:shadow-black/20"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-mono text-xs text-steel-400">{sprint.project || 'Project'}</span>
        {active ? (
          <span className="shrink-0 rounded-full border border-signal-success/25 bg-signal-success/10 px-2 py-0.5 font-mono text-[10px] font-medium text-signal-success">
            ACTIVE
          </span>
        ) : null}
      </div>

      <h3 className="mt-3 font-display text-lg font-semibold text-forge-text">{sprint.name}</h3>
      <p className="mt-1 line-clamp-2 min-h-10 text-sm text-forge-muted">
        {sprint.goal || 'No goal set.'}
      </p>

      <p className="mt-4 flex items-center gap-2 font-mono text-xs text-forge-muted">
        <CalendarRange className="h-3.5 w-3.5 shrink-0 text-forge-faint" aria-hidden />
        {formatDate(sprint.startDate)} — {formatDate(sprint.endDate)}
      </p>

      <div className="mt-auto pt-4">
        <div className="mb-1.5 flex items-center justify-between font-mono text-[11px] text-forge-muted">
          <span>
            {progress.done}/{progress.total} pts done
          </span>
          <span>{pct}%</span>
        </div>
        <ProgressBar value={pct} barClassName={active ? 'bg-signal-success' : 'bg-steel-500'} />
        <span className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-ember-400">
          Open board <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </span>
      </div>
    </Link>
  )
}

export default function Sprints() {
  const [sprints, setSprints] = useState(null)
  const [progressBySprint, setProgressBySprint] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        // 1. Fetch all projects first
        const projects = await fetchProjects()
        
        // 2. Fetch sprints for each project in parallel
        const sprintLists = await Promise.all(
          (projects || []).map(async (p) => {
            const pId = p.id || p._id
            const projectSprints = await fetchSprints(pId)
            return (projectSprints || []).map((s) => ({
              ...s,
              projectId: pId,
              project: p.name,
            }))
          })
        )

        const sprintData = sprintLists.flat()

        // 3. Pull tasks for each sprint to calculate story point progress
        const taskLists = await Promise.all(
          sprintData.map((s) => fetchTasksBySprint(s.projectId, s.id || s._id))
        )

        const progress = {}
        sprintData.forEach((sprint, index) => {
          const tasks = taskLists[index] || []
          const total = tasks.reduce((sum, t) => sum + (t.storyPoints || t.points || 1), 0)
          const done = tasks
            .filter((t) => t.status === 'DONE')
            .reduce((sum, t) => sum + (t.storyPoints || t.points || 1), 0)
          progress[sprint.id || sprint._id] = { done, total }
        })

        if (!cancelled) {
          setSprints(sprintData)
          setProgressBySprint(progress)
        }
      } catch (err) {
        if (!cancelled) setError(err.message ?? 'Failed to load sprints.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const safeSprints = sprints || []

  return (
    <div>
      <PageHeader title="Sprints" subtitle="Time-boxed iterations across every project." />

      {error ? (
        <EmptyState icon={FolderKanban} title="Couldn't load sprints" message={error} />
      ) : loading ? (
        <SprintsSkeleton />
      ) : safeSprints.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No sprints yet"
          message="Sprints created for a project will show up here."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {safeSprints.map((sprint) => {
            const sId = sprint.id || sprint._id
            return (
              <SprintCard
                key={sId}
                sprint={sprint}
                progress={progressBySprint[sId] ?? { done: 0, total: 0 }}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}