import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Crown, FolderKanban, Kanban, Plus, Repeat2, Users } from 'lucide-react'
import {
  createProject,
  fetchProjects,
  fetchSprints,
  fetchTeams,
  fetchUsers,
  isSprintActive,
  PROJECT_STATUSES,
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

function ProjectCard({ project, activeSprint, onOpenBoard }) {
  return (
    <article className="nf-card flex flex-col p-5 transition hover:border-forge-600 hover:shadow-lg hover:shadow-black/20">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-steel-400">{project.id}</span>
        <StatusPill status={project.status} />
      </div>

      <h3 className="mt-3 font-display text-lg font-semibold text-forge-text">{project.name}</h3>
      <p className="mt-1 line-clamp-2 min-h-10 text-sm text-forge-muted">
        {project.description || 'No description yet.'}
      </p>

      <dl className="mt-4 space-y-2 border-t border-forge-700/60 pt-4">
        <MetaRow icon={Users} label="Team" value={project.team} />
        <MetaRow icon={Crown} label="Lead" value={project.lead} />
        <MetaRow icon={Repeat2} label="Sprint" value={project.sprint || '—'} mono />
        <MetaRow
          icon={Calendar}
          label="Due"
          value={formatDate(project.dueDate)}
          mono
          danger={isOverdue(project.dueDate, project.status)}
        />
      </dl>

      <div className="mt-auto flex items-center justify-between gap-3 pt-4">
        <AvatarStack people={project.members} max={5} />
        <span className="font-mono text-xs text-forge-faint">{project.members.length} members</span>
      </div>

      {/* Milestone 2: jump straight to this project's active sprint board */}
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
  // "New project" is restricted to ADMIN / PROJECT_LEAD / PROJECT_MANAGER.
  const canCreate = hasRole('ADMIN', 'PROJECT_LEAD', 'PROJECT_MANAGER')

  const [projects, setProjects] = useState(null)
  const [teams, setTeams] = useState([])
  const [users, setUsers] = useState([])
  const [activeSprintByProject, setActiveSprintByProject] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [projectData, teamData, userData] = await Promise.all([
          fetchProjects(user),
          fetchTeams(),
          canCreate ? fetchUsers() : Promise.resolve([]), // roster only needed by the form
        ])
        if (!cancelled) {
          setProjects(projectData)
          setTeams(teamData)
          setUsers(userData)
        }

        // Milestone 2: resolve each project's active sprint (by date range)
        // so cards can offer "View board" where one exists.
        const sprintLists = await Promise.all(projectData.map((p) => fetchSprints(p.id)))
        const activeMap = {}
        for (const sprints of sprintLists) {
          const active = sprints.find((s) => isSprintActive(s))
          if (active) activeMap[active.projectId] = active
        }
        if (!cancelled) setActiveSprintByProject(activeMap)
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
  }, [user, canCreate])

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle={canCreate ? 'Every workstream on the anvil.' : 'Workstreams you can follow.'}
      >
        {canCreate ? (
          <button type="button" onClick={() => setShowForm(true)} className="nf-btn-primary">
            <Plus className="h-4 w-4" aria-hidden /> New project
          </button>
        ) : null}
      </PageHeader>

      {error ? (
        <EmptyState icon={FolderKanban} title="Couldn't load projects" message={error} />
      ) : loading ? (
        <div aria-hidden className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((key) => (
            <div key={key} className="nf-card h-64 animate-pulse" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          message={
            canCreate
              ? 'Forge your first project to get the sparks flying.'
              : 'Once a project lead creates a project you can see, it will show up here.'
          }
        >
          {canCreate ? (
            <button type="button" onClick={() => setShowForm(true)} className="nf-btn-primary">
              <Plus className="h-4 w-4" aria-hidden /> New project
            </button>
          ) : null}
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              activeSprint={activeSprintByProject[project.id]}
              onOpenBoard={(sprint) => navigate(`/sprints/${sprint.id}`)}
            />
          ))}
        </div>
      )}

      {showForm ? (
        <NewProjectForm
          teams={teams}
          users={users}
          onClose={() => setShowForm(false)}
          onCreated={(created) => {
            setProjects((current) => [created, ...(current ?? [])])
            setShowForm(false)
          }}
        />
      ) : null}
    </div>
  )
}

/**
 * Modal form for creating a project.
 * Rendered on the Projects page — only reachable by
 * ADMIN / PROJECT_LEAD / PROJECT_MANAGER (gated by the page).
 */
function NewProjectForm({ teams, users, onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM)
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
        leadId: form.leadId || null, // "unassigned" → null
      })
      onCreated(created)
    } catch (err) {
      setError(err.message ?? 'Could not create the project.')
      setSubmitting(false)
    }
  }

  // Leads must hold a leadership role — employees can only be members.
  const leadOptions = users.filter((u) => u.role !== 'EMPLOYEE')

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
            <select
              id="project-team"
              required
              value={form.teamId}
              onChange={set('teamId')}
              className="nf-input"
            >
              <option value="" disabled>
                Choose a team…
              </option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
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
                <option key={person.id} value={person.id}>
                  {person.name} — {person.role}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="project-status" className="nf-label">
              Status
            </label>
            <select
              id="project-status"
              value={form.status}
              onChange={set('status')}
              className="nf-input"
            >
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
              placeholder="Sprint 14"
              value={form.sprint}
              onChange={set('sprint')}
              className="nf-input"
            />
          </div>

          <div>
            <label htmlFor="project-due" className="nf-label">
              Due date
            </label>
            <input
              id="project-due"
              type="date"
              value={form.dueDate}
              onChange={set('dueDate')}
              className="nf-input"
            />
          </div>

          <div className="col-span-full">
            <span className="nf-label">Members</span>
            <div className="grid max-h-40 grid-cols-1 gap-1 overflow-y-auto rounded-lg border border-forge-700 bg-forge-950/60 p-2 sm:grid-cols-2">
              {users.map((person) => (
                <label
                  key={person.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-forge-text transition hover:bg-forge-850"
                >
                  <input
                    type="checkbox"
                    className="accent-ember-500"
                    checked={form.memberIds.includes(person.id)}
                    onChange={() => toggleMember(person.id)}
                  />
                  <span className="truncate">{person.name}</span>
                  <span className="ml-auto font-mono text-[10px] text-forge-faint">{person.role}</span>
                </label>
              ))}
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

