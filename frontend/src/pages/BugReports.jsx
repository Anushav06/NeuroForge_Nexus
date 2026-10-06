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
  Trash2,
  X,
} from 'lucide-react'
import { fetchProjects, fetchUsers } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { EmptyState, PageHeader, StatCard } from '../components/ui'

/**
 * Bug Reporting — NO BACKEND YET.
 *
 * There is no Bug/BugReport controller, model or DTO anywhere in either
 * service (confirmed by the same full controller inventory that ruled out
 * Requirements/Testing pages). This feature was requested directly by the
 * trainer, after the original spec and backend build.
 *
 * Everything below runs on local React state and resets on refresh — same
 * placeholder pattern as the AI Assistant and Repository pages. When a real
 * backend exists, the intended shape is:
 *
 *   GET    /projects/{projectId}/bugs
 *   POST   /projects/{projectId}/bugs        body: CreateBugRequest (see form)
 *   PATCH  /bugs/{bugId}/status              body: { status }
 *   PATCH  /bugs/{bugId}/assign              body: { assignedTo }
 *   DELETE /bugs/{bugId}
 *   POST   /bugs/{bugId}/attachments         multipart file upload (NOT built —
 *                                             attachments here only keep the
 *                                             file's name/size, never its bytes)
 *
 * Status field values come from the trainer's exact list: NEW, CONFIRMED,
 * IN_PROGRESS, FIXED, RETEST, CLOSED, REOPENED. The workflow diagram's
 * "Triaged" step is the NEW → CONFIRMED transition; "Assigned" is just
 * setting assignedTo (can happen at any point, not a stored status); the
 * diagram's Retest "Failed"/"Passed" branches are the two actions available
 * on a RETEST bug (→ REOPENED or → CLOSED).
 */

const ENVIRONMENTS = ['DEVELOPMENT', 'STAGING', 'PRODUCTION']
const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
const PRIORITIES = ['URGENT', 'HIGH', 'MEDIUM', 'LOW']

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

function ReportBugModal({ project, users, currentUser, onClose, onSubmit }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    module: '',
    environment: 'DEVELOPMENT',
    severity: 'MEDIUM',
    priority: 'MEDIUM',
    assignedTo: '',
  })
  const [attachments, setAttachments] = useState([])
  const fileInputRef = useRef(null)

  function handleFiles(e) {
    const files = Array.from(e.target.files || [])
    setAttachments((prev) => [...prev, ...files.map((f) => ({ name: f.name, size: f.size }))])
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
            Assign to (optional)
            <select
              value={form.assignedTo}
              onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-forge-700 bg-forge-850 px-3 py-2 text-sm text-forge-text outline-none focus:border-ember-500"
            >
              <option value="">— unassigned —</option>
              {(users || []).map((u) => (
                <option key={u.id || u._id} value={u.id || u._id}>
                  {u.name} — {u.role}
                </option>
              ))}
            </select>
          </label>

          <div>
            <p className="mb-1.5 text-xs font-medium text-forge-muted">
              Attachments — screenshots, recordings, logs, console output, files
            </p>
            <p className="mb-2 rounded-lg border border-signal-warning/25 bg-signal-warning/10 px-3 py-2 text-[11px] text-signal-warning">
              Demo mode — files are listed here but not actually uploaded anywhere;
              there's no storage endpoint on the backend yet.
            </p>
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

function BugRow({ bug, users, usersById, canTransition, canManage, onTransition, onAssign, onDelete }) {
  const assignee = usersById.get(bug.assignedTo)
  const transitions = TRANSITIONS[bug.status] || []

  return (
    <li className="rounded-lg border border-forge-700/60 bg-forge-850/50 p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Pill styles={STATUS_STYLES} value={bug.status} />
        <Pill styles={SEVERITY_STYLES} value={bug.severity} />
        <span className="font-mono text-[10px] text-forge-faint">{bug.environment}</span>
        <span className="text-sm font-medium text-forge-text">{bug.title}</span>

        <div className="ml-auto flex items-center gap-2">
          {canManage ? (
            <button
              type="button"
              onClick={() => onDelete(bug)}
              title="Delete bug"
              className="grid h-7 w-7 place-items-center rounded-md text-forge-faint transition hover:bg-signal-danger/10 hover:text-signal-danger"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>

      {bug.description ? <p className="mt-2 text-xs text-forge-muted">{bug.description}</p> : null}

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

function ProjectSection({ project, bugs, users, usersById, currentUser, isManager, isExpanded, onToggle, onReport, onTransition, onAssign, onDelete }) {
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
                  canTransition={isManager || bug.assignedTo === currentUser.id}
                  canManage={isManager}
                  onTransition={onTransition}
                  onAssign={onAssign}
                  onDelete={onDelete}
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
  const [bugs, setBugs] = useState([]) // flat list, local-only, resets on refresh
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedIds, setExpandedIds] = useState(() => new Set())
  const [reportTarget, setReportTarget] = useState(null)

  const usersById = useMemo(() => new Map((users || []).map((u) => [u.id || u._id, u])), [users])

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchProjects(), fetchUsers()])
      .then(([p, u]) => {
        if (cancelled) return
        setProjects(p || [])
        setUsers(u || [])
        if ((p || []).length > 0) setExpandedIds(new Set([p[0].id || p[0]._id]))
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

  function handleReportSubmit(bugData) {
    const bug = { ...bugData, id: `BUG-${Date.now()}-${Math.round(Math.random() * 999)}` }
    setBugs((prev) => [bug, ...prev])
    setReportTarget(null)
  }

  function handleTransition(bug, nextStatus) {
    setBugs((prev) => prev.map((b) => (b.id === bug.id ? { ...b, status: nextStatus } : b)))
  }

  function handleAssign(bug, userId) {
    setBugs((prev) => prev.map((b) => (b.id === bug.id ? { ...b, assignedTo: userId || null } : b)))
  }

  function handleDelete(bug) {
    if (!window.confirm(`Delete bug "${bug.title}"?`)) return
    setBugs((prev) => prev.filter((b) => b.id !== bug.id))
  }

  const totals = useMemo(() => {
    const open = bugs.filter((b) => b.status !== 'CLOSED').length
    const critical = bugs.filter((b) => b.severity === 'CRITICAL' && b.status !== 'CLOSED').length
    return { total: bugs.length, open, critical }
  }, [bugs])

  const safeProjects = projects || []

  return (
    <div>
      <PageHeader title="Bug Reports" subtitle="Track, triage, and resolve bugs across every project." />

      <p className="mb-6 rounded-lg border border-signal-warning/25 bg-signal-warning/10 px-4 py-3 text-sm text-signal-warning">
        This page runs on local, in-browser data only — there's no Bug entity on the backend yet.
        Bugs reported here reset on refresh. Attachments keep file names, not the actual files.
      </p>

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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard icon={Bug} label="Total Bugs" value={totals.total} hint="reported this session" accent="ember" />
            <StatCard icon={AlertTriangle} label="Open" value={totals.open} hint="not yet closed" accent="danger" />
            <StatCard icon={AlertTriangle} label="Critical Open" value={totals.critical} hint="need attention" accent="danger" />
          </div>

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
                    bugs={bugs.filter((b) => b.projectId === pId)}
                    users={users}
                    usersById={usersById}
                    currentUser={user}
                    isManager={isManager}
                    isExpanded={expandedIds.has(pId)}
                    onToggle={toggleProject}
                    onReport={setReportTarget}
                    onTransition={handleTransition}
                    onAssign={handleAssign}
                    onDelete={handleDelete}
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
          users={users}
          currentUser={user}
          onClose={() => setReportTarget(null)}
          onSubmit={handleReportSubmit}
        />
      ) : null}
    </div>
  )
}