/**
 * ═══════════════════════════════════════════════════════════════
 *  NeuroForge Nexus — API CLIENT
 * ═══════════════════════════════════════════════════════════════
 *  Milestone 1 (auth, users, projects, teams) now calls the REAL backend.
 *  Milestone 2 (sprints, tasks) is still MOCK until backend adds those
 *  endpoints — it uses its own small local dataset below, independent
 *  from the real API, so it keeps working without crashing.
 */

import axios from 'axios'

// ⚠️ CONFIRM WITH BACKEND TEAM: this default port is 8081 here —
// double check it matches your actual running backend (was 8080 before).
export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8081'

export const http = axios.create({
  baseURL: API_BASE,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach session token to outgoing requests
http.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('nf_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Global 401 redirect
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('nf_token')
      sessionStorage.removeItem('nf_user')
      window.location.assign('/login')
    }
    const message = error.response?.data?.message || error.message || 'Network or Server Error'
    return Promise.reject(new Error(message))
  },
)

// ── Domain constants ────────────────────────────────────────────
export const ROLES = ['ADMIN', 'PROJECT_LEAD', 'PROJECT_MANAGER', 'TEAM_LEAD', 'EMPLOYEE']
export const EMPLOYEE_SUB_ROLES = ['Developer', 'Tester', 'Junior', 'Senior']
export const PROJECT_STATUSES = ['PLANNING', 'ACTIVE', 'BLOCKED', 'COMPLETED']
export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE']
export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
export const ROLE_LABELS = {
  ADMIN: 'Admin',
  PROJECT_LEAD: 'Project Lead',
  PROJECT_MANAGER: 'Project Manager',
  TEAM_LEAD: 'Team Lead',
  EMPLOYEE: 'Employee',
}

export const DEMO_CREDENTIALS = { email: 'admin@neuroforge.dev', password: 'forge123' }

// ── Helpers to hydrate raw backend objects for frontend components ──
const hydrateProject = (project, users = [], teams = []) => {
  const memberList = Array.isArray(project.memberIds)
    ? project.memberIds.map((id) => users.find((u) => u.id === id) || { id, name: id })
    : []
  const teamObj = teams.find((t) => t.id === project.teamId)
  const leadObj = users.find((u) => u.id === project.leadId)
  return {
    ...project,
    team: teamObj ? teamObj.name : project.team || 'Unassigned',
    lead: leadObj ? leadObj.name : project.lead || 'Unassigned',
    members: memberList,
  }
}

const hydrateTeam = (team, users = []) => {
  const memberList = Array.isArray(team.memberIds)
    ? team.memberIds.map((id) => users.find((u) => u.id === id) || { id, name: id })
    : []
  const leadObj = users.find((u) => u.id === team.leadId)
  return {
    ...team,
    lead: leadObj ? leadObj.name : team.lead || 'Unassigned',
    members: memberList,
  }
}

/* ==================== MILESTONE 1 — REAL BACKEND CALLS ==================== */

export async function loginRequest({ email, password }) {
  const { data } = await http.post('/auth/login', { email, password })
  if (data?.token) sessionStorage.setItem('nf_token', data.token)
  if (data?.user) sessionStorage.setItem('nf_user', JSON.stringify(data.user))
  return data
}

export async function registerRequest({ name, email, password, role, subRole = null }) {
  const { data } = await http.post('/auth/register', { name, email, password, role, subRole })
  if (data?.token) sessionStorage.setItem('nf_token', data.token)
  if (data?.user) sessionStorage.setItem('nf_user', JSON.stringify(data.user))
  return data
}

export async function fetchDashboardStats(user) {
  try {
    const { data } = await http.get('/dashboard/stats')
    const isEmployee = user?.role === 'EMPLOYEE'
    if (isEmployee) {
      const projectsRes = await http.get('/projects').catch(() => ({ data: [] }))
      const myCount = (projectsRes.data || []).filter(
        (p) => Array.isArray(p.memberIds) && p.memberIds.includes(user.id),
      ).length
      return { ...data, scope: 'personal', myProjects: myCount }
    }
    return data
  } catch {
    return {
      scope: user?.role === 'EMPLOYEE' ? 'personal' : 'organization',
      activeProjects: 0,
      myProjects: 0,
      totalUsers: 0,
      totalTeams: 0,
    }
  }
}

export async function fetchProjects(user) {
  const [projectsRes, usersRes, teamsRes] = await Promise.all([
    http.get('/projects').catch(() => ({ data: [] })),
    http.get('/users').catch(() => ({ data: [] })),
    http.get('/teams').catch(() => ({ data: [] })),
  ])
  const projects = projectsRes.data || []
  const users = usersRes.data || []
  const teams = teamsRes.data || []
  const visible =
    user?.role === 'EMPLOYEE'
      ? projects.filter((p) => Array.isArray(p.memberIds) && p.memberIds.includes(user.id))
      : projects
  return visible.map((p) => hydrateProject(p, users, teams))
}

export async function createProject({
  name,
  description = '',
  teamId,
  leadId = null,
  status = 'PLANNING',
  sprint = '',
  dueDate = '',
  memberIds = [],
}) {
  const { data } = await http.post('/projects', {
    name,
    description,
    teamId,
    leadId,
    status,
    sprint,
    dueDate,
    memberIds,
  })
  const [usersRes, teamsRes] = await Promise.all([
    http.get('/users').catch(() => ({ data: [] })),
    http.get('/teams').catch(() => ({ data: [] })),
  ])
  return hydrateProject(data, usersRes.data || [], teamsRes.data || [])
}

export async function fetchTeams() {
  const [teamsRes, usersRes] = await Promise.all([
    http.get('/teams').catch(() => ({ data: [] })),
    http.get('/users').catch(() => ({ data: [] })),
  ])
  const teams = teamsRes.data || []
  const users = usersRes.data || []
  return teams.map((t) => hydrateTeam(t, users))
}

export async function fetchUsers() {
  const { data } = await http.get('/users')
  return data || []
}

/* ==================== MILESTONE 2 — STILL MOCK (self-contained) ====================
 * No real /sprints or /tasks endpoints exist yet. This mock data is
 * INDEPENDENT from the real backend above — it does not depend on any
 * shared `db` object, so it can't break when Milestone 1 switches to
 * real API calls. Once backend adds sprint/task endpoints, swap these
 * function bodies the same way Milestone 1's were swapped above.
 */

const MOCK_DELAY_MS = 400
const delay = (ms = MOCK_DELAY_MS) => new Promise((resolve) => setTimeout(resolve, ms))

// Local-only user/project data, used ONLY to hydrate mock sprints/tasks.
// Names may not match freshly registered real accounts — acceptable
// stopgap until backend implements sprint/task endpoints.
const MOCK_USERS = [
  { id: 'USR-0001', name: 'Priya Sharma' },
  { id: 'USR-0002', name: 'Marcus Lee' },
  { id: 'USR-0003', name: 'Elena Vasquez' },
  { id: 'USR-0004', name: 'Tomiwa Okafor' },
  { id: 'USR-0005', name: 'Ravi Menon' },
  { id: 'USR-0006', name: 'Sara Lindqvist' },
  { id: 'USR-0007', name: 'Daniel Cho' },
  { id: 'USR-0008', name: 'Amara Diallo' },
]

const MOCK_PROJECTS = [
  { id: 'PRJ-1036', name: 'Atlas Auth Service' },
  { id: 'PRJ-1037', name: 'Hermes Notification Pipeline' },
  { id: 'PRJ-1038', name: 'Vulcan Deploy Orchestrator' },
  { id: 'PRJ-1039', name: 'Aegis Audit Trail' },
  { id: 'PRJ-1040', name: 'Chimera Report Engine' },
  { id: 'PRJ-1041', name: 'Icarus Client SDK' },
]

let mockSprints = [
  { id: 'SPR-1001', projectId: 'PRJ-1036', name: 'Sprint 14', goal: 'Ship OAuth2 login and MFA enrollment.', startDate: '2026-08-24', endDate: '2026-09-06' },
  { id: 'SPR-1002', projectId: 'PRJ-1036', name: 'Sprint 15', goal: 'SSO integrations and session refresh.', startDate: '2026-09-07', endDate: '2026-09-20' },
  { id: 'SPR-1003', projectId: 'PRJ-1039', name: 'Sprint 14', goal: 'Immutable audit log v1 — write path.', startDate: '2026-08-31', endDate: '2026-09-13' },
  { id: 'SPR-1004', projectId: 'PRJ-1038', name: 'Sprint 14', goal: 'Unblock the blue/green traffic switch.', startDate: '2026-08-24', endDate: '2026-09-06' },
  { id: 'SPR-1005', projectId: 'PRJ-1041', name: 'Sprint 15', goal: 'SDK core client and retry policy.', startDate: '2026-09-01', endDate: '2026-09-14' },
  { id: 'SPR-1006', projectId: 'PRJ-1037', name: 'Sprint 15', goal: 'Notification fan-out prototype.', startDate: '2026-09-07', endDate: '2026-09-20' },
]

let mockTasks = [
  { id: 'TSK-2001', sprintId: 'SPR-1001', title: 'Add refresh-token rotation', assigneeId: 'USR-0005', storyPoints: 5, status: 'IN_PROGRESS', priority: 'HIGH' },
  { id: 'TSK-2002', sprintId: 'SPR-1001', title: 'MFA enrollment UI', assigneeId: 'USR-0007', storyPoints: 8, status: 'TODO', priority: 'MEDIUM' },
  { id: 'TSK-2003', sprintId: 'SPR-1001', title: 'Rate-limit the login endpoint', assigneeId: 'USR-0002', storyPoints: 3, status: 'DONE', priority: 'HIGH' },
  { id: 'TSK-2004', sprintId: 'SPR-1001', title: 'Auth integration test suite', assigneeId: 'USR-0006', storyPoints: 5, status: 'TODO', priority: 'MEDIUM' },
  { id: 'TSK-2005', sprintId: 'SPR-1001', title: 'Fix session timeout bug', assigneeId: 'USR-0005', storyPoints: 2, status: 'DONE', priority: 'URGENT' },
  { id: 'TSK-2006', sprintId: 'SPR-1003', title: 'Audit event schema', assigneeId: 'USR-0008', storyPoints: 3, status: 'IN_PROGRESS', priority: 'MEDIUM' },
  { id: 'TSK-2007', sprintId: 'SPR-1003', title: 'Append-only log storage', assigneeId: 'USR-0006', storyPoints: 8, status: 'TODO', priority: 'HIGH' },
  { id: 'TSK-2008', sprintId: 'SPR-1003', title: 'Audit log viewer page', assigneeId: 'USR-0003', storyPoints: 5, status: 'TODO', priority: 'LOW' },
  { id: 'TSK-2009', sprintId: 'SPR-1003', title: 'Tamper-evident hashing', assigneeId: 'USR-0006', storyPoints: 5, status: 'DONE', priority: 'HIGH' },
  { id: 'TSK-2010', sprintId: 'SPR-1004', title: 'Diagnose deploy-hook failure', assigneeId: 'USR-0004', storyPoints: 2, status: 'IN_PROGRESS', priority: 'URGENT' },
  { id: 'TSK-2011', sprintId: 'SPR-1004', title: 'Rollback smoke tests', assigneeId: 'USR-0006', storyPoints: 3, status: 'TODO', priority: 'HIGH' },
  { id: 'TSK-2012', sprintId: 'SPR-1004', title: 'Blue/green traffic switch', assigneeId: 'USR-0004', storyPoints: 8, status: 'TODO', priority: 'HIGH' },
  { id: 'TSK-2013', sprintId: 'SPR-1005', title: 'HTTP client core', assigneeId: 'USR-0005', storyPoints: 8, status: 'IN_PROGRESS', priority: 'HIGH' },
  { id: 'TSK-2014', sprintId: 'SPR-1005', title: 'Retry with backoff', assigneeId: 'USR-0005', storyPoints: 3, status: 'TODO', priority: 'MEDIUM' },
  { id: 'TSK-2015', sprintId: 'SPR-1005', title: 'Typed error surfaces', assigneeId: 'USR-0007', storyPoints: 5, status: 'DONE', priority: 'MEDIUM' },
  { id: 'TSK-2016', sprintId: 'SPR-1005', title: 'Publish beta to npm', assigneeId: 'USR-0004', storyPoints: 1, status: 'TODO', priority: 'LOW' },
  { id: 'TSK-2017', sprintId: 'SPR-1002', title: 'Google SSO provider', assigneeId: 'USR-0007', storyPoints: 8, status: 'TODO', priority: 'MEDIUM' },
  { id: 'TSK-2018', sprintId: 'SPR-1002', title: 'Session refresh tokens', assigneeId: 'USR-0005', storyPoints: 5, status: 'TODO', priority: 'LOW' },
  { id: 'TSK-2019', sprintId: 'SPR-1006', title: 'Fan-out queue prototype', assigneeId: 'USR-0008', storyPoints: 5, status: 'TODO', priority: 'MEDIUM' },
  { id: 'TSK-2020', sprintId: 'SPR-1006', title: 'Push notification spike', assigneeId: 'USR-0006', storyPoints: 3, status: 'TODO', priority: 'LOW' },
]

let mockTaskSeq = 2020

const hydrateSprint = (sprint) => ({
  ...sprint,
  project: MOCK_PROJECTS.find((p) => p.id === sprint.projectId)?.name ?? 'Unknown project',
})

const hydrateTask = (task) => ({
  ...task,
  assignee: task.assigneeId ? MOCK_USERS.find((u) => u.id === task.assigneeId) ?? null : null,
})

export async function fetchSprints(projectId = null) {
  await delay()
  const visible = projectId ? mockSprints.filter((s) => s.projectId === projectId) : mockSprints
  return visible.map(hydrateSprint)
}

export async function fetchTasksBySprint(sprintId) {
  await delay()
  return mockTasks.filter((t) => t.sprintId === sprintId).map(hydrateTask)
}

export async function createTask({
  sprintId,
  title,
  assigneeId = null,
  storyPoints = 3,
  priority = 'MEDIUM',
  status = 'TODO',
}) {
  await delay()
  if (!mockSprints.some((s) => s.id === sprintId)) throw new Error('Sprint not found.')
  if (!String(title).trim()) throw new Error('Task title is required.')
  if (!TASK_PRIORITIES.includes(priority)) throw new Error('Please choose a valid priority.')
  if (!TASK_STATUSES.includes(status)) throw new Error('Invalid task status.')
  const points = Number(storyPoints)
  if (!Number.isInteger(points) || points < 1) {
    throw new Error('Story points must be a positive number.')
  }
  const task = {
    id: `TSK-${++mockTaskSeq}`,
    title: String(title).trim(),
    assigneeId: assigneeId || null,
    storyPoints: points,
    status,
    priority,
    sprintId,
  }
  mockTasks.push(task)
  return hydrateTask(task)
}

export async function updateTaskStatus(taskId, newStatus) {
  await delay()
  const task = mockTasks.find((t) => t.id === taskId)
  if (!task) throw new Error('Task not found.')
  if (!TASK_STATUSES.includes(newStatus)) throw new Error('Invalid task status.')
  task.status = newStatus
  return hydrateTask(task)
}

export function isSprintActive(sprint, today = new Date()) {
  if (!sprint?.startDate || !sprint?.endDate) return false
  const start = new Date(`${sprint.startDate}T00:00:00`)
  const end = new Date(`${sprint.endDate}T23:59:59`)
  return today >= start && today <= end
}