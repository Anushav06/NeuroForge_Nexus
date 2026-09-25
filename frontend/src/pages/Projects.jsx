import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Calendar,
  Crown,
  FolderKanban,
  Kanban,
  Pencil,
  Plus,
  Repeat2,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react'
import {
  createProject,
  deleteProject,
  fetchProjects,
  fetchSprints,
  fetchTeams,
  fetchUsers,
  isSprintActive,
  PROJECT_STATUSES,
  updateProject,
} from '../api/client'
import { useAuth } from '../context/AuthContext'
import { AvatarStack, EmptyState, PageHeader, StatusPill } from '../components/ui'

const EMPTY_FORM = {
  name: '',
  description: '',
  teamId: '',
  leadId: '',
  status: 'PLANNING',
  sprint: '',
  dueDate: '',
  memberIds: [],
}

const formatDate = (iso) =>
  iso
    ? new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : '—'

const isOverdue = (dueDate, status) =>
  Boolean(dueDate) && status !== 'COMPLETED' && new Date(`${dueDate}T23:59:59`) < new Date()

/** One icon + label + value line on a project card. */
function MetaRow({ icon: Icon, label, value, mono = false, danger = false }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-center gap-2 text-forge-faint">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {label}
      </dt>
      <dd
        className={`truncate font-medium ${danger ? 'text-signal-danger' : 'text-forge-text'} ${
          mono ? 'font-mono text-xs' : 'text-sm'
        }`}
      >
        {value}
      </dd>
    </div>
  )
}

function ProjectCard({ project, activeSprint, onOpenBoard, teamsById, usersById, canManage, onEdit, onDelete }) {
  const memberIds = project.memberIds || []
  const members = memberIds.map((id) => usersById.get(id)).filter(Boolean)
  const pId = project.id || project._id
  const team = teamsById.get(project.teamId)
  const lead = usersById.get(project.leadId)

  return (
    <article className="nf-card flex flex-col p-5 transition hover:border-forge-600 hover:shadow-lg hover:shadow-black/20">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-steel-400">{pId}</span>
        <div className="flex items-center gap-2">
          <StatusPill status={project.status} />
          {canManage ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onEdit(project)}
                aria-label="Edit project"
                title="Edit project"
                className="grid h-7 w-7 place-items-center rounded-md text-forge-faint transition hover:bg-forge-800 hover:text-forge-text"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => onDelete(project)}
                aria-label="Delete project"
                title="Delete project"
                className="grid h-7 w-7 place-items-center rounded-md text-forge-faint transition hover:bg-signal-danger/10 hover:text-signal-danger"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <h3 className="mt-3 font-display text-lg font-semibold text-forge-text">{project.name}</h3>
      <p className="mt-1 line-clamp-2 min-h-10 text-sm text-forge-muted">
        {project.description || 'No description yet.'}
      </p>

      <dl className="mt-4 space-y-2 border-t border-forge-700/60 pt-4">
        <MetaRow icon={Users} label="Team" value={team?.name || '—'} />
        <MetaRow icon={Crown} label="Lead" value={lead?.name || '—'} />
        {/* Reads the live sprint's current name, not project.sprint — that field is
            only a one-time snapshot copied in at project creation and goes stale
            the moment the sprint itself is renamed. Falls back to it only when no
            active sprint exists yet (e.g. right after creation, before load completes). */}
        <MetaRow icon={Repeat2} label="Sprint" value={activeSprint?.name || project.sprint || '—'} mono />
        <MetaRow
          icon={Calendar}
          label="Due"
          value={formatDate(project.dueDate)}
          mono
          danger={isOverdue(project.dueDate, project.status)}
        />
      </dl>

      <div className="mt-auto flex items-center justify-between gap-3 pt-4">
        <AvatarStack people={members} max={5} />
        <span className="font-mono text-xs text-forge-faint">{memberIds.length} members</span>
      </div>

      {activeSprint ? (
        <button
          type="button"
          onClick={() => onOpenBoard(activeSprint)}
          className="nf-btn-ghost mt-4 w-full px-3 py-2 text-xs"
        >
          <Kanban className="h-3.5 w-3.5" aria-hidden /> View board · {activeSprint.name}
        </button>
      ) : null}
    </article>
  )
}

export default function Projects() {
  const { user, hasRole } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // Same role gate covers create, edit, and delete — matches the backend's
  // (currently-disabled-for-dev) @PreAuthorize intent on these endpoints.
  const canManage = hasRole('ADMIN', 'PROJECT_LEAD', 'PROJECT_MANAGER')

  const [projects, setProjects] = useState(null)
  const [teams, setTeams] = useState([])
  const [users, setUsers] = useState([])
  const [activeSprintByProject, setActiveSprintByProject] = useState({})
  const [sprintCountByProject, setSprintCountByProject] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionError, setActionError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  // Parsed New-Project values handed over by the AI Assistant (AIAssistant.jsx).
  const [aiPrefill, setAiPrefill] = useState(null)

  // Id → object lookups: cards resolve team / lead / member names from these.
  const teamsById = useMemo(() => new Map((teams || []).map((t) => [t.id || t._id, t])), [teams])
  const usersById = useMemo(() => new Map((users || []).map((u) => [u.id || u._id, u])), [users])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [projectData, teamData, userData] = await Promise.all([
          fetchProjects(user),
          fetchTeams(),
          fetchUsers(),
        ])
        if (!cancelled) {
          setProjects(projectData || [])
          setTeams(teamData || [])
          setUsers(userData || [])
        }

        const sprintLists = await Promise.all((projectData || []).map((p) => fetchSprints(p.id || p._id)))
        const activeMap = {}
        const countMap = {}
        ;(projectData || []).forEach((p, index) => {
          const pId = p.id || p._id
          const sprints = sprintLists[index] || []
          countMap[pId] = sprints.length
          const active = sprints.find((s) => isSprintActive(s))
          if (active) {
            const targetProjId = active.projectId || active.project_id || pId
            activeMap[targetProjId] = active
          }
        })
        if (!cancelled) {
          setActiveSprintByProject(activeMap)
          setSprintCountByProject(countMap)
        }
      } catch (err) {
        if (!cancelled) setError(err.message ?? 'Failed to load projects.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user])

  // ── AI Assistant handoff ───────────────────────────────────────────────
  // The assistant navigates here with a parsed prefill in router state:
  // auto-open the New Project form with those values, then clear the router
  // state so refreshing the page doesn't reopen the modal. The state updates
  // run in a deferred tick (not synchronously during the effect pass) to
  // avoid cascading renders while the effect synchronizes with the router.
  useEffect(() => {
    const prefill = location.state?.aiPrefill
    if (!prefill || !canManage) return
    const tick = window.setTimeout(() => {
      setAiPrefill(prefill)
      setEditingProject(null)
      setShowForm(true)
      navigate(location.pathname, { replace: true })
    }, 0)
    return () => window.clearTimeout(tick)
  }, [location.state, location.pathname, canManage, navigate])

  async function handleDeleteProject(project) {
    const pId = project.id || project._id
    const sprintCount = sprintCountByProject[pId] || 0
    const warning =
      sprintCount > 0
        ? ` This project has ${sprintCount} sprint(s) — they will not be deleted and will become orphaned.`
        : ''
    if (!window.confirm(`Delete project "${project.name}"?${warning} This cannot be undone.`)) return
    setActionError('')
    try {
      await deleteProject(pId)
      setProjects((current) => (current ?? []).filter((p) => (p.id || p._id) !== pId))
    } catch (err) {
      setActionError(err.message ?? 'Could not delete the project.')
    }
  }

  const safeProjects = projects || []

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle={canManage ? 'Every workstream on the anvil.' : 'Workstreams you can follow.'}
      >
        {canManage ? (
          <button
            type="button"
            onClick={() => {
              setAiPrefill(null)
              setEditingProject(null)
              setShowForm(true)
            }}
            className="nf-btn-primary"
          >
            <Plus className="h-4 w-4" aria-hidden /> New project
          </button>
        ) : null}
      </PageHeader>

      {actionError ? (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-signal-danger/30 bg-signal-danger/10 px-3 py-2.5 text-sm text-signal-danger"
        >
          {actionError}
        </p>
      ) : null}

      {error ? (
        <EmptyState icon={FolderKanban} title="Couldn't load projects" message={error} />
      ) : loading ? (
        <div aria-hidden className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((key) => (
            <div key={key} className="nf-card h-64 animate-pulse" />
          ))}
        </div>
      ) : safeProjects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          message={
            canManage
              ? 'Forge your first project to get the sparks flying.'
              : 'Once a project lead creates a project you can see, it will show up here.'
          }
        >
          {canManage ? (
            <button
              type="button"
              onClick={() => {
                setAiPrefill(null)
                setEditingProject(null)
                setShowForm(true)
              }}
              className="nf-btn-primary"
            >
              <Plus className="h-4 w-4" aria-hidden /> New project
            </button>
          ) : null}
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {safeProjects.map((project) => {
            const pId = project.id || project._id
            return (
              <ProjectCard
                key={pId}
                project={project}
                activeSprint={activeSprintByProject[pId]}
                onOpenBoard={(sprint) => navigate(`/sprints/${sprint.id || sprint._id}`)}
                teamsById={teamsById}
                usersById={usersById}
                canManage={canManage}
                onEdit={(p) => {
                  setAiPrefill(null)
                  setEditingProject(p)
                  setShowForm(true)
                }}
                onDelete={handleDeleteProject}
              />
            )
          })}
        </div>
      )}

      {showForm ? (
        editingProject ? (
          <EditProjectForm
            project={editingProject}
            teams={teams}
            users={users}
            onClose={() => {
              setShowForm(false)
              setEditingProject(null)
            }}
            onUpdated={(updated) => {
              const uId = updated.id || updated._id
              setProjects((current) => (current ?? []).map((p) => ((p.id || p._id) === uId ? updated : p)))
              setShowForm(false)
              setEditingProject(null)
            }}
          />
        ) : (
          <NewProjectForm
            teams={teams}
            users={users}
            aiPrefill={aiPrefill}
            onClose={() => setShowForm(false)}
            onCreated={(created) => {
              setProjects((current) => [created, ...(current ?? [])])
              setSprintCountByProject((current) => ({ ...current, [created.id || created._id]: 1 }))
              setShowForm(false)
            }}
          />
        )
      ) : null}
    </div>
  )
}

function NewProjectForm({ teams, users, aiPrefill, onClose, onCreated }) {
  // Seed with the AI Assistant's parsed values when handed over from /projects.
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, ...(aiPrefill || {}) }))
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showAiBanner, setShowAiBanner] = useState(true)

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }))

  // Picking a team auto-fills the lead from that team's leadId — but only
  // while the Lead field is still empty, so a hand-picked lead is never clobbered.
  const handleTeamChange = (event) => {
    const teamId = event.target.value
    setForm((f) => {
      if (f.leadId) return { ...f, teamId }
      const team = (teams || []).find((t) => (t.id || t._id) === teamId)
      return { ...f, teamId, leadId: team?.leadId || '' }
    })
  }

  const toggleMember = (id) =>
    setForm((f) => ({
      ...f,
      memberIds: f.memberIds.includes(id)
        ? f.memberIds.filter((memberId) => memberId !== id)
        : [...f.memberIds, id],
    }))

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const created = await createProject({
        ...form,
        leadId: form.leadId || null,
      })
      onCreated(created)
    } catch (err) {
      setError(err.message ?? 'Could not create the project.')
      setSubmitting(false)
    }
  }

  const leadOptions = (users || []).filter((u) => u.role !== 'EMPLOYEE')

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-forge-950/80 p-4 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="mx-auto w-full max-w-xl rounded-2xl border border-forge-700 bg-forge-900 shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between border-b border-forge-700/70 px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-forge-text">Forge a new project</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-lg text-forge-muted transition hover:bg-forge-800 hover:text-forge-text"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          {aiPrefill && showAiBanner ? (
            <div className="col-span-full flex items-center justify-between gap-3 rounded-lg border border-ember-500/30 bg-ember-500/10 px-3 py-2.5 text-sm text-ember-300">
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
                Parsed from your AI Assistant request — review before creating.
              </span>
              <button
                type="button"
                onClick={() => setShowAiBanner(false)}
                aria-label="Dismiss"
                className="shrink-0 text-ember-300/70 transition hover:text-ember-300"
              >
                ✕
              </button>
            </div>
          ) : null}

          {error ? (
            <p
              role="alert"
              className="col-span-full rounded-lg border border-signal-danger/30 bg-signal-danger/10 px-3 py-2.5 text-sm text-signal-danger"
            >
              {error}
            </p>
          ) : null}

          <div className="col-span-full">
            <label htmlFor="project-name" className="nf-label">
              Name
            </label>
            <input
              id="project-name"
              type="text"
              required
              placeholder="e.g. Phoenix Recovery Tooling"
              value={form.name}
              onChange={set('name')}
              className="nf-input"
            />
          </div>

          <div className="col-span-full">
            <label htmlFor="project-description" className="nf-label">
              Description
            </label>
            <textarea
              id="project-description"
              rows={2}
              placeholder="What is this project forging?"
              value={form.description}
              onChange={set('description')}
              className="nf-input resize-none"
            />
          </div>

          <div>
            <label htmlFor="project-team" className="nf-label">
              Team
            </label>
            <select id="project-team" required value={form.teamId} onChange={handleTeamChange} className="nf-input">
              <option value="" disabled>
                Choose a team…
              </option>
              {(teams || []).map((team) => (
                <option key={team.id || team._id} value={team.id || team._id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="project-lead" className="nf-label">
              Lead
            </label>
            <select id="project-lead" value={form.leadId} onChange={set('leadId')} className="nf-input">
              <option value="">Unassigned</option>
              {leadOptions.map((person) => (
                <option key={person.id || person._id} value={person.id || person._id}>
                  {person.name} — {person.role}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-forge-faint">
              Defaults to the team's lead — change it if someone else is accountable for this project.
            </p>
          </div>

          <div>
            <label htmlFor="project-status" className="nf-label">
              Status
            </label>
            <select id="project-status" value={form.status} onChange={set('status')} className="nf-input">
              {PROJECT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="project-sprint" className="nf-label">
              Sprint
            </label>
            <input
              id="project-sprint"
              type="text"
              placeholder="Sprint 1"
              value={form.sprint}
              onChange={set('sprint')}
              className="nf-input"
            />
          </div>

          <div>
            <label htmlFor="project-due" className="nf-label">
              Due date
            </label>
            <input id="project-due" type="date" value={form.dueDate} onChange={set('dueDate')} className="nf-input" />
          </div>

          <div className="col-span-full">
            <span className="nf-label">Members</span>
            <div className="grid max-h-40 grid-cols-1 gap-1 overflow-y-auto rounded-lg border border-forge-700 bg-forge-950/60 p-2 sm:grid-cols-2">
              {(users || []).map((person) => {
                const uId = person.id || person._id
                return (
                  <label
                    key={uId}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-forge-text transition hover:bg-forge-850"
                  >
                    <input
                      type="checkbox"
                      className="accent-ember-500"
                      checked={form.memberIds.includes(uId)}
                      onChange={() => toggleMember(uId)}
                    />
                    <span className="truncate">{person.name}</span>
                    <span className="ml-auto font-mono text-[10px] text-forge-faint">{person.role}</span>
                  </label>
                )
              })}
            </div>
          </div>

          <div className="col-span-full mt-2 flex items-center justify-end gap-3 border-t border-forge-700/70 pt-4">
            <button type="button" onClick={onClose} className="nf-btn-ghost" disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="nf-btn-primary" disabled={submitting}>
              {submitting ? 'Forging…' : 'Create project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/**
 * Modal form for editing an existing project. Mirrors NewProjectForm's
 * layout/styling but pre-fills from the current project and calls
 * updateProject instead of createProject. Intentionally omits the AI
 * Assistant prefill banner — that flow only ever creates new projects.
 */
function EditProjectForm({ project, teams, users, onClose, onUpdated }) {
  const [form, setForm] = useState(() => ({
    name: project.name || '',
    description: project.description || '',
    teamId: project.teamId || '',
    leadId: project.leadId || '',
    status: project.status || 'PLANNING',
    sprint: project.sprint || '',
    dueDate: project.dueDate || '',
    memberIds: project.memberIds || [],
  }))
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

  // Same auto-fill convenience as creation, but here it only ever fires on
  // an explicit team change (not on mount), so it never clobbers the
  // project's existing lead just because the form opened.
  const handleTeamChange = (event) => {
    const teamId = event.target.value
    setForm((f) => {
      if (f.leadId) return { ...f, teamId }
      const team = (teams || []).find((t) => (t.id || t._id) === teamId)
      return { ...f, teamId, leadId: team?.leadId || '' }
    })
  }

  const toggleMember = (id) =>
    setForm((f) => ({
      ...f,
      memberIds: f.memberIds.includes(id)
        ? f.memberIds.filter((memberId) => memberId !== id)
        : [...f.memberIds, id],
    }))

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const updated = await updateProject(project.id || project._id, {
        ...form,
        leadId: form.leadId || null,
      })
      onUpdated(updated)
    } catch (err) {
      setError(err.message ?? 'Could not update the project.')
      setSubmitting(false)
    }
  }

  const leadOptions = (users || []).filter((u) => u.role !== 'EMPLOYEE')

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-forge-950/80 p-4 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="mx-auto w-full max-w-xl rounded-2xl border border-forge-700 bg-forge-900 shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between border-b border-forge-700/70 px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-forge-text">Edit project</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-lg text-forge-muted transition hover:bg-forge-800 hover:text-forge-text"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          {error ? (
            <p
              role="alert"
              className="col-span-full rounded-lg border border-signal-danger/30 bg-signal-danger/10 px-3 py-2.5 text-sm text-signal-danger"
            >
              {error}
            </p>
          ) : null}

          <div className="col-span-full">
            <label htmlFor="edit-project-name" className="nf-label">
              Name
            </label>
            <input
              id="edit-project-name"
              type="text"
              required
              value={form.name}
              onChange={set('name')}
              className="nf-input"
            />
          </div>

          <div className="col-span-full">
            <label htmlFor="edit-project-description" className="nf-label">
              Description
            </label>
            <textarea
              id="edit-project-description"
              rows={2}
              value={form.description}
              onChange={set('description')}
              className="nf-input resize-none"
            />
          </div>

          <div>
            <label htmlFor="edit-project-team" className="nf-label">
              Team
            </label>
            <select
              id="edit-project-team"
              required
              value={form.teamId}
              onChange={handleTeamChange}
              className="nf-input"
            >
              <option value="" disabled>
                Choose a team…
              </option>
              {(teams || []).map((team) => (
                <option key={team.id || team._id} value={team.id || team._id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="edit-project-lead" className="nf-label">
              Lead
            </label>
            <select id="edit-project-lead" value={form.leadId} onChange={set('leadId')} className="nf-input">
              <option value="">Unassigned</option>
              {leadOptions.map((person) => (
                <option key={person.id || person._id} value={person.id || person._id}>
                  {person.name} — {person.role}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="edit-project-status" className="nf-label">
              Status
            </label>
            <select id="edit-project-status" value={form.status} onChange={set('status')} className="nf-input">
              {PROJECT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="edit-project-sprint" className="nf-label">
              Sprint
            </label>
            <input
              id="edit-project-sprint"
              type="text"
              value={form.sprint}
              onChange={set('sprint')}
              className="nf-input"
            />
          </div>

          <div>
            <label htmlFor="edit-project-due" className="nf-label">
              Due date
            </label>
            <input
              id="edit-project-due"
              type="date"
              value={form.dueDate}
              onChange={set('dueDate')}
              className="nf-input"
            />
          </div>

          <div className="col-span-full">
            <span className="nf-label">Members</span>
            <div className="grid max-h-40 grid-cols-1 gap-1 overflow-y-auto rounded-lg border border-forge-700 bg-forge-950/60 p-2 sm:grid-cols-2">
              {(users || []).map((person) => {
                const uId = person.id || person._id
                return (
                  <label
                    key={uId}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-forge-text transition hover:bg-forge-850"
                  >
                    <input
                      type="checkbox"
                      className="accent-ember-500"
                      checked={form.memberIds.includes(uId)}
                      onChange={() => toggleMember(uId)}
                    />
                    <span className="truncate">{person.name}</span>
                    <span className="ml-auto font-mono text-[10px] text-forge-faint">{person.role}</span>
                  </label>
                )
              })}
            </div>
          </div>

          <div className="col-span-full mt-2 flex items-center justify-end gap-3 border-t border-forge-700/70 pt-4">
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
