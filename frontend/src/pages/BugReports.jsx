import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  ChevronDown,
  FolderKanban,
  Link2,
  Paperclip,
  Plus,
  RotateCcw,
  X,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { extractId, fetchProjects, fetchTasksByProject, fetchUsers, requestCicd } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { EmptyState, PageHeader } from '../components/ui'

/**
 * Bug Reports — backed by the cicd-service Bug API:
 *
 *   GET   /projects/{projectId}/bugs
 *   POST  /projects/{projectId}/bugs
 *   PATCH /bugs/{bugId}/status      body { status }
 *   PATCH /bugs/{bugId}/assign      body { assignedTo }
 *
 * Trainer's rules implemented here:
 *  - No delete anywhere: bugs stay as project history, even when CLOSED.
 *  - Only a manager (ADMIN / PROJECT_LEAD / PROJECT_MANAGER) assigns who fixes
 *    a bug. The reporter cannot pick an assignee, and work cannot start on a
 *    CONFIRMED bug until someone is assigned.
 *  - Every bug can be linked to the task / user story it came from.
 *  - Status and severity tags, the metric cards and the chart bars are all
 *    clickable filters.
 *
 * The backend Bug model does NOT store linkedTaskId, errorMessage, consoleLog
 * or attachments yet (see the Bug.java / CreateBugRequest the backend team
 * shared). The form still sends them; once the backend stores them they come
 * back on every load. Until then they only live in the browser until refresh.
 * Flip BACKEND_STORES_EXTRAS to true when the backend team has added them, and
 * the warning banner disappears.
 */
const BACKEND_STORES_EXTRAS = false

const ENVIRONMENTS = ['DEVELOPMENT', 'STAGING', 'PRODUCTION']
const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
const PRIORITIES = ['URGENT', 'HIGH', 'MEDIUM', 'LOW']
const STATUSES = ['NEW', 'CONFIRMED', 'IN_PROGRESS', 'FIXED', 'RETEST', 'REOPENED', 'CLOSED']

// Forward transitions per status. RETEST branches two ways.
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

// recharts needs literal colors (approximate hex of the design tokens).
const STATUS_CHART_COLORS = {
  NEW: '#8b94a7',
  CONFIRMED: '#6f8cd3',
  IN_PROGRESS: '#f5b841',
  FIXED: '#7ad6a8',
  RETEST: '#ff8a4c',
  REOPENED: '#f0546a',
  CLOSED: '#3ddc97',
}
const SEVERITY_CHART_COLORS = {
  CRITICAL: '#f0546a',
  HIGH: '#ff8a4c',
  MEDIUM: '#f5b841',
  LOW: '#8b94a7',
}

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: '#12151b',
    border: '1px solid #232a36',
    borderRadius: '8px',
    color: '#e8ebf1',
  },
  itemStyle: { color: '#e8ebf1', fontSize: 12 },
}

/* ── Bug API (cicd-service) ──────────────────────────────────── */

const listBugs = (projectId) => requestCicd(`/projects/${extractId(projectId)}/bugs`)

const createBug = (projectId, body) =>
  requestCicd(`/projects/${extractId(projectId)}/bugs`, { method: 'POST', body })

const patchBugStatus = (bugId, status) =>
  requestCicd(`/bugs/${extractId(bugId)}/status`, { method: 'PATCH', body: { status } })

const patchBugAssign = (bugId, assignedTo) =>
  requestCicd(`/bugs/${extractId(bugId)}/assign`, { method: 'PATCH', body: { assignedTo } })

// Keep browser-only extras (linked task, error text, attachments) when the
// server response doesn't carry them back.
const mergeBug = (current, updated) => ({
  ...current,
  ...updated,
  attachments: updated?.attachments?.length ? updated.attachments : current.attachments,
})

const relativeTime = (iso) => {
  if (!iso) return '—'
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (Number.isNaN(minutes)) return '—'
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

/* ── Clickable tag (status / severity) ───────────────────────── */

function FilterPill({ styles, value, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`Filter by ${value}`}
      className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wider transition hover:brightness-125 ${
        styles[value] ?? 'border-forge-600 bg-forge-800 text-forge-muted'
      } ${active ? 'ring-2 ring-ember-500/70' : ''}`}
    >
      {value}
    </button>
  )
}

/* ── Summary: clickable metric cards + charts ────────────────── */

function BugSummary({ bugs, filters, onCard, onStatus, onSeverity }) {
  const open = bugs.filter((b) => b.status !== 'CLOSED').length
  const inProgress = bugs.filter((b) => b.status === 'IN_PROGRESS').length
  const closed = bugs.filter((b) => b.status === 'CLOSED').length
  const criticalOpen = bugs.filter((b) => b.severity === 'CRITICAL' && b.status !== 'CLOSED').length

  const cards = [
    { label: 'Total', value: bugs.length, next: { status: null, severity: null } },
    { label: 'Open', value: open, next: { status: 'OPEN', severity: null } },
    { label: 'In Progress', value: inProgress, next: { status: 'IN_PROGRESS', severity: null } },
    { label: 'Closed', value: closed, next: { status: 'CLOSED', severity: null } },
    { label: 'Critical open', value: criticalOpen, next: { status: 'OPEN', severity: 'CRITICAL' } },
  ]

  const byStatus = STATUSES.map((status) => ({
    status,
    label: status.replace('_', ' '),
    count: bugs.filter((b) => b.status === status).length,
  }))
  const bySeverity = SEVERITIES.map((severity) => ({
    severity,
    name: severity,
    value: bugs.filter((b) => b.severity === severity).length,
  })).filter((d) => d.value > 0)

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {cards.map((card) => {
          const active = filters.status === card.next.status && filters.severity === card.next.severity
          return (
            <button
              key={card.label}
              type="button"
              onClick={() => onCard(card.next)}
              className={`nf-card p-4 text-left transition hover:border-forge-600 ${
                active ? 'ring-2 ring-ember-500/70' : ''
              }`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-forge-muted">{card.label}</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-forge-text">{card.value}</p>
            </button>
          )
        })}
      </div>

      {bugs.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-forge-700 px-4 py-6 text-center text-sm text-forge-faint">
          Charts appear once a bug is reported.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <section className="nf-card p-4 lg:col-span-2">
            <h3 className="mb-1 font-display text-sm font-semibold text-forge-text">Bugs by status</h3>
            <p className="mb-2 text-xs text-forge-faint">Click a bar to filter the list.</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byStatus} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#8b94a7' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#8b94a7' }} axisLine={false} tickLine={false} />
                  <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.04)' }} formatter={(v) => [v, 'Bugs']} />
                  <Bar
                    dataKey="count"
                    radius={[4, 4, 0, 0]}
                    cursor="pointer"
                    onClick={(d) => onStatus(d?.payload?.status ?? d?.status)}
                  >
                    {byStatus.map((entry) => (
                      <Cell
                        key={entry.status}
                        fill={STATUS_CHART_COLORS[entry.status]}
                        fillOpacity={filters.status && filters.status !== entry.status ? 0.35 : 1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="nf-card p-4">
            <h3 className="mb-1 font-display text-sm font-semibold text-forge-text">Bugs by severity</h3>
            <p className="mb-2 text-xs text-forge-faint">Click a slice to filter.</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bySeverity}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="50%"
                    outerRadius="78%"
                    paddingAngle={3}
                    stroke="#0a0c10"
                    strokeWidth={2}
                    cursor="pointer"
                    onClick={(d) => onSeverity(d?.payload?.severity ?? d?.severity ?? d?.name)}
                  >
                    {bySeverity.map((entry) => (
                      <Cell
                        key={entry.severity}
                        fill={SEVERITY_CHART_COLORS[entry.severity]}
                        fillOpacity={filters.severity && filters.severity !== entry.severity ? 0.35 : 1}
                      />
                    ))}
                  </Pie>
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v, name) => [`${v} bug${v === 1 ? '' : 's'}`, name]} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#8b94a7' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      )}
    </>
  )
}

/* ── Report Bug modal ────────────────────────────────────────── */

function ReportBugModal({ project, tasks, onClose, onSubmit }) {
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
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  function handleFiles(e) {
    const files = Array.from(e.target.files || [])
    setAttachments((prev) => [...prev, ...files.map((f) => ({ name: f.name, size: f.size }))])
    e.target.value = ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSubmitting(true)
    setError('')
    try {
      await onSubmit({ ...form, attachments })
    } catch (err) {
      setError(err.message ?? 'Could not report the bug.')
      setSubmitting(false)
    }
  }

  const inputClass =
    'mt-1 w-full rounded-lg border border-forge-700 bg-forge-850 px-3 py-2 text-sm text-forge-text outline-none focus:border-ember-500'
  const selectClass =
    'mt-1 w-full rounded-lg border border-forge-700 bg-forge-850 px-2 py-2 text-xs text-forge-text outline-none focus:border-ember-500'

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
          {error ? (
            <p role="alert" className="rounded-lg border border-signal-danger/30 bg-signal-danger/10 px-3 py-2.5 text-sm text-signal-danger">
              {error}
            </p>
          ) : null}

          <label className="block text-xs font-medium text-forge-muted">
            Bug title
            <input required value={form.title} onChange={set('title')} placeholder="Login fails with valid credentials on mobile" className={inputClass} />
          </label>

          <label className="block text-xs font-medium text-forge-muted">
            Description
            <textarea value={form.description} onChange={set('description')} rows={3} placeholder="Steps to reproduce, expected vs actual behavior..." className={inputClass} />
          </label>

          <label className="block text-xs font-medium text-forge-muted">
            Module / Feature
            <input value={form.module} onChange={set('module')} placeholder="e.g. Login, Dashboard, Payments" className={inputClass} />
          </label>

          <label className="block text-xs font-medium text-forge-muted">
            Linked task / user story (optional)
            <select value={form.linkedTaskId} onChange={set('linkedTaskId')} className={inputClass}>
              <option value="">— none —</option>
              {(tasks || []).map((t) => (
                <option key={t.id || t._id} value={t.id || t._id}>
                  {t.title}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-[11px] text-forge-faint">
              Pick the task or user story this bug came from, so it can be traced back.
            </span>
          </label>

          <div className="grid grid-cols-3 gap-3">
            <label className="block text-xs font-medium text-forge-muted">
              Environment
              <select value={form.environment} onChange={set('environment')} className={selectClass}>
                {ENVIRONMENTS.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-forge-muted">
              Severity
              <select value={form.severity} onChange={set('severity')} className={selectClass}>
                {SEVERITIES.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-forge-muted">
              Priority
              <select value={form.priority} onChange={set('priority')} className={selectClass}>
                {PRIORITIES.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="block text-xs font-medium text-forge-muted">
            Error message (optional)
            <textarea value={form.errorMessage} onChange={set('errorMessage')} rows={2} placeholder="Paste the error text the user saw" className={`${inputClass} font-mono text-xs`} />
          </label>

          <label className="block text-xs font-medium text-forge-muted">
            Console log (optional)
            <textarea value={form.consoleLog} onChange={set('consoleLog')} rows={3} placeholder="Paste browser console or server log output" className={`${inputClass} font-mono text-xs`} />
          </label>

          <div>
            <p className="mb-1.5 text-xs font-medium text-forge-muted">
              Attachments — screenshots, recordings, logs, files
            </p>
            {!BACKEND_STORES_EXTRAS ? (
              <p className="mb-2 rounded-lg border border-signal-warning/25 bg-signal-warning/10 px-3 py-2 text-[11px] text-signal-warning">
                Files are listed by name only — the server doesn't store attachments yet.
              </p>
            ) : null}
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
                    <button
                      type="button"
                      onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                      className="ml-2 shrink-0 text-forge-faint hover:text-signal-danger"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <p className="text-[11px] text-forge-faint">
            You can't pick who fixes it — a lead or manager assigns the bug after it is confirmed.
          </p>

          <div className="flex justify-end gap-2 border-t border-forge-700/60 pt-4">
            <button type="button" onClick={onClose} disabled={submitting} className="rounded-lg border border-forge-700 px-3 py-2 text-sm text-forge-muted hover:bg-forge-850">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="inline-flex items-center gap-1.5 rounded-lg bg-ember-500 px-4 py-2 text-sm font-medium text-white hover:bg-ember-600 disabled:opacity-60">
              <Bug className="h-3.5 w-3.5" aria-hidden /> {submitting ? 'Reporting…' : 'Report bug'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Single bug row ──────────────────────────────────────────── */

function BugRow({
  bug,
  users,
  usersById,
  tasksById,
  filters,
  isManager,
  canMove,
  busy,
  onTransition,
  onAssign,
  onStatusFilter,
  onSeverityFilter,
}) {
  const assignee = usersById.get(bug.assignedTo)
  const reporterName = usersById.get(bug.reportedBy)?.name || bug.reportedByName || bug.reportedBy || 'Unknown'
  const linkedTask = bug.linkedTaskId ? tasksById.get(bug.linkedTaskId) : null
  const transitions = TRANSITIONS[bug.status] || []

  return (
    <li className="rounded-lg border border-forge-700/60 bg-forge-850/50 p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <FilterPill
          styles={STATUS_STYLES}
          value={bug.status}
          active={filters.status === bug.status}
          onClick={() => onStatusFilter(bug.status)}
        />
        <FilterPill
          styles={SEVERITY_STYLES}
          value={bug.severity}
          active={filters.severity === bug.severity}
          onClick={() => onSeverityFilter(bug.severity)}
        />
        <span className="font-mono text-[10px] text-forge-faint">{bug.environment}</span>
        <span className="text-sm font-medium text-forge-text">{bug.title}</span>
      </div>

      {bug.description ? <p className="mt-2 text-xs text-forge-muted">{bug.description}</p> : null}

      {bug.errorMessage ? (
        <pre className="mt-2 overflow-x-auto rounded-md border border-signal-danger/25 bg-forge-900 p-2 font-mono text-[11px] text-signal-danger">
          {bug.errorMessage}
        </pre>
      ) : null}
      {bug.consoleLog ? (
        <pre className="mt-2 max-h-40 overflow-auto rounded-md border border-forge-700 bg-forge-900 p-2 font-mono text-[11px] text-forge-muted">
          {bug.consoleLog}
        </pre>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-forge-faint">
        {bug.module ? <span>Module: {bug.module}</span> : null}
        <span>Priority: {bug.priority}</span>
        {bug.linkedTaskId ? (
          <span className="inline-flex items-center gap-1 text-steel-300">
            <Link2 className="h-3 w-3" aria-hidden /> From task: {linkedTask?.title || bug.linkedTaskId}
          </span>
        ) : null}
        <span>
          Reported by {reporterName} · {relativeTime(bug.createdAt)}
        </span>
        {bug.attachments?.length > 0 ? (
          <span className="inline-flex items-center gap-1">
            <Paperclip className="h-3 w-3" aria-hidden /> {bug.attachments.length} attachment
            {bug.attachments.length === 1 ? '' : 's'}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-forge-700/50 pt-3">
        {isManager ? (
          <select
            value={bug.assignedTo || ''}
            onChange={(e) => e.target.value && onAssign(bug, e.target.value)}
            disabled={busy}
            className="rounded-md border border-forge-700 bg-forge-850 px-2 py-1 text-xs text-forge-text outline-none focus:border-ember-500"
          >
            <option value="" disabled>
              Assign to…
            </option>
            {(users || []).map((u) => (
              <option key={u.id || u._id} value={u.id || u._id}>
                {u.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-xs text-forge-faint">
            {assignee ? `Assigned to ${assignee.name}` : 'Not assigned yet'}
          </span>
        )}

        {canMove
          ? transitions.map((t) => {
              // "Assigned" step: a confirmed bug needs an assignee before work starts.
              const needsAssignee = bug.status === 'CONFIRMED' && !bug.assignedTo
              return (
                <button
                  key={t.to}
                  type="button"
                  disabled={needsAssignee || busy}
                  title={needsAssignee ? 'A lead or manager must assign this bug first' : undefined}
                  onClick={() => onTransition(bug, t.to)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-forge-600 px-2.5 py-1.5 text-xs font-medium text-forge-muted transition hover:bg-forge-850 hover:text-forge-text disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t.to === 'CLOSED' ? <CheckCircle2 className="h-3.5 w-3.5 text-signal-success" aria-hidden /> : null}
                  {t.to === 'REOPENED' ? <RotateCcw className="h-3.5 w-3.5 text-signal-danger" aria-hidden /> : null}
                  {t.label}
                </button>
              )
            })
          : null}
      </div>
    </li>
  )
}

/* ── Expandable per-project section ─────────────────────────── */

function ProjectSection({
  project,
  allBugs,
  visibleBugs,
  isExpanded,
  onToggle,
  onReport,
  renderBug,
}) {
  const pId = project.id || project._id
  const open = allBugs.filter((b) => b.status !== 'CLOSED').length
  const filtered = visibleBugs.length !== allBugs.length

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
          <span className="block truncate font-display text-sm font-semibold text-forge-text">{project.name}</span>
          <span className="block truncate font-mono text-[11px] text-steel-400">{pId}</span>
        </span>
        <span className="hidden items-center gap-4 font-mono text-[11px] text-forge-muted sm:flex">
          <span>{filtered ? `${visibleBugs.length} of ${allBugs.length}` : allBugs.length} bugs</span>
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

          {allBugs.length === 0 ? (
            <p className="py-4 text-center text-sm text-forge-muted">No bugs reported for this project yet.</p>
          ) : visibleBugs.length === 0 ? (
            <p className="py-4 text-center text-sm text-forge-muted">No bugs match the current filter.</p>
          ) : (
            <ul className="space-y-3">{visibleBugs.map(renderBug)}</ul>
          )}
        </div>
      ) : null}
    </section>
  )
}

/* ── Page ───────────────────────────────────────────────────── */

export default function BugReports() {
  const { user, hasRole } = useAuth()
  const isManager = hasRole ? hasRole(...MANAGER_ROLES) : MANAGER_ROLES.includes(user.role)
  const isQA = user.role === 'QA'

  const [projects, setProjects] = useState(null)
  const [users, setUsers] = useState([])
  const [tasks, setTasks] = useState([])
  const [bugs, setBugs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [loadWarning, setLoadWarning] = useState(false)
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [expandedIds, setExpandedIds] = useState(() => new Set())
  const [reportTarget, setReportTarget] = useState(null)
  const [filters, setFilters] = useState({ status: null, severity: null })

  const usersById = useMemo(() => new Map((users || []).map((u) => [u.id || u._id, u])), [users])
  const tasksById = useMemo(() => new Map((tasks || []).map((t) => [t.id || t._id, t])), [tasks])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [projectData, userData] = await Promise.all([fetchProjects(), fetchUsers()])
        let failed = false
        const entries = await Promise.all(
          (projectData || []).map(async (p) => {
            const pId = p.id || p._id
            const [projectBugs, projectTasks] = await Promise.all([
              listBugs(pId).catch(() => {
                failed = true
                return []
              }),
              fetchTasksByProject(pId).catch(() => []),
            ])
            return { bugs: projectBugs || [], tasks: projectTasks || [] }
          }),
        )
        if (cancelled) return
        setProjects(projectData || [])
        setUsers(userData || [])
        setBugs(
          entries
            .flatMap((e) => e.bugs)
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
        )
        setTasks(entries.flatMap((e) => e.tasks))
        setLoadWarning(failed)
        if ((projectData || []).length > 0) {
          setExpandedIds(new Set([projectData[0].id || projectData[0]._id]))
        }
      } catch (err) {
        if (!cancelled) setError(err.message ?? 'Failed to load bug reports.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
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

  // Filters: clicking the same value again clears it.
  const toggleStatus = (value) =>
    value && setFilters((f) => ({ ...f, status: f.status === value ? null : value }))
  const toggleSeverity = (value) =>
    value && setFilters((f) => ({ ...f, severity: f.severity === value ? null : value }))
  const applyCard = (next) =>
    setFilters((f) =>
      f.status === next.status && f.severity === next.severity ? { status: null, severity: null } : next,
    )
  const clearFilters = () => setFilters({ status: null, severity: null })

  function passesFilter(bug) {
    if (filters.status === 'OPEN' && bug.status === 'CLOSED') return false
    if (filters.status && filters.status !== 'OPEN' && bug.status !== filters.status) return false
    if (filters.severity && bug.severity !== filters.severity) return false
    return true
  }

  async function handleReportSubmit(project, data) {
    const pId = project.id || project._id
    const { attachments, linkedTaskId, errorMessage, consoleLog, ...core } = data
    const body = {
      ...core,
      ...(linkedTaskId ? { linkedTaskId } : {}),
      ...(errorMessage.trim() ? { errorMessage: errorMessage.trim() } : {}),
      ...(consoleLog.trim() ? { consoleLog: consoleLog.trim() } : {}),
    }
    const created = await createBug(pId, body)
    const bug = {
      ...created,
      projectId: created.projectId ?? pId,
      reportedBy: created.reportedBy ?? user.id,
      reportedByName: created.reportedByName ?? user.name,
      linkedTaskId: created.linkedTaskId ?? (linkedTaskId || null),
      errorMessage: created.errorMessage ?? (errorMessage.trim() || null),
      consoleLog: created.consoleLog ?? (consoleLog.trim() || null),
      attachments: created.attachments?.length ? created.attachments : attachments,
    }
    setBugs((prev) => [bug, ...prev])
    setReportTarget(null)
  }

  async function handleTransition(bug, nextStatus) {
    setActionError('')
    setBusyId(bug.id)
    try {
      const updated = await patchBugStatus(bug.id, nextStatus)
      setBugs((prev) => prev.map((b) => (b.id === bug.id ? mergeBug(b, updated) : b)))
    } catch (err) {
      setActionError(err.message ?? 'Could not update the bug.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleAssign(bug, userId) {
    setActionError('')
    setBusyId(bug.id)
    try {
      const updated = await patchBugAssign(bug.id, userId)
      setBugs((prev) => prev.map((b) => (b.id === bug.id ? mergeBug(b, updated) : b)))
    } catch (err) {
      setActionError(err.message ?? 'Could not assign the bug.')
    } finally {
      setBusyId(null)
    }
  }

  // Who can move a bug along: managers, the assignee, and QA (who retest fixes).
  const canMove = (bug) =>
    isManager || bug.assignedTo === user.id || (isQA && ['FIXED', 'RETEST'].includes(bug.status))

  const hasFilter = Boolean(filters.status || filters.severity)
  const safeProjects = projects || []

  return (
    <div>
      <PageHeader title="Bug Reports" subtitle="Track, triage, and resolve bugs across every project." />

      {!BACKEND_STORES_EXTRAS ? (
        <p className="mb-6 rounded-lg border border-signal-warning/25 bg-signal-warning/10 px-4 py-3 text-sm text-signal-warning">
          Bugs are saved on the server. The linked task, error message, console log and attachments
          aren't stored by the backend yet, so they only show until you refresh the page.
        </p>
      ) : null}

      {loadWarning ? (
        <p role="alert" className="mb-6 rounded-lg border border-signal-danger/30 bg-signal-danger/10 px-4 py-3 text-sm text-signal-danger">
          Couldn't load bugs for some projects — check that cicd-service is running.
        </p>
      ) : null}

      {actionError ? (
        <p role="alert" className="mb-6 rounded-lg border border-signal-danger/30 bg-signal-danger/10 px-4 py-3 text-sm text-signal-danger">
          {actionError}
        </p>
      ) : null}

      {error ? (
        <EmptyState icon={AlertTriangle} title="Couldn't load bug reports" message={error} />
      ) : loading ? (
        <div aria-hidden className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[0, 1, 2, 3, 4].map((k) => (
              <div key={k} className="nf-card h-20 animate-pulse" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <BugSummary
            bugs={bugs}
            filters={filters}
            onCard={applyCard}
            onStatus={toggleStatus}
            onSeverity={toggleSeverity}
          />

          <div className="mb-4 mt-8 flex flex-wrap items-center gap-3">
            <h2 className="font-display text-lg font-semibold text-forge-text">Bugs by project</h2>
            {hasFilter ? (
              <div className="flex flex-wrap items-center gap-2">
                {filters.status ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-ember-500/40 bg-ember-500/10 px-2.5 py-1 font-mono text-[10px] font-semibold text-ember-400">
                    Status: {filters.status}
                  </span>
                ) : null}
                {filters.severity ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-ember-500/40 bg-ember-500/10 px-2.5 py-1 font-mono text-[10px] font-semibold text-ember-400">
                    Severity: {filters.severity}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-forge-muted transition hover:bg-forge-850 hover:text-forge-text"
                >
                  <X className="h-3 w-3" aria-hidden /> Clear filter
                </button>
              </div>
            ) : null}
          </div>

          {safeProjects.length === 0 ? (
            <EmptyState icon={FolderKanban} title="No projects yet" message="Create a project first to report bugs against it." />
          ) : (
            <div className="space-y-4">
              {safeProjects.map((project) => {
                const pId = project.id || project._id
                const allBugs = bugs.filter((b) => b.projectId === pId)
                const visibleBugs = allBugs.filter(passesFilter)
                return (
                  <ProjectSection
                    key={pId}
                    project={project}
                    allBugs={allBugs}
                    visibleBugs={visibleBugs}
                    isExpanded={expandedIds.has(pId)}
                    onToggle={toggleProject}
                    onReport={setReportTarget}
                    renderBug={(bug) => (
                      <BugRow
                        key={bug.id}
                        bug={bug}
                        users={users}
                        usersById={usersById}
                        tasksById={tasksById}
                        filters={filters}
                        isManager={isManager}
                        canMove={canMove(bug)}
                        busy={busyId === bug.id}
                        onTransition={handleTransition}
                        onAssign={handleAssign}
                        onStatusFilter={toggleStatus}
                        onSeverityFilter={toggleSeverity}
                      />
                    )}
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
          tasks={tasks.filter((t) => t.projectId === (reportTarget.id || reportTarget._id))}
          onClose={() => setReportTarget(null)}
          onSubmit={(data) => handleReportSubmit(reportTarget, data)}
        />
      ) : null}
    </div>
  )
}