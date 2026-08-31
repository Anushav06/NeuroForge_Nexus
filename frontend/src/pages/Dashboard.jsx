import { useEffect, useState } from 'react'
import { AlertTriangle, FolderKanban, Users, UsersRound } from 'lucide-react'
import { fetchDashboardStats, fetchProjects } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { AvatarStack, EmptyState, PageHeader, StatCard, StatusPill } from '../components/ui'

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

export default function Dashboard() {
  const { user } = useAuth()
  const isEmployee = user.role === 'EMPLOYEE'

  const [stats, setStats] = useState(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [statsData, projectData] = await Promise.all([
          fetchDashboardStats(user),
          fetchProjects(user),
        ])
        if (!cancelled) {
          setStats(statsData)
          setProjects(projectData)
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
        title={isEmployee ? 'My Dashboard' : 'Dashboard'}
        subtitle={`Welcome back, ${user.name.split(' ')[0]} — here's what's smelting ${
          isEmployee ? 'on your plate' : 'across the forge'
        }.`}
      />

      {error ? (
        <EmptyState icon={AlertTriangle} title="Couldn't load the dashboard" message={error} />
      ) : loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* Stat cards — EMPLOYEE sees personal numbers instead of org-wide ones */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {isEmployee ? (
              <StatCard
                icon={FolderKanban}
                label="My Projects"
                value={stats.myProjects}
                hint="projects you're staffed on"
                accent="ember"
              />
            ) : (
              <StatCard
                icon={FolderKanban}
                label="Active Projects"
                value={stats.activeProjects}
                hint="currently in flight"
                accent="ember"
              />
            )}
            <StatCard
              icon={Users}
              label="Total Users"
              value={stats.totalUsers}
              hint="registered accounts"
              accent="steel"
            />
            <StatCard
              icon={UsersRound}
              label="Total Teams"
              value={stats.totalTeams}
              hint="squads on the floor"
              accent="success"
            />
          </div>


          {/* Projects table */}
          <section className="mt-10">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-forge-text">
                  {isEmployee ? 'My Projects' : 'All Projects'}
                </h2>
                <p className="text-sm text-forge-muted">
                  {isEmployee ? 'Projects you are assigned to.' : 'Every project in the workspace.'}
                </p>
              </div>
              <span className="font-mono text-xs text-forge-faint">{projects.length} total</span>
            </div>

            {projects.length === 0 ? (
              <EmptyState
                icon={FolderKanban}
                title="No projects yet"
                message={
                  isEmployee
                    ? "You haven't been staffed on any projects — check back once a lead assigns you."
                    : 'When a project lead creates the first project, it will show up here.'
                }
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
                    {projects.map((project) => (
                      <tr key={project.id} className="transition hover:bg-forge-850/60">
                        <td className="px-4 py-3.5">
                          <p className="font-medium text-forge-text">{project.name}</p>
                          <p className="font-mono text-[11px] text-steel-400">{project.id}</p>
                        </td>
                        <td className="px-4 py-3.5 text-forge-muted">{project.team}</td>
                        <td className="px-4 py-3.5 text-forge-muted">{project.lead}</td>
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
                          <AvatarStack people={project.members} max={4} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

        </>
      )}
    </div>
  )
}
