import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckSquare, Circle, FolderKanban, Users, UsersRound } from 'lucide-react'
import {
  fetchDashboardStats,
  fetchProjects,
  fetchTasksByProject,
  fetchTeams,
  fetchUsers,
} from '../api/client'
import { useAuth } from '../context/AuthContext'
import { AvatarStack, EmptyState, PageHeader, PriorityBadge, StatCard, StatusPill } from '../components/ui'

// Same two-tier model used everywhere else in the app (Teams, Projects,
// Sprints, Pipelines, Releases, Deployments): it mirrors what the backend's
// @PreAuthorize actually enforces.
const MANAGER_ROLES = ['ADMIN', 'PROJECT_LEAD', 'PROJECT_MANAGER']

const TASK_STATUS_ORDER = ['TODO', 'IN_PROGRESS', 'DONE']
const TASK_STATUS_LABELS = { TODO: 'To Do', IN_PROGRESS: 'In Progress', DONE: 'Done' }

const formatDate = (iso) =>
  iso
    ? new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—'

const isOverdue = (dueDate, status) =>
  Boolean(dueDate) && status !== 'COMPLETED' && new Date(`${dueDate}T23:59:59`) < new Date()

function DashboardSkeleton() {
  return (
    <div aria-hidden>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <div key={key} className="nf-card h-32 animate-pulse" />
        ))}
      </div>
      <div className="nf-card mt-10 h-72 animate-pulse" />
    </div>
  )
}

/** One task row in a contributor's "My Tasks" list. */
function MyTaskRow({ task, projectName }) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-forge-700/60 bg-forge-850/50 px-4 py-3">
      <Circle
        className={`h-3 w-3 shrink-0 ${
          task.status === 'DONE'
            ? 'fill-signal-success text-signal-success'
            : task.status === 'IN_PROGRESS'
              ? 'fill-signal-warning text-signal-warning'
              : 'fill-forge-600 text-forge-600'
        }`}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-forge-text">{task.title}</p>
        <p className="truncate font-mono text-[11px] text-forge-faint">{projectName || task.projectId}</p>
      </div>
      <PriorityBadge priority={task.priority} />
      <span className="rounded-md border border-steel-500/30 bg-steel-500/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-steel-300">
        {task.storyPoints ?? 0} pts
      </span>
    </li>
  )
}

/** Contributor view: their own assigned tasks across every project, grouped by status. */
function MyTasksSection({ tasks, projectsById }) {
  const grouped = useMemo(() => {
    const map = { TODO: [], IN_PROGRESS: [], DONE: [] }
    for (const task of tasks) {
      if (map[task.status]) map[task.status].push(task)
    }
    return map
  }, [tasks])

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={CheckSquare}
        title="No tasks assigned"
        message="Once a lead assigns you a task, it will show up here."
      />
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {TASK_STATUS_ORDER.map((status) => (
        <section key={status} className="rounded-xl border border-forge-700/70 bg-forge-900/60 p-3">
          <h3 className="mb-3 px-1 font-display text-sm font-semibold text-forge-text">
            {TASK_STATUS_LABELS[status]}
            <span className="ml-2 font-mono text-[11px] font-normal text-forge-faint">
              {grouped[status].length}
            </span>
          </h3>
          <ul className="space-y-2">
            {grouped[status].length === 0 ? (
              <p className="rounded-lg border border-dashed border-forge-700 px-3 py-6 text-center text-xs text-forge-faint">
                Nothing here
              </p>
            ) : (
              grouped[status].map((task) => (
                <MyTaskRow
                  key={task.id || task._id}
                  task={task}
                  projectName={projectsById.get(task.projectId)?.name}
                />
              ))
            )}
          </ul>
        </section>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const isManager = MANAGER_ROLES.includes(user.role)

  const [stats, setStats] = useState(null)
  const [projects, setProjects] = useState([])
  const [teams, setTeams] = useState([])
  const [users, setUsers] = useState([])
  const [myTasks, setMyTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Id → object lookups: the manager's projects table resolves team / lead /
  // member names from these, same pattern as Projects.jsx / Teams.jsx.
  const teamsById = useMemo(() => new Map((teams || []).map((t) => [t.id || t._id, t])), [teams])
  const usersById = useMemo(() => new Map((users || []).map((u) => [u.id || u._id, u])), [users])
  const projectsById = useMemo(() => new Map((projects || []).map((p) => [p.id || p._id, p])), [projects])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [statsData, projectData, teamData, userData] = await Promise.all([
          fetchDashboardStats(user),
          fetchProjects(user),
          fetchTeams(),
          fetchUsers(),
        ])
        if (cancelled) return
        setStats(statsData)
        setProjects(projectData || [])
        setTeams(teamData || [])
        setUsers(userData || [])

        // Contributors get "My Tasks" instead of the org-wide table. There is
        // no "tasks assigned to me" endpoint on the backend, so this
        // aggregates every project's tasks client-side and filters by
        // assignedTo. Skipped for managers to avoid the extra requests.
        if (!MANAGER_ROLES.includes(user.role)) {
          const taskLists = await Promise.all(
            (projectData || []).map((p) => fetchTasksByProject(p.id || p._id).catch(() => [])),
          )
          const mine = taskLists.flat().filter((t) => t.assignedTo === user.id)
          if (!cancelled) setMyTasks(mine)
        }
      } catch (err) {
        if (!cancelled) setError(err.message ?? 'Failed to load the dashboard.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user])

  return (
    <div>
      <PageHeader
        title={isManager ? 'Dashboard' : 'My Dashboard'}
        subtitle={`Welcome back, ${user.name.split(' ')[0]} — here's what's smelting ${
          isManager ? 'across the forge' : 'on your plate'
        }.`}
      />

      {error ? (
        <EmptyState icon={AlertTriangle} title="Couldn't load the dashboard" message={error} />
      ) : loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {isManager ? (
              <StatCard
                icon={FolderKanban}
                label="Active Projects"
                value={stats?.activeProjects ?? 0}
                hint="currently in flight"
                accent="ember"
              />
            ) : (
              <StatCard
                icon={CheckSquare}
                label="My Open Tasks"
                value={myTasks.filter((t) => t.status !== 'DONE').length}
                hint="assigned to you"
                accent="ember"
              />
            )}
            <StatCard
              icon={Users}
              label="Total Users"
              value={stats?.totalUsers ?? 0}
              hint="registered accounts"
              accent="steel"
            />
            <StatCard
              icon={UsersRound}
              label="Total Teams"
              value={stats?.totalTeams ?? 0}
              hint="squads on the floor"
              accent="success"
            />
          </div>

          <section className="mt-10">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-forge-text">
                  {isManager ? 'All Projects' : 'My Tasks'}
                </h2>
                <p className="text-sm text-forge-muted">
                  {isManager
                    ? 'Every project in the workspace.'
                    : 'Tasks assigned to you, across every project.'}
                </p>
              </div>
              <span className="font-mono text-xs text-forge-faint">
                {isManager ? projects.length : myTasks.length} total
              </span>
            </div>

            {isManager ? (
              projects.length === 0 ? (
                <EmptyState
                  icon={FolderKanban}
                  title="No projects yet"
                  message="When a project lead creates the first project, it will show up here."
                />
              ) : (
                <div className="nf-card overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-forge-700/70 bg-forge-850/60 text-xs uppercase tracking-wider text-forge-muted">
                        <th className="px-4 py-3 font-semibold">Project</th>
                        <th className="px-4 py-3 font-semibold">Team</th>
                        <th className="px-4 py-3 font-semibold">Lead</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Sprint</th>
                        <th className="px-4 py-3 font-semibold">Due</th>
                        <th className="px-4 py-3 font-semibold">Members</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-forge-700/60">
                      {projects.map((project) => {
                        const pId = project.id || project._id
                        const team = teamsById.get(project.teamId)
                        const lead = usersById.get(project.leadId)
                        const memberIds = project.memberIds || []
                        const members = memberIds.map((id) => usersById.get(id)).filter(Boolean)

                        return (
                          <tr key={pId} className="transition hover:bg-forge-850/60">
                            <td className="px-4 py-3.5">
                              <p className="font-medium text-forge-text">{project.name}</p>
                              <p className="font-mono text-[11px] text-steel-400">{pId}</p>
                            </td>
                            <td className="px-4 py-3.5 text-forge-muted">{team?.name || '—'}</td>
                            <td className="px-4 py-3.5 text-forge-muted">{lead?.name || '—'}</td>
                            <td className="px-4 py-3.5">
                              <StatusPill status={project.status} />
                            </td>
                            <td className="px-4 py-3.5 font-mono text-xs text-forge-muted">
                              {project.sprint || '—'}
                            </td>
                            <td
                              className={`px-4 py-3.5 font-mono text-xs ${
                                isOverdue(project.dueDate, project.status)
                                  ? 'text-signal-danger'
                                  : 'text-forge-muted'
                              }`}
                            >
                              {formatDate(project.dueDate)}
                            </td>
                            <td className="px-4 py-3.5">
                              {members.length > 0 ? (
                                <AvatarStack people={members} max={4} />
                              ) : (
                                <span className="text-xs text-forge-faint">No members</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              <MyTasksSection tasks={myTasks} projectsById={projectsById} />
            )}
          </section>
        </>
      )}
    </div>
  )
}