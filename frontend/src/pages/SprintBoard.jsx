import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarRange, Plus, Target, Zap } from 'lucide-react'
import {
  createTask,
  fetchSprints,
  fetchTasksBySprint,
  fetchUsers,
  isSprintActive,
  TASK_PRIORITIES,
  TASK_STATUSES,
  updateTaskStatus,
} from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Avatar, EmptyState, PriorityBadge, ProgressBar } from '../components/ui'

const STATUS_LABELS = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
}

const BOARD_COLUMNS = ['TODO', 'IN_PROGRESS', 'DONE']

const STORY_POINT_OPTIONS = [1, 2, 3, 5, 8, 13]

const formatDate = (iso) =>
  iso
    ? new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : '—'

/** One task on the board: title, priority + points badges, assignee, status control. */
function TaskCard({ task, canEdit, onStatusChange }) {
  return (
    <article className="rounded-lg border border-forge-700/70 bg-forge-850 p-3 transition hover:border-forge-600">
      <p className="text-sm font-medium leading-snug text-forge-text">{task.title}</p>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <PriorityBadge priority={task.priority} />
        <span className="rounded-md border border-steel-500/30 bg-steel-500/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-steel-300">
          {task.storyPoints} pts
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {task.assignee ? (
          <>
            <Avatar name={task.assignee.name} className="h-6 w-6 text-[10px]" />
            <span className="truncate text-xs text-forge-muted">{task.assignee.name}</span>
          </>
        ) : (
          <span className="text-xs text-forge-faint">Unassigned</span>
        )}
      </div>

      {/* Status control: leadership can move any task, EMPLOYEEs only their own. */}
      {canEdit ? (
        <label className="mt-3 block">
          <span className="sr-only">Status for {task.title}</span>
          <select
            value={task.status}
            onChange={(event) => onStatusChange(task.id, event.target.value)}
            className="nf-input px-2 py-1 text-xs"
          >
            {TASK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </article>
  )
}

/**
 * Modal for creating a task. `defaultStatus` presets which board column
 * the "+ Add task" button was clicked in.
 */
function NewTaskForm({ sprintId, users, defaultStatus, onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', assigneeId: '', storyPoints: 3, priority: 'MEDIUM' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Close the modal on Escape.
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }))

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const created = await createTask({
        sprintId,
        title: form.title,
        assigneeId: form.assigneeId || null, // "Unassigned" → null
        storyPoints: Number(form.storyPoints),
        priority: form.priority,
        status: defaultStatus,
      })
      onCreated(created)
    } catch (err) {
      setError(err.message ?? 'Could not create the task.')
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-forge-950/80 p-4 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="mx-auto w-full max-w-lg rounded-2xl border border-forge-700 bg-forge-900 shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between border-b border-forge-700/70 px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-forge-text">
            Add task · {STATUS_LABELS[defaultStatus]}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-lg text-forge-muted transition hover:bg-forge-800 hover:text-forge-text"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error ? (
            <p
              role="alert"
              className="rounded-lg border border-signal-danger/30 bg-signal-danger/10 px-3 py-2.5 text-sm text-signal-danger"
            >
              {error}
            </p>
          ) : null}

          <div>
            <label htmlFor="task-title" className="nf-label">
              Title
            </label>
            <input
              id="task-title"
              type="text"
              required
              placeholder="e.g. Add rate limiting to refresh endpoint"
              value={form.title}
              onChange={set('title')}
              className="nf-input"
            />
          </div>

          <div>
            <label htmlFor="task-assignee" className="nf-label">
              Assignee
            </label>
            <select id="task-assignee" value={form.assigneeId} onChange={set('assigneeId')} className="nf-input">
              <option value="">Unassigned</option>
              {users.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name} — {person.role}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="task-points" className="nf-label">
                Story points
              </label>
              <select
                id="task-points"
                value={form.storyPoints}
                onChange={set('storyPoints')}
                className="nf-input"
              >
                {STORY_POINT_OPTIONS.map((points) => (
                  <option key={points} value={points}>
                    {points}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="task-priority" className="nf-label">
                Priority
              </label>
              <select
                id="task-priority"
                value={form.priority}
                onChange={set('priority')}
                className="nf-input"
              >
                {TASK_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-forge-700/70 pt-4">
            <button type="button" onClick={onClose} className="nf-btn-ghost" disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="nf-btn-primary" disabled={submitting}>
              {submitting ? 'Adding…' : 'Add task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function SprintBoard() {
  const { sprintId } = useParams()
  const { user, hasRole } = useAuth()
  // Task creation is leadership-only; EMPLOYEEs can only move their own tasks.
  const canManage = hasRole('ADMIN', 'PROJECT_LEAD', 'PROJECT_MANAGER')

  // undefined = still loading, null = loaded but not found.
  const [sprint, setSprint] = useState(undefined)
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionError, setActionError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formStatus, setFormStatus] = useState('TODO')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [sprintData, taskData, userData] = await Promise.all([
          fetchSprints(),
          fetchTasksBySprint(sprintId),
          canManage ? fetchUsers() : Promise.resolve([]), // roster only needed to assign tasks
        ])
        if (!cancelled) {
          setSprint(sprintData.find((s) => s.id === sprintId) ?? null)
          setTasks(taskData)
          setUsers(userData)
        }
      } catch (err) {
        if (!cancelled) setError(err.message ?? 'Failed to load the sprint board.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [sprintId, canManage])

  async function handleStatusChange(taskId, newStatus) {
    setActionError('')
    try {
      const updated = await updateTaskStatus(taskId, newStatus)
      setTasks((current) => current.map((t) => (t.id === updated.id ? updated : t)))
    } catch (err) {
      setActionError(err.message ?? 'Could not update the task.')
    }
  }

  // Leadership moves anything; EMPLOYEEs only the tasks assigned to them.
  const canEditTask = (task) => canManage || task.assigneeId === user.id

  const totalPoints = tasks.reduce((sum, t) => sum + t.storyPoints, 0)
  const donePoints = tasks
    .filter((t) => t.status === 'DONE')
    .reduce((sum, t) => sum + t.storyPoints, 0)
  const burndownPct = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0

  if (loading) {
    return (
      <div aria-hidden>
        <div className="nf-card mb-6 h-28 animate-pulse" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="nf-card h-96 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <Link
          to="/sprints"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-forge-muted transition hover:text-forge-text"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> All sprints
        </Link>
        <div className="mt-4">
          <EmptyState icon={Target} title="Couldn't load the sprint board" message={error} />
        </div>
      </div>
    )
  }

  if (!sprint) {
    return (
      <div>
        <Link
          to="/sprints"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-forge-muted transition hover:text-forge-text"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> All sprints
        </Link>
        <div className="mt-4">
          <EmptyState
            icon={Target}
            title="Sprint not found"
            message="This sprint may have been removed, or the link is out of date."
          />
        </div>
      </div>
    )
  }

  return (
    <div>
      <Link
        to="/sprints"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-forge-muted transition hover:text-forge-text"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> All sprints
      </Link>

      {/* ── Sprint header ─────────────────────────────────────── */}
      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold tracking-tight text-forge-text">
            {sprint.name}
          </h1>
          <span className="font-mono text-xs text-steel-400">{sprint.project}</span>
          {isSprintActive(sprint) ? (
            <span className="rounded-full border border-signal-success/25 bg-signal-success/10 px-2 py-0.5 font-mono text-[10px] font-medium text-signal-success">
              ACTIVE
            </span>
          ) : null}
        </div>

        <p className="mt-2 flex items-start gap-2 text-sm text-forge-muted">
          <Target className="mt-0.5 h-4 w-4 shrink-0 text-ember-400" aria-hidden />
          <span>
            <span className="text-forge-faint">Goal: </span>
            {sprint.goal || 'No goal set.'}
          </span>
        </p>
        <p className="mt-1.5 flex items-center gap-2 font-mono text-xs text-forge-muted">
          <CalendarRange className="h-3.5 w-3.5 text-forge-faint" aria-hidden />
          {formatDate(sprint.startDate)} — {formatDate(sprint.endDate)}
        </p>
      </header>

      {/* ── Sprint metrics: velocity, burndown, task count ────── */}
      <div className="mb-6 mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="nf-card flex items-center gap-3 p-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ember-500/10 text-ember-400 ring-1 ring-ember-500/25">
            <Zap className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-forge-muted">
              Velocity
            </p>
            <p className="font-mono text-2xl font-semibold text-forge-text">{donePoints} pts</p>
          </div>
        </div>

        <div className="nf-card p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-forge-muted">
              Burndown
            </p>
            <p className="font-mono text-sm font-semibold text-signal-success">{burndownPct}%</p>
          </div>
          <ProgressBar value={burndownPct} barClassName="bg-signal-success" className="mt-2.5" />
          <p className="mt-1.5 text-[11px] text-forge-faint">
            {donePoints} of {totalPoints} story points done
          </p>
        </div>

        <div className="nf-card flex items-center gap-3 p-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-steel-500/10 text-steel-400 ring-1 ring-steel-500/25">
            <Target className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-forge-muted">Tasks</p>
            <p className="font-mono text-2xl font-semibold text-forge-text">{tasks.length}</p>
          </div>
        </div>
      </div>

      {actionError ? (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-signal-danger/30 bg-signal-danger/10 px-3 py-2.5 text-sm text-signal-danger"
        >
          {actionError}
        </p>
      ) : null}

      {/* ── Kanban board ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {BOARD_COLUMNS.map((status) => {
          const columnTasks = tasks.filter((t) => t.status === status)
          return (
            <section
              key={status}
              className="rounded-xl border border-forge-700/70 bg-forge-900/60 p-3"
            >
              <div className="mb-3 flex items-center justify-between gap-2 px-1">
                <h2 className="font-display text-sm font-semibold text-forge-text">
                  {STATUS_LABELS[status]}
                  <span className="ml-2 font-mono text-[11px] font-normal text-forge-faint">
                    {columnTasks.length}
                  </span>
                </h2>
                {canManage ? (
                  <button
                    type="button"
                    onClick={() => {
                      setFormStatus(status)
                      setShowForm(true)
                    }}
                    title={`Add task to ${STATUS_LABELS[status]}`}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-ember-400 transition hover:bg-ember-500/10"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden /> Add task
                  </button>
                ) : null}
              </div>

              <div className="space-y-3">
                {columnTasks.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-forge-700 px-3 py-6 text-center text-xs text-forge-faint">
                    No tasks
                  </p>
                ) : (
                  columnTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      canEdit={canEditTask(task)}
                      onStatusChange={handleStatusChange}
                    />
                  ))
                )}
              </div>
            </section>
          )
        })}
      </div>

      {showForm ? (
        <NewTaskForm
          sprintId={sprintId}
          users={users}
          defaultStatus={formStatus}
          onClose={() => setShowForm(false)}
          onCreated={(created) => {
            setTasks((current) => [...current, created])
            setShowForm(false)
          }}
        />
      ) : null}

    </div>
  )
}
