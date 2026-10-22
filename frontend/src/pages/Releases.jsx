import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  FileText,
  FolderKanban,
  Pencil,
  Plus,
  Rocket,
  Tag,
  X,
} from 'lucide-react'
import {
  fetchProjects,
  fetchReleases,
  fetchProjectDeployments,
  createRelease,
  updateRelease,
  publishRelease,
  fetchChangelog,
} from '../api/client'
import { useAuth } from '../context/AuthContext'
import { EmptyState, PageHeader, StatCard } from '../components/ui'

/**
 * Milestone 4 — Releases.
 *
 * Backed by the real cicd-service ReleaseController (see client.js
 * additions). No HealthMetric model exists on the backend, so this page
 * only deals with Release records — Monitoring.jsx covers pipeline health.
 */

// Real @PreAuthorize on create/update/publish endpoints.
const MANAGE_ROLES = ['ADMIN', 'PROJECT_LEAD', 'PROJECT_MANAGER', 'TEAM_LEAD']

const RELEASE_PILL_STYLES = {
  DRAFT: 'border-forge-600 bg-forge-800 text-forge-muted',
  RELEASED: 'border-signal-success/25 bg-signal-success/10 text-signal-success',
  ROLLED_BACK: 'border-signal-danger/25 bg-signal-danger/10 text-signal-danger',
}

function StatusPill({ status }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wider ${
        RELEASE_PILL_STYLES[status] ?? 'border-forge-600 bg-forge-800 text-forge-muted'
      }`}
    >
      {status ?? 'UNKNOWN'}
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

function ReleasesSkeleton() {
  return (
    <div aria-hidden>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <div key={key} className="nf-card h-28 animate-pulse" />
        ))}
      </div>
      <div className="nf-card mt-8 h-24 animate-pulse" />
      <div className="nf-card mt-4 h-24 animate-pulse" />
    </div>
  )
}

/* ── Create / Edit Release modal ─────────────────────────────── */

function ReleaseFormModal({ project, deployments, initial, onClose, onSubmit, submitting, error }) {
  const isEdit = Boolean(initial?.id)
  const [form, setForm] = useState({
    version: initial?.version ?? '',
    name: initial?.name ?? '',
    notes: initial?.notes ?? '',
    deploymentId: initial?.deploymentId ?? '',
    milestoneId: initial?.milestoneId ?? '',
  })

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl border border-forge-700 bg-forge-900 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-base font-semibold text-forge-text">
            {isEdit ? 'Edit release' : 'New release'} — {project.name}
          </h3>
          <button type="button" onClick={onClose} className="text-forge-faint hover:text-forge-text">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit(form)
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-forge-muted">
              Version
              <input
                required
                value={form.version}
                onChange={(e) => update('version', e.target.value)}
                placeholder="v2.4.0"
                className="mt-1 w-full rounded-lg border border-forge-700 bg-forge-850 px-3 py-2 text-sm text-forge-text outline-none focus:border-ember-500"
              />
            </label>
            <label className="block text-xs font-medium text-forge-muted">
              Name
              <input
                required
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="Payment service GA"
                className="mt-1 w-full rounded-lg border border-forge-700 bg-forge-850 px-3 py-2 text-sm text-forge-text outline-none focus:border-ember-500"
              />
            </label>
          </div>

          <label className="block text-xs font-medium text-forge-muted">
            Notes / changelog summary
            <textarea
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              rows={3}
              placeholder="What changed in this release..."
              className="mt-1 w-full rounded-lg border border-forge-700 bg-forge-850 px-3 py-2 text-sm text-forge-text outline-none focus:border-ember-500"
            />
          </label>

          <label className="block text-xs font-medium text-forge-muted">
            Linked deployment (optional)
            <select
              value={form.deploymentId}
              onChange={(e) => update('deploymentId', e.target.value)}
              className="mt-1 w-full rounded-lg border border-forge-700 bg-forge-850 px-3 py-2 text-sm text-forge-text outline-none focus:border-ember-500"
            >
              <option value="">— none —</option>
              {deployments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.environment} · {d.version || d.imageTag || d.id} · {d.status}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-medium text-forge-muted">
            Milestone ID (optional)
            <input
              value={form.milestoneId}
              onChange={(e) => update('milestoneId', e.target.value)}
              placeholder="e.g. sprint or milestone identifier"
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
              className="rounded-lg bg-ember-500 px-4 py-2 text-sm font-medium text-white hover:bg-ember-600 disabled:opacity-60"
            >
              {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create release'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Changelog modal ─────────────────────────────────────────── */

function ChangelogModal({ release, changelog, loading, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-forge-700 bg-forge-900 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-base font-semibold text-forge-text">
            Changelog — {release.version}
          </h3>
          <button type="button" onClick={onClose} className="text-forge-faint hover:text-forge-text">
            <X className="h-4 w-4" />
          </button>
        </div>
        {loading ? (
          <div className="h-20 animate-pulse rounded-lg bg-forge-850" />
        ) : changelog ? (
          <dl className="space-y-2 font-mono text-xs text-forge-muted">
            <div className="flex justify-between gap-4">
              <dt className="text-forge-faint">Name</dt>
              <dd className="text-right text-forge-text">{changelog.name || '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-forge-faint">Status</dt>
              <dd className="text-right text-forge-text">{changelog.status || '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-forge-faint">Deployment</dt>
              <dd className="truncate text-right text-forge-text">{changelog.deploymentId || '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-forge-faint">Milestone</dt>
              <dd className="truncate text-right text-forge-text">{changelog.milestoneId || '—'}</dd>
            </div>
            <div className="pt-2">
              <dt className="mb-1 text-forge-faint">Notes</dt>
              <dd className="whitespace-pre-wrap text-forge-text">{changelog.notes || 'No notes recorded.'}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-forge-muted">No changelog data available.</p>
        )}
      </div>
    </div>
  )
}

/* ── Single release row ──────────────────────────────────────── */

function ReleaseRow({ release, canManage, onEdit, onPublish, onViewChangelog, publishPending }) {
  return (
    <li className="rounded-lg border border-forge-700/60 bg-forge-850/50 p-4 transition hover:border-forge-600">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <StatusPill status={release.status} />
        <span className="inline-flex items-center gap-1.5 font-mono text-xs text-steel-300">
          <Tag className="h-3.5 w-3.5 shrink-0 text-forge-faint" aria-hidden />
          {release.version}
        </span>
        <span className="font-mono text-xs text-forge-muted">{release.name}</span>

        <div className="ml-auto flex items-center gap-2">
          <span className="font-mono text-[11px] text-forge-faint">
            {release.status === 'RELEASED'
              ? `released ${relativeTime(release.releasedAt)}${release.releasedBy ? ` by ${release.releasedBy}` : ''}`
              : 'not yet released'}
          </span>

          <button
            type="button"
            onClick={() => onViewChangelog(release)}
            title="View changelog"
            className="inline-flex items-center gap-1.5 rounded-lg border border-forge-600 px-2 py-1.5 text-xs font-medium text-forge-muted transition hover:bg-forge-850 hover:text-forge-text"
          >
            <FileText className="h-3.5 w-3.5" aria-hidden />
          </button>

          {canManage ? (
            <button
              type="button"
              onClick={() => onEdit(release)}
              title="Edit release"
              className="inline-flex items-center gap-1.5 rounded-lg border border-forge-600 px-2 py-1.5 text-xs font-medium text-forge-muted transition hover:bg-forge-850 hover:text-forge-text"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : null}

          {canManage && release.status === 'DRAFT' ? (
            <button
              type="button"
              onClick={() => onPublish(release)}
              disabled={publishPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-signal-success/30 bg-signal-success/10 px-2.5 py-1.5 text-xs font-medium text-signal-success transition hover:bg-signal-success/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              {publishPending ? 'Publishing…' : 'Publish'}
            </button>
          ) : null}
        </div>
      </div>

      {release.notes ? (
        <p className="mt-3 line-clamp-2 border-t border-forge-700/50 pt-3 text-xs text-forge-muted">
          {release.notes}
        </p>
      ) : null}
    </li>
  )
}

/* ── Expandable per-project section ─────────────────────────── */

function ProjectSection({
  project,
  releases,
  deployments,
  isExpanded,
  onToggle,
  canManage,
  onCreate,
  onEdit,
  onPublish,
  onViewChangelog,
  publishingId,
}) {
  const pId = project.id || project._id
  const released = releases.filter((r) => r.status === 'RELEASED').length

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
          <span>{releases.length} releases</span>
          <span>{released} released</span>
        </span>
      </button>

      {isExpanded ? (
        <div className="border-t border-forge-700/60 px-5 py-4">
          {canManage ? (
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={() => onCreate(project)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-ember-500/40 bg-ember-500/10 px-3 py-1.5 text-xs font-medium text-ember-400 transition hover:bg-ember-500/20"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                New release
              </button>
            </div>
          ) : null}

          {releases.length === 0 ? (
            <p className="py-4 text-center text-sm text-forge-muted">
              No releases recorded for this project yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {releases.map((release) => (
                <ReleaseRow
                  key={release.id}
                  release={release}
                  canManage={canManage}
                  onEdit={onEdit}
                  onPublish={onPublish}
                  onViewChangelog={onViewChangelog}
                  publishPending={publishingId === release.id}
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

export default function Releases() {
  const { hasRole, user } = useAuth()
  const canManage = hasRole(...MANAGE_ROLES)

  const [projects, setProjects] = useState(null)
  const [releasesByProject, setReleasesByProject] = useState({})
  const [deploymentsByProject, setDeploymentsByProject] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedIds, setExpandedIds] = useState(() => new Set())

  const [formTarget, setFormTarget] = useState(null) // { project, initial }
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  const [publishingId, setPublishingId] = useState(null)
  const [actionError, setActionError] = useState(null)

  const [changelogTarget, setChangelogTarget] = useState(null) // release
  const [changelog, setChangelog] = useState(null)
  const [changelogLoading, setChangelogLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const projectData = (await fetchProjects()) || []
        const entries = await Promise.all(
          projectData.map(async (p) => {
            const pId = p.id || p._id
            const [releases, deployments] = await Promise.all([
              fetchReleases(pId).catch(() => []),
              fetchProjectDeployments(pId).catch(() => []),
            ])
            return [pId, releases || [], deployments || []]
          }),
        )
        if (cancelled) return
        setProjects(projectData)
        setReleasesByProject(Object.fromEntries(entries.map(([pId, r]) => [pId, r])))
        setDeploymentsByProject(Object.fromEntries(entries.map(([pId, , d]) => [pId, d])))
        if (projectData.length > 0) {
          setExpandedIds(new Set([projectData[0].id || projectData[0]._id]))
        }
      } catch (err) {
        if (!cancelled) setError(err.message ?? 'Failed to load releases.')
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
    const all = Object.values(releasesByProject).flat()
    return {
      total: all.length,
      released: all.filter((r) => r.status === 'RELEASED').length,
      draft: all.filter((r) => r.status === 'DRAFT').length,
    }
  }, [releasesByProject])

  function toggleProject(pId) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(pId)) next.delete(pId)
      else next.add(pId)
      return next
    })
  }

  function openCreate(project) {
    setFormError(null)
    setFormTarget({ project, initial: null })
  }

  function openEdit(release, project) {
    setFormError(null)
    setFormTarget({ project, initial: release })
  }

  async function handleFormSubmit(form) {
    if (!formTarget) return
    const { project, initial } = formTarget
    const pId = project.id || project._id
    setFormSubmitting(true)
    setFormError(null)
    try {
      if (initial?.id) {
        const updated = await updateRelease(initial.id, form)
        setReleasesByProject((prev) => ({
          ...prev,
          [pId]: (prev[pId] || []).map((r) => (r.id === initial.id ? { ...r, ...updated } : r)),
        }))
      } else {
        const created = await createRelease(pId, form)
        setReleasesByProject((prev) => ({
          ...prev,
          [pId]: [created, ...(prev[pId] || [])],
        }))
      }
      setFormTarget(null)
    } catch (err) {
      setFormError(err.message ?? 'Failed to save release.')
    } finally {
      setFormSubmitting(false)
    }
  }

  async function handlePublish(release, project) {
    const pId = project.id || project._id
    setActionError(null)
    setPublishingId(release.id)
    try {
      const updated = await publishRelease(release.id, user?.name || user?.email)
      setReleasesByProject((prev) => ({
        ...prev,
        [pId]: (prev[pId] || []).map((r) => (r.id === release.id ? { ...r, ...updated } : r)),
      }))
    } catch (err) {
      setActionError(err.message ?? 'Failed to publish release.')
    } finally {
      setPublishingId(null)
    }
  }

  async function handleViewChangelog(release) {
    setChangelogTarget(release)
    setChangelog(null)
    setChangelogLoading(true)
    try {
      const data = await fetchChangelog(release.id)
      setChangelog(data)
    } catch {
      setChangelog(null)
    } finally {
      setChangelogLoading(false)
    }
  }

  const safeProjects = projects || []

  return (
    <div>
      <PageHeader title="Releases" subtitle="Version history and release management across the forge." />

      {error ? (
        <EmptyState icon={AlertTriangle} title="Couldn't load releases" message={error} />
      ) : loading ? (
        <ReleasesSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard icon={Tag} label="Total Releases" value={totals.total} hint="across all projects" accent="ember" />
            <StatCard
              icon={Rocket}
              label="Released"
              value={totals.released}
              hint="live releases"
              accent="success"
            />
            <StatCard icon={FileText} label="Drafts" value={totals.draft} hint="not yet published" accent="steel" />
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
            Releases by project
          </h2>

          {safeProjects.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="No projects yet"
              message="Create a project first — its releases will show up here."
            />
          ) : (
            <div className="space-y-4">
              {safeProjects.map((project) => {
                const pId = project.id || project._id
                return (
                  <ProjectSection
                    key={pId}
                    project={project}
                    releases={releasesByProject[pId] ?? []}
                    deployments={deploymentsByProject[pId] ?? []}
                    isExpanded={expandedIds.has(pId)}
                    onToggle={toggleProject}
                    canManage={canManage}
                    onCreate={openCreate}
                    onEdit={(release) => openEdit(release, project)}
                    onPublish={(release) => handlePublish(release, project)}
                    onViewChangelog={handleViewChangelog}
                    publishingId={publishingId}
                  />
                )
              })}
            </div>
          )}
        </>
      )}

      {formTarget ? (
        <ReleaseFormModal
          project={formTarget.project}
          deployments={deploymentsByProject[formTarget.project.id || formTarget.project._id] ?? []}
          initial={formTarget.initial}
          onClose={() => setFormTarget(null)}
          onSubmit={handleFormSubmit}
          submitting={formSubmitting}
          error={formError}
        />
      ) : null}

      {changelogTarget ? (
        <ChangelogModal
          release={changelogTarget}
          changelog={changelog}
          loading={changelogLoading}
          onClose={() => {
            setChangelogTarget(null)
            setChangelog(null)
          }}
        />
      ) : null}
    </div>
  )
}
