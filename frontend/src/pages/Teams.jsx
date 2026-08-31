import { useEffect, useState } from 'react'
import { Crown, Users } from 'lucide-react'
import { fetchTeams, fetchUsers } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Avatar, EmptyState, PageHeader, RoleBadge } from '../components/ui'

function TeamsSkeleton() {
  return (
    <div aria-hidden className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2].map((key) => (
        <div key={key} className="nf-card h-64 animate-pulse" />
      ))}
    </div>
  )
}

function TeamCard({ team }) {
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
  const { hasRole } = useAuth()
  // The full user directory is an ADMIN-only view.
  const isAdmin = hasRole('ADMIN')

  const [teams, setTeams] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [teamData, userData] = await Promise.all([
          fetchTeams(),
          isAdmin ? fetchUsers() : Promise.resolve([]), // users only fetched for admins
        ])
        if (!cancelled) {
          setTeams(teamData)
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
  }, [isAdmin])

  return (
    <div>
      <PageHeader title="Teams" subtitle="Squads on the forge floor." />

      {error ? (
        <EmptyState icon={Users} title="Couldn't load teams" message={error} />
      ) : loading ? (
        <TeamsSkeleton />
      ) : teams.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No teams yet"
          message="Teams will appear here as soon as they are created."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
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
