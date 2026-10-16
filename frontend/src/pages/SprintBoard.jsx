import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarRange, CheckSquare, Pencil, Plus, Target, Trash2, Zap } from 'lucide-react'
import {
  createTask,
  deleteSprint,
  deleteTask,
  fetchProjects,
  fetchSprints,
  fetchSubtasks,
  fetchTasksBySprint,
  fetchUsers,
  isSprintActive,
  TASK_PRIORITIES,
  TASK_STATUSES,
  updateSprint,
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

/** One task on the board including subtasks checklist */
function TaskCard({ task, assignee, subtasks = [], canEdit, canManage, onStatusChange, onDelete }) {
  const completedSubs = subtasks.filter((st) => st.status === 'DONE');
  const taskId = task.id || task._id

  return (
    <article className="rounded-lg border border-forge-700/70 bg-forge-850 p-3 transition hover:border-forge-600">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug text-forge-text">{task.title}</p>
        {/* Delete is intentionally restricted to managers/leads, not the
            assignee — assignees can move a task's status but shouldn't be
            able to remove it outright. */}
        {canManage ? (
          <button
            type="button"
            onClick={() => onDelete(taskId, task.title)}
            aria-label="Delete task"
            title="Delete task"
            className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-forge-faint transition hover:bg-signal-danger/10 hover:text-signal-danger"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : null}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <PriorityBadge priority={task.priority} />
        <span className="rounded-md border border-steel-500/30 bg-steel-500/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-steel-300">
          {task.storyPoints} pts
        </span>
      </div>

      {/* Subtasks summary preview */}
      {subtasks.length > 0 ? (
        <div className="mt-2.5 flex items-center gap-1.5 font-mono text-[11px] text-forge-faint">
          <CheckSquare className="h-3 w-3 text-ember-400" aria-hidden />
          <span>{completedSubs.length}/{subtasks.length} subtasks</span>
        </div>
      ) : null}

      <div className="mt-3 flex items-center gap-2">
        {/* Real backend field is task.assignedTo (a bare user-ID string, no
            nested object) — resolve the display name from the users list,
            the same lookup pattern Projects.jsx/Teams.jsx already use. */}
        {assignee ? (
          <>
            <Avatar name={assignee.name} className="h-6 w-6 text-[10px]" />
            <span className="truncate text-xs text-forge-muted">{assignee.name}</span>
          </>
        ) : (
          <span className="text-xs text-forge-faint">Unassigned</span>
        )}
      </div>

      {canEdit ? (
        <label className="mt-3 block">
          <span className="sr-only">Status for {task.title}</span>
          <select
            value={task.status}
            onChange={(event) => onStatusChange(taskId, event.target.value)}
            className="nf-input px-2 py-1 text-xs"
          >
            {TASK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status] || status}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </article>
  )
}

/** Modal for creating a task */
function NewTaskForm({ projectId, sprintId, users, defaultStatus, onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', assigneeId: '', storyPoints: 3, priority: 'MEDIUM' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
      const payload = {
        sprintId,
        title: form.title,
        storyPoints: Number(form.storyPoints),
        priority: form.priority,
        status: defaultStatus,
      }

      // Real backend field is assignedTo (Task.java) — map the form's
      // assigneeId select value onto it before posting.
      if (form.assigneeId && form.assigneeId !== '') {
        payload.assignedTo = form.assigneeId
      }

      const created = await createTask(projectId, payload)
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
            Add task · {STATUS_LABELS[defaultStatus] || defaultStatus}
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
              {(users || []).map((person) => {
                const uId = person.id || person._id;
                return (
                  <option key={uId} value={uId}>
                    {person.name} — {person.role}
                  </option>
                )
              })}
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

/** Modal for editing a sprint's name, goal and date range */
function EditSprintForm({ sprint, projectId, onClose, onUpdated }) {
  const [form, setForm] = useState({
    name: sprint.name || '',
    goal: sprint.goal || '',
    startDate: sprint.startDate || '',
    endDate: sprint.endDate || '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
      const updated = await updateSprint(projectId, sprint.id || sprint._id, form)
      onUpdated(updated)
    } catch (err) {
      setError(err.message ?? 'Could not update the sprint.')
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
          <h2 className="font-display text-lg font-semibold text-forge-text">Edit sprint</h2>
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
            <label htmlFor="sprint-name" className="nf-label">
              Name
            </label>
            <input
              id="sprint-name"
              type="text"
              required
              value={form.name}
              onChange={set('name')}
              className="nf-input"
            />
          </div>

          <div>
            <label htmlFor="sprint-goal" className="nf-label">
              Goal
            </label>
            <textarea
              id="sprint-goal"
              rows={2}
              value={form.goal}
              onChange={set('goal')}
              className="nf-input resize-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="sprint-start" className="nf-label">
                Start date
              </label>
              <input
                id="sprint-start"
                type="date"
                value={form.startDate}
                onChange={set('startDate')}
                className="nf-input"
              />
            </div>
            <div>
              <label htmlFor="sprint-end" className="nf-label">
                End date
              </label>
              <input
                id="sprint-end"
                type="date"
                value={form.endDate}
                onChange={set('endDate')}
                className="nf-input"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-forge-700/70 pt-4">
            <button type="button" onClick={onClose} className="nf-btn-ghost" disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="nf-btn-primary" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function SprintBoard() {
  const params = useParams()
  const navigate = useNavigate()
  const sprintId = params.sprintId
  const paramProjectId = params.projectId

  let authContext = {}
  try {
    authContext = useAuth() || {}
  } catch {
    authContext = {}
  }

  const currentUser = authContext.user || { id: '', role: 'ADMIN' }
  const canManage = authContext.hasRole ? authContext.hasRole('ADMIN', 'PROJECT_LEAD', 'PROJECT_MANAGER') : true

  const [projectId, setProjectId] = useState(paramProjectId || '')
  const [sprint, setSprint] = useState(null)
  const [tasks, setTasks] = useState([])
  const [subtasksMap, setSubtasksMap] = useState({})
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionError, setActionError] = useState('')
  const [sprintActionError, setSprintActionError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formStatus, setFormStatus] = useState('TODO')
  const [showEditSprintForm, setShowEditSprintForm] = useState(false)

  // Id → user lookup: task cards resolve the assignee's name from
  // task.assignedTo (a bare user-ID string) through this map — the backend
  // never returns a nested assignee object.
  const usersById = useMemo(() => new Map((users || []).map((u) => [u.id || u._id, u])), [users])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const projects = await fetchProjects()
        const userData = await fetchUsers()

        let foundSprint = null
        let resolvedProjectId = paramProjectId

        for (const p of (projects || [])) {
          const pId = p.id || p._id
          const pSprints = await fetchSprints(pId).catch(() => [])
          const match = (pSprints || []).find((s) => (s.id || s._id) === sprintId)
          if (match) {
            foundSprint = match
            resolvedProjectId = pId
            break
          }
        }

        if (!foundSprint && projects && projects.length > 0 && !sprintId) {
          resolvedProjectId = projects[0].id || projects[0]._id
          const pSprints = await fetchSprints(resolvedProjectId).catch(() => [])
          foundSprint = pSprints[0] || null
        }

        if (!foundSprint) {
          throw new Error('Sprint not found.')
        }

        const actualSprintId = foundSprint.id || foundSprint._id
        const taskData = await fetchTasksBySprint(resolvedProjectId, actualSprintId)

        const subtaskEntries = await Promise.all(
          (taskData || []).map(async (t) => {
            const tId = t.id || t._id
            try {
              const subs = await fetchSubtasks(resolvedProjectId, tId)
              return [tId, subs || []]
            } catch {
              return [tId, []]
            }
          })
        )

        if (!cancelled) {
          setProjectId(resolvedProjectId)
          setSprint(foundSprint)
          setTasks(taskData || [])
          setSubtasksMap(Object.fromEntries(subtaskEntries))
          setUsers(userData || [])
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
  }, [sprintId, paramProjectId])

  async function handleStatusChange(taskId, newStatus) {
    setActionError('')
    try {
      const updated = await updateTaskStatus(projectId, taskId, newStatus)
      setTasks((current) => current.map((t) => ((t.id || t._id) === (updated.id || updated._id) ? updated : t)))
    } catch (err) {
      setActionError(err.message ?? 'Could not update the task.')
    }
  }

  async function handleDeleteTask(taskId, taskTitle) {
    if (!window.confirm(`Delete task "${taskTitle}"? This cannot be undone.`)) return
    setActionError('')
    try {
      await deleteTask(projectId, taskId)
      setTasks((current) => current.filter((t) => (t.id || t._id) !== taskId))
      setSubtasksMap((current) => {
        const next = { ...current }
        delete next[taskId]
        return next
      })
    } catch (err) {
      setActionError(err.message ?? 'Could not delete the task.')
    }
  }

  async function handleDeleteSprint() {
    if (tasks.length > 0) {
      setSprintActionError(`Can't delete this sprint — it has ${tasks.length} task(s). Move or delete them first.`)
      return
    }
    if (!window.confirm(`Delete sprint "${sprint.name}"? This cannot be undone.`)) return
    setSprintActionError('')
    try {
      await deleteSprint(projectId, sprint.id || sprint._id)
      navigate('/sprints')
    } catch (err) {
      setSprintActionError(err.message ?? 'Could not delete the sprint.')
    }
  }

  // Real backend field is task.assignedTo (a bare user-ID string) — the
  // previous check read task.assigneeId, which never existed, so
  // non-managers could never edit their own tasks. Fixed to match reality.
  const canEditTask = (task) => canManage || task.assignedTo === currentUser.id

  const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0)
  const donePoints = tasks
    .filter((t) => t.status === 'DONE')
    .reduce((sum, t) => sum + (t.storyPoints || 0), 0)
  const burndownPct = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0

  if (loading) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ background: '#1e293b', height: '100px', borderRadius: '8px', marginBottom: '16px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {[0, 1, 2].map((key) => (
            <div key={key} style={{ background: '#1e293b', height: '350px', borderRadius: '8px' }} />
          ))}
        </div>
      </div>
    )
  }

  if (error || !sprint) {
    return (
      <div style={{ padding: '24px' }}>
        <Link
          to="/sprints"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-forge-muted transition hover:text-forge-text"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> All sprints
        </Link>
        <div className="mt-4">
          <EmptyState
            icon={Target}
            title={error ? "Couldn't load sprint board" : "Sprint not found"}
            message={error || "Could not find active sprint data."}
          />
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      <Link
        to="/sprints"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-forge-muted transition hover:text-forge-text"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> All sprints
      </Link>

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

        {canManage ? (
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowEditSprintForm(true)}
              className="nf-btn-ghost px-3 py-1.5 text-xs"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit sprint
            </button>
            <button
              type="button"
              onClick={handleDeleteSprint}
              className="nf-btn-ghost px-3 py-1.5 text-xs text-signal-danger hover:bg-signal-danger/10"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete sprint
            </button>
          </div>
        ) : null}

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

      {sprintActionError ? (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-signal-danger/30 bg-signal-danger/10 px-3 py-2.5 text-sm text-signal-danger"
        >
          {sprintActionError}
        </p>
      ) : null}

      {actionError ? (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-signal-danger/30 bg-signal-danger/10 px-3 py-2.5 text-sm text-signal-danger"
        >
          {actionError}
        </p>
      ) : null}

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
                  columnTasks.map((task) => {
                    const tId = task.id || task._id;
                    return (
                      <TaskCard
                        key={tId}
                        task={task}
                        assignee={usersById.get(task.assignedTo)}
                        subtasks={subtasksMap[tId] || []}
                        canEdit={canEditTask(task)}
                        canManage={canManage}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDeleteTask}
                      />
                    )
                  })
                )}
              </div>
            </section>
          )
        })}
      </div>

      {showForm ? (
        <NewTaskForm
          projectId={projectId}
          sprintId={sprint.id || sprint._id}
          users={users}
          defaultStatus={formStatus}
          onClose={() => setShowForm(false)}
          onCreated={(created) => {
            const cId = created.id || created._id;
            setTasks((current) => [...current, created])
            setSubtasksMap((current) => ({ ...current, [cId]: [] }))
            setShowForm(false)
          }}
        />
      ) : null}

      {showEditSprintForm ? (
        <EditSprintForm
          sprint={sprint}
          projectId={projectId}
          onClose={() => setShowEditSprintForm(false)}
          onUpdated={(updated) => {
            setSprint((current) => ({ ...current, ...updated }))
            setShowEditSprintForm(false)
          }}
        />
      ) : null}
    </div>
  )
}
export { SprintBoard }
