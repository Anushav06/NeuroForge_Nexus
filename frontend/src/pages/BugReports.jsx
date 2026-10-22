import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  ChevronDown,
  FolderKanban,
  Paperclip,
  Plus,
  RotateCcw,
  Search,
  X,
} from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import {
  fetchProjects,
  fetchUsers,
  fetchProjectBugs,
  fetchTasksByProject,
  createBug,
  updateBugStatus,
  assignBug,
} from '../api/client'
import { useAuth } from '../context/AuthContext'
import { EmptyState, PageHeader, StatCard } from '../components/ui'

/** Bug dashboard backed by persistent CICD service records. */

const ENVIRONMENTS = ['DEVELOPMENT', 'STAGING', 'PRODUCTION']
const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
const PRIORITIES = ['URGENT', 'HIGH', 'MEDIUM', 'LOW']
const STATUS_ORDER = ['NEW', 'CONFIRMED', 'IN_PROGRESS', 'FIXED', 'RETEST', 'CLOSED', 'REOPENED']
const STATUS_COLORS = ['#94a3b8', '#60a5fa', '#fbbf24', '#34d399', '#fb923c', '#22c55e', '#f87171']

// Allowed forward transitions per status. RETEST branches two ways.
const TRANSITIONS = {
  NEW: [{ to: 'CONFIRMED', label: 'Confirm (Triage)' }],
  CONFIRMED: [{ to: 'IN_PROGRESS', label: 'Start work' }],
  IN_PROGRESS: [{ to: 'FIXED', label: 'Mark fixed' }],
  FIXED: [{ to: 'RETEST', label: 'Send to retest' }],
  RETEST: [
    { to: 'REOPENED', label: 'Retest failed' },
    { to: 'CLOSED', label: 'Retest passed' },
  ],
  REOPENED: [{ to: 'IN_PROGRESS', label: 'Start work' }],
  CLOSED: [],
}

const MANAGER_ROLES = ['ADMIN', 'PROJECT_LEAD', 'PROJECT_MANAGER']

const STATUS_STYLES = {
  NEW: 'border-forge-600 bg-forge-800 text-forge-muted',
  CONFIRMED: 'border-steel-500/30 bg-steel-500/10 text-steel-300',
  IN_PROGRESS: 'border-signal-warning/25 bg-signal-warning/10 text-signal-warning',
  FIXED: 'border-signal-success/25 bg-signal-success/10 text-signal-success',
  RETEST: 'border-ember-500/30 bg-ember-500/10 text-ember-400',
  CLOSED: 'border-signal-success/25 bg-signal-success/10 text-signal-success',
  REOPENED: 'border-signal-danger/25 bg-signal-danger/10 text-signal-danger',
}

const SEVERITY_STYLES = {
  CRITICAL: 'border-signal-danger/25 bg-signal-danger/10 text-signal-danger',
  HIGH: 'border-ember-500/30 bg-ember-500/10 text-ember-400',
  MEDIUM: 'border-signal-warning/25 bg-signal-warning/10 text-signal-warning',
  LOW: 'border-forge-600 bg-forge-800 text-forge-muted',
}

function Pill({ styles, value }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wider ${
        styles[value] ?? 'border-forge-600 bg-forge-800 text-forge-muted'
      }`}
    >
      {value}
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

/* ── Report Bug modal ────────────────────────────────────────── */

function ReportBugModal({ project, currentUser, onClose, onSubmit }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    module: '',
    environment: 'DEVELOPMENT',
    severity: 'MEDIUM',
    priority: 'MEDIUM',
    linkedTaskId: '',
    errorMessage: '',
    consoleLog: '',
  })
  const [attachments, setAttachments] = useState([])
  const [tasks, setTasks] = useState([])
  const fileInputRef = useRef(null)

  useEffect(() => {
    let active = true
    fetchTasksByProject(project.id || project._id)
      .then((result) => {
        if (!active) return
        setTasks(Array.isArray(result) ? result : result?.content || [])
      })
      .catch((err) => console.error('Failed to load project tasks:', err.message))
    return () => { active = false }
  }, [project])

  function handleFiles(e) {
    const files = Array.from(e.target.files || [])
    setAttachments((prev) => [...prev, ...files.map((f) => ({ name: f.name, size: f.size }))].slice(0, 10))
    e.target.value = ''
  }

  function removeAttachment(index) {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    onSubmit({
      ...form,
      projectId: project.id || project._id,
      reportedBy: currentUser.id,
      reportedByName: currentUser.name,
      status: 'NEW',
      createdAt: new Date().toISOString(),
      attachments,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-forge-700 bg-forge-900 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-base font-semibold text-forge-text">
            Report a bug — {project.name}
          </h3>
          <button type="button" onClick={onClose} className="text-forge-faint hover:text-forge-text">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-xs font-medium text-forge-muted">
            Bug title
            <input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Login fails with valid credentials on mobile"
              className="mt-1 w-full rounded-lg border border-forge-700 bg-forge-850 px-3 py-2 text-sm text-forge-text outline-none focus:border-ember-500"
            />
          </label>

          <label className="block text-xs font-medium text-forge-muted">
            Description
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="Steps to reproduce, expected vs actual behavior..."
              className="mt-1 w-full rounded-lg border border-forge-700 bg-forge-850 px-3 py-2 text-sm text-forge-text outline-none focus:border-ember-500"
            />
          </label>

          <label className="block text-xs font-medium text-forge-muted">
            Module / Feature
            <input
              value={form.module}
              onChange={(e) => setForm((f) => ({ ...f, module: e.target.value }))}
              placeholder="e.g. Login, Dashboard, Payments"
              className="mt-1 w-full rounded-lg border border-forge-700 bg-forge-850 px-3 py-2 text-sm text-forge-text outline-none focus:border-ember-500"
            />
          </label>

          <div className="grid grid-cols-3 gap-3">
            <label className="block text-xs font-medium text-forge-muted">
              Environment
              <select
                value={form.environment}
                onChange={(e) => setForm((f) => ({ ...f, environment: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-forge-700 bg-forge-850 px-2 py-2 text-xs text-forge-text outline-none focus:border-ember-500"
              >
                {ENVIRONMENTS.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-forge-muted">
              Severity
              <select
                value={form.severity}
                onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-forge-700 bg-forge-850 px-2 py-2 text-xs text-forge-text outline-none focus:border-ember-500"
              >
                {SEVERITIES.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-forge-muted">
              Priority
              <select
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-forge-700 bg-forge-850 px-2 py-2 text-xs text-forge-text outline-none focus:border-ember-500"
              >
                {PRIORITIES.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="block text-xs font-medium text-forge-muted">
            Linked task / user story (optional)
            <select value={form.linkedTaskId} onChange={(e) => setForm((f) => ({ ...f, linkedTaskId: e.target.value }))} className="mt-1 w-full rounded-lg border border-forge-700 bg-forge-850 px-3 py-2 text-sm text-forge-text outline-none focus:border-ember-500">
              <option value="">No linked task</option>
              {tasks.map((task) => <option key={task.id || task._id} value={task.id || task._id}>{task.title} · {task.id || task._id}</option>)}
            </select>
          </label>

          <label className="block text-xs font-medium text-forge-muted">
            Error message (optional)
            <textarea maxLength={2000} value={form.errorMessage} onChange={(e) => setForm((f) => ({ ...f, errorMessage: e.target.value }))} rows={2} placeholder="Paste the error shown by the application" className="mt-1 w-full rounded-lg border border-forge-700 bg-forge-850 px-3 py-2 text-sm text-forge-text outline-none focus:border-ember-500" />
          </label>

          <label className="block text-xs font-medium text-forge-muted">
            Console log (optional)
            <textarea maxLength={20000} value={form.consoleLog} onChange={(e) => setForm((f) => ({ ...f, consoleLog: e.target.value }))} rows={4} placeholder="Paste relevant console output" className="mt-1 w-full rounded-lg border border-forge-700 bg-forge-850 px-3 py-2 font-mono text-xs text-forge-text outline-none focus:border-ember-500" />
          </label>

          <div>
            <p className="mb-1.5 text-xs font-medium text-forge-muted">
              Attachments — screenshots, recordings, logs, console output, files
            </p>
            <p className="mb-2 text-[11px] text-forge-faint">File names and sizes are saved with the report; file contents are not uploaded.</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-forge-600 px-3 py-1.5 text-xs font-medium text-forge-muted transition hover:bg-forge-850 hover:text-forge-text"
            >
              <Paperclip className="h-3.5 w-3.5" aria-hidden /> Attach files
            </button>
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFiles} />
            {attachments.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {attachments.map((a, i) => (
                  <li key={`${a.name}-${i}`} className="flex items-center justify-between rounded-md bg-forge-850 px-2.5 py-1.5 text-xs text-forge-muted">
                    <span className="truncate">{a.name}</span>
                    <button type="button" onClick={() => removeAttachment(i)} className="ml-2 shrink-0 text-forge-faint hover:text-signal-danger">
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="flex justify-end gap-2 border-t border-forge-700/60 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-forge-700 px-3 py-2 text-sm text-forge-muted hover:bg-forge-850">
              Cancel
            </button>
            <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-ember-500 px-4 py-2 text-sm font-medium text-white hover:bg-ember-600">
              <Bug className="h-3.5 w-3.5" aria-hidden /> Report bug
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Single bug row ──────────────────────────────────────────── */

function BugRow({ bug, users, usersById, canTransition, canManage, onTransition, onAssign }) {
  const assignee = usersById.get(bug.assignedTo)
  const transitions = TRANSITIONS[bug.status] || []

  return (
    <li className="rounded-lg border border-forge-700/60 bg-forge-850/50 p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Pill styles={STATUS_STYLES} value={bug.status} />
        <Pill styles={SEVERITY_STYLES} value={bug.severity} />
        <span className="font-mono text-[10px] text-forge-faint">{bug.environment}</span>
        <span className="text-sm font-medium text-forge-text">{bug.title}</span>

        <span className="ml-auto font-mono text-[10px] text-forge-faint">#{bug.id}</span>
      </div>

      {bug.description ? <p className="mt-2 text-xs text-forge-muted">{bug.description}</p> : null}

      {bug.linkedTaskId ? <p className="mt-2 text-xs text-steel-300">From task: <span className="font-mono">{bug.linkedTaskId}</span></p> : null}
      {bug.errorMessage || bug.consoleLog ? (
        <details className="mt-2 rounded-md border border-forge-700/60 bg-forge-900/50 px-3 py-2">
          <summary className="cursor-pointer text-xs text-forge-muted">Error details and console log</summary>
          {bug.errorMessage ? <p className="mt-2 whitespace-pre-wrap text-xs text-signal-danger">{bug.errorMessage}</p> : null}
          {bug.consoleLog ? <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-[11px] text-forge-muted">{bug.consoleLog}</pre> : null}
        </details>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-forge-faint">
        {bug.module ? <span>Module: {bug.module}</span> : null}
        <span>Priority: {bug.priority}</span>
        <span>Reported by {bug.reportedByName} · {relativeTime(bug.createdAt)}</span>
        {bug.attachments?.length > 0 ? (
          <span className="inline-flex items-center gap-1">
            <Paperclip className="h-3 w-3" aria-hidden /> {bug.attachments.length} attachment
            {bug.attachments.length === 1 ? '' : 's'}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-forge-700/50 pt-3">
        {canManage ? (
          <select
            value={bug.assignedTo || ''}
            onChange={(e) => onAssign(bug, e.target.value)}
            className="rounded-md border border-forge-700 bg-forge-850 px-2 py-1 text-xs text-forge-text outline-none focus:border-ember-500"
          >
            <option value="">Unassigned</option>
            {(users || []).map((u) => (
              <option key={u.id || u._id} value={u.id || u._id}>
                {u.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-xs text-forge-faint">
            {assignee ? `Assigned to ${assignee.name}` : 'Unassigned'}
          </span>
        )}

        {canTransition
          ? transitions.map((t) => (
              <button
                key={t.to}
                type="button"
                onClick={() => onTransition(bug, t.to)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-forge-600 px-2.5 py-1.5 text-xs font-medium text-forge-muted transition hover:bg-forge-850 hover:text-forge-text"
              >
                {t.to === 'CLOSED' ? <CheckCircle2 className="h-3.5 w-3.5 text-signal-success" aria-hidden /> : null}
                {t.to === 'REOPENED' ? <RotateCcw className="h-3.5 w-3.5 text-signal-danger" aria-hidden /> : null}
                {t.label}
              </button>
            ))
          : null}
      </div>
    </li>
  )
}

/* ── Expandable per-project section ─────────────────────────── */

function ProjectSection({ project, bugs, users, usersById, currentUser, isManager, isExpanded, onToggle, onReport, onTransition, onAssign }) {
  const pId = project.id || project._id
  const open = bugs.filter((b) => b.status !== 'CLOSED').length

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
          <span>{bugs.length} bugs</span>
          <span>{open} open</span>
        </span>
      </button>

      {isExpanded ? (
        <div className="border-t border-forge-700/60 px-5 py-4">
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => onReport(project)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-ember-500/40 bg-ember-500/10 px-3 py-1.5 text-xs font-medium text-ember-400 transition hover:bg-ember-500/20"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden /> Report bug
            </button>
          </div>

          {bugs.length === 0 ? (
            <p className="py-4 text-center text-sm text-forge-muted">No bugs reported for this project yet.</p>
          ) : (
            <ul className="space-y-3">
              {bugs.map((bug) => (
                <BugRow
                  key={bug.id}
                  bug={bug}
                  users={users}
                  usersById={usersById}
                  canTransition={isManager || bug.assignedTo === currentUser.id || (currentUser.role === 'QA' && bug.status === 'RETEST')}
                  canManage={isManager}
                  onTransition={onTransition}
                  onAssign={onAssign}
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

const MANAGER_ROLES_CONST = MANAGER_ROLES

export default function BugReports() {
  const { user, hasRole } = useAuth()
  const isManager = hasRole ? hasRole(...MANAGER_ROLES_CONST) : MANAGER_ROLES_CONST.includes(user.role)

  const [projects, setProjects] = useState(null)
  const [users, setUsers] = useState([])
  const [bugs, setBugs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedIds, setExpandedIds] = useState(() => new Set())
  const [reportTarget, setReportTarget] = useState(null)
  const [filters, setFilters] = useState({ query: '', project: '', status: '', severity: '', priority: '', environment: '', assignee: '' })
  const [quickFilter, setQuickFilter] = useState('all')

  const usersById = useMemo(() => new Map((users || []).map((u) => [u.id || u._id, u])), [users])

  useEffect(() => {
  let cancelled = false

  async function loadData() {
    try {
      const [projectsData, usersData] = await Promise.all([
        fetchProjects(),
        fetchUsers(),
      ])

      if (cancelled) return

      const projectList = Array.isArray(projectsData)
        ? projectsData
        : projectsData?.content || []

      const userList = Array.isArray(usersData)
        ? usersData
        : usersData?.content || []

      setProjects(projectList)
      setUsers(userList)

      if (projectList.length > 0) {
        setExpandedIds(
          new Set([projectList[0].id || projectList[0]._id])
        )
      }

      const bugResults = await Promise.all(
        projectList.map(async (project) => {
          const projectId = project.id || project._id

          try {
            const result = await fetchProjectBugs(projectId)

            const projectBugs = Array.isArray(result)
              ? result
              : result?.content || []

            return projectBugs.map((bug) => ({
              ...bug,
              id: bug.id || bug._id,
              projectId: bug.projectId || projectId,
            }))
          } catch (err) {
            console.error(
              `Failed to load bugs for project ${projectId}:`,
              err.message
            )

            return []
          }
        })
      )

      if (!cancelled) {
        setBugs(bugResults.flat())
      }
    } catch (err) {
      if (!cancelled) {
        setError(err.message || 'Failed to load projects and users.')
      }
    } finally {
      if (!cancelled) {
        setLoading(false)
      }
    }
  }

  loadData()

  return () => {
    cancelled = true
  }
}, [])

  // Refresh persisted records periodically so updates made elsewhere are
  // reflected in the list and analytics without a full page reload.
  useEffect(() => {
    if (!projects?.length) return undefined
    let active = true
    const refreshBugs = async () => {
      const results = await Promise.all(projects.map(async (project) => {
        const projectId = project.id || project._id
        try {
          const result = await fetchProjectBugs(projectId)
          const records = Array.isArray(result) ? result : result?.content || []
          return records.map((bug) => ({ ...bug, id: bug.id || bug._id, projectId: bug.projectId || projectId }))
        } catch (err) {
          console.error(`Failed to refresh bugs for project ${projectId}:`, err.message)
          return null
        }
      }))
      if (!active) return
      const refreshed = results.filter((records) => records !== null).flat()
      if (refreshed.length || results.every((records) => records !== null)) setBugs(refreshed)
    }
    const interval = window.setInterval(refreshBugs, 10000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [projects])

  function toggleProject(pId) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(pId)) next.delete(pId)
      else next.add(pId)
      return next
    })
  }

  async function handleReportSubmit(bugData) {
  try {
    setError(null)

    const projectId = bugData.projectId

    const payload = {
      title: bugData.title,
      description: bugData.description,
      module: bugData.module,
      linkedTaskId: bugData.linkedTaskId || null,
      errorMessage: bugData.errorMessage || null,
      consoleLog: bugData.consoleLog || null,
      attachments: bugData.attachments,
      environment: bugData.environment,
      severity: bugData.severity,
      priority: bugData.priority,
    }

    const savedBug = await createBug(projectId, payload)

    const normalizedBug = {
      ...savedBug,
      id: savedBug.id || savedBug._id,
      projectId: savedBug.projectId || projectId,
    }

    setBugs((prev) => [normalizedBug, ...prev])
    setReportTarget(null)
  } catch (err) {
    console.error('Failed to create bug:', err)
    setError(err.message || 'Failed to save the bug.')
  }
}

  async function handleTransition(bug, nextStatus) {
  try {
    setError(null)

    const updatedBug = await updateBugStatus(bug.id, nextStatus)

    setBugs((prev) =>
      prev.map((b) =>
        b.id === bug.id
          ? {
              ...b,
              ...updatedBug,
              id: updatedBug.id || updatedBug._id || bug.id,
              status: updatedBug.status || nextStatus,
            }
          : b
      )
    )
  } catch (err) {
    console.error('Failed to update bug status:', err)
    setError(err.message || 'Failed to update bug status.')
  }
}

  async function handleAssign(bug, userId) {
  try {
    setError(null)

    const updatedBug = await assignBug(bug.id, userId)

    setBugs((prev) =>
      prev.map((b) =>
        b.id === bug.id
          ? {
              ...b,
              ...updatedBug,
              id: updatedBug.id || updatedBug._id || bug.id,
              assignedTo: updatedBug.assignedTo ?? userId ?? null,
            }
          : b
      )
    )
  } catch (err) {
    console.error('Failed to assign bug:', err)
    setError(err.message || 'Failed to assign bug.')
  }
}

  const safeProjects = projects || []
  const statusData = useMemo(() => STATUS_ORDER.map((status, index) => ({
    status,
    count: bugs.filter((bug) => bug.status === status).length,
    color: STATUS_COLORS[index],
  })), [bugs])
  const totals = useMemo(() => ({
    total: bugs.length,
    open: bugs.filter((bug) => bug.status !== 'CLOSED').length,
    inProgress: bugs.filter((bug) => bug.status === 'IN_PROGRESS').length,
    closed: bugs.filter((bug) => bug.status === 'CLOSED').length,
  }), [bugs])
  const filteredBugs = useMemo(() => {
    const query = filters.query.trim().toLowerCase()
    return bugs.filter((bug) => {
      const matchesQuery = !query || [bug.id, bug.title, bug.description].some((value) => String(value || '').toLowerCase().includes(query))
      return matchesQuery && (!filters.project || bug.projectId === filters.project)
        && (quickFilter === 'all' || (quickFilter === 'open' && bug.status !== 'CLOSED') || bug.status === quickFilter)
        && (!filters.status || bug.status === filters.status)
        && (!filters.severity || bug.severity === filters.severity)
        && (!filters.priority || bug.priority === filters.priority)
        && (!filters.environment || bug.environment === filters.environment)
        && (!filters.assignee || (bug.assignedTo || '') === filters.assignee)
    })
  }, [bugs, filters, quickFilter])

  return (
    <div>
      <PageHeader title="Bug Reports" subtitle="Track, triage, and resolve bugs across every project." />

      <p className="mb-6 text-sm text-forge-muted">Report, track, assign, and resolve bugs across your projects.</p>

      {error ? (
        <EmptyState icon={AlertTriangle} title="Couldn't load projects" message={error} />
      ) : loading ? (
        <div aria-hidden className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((k) => <div key={k} className="nf-card h-24 animate-pulse" />)}
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { key: 'all', icon: Bug, label: 'Total Bugs', value: totals.total, hint: 'all reported bugs', accent: 'ember' },
              { key: 'open', icon: AlertTriangle, label: 'Open Bugs', value: totals.open, hint: 'not yet closed', accent: 'danger' },
              { key: 'IN_PROGRESS', icon: RotateCcw, label: 'In Progress', value: totals.inProgress, hint: 'currently being worked', accent: 'ember' },
              { key: 'CLOSED', icon: CheckCircle2, label: 'Closed Bugs', value: totals.closed, hint: 'resolved and closed', accent: 'success' },
            ].map((card) => <button key={card.key} type="button" onClick={() => { setQuickFilter(card.key); setFilters((current) => ({ ...current, status: '' })) }} aria-pressed={quickFilter === card.key} className={`rounded-xl text-left transition ${quickFilter === card.key ? 'ring-1 ring-ember-500/60' : 'hover:-translate-y-0.5'}`}>
              <StatCard icon={card.icon} label={card.label} value={card.value} hint={card.hint} accent={card.accent} />
            </button>)}
          </div>

          <section className="nf-card mt-6 p-5">
                <h2 className="font-display text-base font-semibold text-forge-text">Bugs by status</h2>
                <p className="mb-4 mt-1 text-xs text-forge-faint">Select a segment or label to filter the bug list</p>
                {bugs.length === 0 ? <p className="py-8 text-center text-sm text-forge-muted">No bug data to chart yet.</p> : (
                  <div className="mx-auto grid max-w-3xl items-center gap-3 sm:grid-cols-[minmax(180px,280px)_1fr]">
                    <div className="h-52"><ResponsiveContainer width="100%" height="100%"><PieChart>
                      <Pie data={statusData.filter((entry) => entry.count > 0)} dataKey="count" nameKey="status" innerRadius={48} outerRadius={78} paddingAngle={3} onClick={(entry) => {
                        const value = entry?.payload?.status ?? entry?.status
                        if (value) {
                          setQuickFilter('all')
                          setFilters((current) => ({ ...current, status: current.status === value ? '' : value }))
                        }
                      }}>
                        {statusData.filter((entry) => entry.count > 0).map((entry) => <Cell key={entry.status} fill={entry.color} style={{ cursor: 'pointer' }} />)}
                      </Pie><Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#f3f4f6' }} formatter={(value, name) => [`${value} (${Math.round((value / bugs.length) * 100)}%)`, name]} />
                    </PieChart></ResponsiveContainer></div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                      {statusData.map((entry) => <button key={entry.status} type="button" onClick={() => { setQuickFilter('all'); setFilters((current) => ({ ...current, status: current.status === entry.status ? '' : entry.status })) }} className={`flex items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs hover:bg-forge-800 ${filters.status === entry.status ? 'bg-forge-800 text-forge-text' : 'text-forge-muted'}`}>
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="min-w-0 flex-1 truncate">{entry.status.replace('_', ' ')}</span>
                        <span className="font-mono text-forge-text">{entry.count}</span>
                        <span className="w-9 text-right font-mono text-forge-faint">{Math.round((entry.count / bugs.length) * 100)}%</span>
                      </button>)}
                    </div>
                  </div>
                )}
          </section>

          <section className="nf-card mt-6 p-4">
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-forge-700 bg-forge-850 px-3">
              <Search className="h-4 w-4 text-forge-faint" aria-hidden />
              <input value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} placeholder="Search by title, description, or bug ID" className="w-full bg-transparent py-2.5 text-sm text-forge-text outline-none placeholder:text-forge-faint" />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
              {[
                ['project', 'All projects', safeProjects.map((item) => [item.id || item._id, item.name])],
                ['status', 'All statuses', STATUS_ORDER.map((value) => [value, value.replace('_', ' ')])],
                ['severity', 'All severities', SEVERITIES.map((value) => [value, value])],
                ['priority', 'All priorities', PRIORITIES.map((value) => [value, value])],
                ['environment', 'All environments', ENVIRONMENTS.map((value) => [value, value])],
                ['assignee', 'All assignees', users.map((item) => [item.id || item._id, item.name])],
              ].map(([key, label, options]) => <select key={key} value={filters[key]} onChange={(event) => { setQuickFilter('all'); setFilters((current) => ({ ...current, [key]: event.target.value })) }} aria-label={label} className="min-w-0 rounded-lg border border-forge-700 bg-forge-850 px-2.5 py-2 text-xs text-forge-muted outline-none focus:border-ember-500">
                <option value="">{label}</option>{options.map(([value, name]) => <option key={value} value={value}>{name}</option>)}
              </select>)}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <button type="button" onClick={() => { setQuickFilter('all'); setFilters({ query: '', project: '', status: '', severity: '', priority: '', environment: '', assignee: '' }) }} className="text-xs text-ember-400 hover:text-ember-300">Clear filters</button>
              <p className="font-mono text-[11px] text-forge-faint">Showing {filteredBugs.length} of {bugs.length} bugs</p>
            </div>
          </section>

          <h2 className="mb-4 mt-8 font-display text-lg font-semibold text-forge-text">Bugs by project</h2>

          {safeProjects.length === 0 ? (
            <EmptyState icon={FolderKanban} title="No projects yet" message="Create a project first to report bugs against it." />
          ) : (
            <div className="space-y-4">
              {safeProjects.map((project) => {
                const pId = project.id || project._id
                return (
                  <ProjectSection
                    key={pId}
                    project={project}
                    bugs={filteredBugs.filter((b) => b.projectId === pId)}
                    users={users}
                    usersById={usersById}
                    currentUser={user}
                    isManager={isManager}
                    isExpanded={expandedIds.has(pId)}
                    onToggle={toggleProject}
                    onReport={setReportTarget}
                    onTransition={handleTransition}
                    onAssign={handleAssign}
                  />
                )
              })}
            </div>
          )}
        </>
      )}

      {reportTarget ? (
        <ReportBugModal
          project={reportTarget}
          currentUser={user}
          onClose={() => setReportTarget(null)}
          onSubmit={handleReportSubmit}
        />
      ) : null}
    </div>
  )
}
