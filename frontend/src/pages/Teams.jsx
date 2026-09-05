import { useEffect, useMemo, useState } from 'react'
import { Crown, FolderKanban, Users } from 'lucide-react'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { fetchProjects, fetchTeams, fetchUsers } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Avatar, EmptyState, PageHeader, RoleBadge } from '../components/ui'

/* Slice colors for the status pie. Hex mirrors the signal tokens in index.css —
   recharts needs literal color values and can't read Tailwind classes. */
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
  for (const project of projects) {
    if (project.status in counts) counts[project.status] += 1
  }
  return counts
}

/**
 * Roll up the projects list per team id:
 * total assigned, how many ACTIVE (in progress), how many COMPLETED.
 */
function buildTeamStats(teams, projects) {
  const byTeam = new Map(teams.map((team) => [team.id, []]))
  for (const project of projects) {
    byTeam.get(project.teamId)?.push(project)
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
  const counts = countByStatus(projects)
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
        <span className="font-mono text-xs text-forge-faint">{projects.length} projects</span>
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
              stroke="#0a0c10" /* forge-950 — separates the slices */
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
              {projects.length}
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
                backgroundColor: '#12151b', /* forge-900 */
                border: '1px solid #232a36', /* forge-700 */
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

function TeamCard({ team, stats }) {
  return (
    <article className="nf-card flex flex-col p-5 transition hover:border-forge-600">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-forge-text">{team.name}</h3>
          <p className="mt-0.5 font-mono text-xs text-steel-400">{team.id}</p>
        </div>
        <span className="rounded-full bg-forge-800 px-2.5 py-1 font-mono text-[11px] text-forge-muted ring-1 ring-forge-700">
          {team.members.length} members
        </span>
      </div>

      <p className="mt-2 text-sm text-forge-muted">{team.description}</p>

      <p className="mt-3 flex items-center gap-2 text-sm">
        <Crown className="h-3.5 w-3.5 shrink-0 text-ember-400" aria-hidden />
        <span className="text-forge-faint">Lead:</span>
        <span className="font-medium text-forge-text">{team.lead}</span>
      </p>

      {/* Project rollup — cross-referenced from the projects list by team id */}
      <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-forge-700/60 bg-forge-850/50 p-3">
        <div className="text-center">
          <span className="block font-mono text-lg font-semibold text-forge-text">
            {stats.total}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-forge-faint">Projects</span>
        </div>
        <div className="text-center">
          <span className="block font-mono text-lg font-semibold text-signal-success">
            {stats.active}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-forge-faint">Active</span>
        </div>
        <div className="text-center">
          <span className="block font-mono text-lg font-semibold text-steel-300">
            {stats.completed}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-forge-faint">Completed</span>
        </div>
      </div>

      <ul className="mt-4 space-y-2.5 border-t border-forge-700/60 pt-4">
        {team.members.map((member) => (
          <li key={member.id} className="flex items-center gap-3">
            <Avatar name={member.name} className="h-7 w-7 text-[10px]" />
            <span className="truncate text-sm font-medium text-forge-text">{member.name}</span>
            <span className="ml-auto flex shrink-0 items-center gap-2">
              {member.subRole ? (
                <span className="font-mono text-[10px] text-forge-faint">{member.subRole}</span>
              ) : null}
              <RoleBadge role={member.role} />
            </span>
          </li>
        ))}
      </ul>
    </article>
  )
}

export default function Teams() {
  const { user, hasRole } = useAuth()
  // The full user directory is an ADMIN-only view.
  const isAdmin = hasRole('ADMIN')

  const [teams, setTeams] = useState(null)
  const [projects, setProjects] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Per-team project rollup (total / active / completed), recomputed
  // whenever the teams or projects lists change.
  const teamStats = useMemo(() => buildTeamStats(teams ?? [], projects), [teams, projects])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [teamData, projectData, userData] = await Promise.all([
          fetchTeams(),
          fetchProjects(user), // RBAC lives in client.js: EMPLOYEEs only get their projects
          isAdmin ? fetchUsers() : Promise.resolve([]), // users only fetched for admins
        ])
        if (!cancelled) {
          setTeams(teamData)
          setProjects(projectData)
          setUsers(userData)
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
  }, [user, isAdmin])

  return (
    <div>
      <PageHeader title="Teams" subtitle="Squads on the forge floor." />

      {error ? (
        <EmptyState icon={Users} title="Couldn't load teams" message={error} />
      ) : loading ? (
        <TeamsSkeleton />
      ) : (
        <>
          {/* Overall status donut — replaced by a friendly empty state when there is no data */}
          {projects.length > 0 ? (
            <StatusPie projects={projects} />
          ) : (
            <div className="mb-10">
              <EmptyState
                icon={FolderKanban}
                title="No project data yet"
                message="The status chart will appear here as soon as there is at least one project."
              />
            </div>
          )}

          {teams.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No teams yet"
              message="Teams will appear here as soon as they are created."
            />
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {teams.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  stats={teamStats.get(team.id) ?? EMPTY_TEAM_STATS}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── ADMIN-only: full user directory ─────────────────── */}
      {isAdmin && !loading && !error ? (
        <section className="mt-12">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-forge-text">All users</h2>
              <p className="text-sm text-forge-muted">
                Full account directory — visible to admins only.
              </p>
            </div>
            <span className="font-mono text-xs text-forge-faint">{users.length} accounts</span>
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
                {users.map((account) => (
                  <tr key={account.id} className="transition hover:bg-forge-850/60">
                    <td className="px-4 py-3.5 font-mono text-xs text-steel-400">{account.id}</td>
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
                      {account.createdAt}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

    </div>
  )
}
