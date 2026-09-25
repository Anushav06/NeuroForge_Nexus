// 
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Crown, FolderKanban, Plus, Users } from 'lucide-react'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { createTeam, fetchProjects, fetchTeams, fetchUsers } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Avatar, EmptyState, PageHeader, RoleBadge } from '../components/ui'

/* Slice colors for the status pie. Hex mirrors the signal tokens in index.css */
const STATUS_COLORS = {
  PLANNING: '#f5b841', // signal-warning (amber)
  ACTIVE: '#3ddc97', // signal-success (green)
  BLOCKED: '#f0546a', // signal-danger (red)
  COMPLETED: '#6f8cd3', // steel-400 (blue)
}

const EMPTY_TEAM_STATS = { total: 0, active: 0, completed: 0 }

/** Count projects per status in canonical order, for the pie chart. */
function countByStatus(projects) {
  const counts = { PLANNING: 0, ACTIVE: 0, BLOCKED: 0, COMPLETED: 0 }
  for (const project of (projects || [])) {
    if (project.status in counts) counts[project.status] += 1
  }
  return counts
}

/**
 * Roll up the projects list per team id:
 * total assigned, how many ACTIVE (in progress), how many COMPLETED.
 */
function buildTeamStats(teams, projects) {
  const byTeam = new Map((teams || []).map((team) => [team.id || team._id, []]))
  for (const project of (projects || [])) {
    if (project.teamId && byTeam.has(project.teamId)) {
      byTeam.get(project.teamId).push(project)
    }
  }
  return new Map(
    [...byTeam].map(([teamId, list]) => [
      teamId,
      {
        total: list.length,
        active: list.filter((p) => p.status === 'ACTIVE').length,
        completed: list.filter((p) => p.status === 'COMPLETED').length,
      },
    ]),
  )
}

/** Donut chart: overall project status breakdown across all teams combined. */
function StatusPie({ projects }) {
  const safeProjects = projects || []
  const counts = countByStatus(safeProjects)
  const data = Object.entries(counts)
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({ name, value }))

  return (
    <section className="nf-card mb-10 p-5 sm:p-6">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-forge-text">
            Project status overview
          </h2>
          <p className="text-sm text-forge-muted">
            Status breakdown across the projects you can see, all teams combined.
          </p>
        </div>
        <span className="font-mono text-xs text-forge-faint">{safeProjects.length} projects</span>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="55%"
              outerRadius="80%"
              paddingAngle={3}
              cornerRadius={4}
              stroke="#0a0c10"
              strokeWidth={2}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
              ))}
            </Pie>
            <text
              x="50%"
              y="48%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-forge-text font-mono text-2xl font-semibold"
            >
              {safeProjects.length}
            </text>
            <text
              x="50%"
              y="60%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-forge-faint font-mono text-[10px] tracking-[0.2em]"
            >
              PROJECTS
            </text>
            <Tooltip
              contentStyle={{
                backgroundColor: '#12151b',
                border: '1px solid #232a36',
                borderRadius: '8px',
                color: '#e8ebf1',
              }}
              itemStyle={{ color: '#e8ebf1', fontSize: 12 }}
              formatter={(value, name) => [`${value} project${value === 1 ? '' : 's'}`, name]}
            />
            <Legend
              formatter={(value, entry) => `${value} · ${entry?.payload?.value ?? ''}`}
              wrapperStyle={{ fontSize: 12, color: '#8b94a7' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

function TeamsSkeleton() {
  return (
    <div aria-hidden>
      <div className="nf-card mb-10 h-80 animate-pulse" />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <div key={key} className="nf-card h-72 animate-pulse" />
        ))}
      </div>
    </div>
  )
}

function TeamCard({ team, stats, usersById, onSelect }) {
  const memberIds = team.memberIds || []
  const teamId = team.id || team._id
  const leadUser = usersById.get(team.leadId)

  return (
    <article
      className="nf-card flex cursor-pointer flex-col p-5 transition hover:border-forge-600"
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect() }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-forge-text">{team.name}</h3>
          <p className="mt-0.5 font-mono text-xs text-steel-400">{teamId}</p>
        </div>
        <span className="rounded-full bg-forge-800 px-2.5 py-1 font-mono text-[11px] text-forge-muted ring-1 ring-forge-700">
          {memberIds.length} members
        </span>
      </div>

      <p className="mt-2 text-sm text-forge-muted">{team.description || 'No description provided.'}</p>

      <p className="mt-3 flex items-center gap-2 text-sm">
        <Crown className="h-3.5 w-3.5 shrink-0 text-ember-400" aria-hidden />
        <span className="text-forge-faint">Lead:</span>
        <span className="font-medium text-forge-text">{leadUser?.name || 'Unassigned'}</span>
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-forge-700/60 bg-forge-850/50 p-3">
        <div className="text-center">
          <span className="block font-mono text-lg font-semibold text-forge-text">{stats.total}</span>
          <span className="text-[10px] uppercase tracking-wider text-forge-faint">Projects</span>
        </div>
        <div className="text-center">
          <span className="block font-mono text-lg font-semibold text-signal-success">{stats.active}</span>
          <span className="text-[10px] uppercase tracking-wider text-forge-faint">Active</span>
        </div>
        <div className="text-center">
          <span className="block font-mono text-lg font-semibold text-steel-300">{stats.completed}</span>
          <span className="text-[10px] uppercase tracking-wider text-forge-faint">Completed</span>
        </div>
      </div>

      <ul className="mt-4 space-y-2.5 border-t border-forge-700/60 pt-4">
        {memberIds.map((id) => {
          const person = usersById.get(id)
          const mName = person?.name || id
          const mRole = person?.role || 'EMPLOYEE'
          const mSubRole = person?.subRole

          return (
            <li key={id} className="flex items-center gap-3">
              <Avatar name={mName} className="h-7 w-7 text-[10px]" />
              <span className="truncate text-sm font-medium text-forge-text">{mName}</span>
              <span className="ml-auto flex shrink-0 items-center gap-2">
                {mSubRole ? <span className="font-mono text-[10px] text-forge-faint">{mSubRole}</span> : null}
                <RoleBadge role={mRole} />
              </span>
            </li>
          )
        })}
      </ul>
    </article>
  )
}

export default function Teams() {
  const { user, hasRole } = useAuth()
  const navigate = useNavigate()
  const isAdmin = hasRole('ADMIN')
  // Mirrors the backend rule: only these roles may POST /teams
  // (@PreAuthorize on TeamController.createTeam).
  const canCreate = hasRole('ADMIN', 'PROJECT_LEAD', 'PROJECT_MANAGER')
  const [showForm, setShowForm] = useState(false)

  const [teams, setTeams] = useState(null)
  const [projects, setProjects] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const teamStats = useMemo(() => buildTeamStats(teams ?? [], projects), [teams, projects])
  // Id → user lookup: team cards resolve lead + member names from this.
  const usersById = useMemo(() => new Map((users || []).map((u) => [u.id || u._id, u])), [users])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [teamData, projectData, userData] = await Promise.all([
          fetchTeams(),
          fetchProjects(user),
          // Every role needs the user list now — team cards resolve lead and
          // member names from it (the "All users" table stays admin-only).
          fetchUsers(),
        ])
        if (!cancelled) {
          setTeams(teamData || [])
          setProjects(projectData || [])
          setUsers(userData || [])
        }
      } catch (err) {
        if (!cancelled) setError(err.message ?? 'Failed to load teams.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user, canCreate])

  const safeTeams = teams || []
  const safeProjects = projects || []
  const safeUsers = users || []

  return (
    <div>
      <PageHeader title="Teams" subtitle="Squads on the forge floor.">
        {canCreate ? (
          <button type="button" onClick={() => setShowForm(true)} className="nf-btn-primary">
            <Plus className="h-4 w-4" aria-hidden /> New team
          </button>
        ) : null}
      </PageHeader>

      {error ? (
        <EmptyState icon={Users} title="Couldn't load teams" message={error} />
      ) : loading ? (
        <TeamsSkeleton />
      ) : (
        <>
          {safeProjects.length > 0 ? (
            <StatusPie projects={safeProjects} />
          ) : (
            <div className="mb-10">
              <EmptyState
                icon={FolderKanban}
                title="No project data yet"
                message="The status chart will appear here as soon as there is at least one project."
              />
            </div>
          )}

          {safeTeams.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No teams yet"
              message={
                canCreate
                  ? 'Forge your first squad to get the sparks flying.'
                  : 'Teams will appear here as soon as they are created.'
              }
            >
              {canCreate ? (
                <button type="button" onClick={() => setShowForm(true)} className="nf-btn-primary">
                  <Plus className="h-4 w-4" aria-hidden /> New team
                </button>
              ) : null}
            </EmptyState>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {safeTeams.map((team) => {
                const tId = team.id || team._id
                return (
                  <TeamCard
                    key={tId}
                    team={team}
                    stats={teamStats.get(tId) ?? EMPTY_TEAM_STATS}
                    usersById={usersById}
                    onSelect={() => navigate(`/teams/${tId}`)}
                  />
                )
              })}
            </div>
          )}
        </>
      )}

      {isAdmin && !loading && !error ? (
        <section className="mt-12">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-forge-text">All users</h2>
              <p className="text-sm text-forge-muted">
                Full account directory — visible to admins only.
              </p>
            </div>
            <span className="font-mono text-xs text-forge-faint">{safeUsers.length} accounts</span>
          </div>

          <div className="nf-card overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-forge-700/70 bg-forge-850/60 text-xs uppercase tracking-wider text-forge-muted">
                  <th className="px-4 py-3 font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Sub-role</th>
                  <th className="px-4 py-3 font-semibold">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forge-700/60">
                {safeUsers.map((account) => {
                  const aId = account.id || account._id
                  return (
                    <tr key={aId} className="transition hover:bg-forge-850/60">
                      <td className="px-4 py-3.5 font-mono text-xs text-steel-400">{aId}</td>
                      <td className="px-4 py-3.5 font-medium text-forge-text">{account.name}</td>
                      <td className="px-4 py-3.5 font-mono text-xs text-forge-muted">
                        {account.email}
                      </td>
                      <td className="px-4 py-3.5">
                        <RoleBadge role={account.role} />
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-forge-muted">
                        {account.subRole ?? '—'}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-forge-muted">
                        {account.createdAt || '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {showForm && canCreate ? (
        <NewTeamForm
          users={safeUsers}
          onClose={() => setShowForm(false)}
          onCreated={(created) => {
            // The backend returns the canonical saved Team (id + createdAt are
            // stamped server-side), so appending it is equivalent to a refresh.
            setTeams((current) => [...(current ?? []), created])
            setShowForm(false)
          }}
        />
      ) : null}
    </div>
  )
}

function NewTeamForm({ users, onClose, onCreated }) {
  const [form, setForm] = useState(() => ({ name: '', description: '', leadId: '', memberIds: [] }))
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
      // Shape exactly matches POST /teams: name is required server-side;
      // id and createdAt are stamped by the backend and must never be sent.
      const created = await createTeam({
        name: form.name.trim(),
        description: form.description.trim() || null,
        leadId: form.leadId || null,
        memberIds: form.memberIds,
      })
      onCreated(created)
    } catch (err) {
      // request() already extracts the backend's { message } field.
      setError(err.message ?? 'Could not create the team.')
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
          <h2 className="font-display text-lg font-semibold text-forge-text">Forge a new team</h2>
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
            <label htmlFor="team-name" className="nf-label">
              Name
            </label>
            <input
              id="team-name"
              type="text"
              required
              placeholder="e.g. Circuit Breakers"
              value={form.name}
              onChange={set('name')}
              className="nf-input"
            />
          </div>

          <div className="col-span-full">
            <label htmlFor="team-description" className="nf-label">
              Description
            </label>
            <textarea
              id="team-description"
              rows={2}
              placeholder="What does this squad own?"
              value={form.description}
              onChange={set('description')}
              className="nf-input resize-none"
            />
          </div>

          <div className="col-span-full">
            <label htmlFor="team-lead" className="nf-label">
              Lead
            </label>
            <select id="team-lead" value={form.leadId} onChange={set('leadId')} className="nf-input">
              <option value="">Unassigned</option>
              {leadOptions.map((person) => (
                <option key={person.id || person._id} value={person.id || person._id}>
                  {person.name} — {person.role}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-forge-faint">
              Leads are drawn from admin / lead / manager accounts.
            </p>
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
            <p className="mt-1.5 text-xs text-forge-faint">
              Optional — the backend has no add-member endpoint, so creation is the only chance to
              attach members.
            </p>
          </div>

          <div className="col-span-full mt-2 flex items-center justify-end gap-3 border-t border-forge-700/70 pt-4">
            <button type="button" onClick={onClose} className="nf-btn-ghost" disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="nf-btn-primary" disabled={submitting}>
              {submitting ? 'Forging…' : 'Create team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}