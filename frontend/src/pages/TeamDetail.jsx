import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Crown, FolderKanban, Pencil, Trash2, Users } from 'lucide-react'
import { deleteTeam, fetchProjects, fetchTeamById, fetchUsers, updateTeam } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Avatar, EmptyState, PageHeader, RoleBadge, StatusPill } from '../components/ui'

function TeamDetailSkeleton() {
  return (
    <div aria-hidden>
      <div className="nf-card mb-6 h-40 animate-pulse" />
      <div className="nf-card h-64 animate-pulse" />
    </div>
  )
}

export default function TeamDetail() {
  const { teamId } = useParams()
  const navigate = useNavigate()
  const { hasRole } = useAuth()
  const canManage = hasRole('ADMIN', 'PROJECT_LEAD', 'PROJECT_MANAGER')

  const [team, setTeam] = useState(null)
  const [projects, setProjects] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [teamData, projectData, userData] = await Promise.all([
          fetchTeamById(teamId),
          fetchProjects(),
          fetchUsers(),
        ])
        if (!cancelled) {
          if (!teamData) {
            setError('Team not found.')
          } else {
            setTeam(teamData)
          }
          setProjects(projectData || [])
          setUsers(userData || [])
        }
      } catch (err) {
        if (!cancelled) setError(err.message ?? 'Failed to load this team.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [teamId])

  const usersById = useMemo(() => new Map((users || []).map((u) => [u.id || u._id, u])), [users])

  // Client-side filter — matches the pattern already used in Teams.jsx's
  // buildTeamStats, since there's no /teams/{id}/projects endpoint yet.
  const teamProjects = useMemo(
    () => (projects || []).filter((p) => p.teamId === teamId),
    [projects, teamId],
  )

  if (loading) {
    return (
      <div>
        <button type="button" onClick={() => navigate('/teams')} className="nf-btn-ghost mb-6 px-3 py-1.5 text-xs">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Back to teams
        </button>
        <TeamDetailSkeleton />
      </div>
    )
  }

  if (error || !team) {
    return (
      <div>
        <button type="button" onClick={() => navigate('/teams')} className="nf-btn-ghost mb-6 px-3 py-1.5 text-xs">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Back to teams
        </button>
        <EmptyState icon={Users} title="Couldn't load this team" message={error || 'Team not found.'} />
      </div>
    )
  }

  const memberIds = team.memberIds || []
  const leadUser = usersById.get(team.leadId)

  const handleDelete = async () => {
    if (teamProjects.length > 0) {
      setDeleteError(
        `Can't delete this team — ${teamProjects.length} project(s) still use it. Reassign them to another team first.`,
      )
      return
    }
    if (!window.confirm(`Delete team "${team.name}"? This cannot be undone.`)) return
    setDeleteError('')
    try {
      await deleteTeam(team.id || team._id)
      navigate('/teams')
    } catch (err) {
      setDeleteError(err.message ?? 'Could not delete the team.')
    }
  }

  return (
    <div>
      <button type="button" onClick={() => navigate('/teams')} className="nf-btn-ghost mb-6 px-3 py-1.5 text-xs">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Back to teams
      </button>

      {deleteError ? (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-signal-danger/30 bg-signal-danger/10 px-3 py-2.5 text-sm text-signal-danger"
        >
          {deleteError}
        </p>
      ) : null}

      <PageHeader title={team.name} subtitle={team.description || 'No description provided.'}>
        {canManage ? (
          <>
            <button
              type="button"
              onClick={() => setShowEditForm(true)}
              className="nf-btn-ghost px-3 py-1.5 text-xs"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="nf-btn-ghost px-3 py-1.5 text-xs text-signal-danger hover:bg-signal-danger/10"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete
            </button>
          </>
        ) : null}
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="nf-card p-5 lg:col-span-1">
          <p className="font-mono text-xs text-steel-400">{team.id || team._id}</p>

          <p className="mt-4 flex items-center gap-2 text-sm">
            <Crown className="h-3.5 w-3.5 shrink-0 text-ember-400" aria-hidden />
            <span className="text-forge-faint">Lead:</span>
            <span className="font-medium text-forge-text">{leadUser?.name || 'Unassigned'}</span>
          </p>

          <h3 className="mt-6 mb-3 text-xs font-semibold uppercase tracking-wider text-forge-muted">
            Members ({memberIds.length})
          </h3>
          <ul className="space-y-2.5">
            {memberIds.length === 0 ? (
              <li className="text-sm text-forge-faint">No members yet.</li>
            ) : (
              memberIds.map((id) => {
                const person = usersById.get(id)
                const mName = person?.name || id
                const mRole = person?.role || 'EMPLOYEE'
                return (
                  <li key={id} className="flex items-center gap-3">
                    <Avatar name={mName} className="h-7 w-7 text-[10px]" />
                    <span className="truncate text-sm font-medium text-forge-text">{mName}</span>
                    <span className="ml-auto">
                      <RoleBadge role={mRole} />
                    </span>
                  </li>
                )
              })
            )}
          </ul>
        </section>

        <section className="lg:col-span-2">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-forge-muted">
            Projects ({teamProjects.length})
          </h3>
          {teamProjects.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="No projects assigned"
              message="Projects assigned to this team will show up here."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {teamProjects.map((project) => {
                const pId = project.id || project._id
                return (
                  <article key={pId} className="nf-card p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-steel-400">{pId}</span>
                      <StatusPill status={project.status} />
                    </div>
                    <h4 className="mt-2 font-display text-base font-semibold text-forge-text">{project.name}</h4>
                    <p className="mt-1 line-clamp-2 text-xs text-forge-muted">
                      {project.description || 'No description yet.'}
                    </p>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {showEditForm ? (
        <EditTeamForm
          team={team}
          users={users}
          onClose={() => setShowEditForm(false)}
          onUpdated={(updated) => {
            setTeam(updated)
            setShowEditForm(false)
          }}
        />
      ) : null}
    </div>
  )
}

function EditTeamForm({ team, users, onClose, onUpdated }) {
  const [form, setForm] = useState(() => ({
    name: team.name || '',
    description: team.description || '',
    leadId: team.leadId || '',
    memberIds: team.memberIds || [],
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
      const updated = await updateTeam(team.id || team._id, {
        name: form.name.trim(),
        description: form.description.trim() || null,
        leadId: form.leadId || null,
        memberIds: form.memberIds,
      })
      onUpdated(updated)
    } catch (err) {
      setError(err.message ?? 'Could not update the team.')
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
          <h2 className="font-display text-lg font-semibold text-forge-text">Edit team</h2>
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
            <label htmlFor="edit-team-name" className="nf-label">
              Name
            </label>
            <input
              id="edit-team-name"
              type="text"
              required
              value={form.name}
              onChange={set('name')}
              className="nf-input"
            />
          </div>

          <div className="col-span-full">
            <label htmlFor="edit-team-description" className="nf-label">
              Description
            </label>
            <textarea
              id="edit-team-description"
              rows={2}
              value={form.description}
              onChange={set('description')}
              className="nf-input resize-none"
            />
          </div>

          <div className="col-span-full">
            <label htmlFor="edit-team-lead" className="nf-label">
              Lead
            </label>
            <select id="edit-team-lead" value={form.leadId} onChange={set('leadId')} className="nf-input">
              <option value="">Unassigned</option>
              {leadOptions.map((person) => (
                <option key={person.id || person._id} value={person.id || person._id}>
                  {person.name} — {person.role}
                </option>
              ))}
            </select>
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
