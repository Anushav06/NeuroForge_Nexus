/**
 * ═══════════════════════════════════════════════════════════════
 *  NeuroForge Nexus — API CLIENT
 *  (MOCK implementation)
 * ═══════════════════════════════════════════════════════════════
 *
 *  This is the ONLY file in the app that talks to a backend.
 *  Pages/components import the exported functions below — they never
 *  call axios directly. When the real API is ready:
 *
 *    1. Point the app at your API via `frontend/.env` (template: `.env.example`):
 *         VITE_API_BASE_URL=http://localhost:8080/api
 *       `API_BASE` below already reads `import.meta.env.VITE_API_BASE_URL`
 *       at dev/build time, so no code change is needed — just the .env value.
 *    2. In each function, delete the mock body and return the real
 *       axios call shown in its "REAL BACKEND" comment.
 *    3. Done. The shared `http` instance below is already live (nothing to
 *       uncomment) and handles the auth header + global 401 handling;
 *       no page needs to change.
 */

import axios from 'axios'

export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api'

/**
 * REAL BACKEND — shared axios instance (already active, nothing to uncomment).
 * `baseURL` is wired to import.meta.env.VITE_API_BASE_URL via API_BASE above
 * (set it in frontend/.env — template in .env.example). The interceptors below
 * attach the token that AuthContext stores in sessionStorage and handle 401s.
 */
export const http = axios.create({
  baseURL: API_BASE,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach the session token to every request.
http.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('nf_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// A 401 anywhere means the session died — reset and bounce to /login.
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('nf_token')
      sessionStorage.removeItem('nf_user')
      window.location.assign('/login')
    }
    return Promise.reject(error)
  },
)

// ── Domain constants (single source of truth for forms & badges) ──
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

/** Demo login shown as a hint on the Login page. */
export const DEMO_CREDENTIALS = { email: 'admin@neuroforge.dev', password: 'forge123' }

// ── Mock plumbing ─────────────────────────────────────────────────
const MOCK_DELAY_MS = 450
const delay = (ms = MOCK_DELAY_MS) => new Promise((resolve) => setTimeout(resolve, ms))

/** Strip the password before a user object leaves this module. */
const publicUser = (user) => {
  const clone = { ...user }
  delete clone.password
  return clone
}

const makeToken = (user) => `nf.mock.${user.id}.${Date.now()}`

// ── In-memory database (resets when the page is refreshed) ────────
const DEMO_PASSWORD = DEMO_CREDENTIALS.password

const db = {
  users: [
    { id: 'USR-0001', name: 'Priya Sharma',   email: 'admin@neuroforge.dev',          password: DEMO_PASSWORD, role: 'ADMIN',           subRole: null,        status: 'active', createdAt: '2026-01-12' },
    { id: 'USR-0002', name: 'Marcus Lee',     email: 'marcus.lee@neuroforge.dev',     password: DEMO_PASSWORD, role: 'PROJECT_LEAD',    subRole: null,        status: 'active', createdAt: '2026-01-15' },
    { id: 'USR-0003', name: 'Elena Vasquez',  email: 'elena.vasquez@neuroforge.dev',  password: DEMO_PASSWORD, role: 'PROJECT_MANAGER', subRole: null,        status: 'active', createdAt: '2026-01-19' },
    { id: 'USR-0004', name: 'Tomiwa Okafor',  email: 'tomiwa.okafor@neuroforge.dev',  password: DEMO_PASSWORD, role: 'TEAM_LEAD',       subRole: null,        status: 'active', createdAt: '2026-01-22' },
    { id: 'USR-0005', name: 'Ravi Menon',     email: 'ravi.menon@neuroforge.dev',     password: DEMO_PASSWORD, role: 'EMPLOYEE',        subRole: 'Developer', status: 'active', createdAt: '2026-02-02' },
    { id: 'USR-0006', name: 'Sara Lindqvist', email: 'sara.lindqvist@neuroforge.dev', password: DEMO_PASSWORD, role: 'EMPLOYEE',        subRole: 'Tester',    status: 'active', createdAt: '2026-02-09' },
    { id: 'USR-0007', name: 'Daniel Cho',     email: 'daniel.cho@neuroforge.dev',     password: DEMO_PASSWORD, role: 'EMPLOYEE',        subRole: 'Senior',    status: 'active', createdAt: '2026-02-14' },
    { id: 'USR-0008', name: 'Amara Diallo',   email: 'amara.diallo@neuroforge.dev',   password: DEMO_PASSWORD, role: 'EMPLOYEE',        subRole: 'Junior',    status: 'active', createdAt: '2026-02-20' },
  ],

  teams: [
    { id: 'TEAM-001', name: 'Core Forge',       description: 'Platform, auth & core services', leadId: 'USR-0002', memberIds: ['USR-0002', 'USR-0005', 'USR-0007'] },
    { id: 'TEAM-002', name: 'Quality Hearth',   description: 'QA automation & release gating', leadId: 'USR-0003', memberIds: ['USR-0003', 'USR-0006', 'USR-0008'] },
    { id: 'TEAM-003', name: 'Circuit Breakers', description: 'CI/CD & infrastructure tooling', leadId: 'USR-0004', memberIds: ['USR-0004', 'USR-0005', 'USR-0006'] },
  ],

  projects: [],

  sprints: [],
  tasks: [],
}

let userSeq = 8
let projectSeq = 1041

/** Fill a raw project with readable team / lead / member objects. */
const hydrateProject = (project) => ({
  ...project,
  team: db.teams.find((t) => t.id === project.teamId)?.name ?? 'Unassigned',
  lead: db.users.find((u) => u.id === project.leadId)?.name ?? 'Unassigned',
  members: project.memberIds
    .map((id) => db.users.find((u) => u.id === id))
    .filter(Boolean)
    .map(publicUser),
})

db.projects = [
  { id: 'PRJ-1036', name: 'Atlas Auth Service',          description: 'OAuth2, SSO and session hardening for the platform.',  status: 'ACTIVE',   teamId: 'TEAM-001', leadId: 'USR-0002', memberIds: ['USR-0002', 'USR-0005', 'USR-0007'], sprint: 'Sprint 14', dueDate: '2026-09-18', createdAt: '2026-06-01' },
  { id: 'PRJ-1037', name: 'Hermes Notification Pipeline', description: 'Fan-out email/push notifications with retry queues.',  status: 'PLANNING', teamId: 'TEAM-001', leadId: 'USR-0003', memberIds: ['USR-0003', 'USR-0005'],             sprint: 'Sprint 15', dueDate: '2026-10-02', createdAt: '2026-06-15' },
  { id: 'PRJ-1038', name: 'Vulcan Deploy Orchestrator',   description: 'One-click blue/green deploys with instant rollback.',  status: 'BLOCKED',  teamId: 'TEAM-003', leadId: 'USR-0004', memberIds: ['USR-0004', 'USR-0006'],             sprint: 'Sprint 14', dueDate: '2026-09-25', createdAt: '2026-05-20' },
  { id: 'PRJ-1039', name: 'Aegis Audit Trail',            description: 'Immutable audit log for every privileged action.',     status: 'ACTIVE',   teamId: 'TEAM-002', leadId: 'USR-0003', memberIds: ['USR-0003', 'USR-0006', 'USR-0008'], sprint: 'Sprint 14', dueDate: '2026-09-11', createdAt: '2026-05-28' },
  { id: 'PRJ-1040', name: 'Chimera Report Engine',        description: 'Scheduled CSV/PDF exports and executive dashboards.',  status: 'PLANNING', teamId: 'TEAM-001', leadId: 'USR-0002', memberIds: ['USR-0002', 'USR-0007'],             sprint: 'Sprint 16', dueDate: '2026-10-30', createdAt: '2026-07-04' },
  { id: 'PRJ-1041', name: 'Icarus Client SDK',            description: 'Typed TypeScript SDK for the public NeuroForge API.',  status: 'ACTIVE',   teamId: 'TEAM-003', leadId: 'USR-0004', memberIds: ['USR-0004', 'USR-0005', 'USR-0006'], sprint: 'Sprint 15', dueDate: '2026-10-16', createdAt: '2026-07-10' },
]

/* ── Milestone 2: sprints & tasks ────────────────────────────────── */
let taskSeq = 2020

/** Fill a raw sprint with the project name the UI displays. */
const hydrateSprint = (sprint) => ({
  ...sprint,
  project: db.projects.find((p) => p.id === sprint.projectId)?.name ?? 'Unknown project',
})

/** Fill a raw task with the assignee user object the UI displays. */
const hydrateTask = (task) => ({
  ...task,
  assignee: task.assigneeId ? publicUser(db.users.find((u) => u.id === task.assigneeId)) : null,
})

db.sprints = [
  { id: 'SPR-1001', projectId: 'PRJ-1036', name: 'Sprint 14', goal: 'Ship OAuth2 login and MFA enrollment.',      startDate: '2026-08-24', endDate: '2026-09-06' },
  { id: 'SPR-1002', projectId: 'PRJ-1036', name: 'Sprint 15', goal: 'SSO integrations and session refresh.',      startDate: '2026-09-07', endDate: '2026-09-20' },
  { id: 'SPR-1003', projectId: 'PRJ-1039', name: 'Sprint 14', goal: 'Immutable audit log v1 — write path.',       startDate: '2026-08-31', endDate: '2026-09-13' },
  { id: 'SPR-1004', projectId: 'PRJ-1038', name: 'Sprint 14', goal: 'Unblock the blue/green traffic switch.',     startDate: '2026-08-24', endDate: '2026-09-06' },
  { id: 'SPR-1005', projectId: 'PRJ-1041', name: 'Sprint 15', goal: 'SDK core client and retry policy.',          startDate: '2026-09-01', endDate: '2026-09-14' },
  { id: 'SPR-1006', projectId: 'PRJ-1037', name: 'Sprint 15', goal: 'Notification fan-out prototype.',            startDate: '2026-09-07', endDate: '2026-09-20' },
]

db.tasks = [
  { id: 'TSK-2001', sprintId: 'SPR-1001', title: 'Add refresh-token rotation',       assigneeId: 'USR-0005', storyPoints: 5, status: 'IN_PROGRESS', priority: 'HIGH' },
  { id: 'TSK-2002', sprintId: 'SPR-1001', title: 'MFA enrollment UI',               assigneeId: 'USR-0007', storyPoints: 8, status: 'TODO',        priority: 'MEDIUM' },
  { id: 'TSK-2003', sprintId: 'SPR-1001', title: 'Rate-limit the login endpoint',   assigneeId: 'USR-0002', storyPoints: 3, status: 'DONE',        priority: 'HIGH' },
  { id: 'TSK-2004', sprintId: 'SPR-1001', title: 'Auth integration test suite',     assigneeId: 'USR-0006', storyPoints: 5, status: 'TODO',        priority: 'MEDIUM' },
  { id: 'TSK-2005', sprintId: 'SPR-1001', title: 'Fix session timeout bug',         assigneeId: 'USR-0005', storyPoints: 2, status: 'DONE',        priority: 'URGENT' },
  { id: 'TSK-2006', sprintId: 'SPR-1003', title: 'Audit event schema',              assigneeId: 'USR-0008', storyPoints: 3, status: 'IN_PROGRESS', priority: 'MEDIUM' },
  { id: 'TSK-2007', sprintId: 'SPR-1003', title: 'Append-only log storage',         assigneeId: 'USR-0006', storyPoints: 8, status: 'TODO',        priority: 'HIGH' },
  { id: 'TSK-2008', sprintId: 'SPR-1003', title: 'Audit log viewer page',           assigneeId: 'USR-0003', storyPoints: 5, status: 'TODO',        priority: 'LOW' },
  { id: 'TSK-2009', sprintId: 'SPR-1003', title: 'Tamper-evident hashing',          assigneeId: 'USR-0006', storyPoints: 5, status: 'DONE',        priority: 'HIGH' },
  { id: 'TSK-2010', sprintId: 'SPR-1004', title: 'Diagnose deploy-hook failure',    assigneeId: 'USR-0004', storyPoints: 2, status: 'IN_PROGRESS', priority: 'URGENT' },
  { id: 'TSK-2011', sprintId: 'SPR-1004', title: 'Rollback smoke tests',            assigneeId: 'USR-0006', storyPoints: 3, status: 'TODO',        priority: 'HIGH' },
  { id: 'TSK-2012', sprintId: 'SPR-1004', title: 'Blue/green traffic switch',       assigneeId: 'USR-0004', storyPoints: 8, status: 'TODO',        priority: 'HIGH' },
  { id: 'TSK-2013', sprintId: 'SPR-1005', title: 'HTTP client core',                assigneeId: 'USR-0005', storyPoints: 8, status: 'IN_PROGRESS', priority: 'HIGH' },
  { id: 'TSK-2014', sprintId: 'SPR-1005', title: 'Retry with backoff',              assigneeId: 'USR-0005', storyPoints: 3, status: 'TODO',        priority: 'MEDIUM' },
  { id: 'TSK-2015', sprintId: 'SPR-1005', title: 'Typed error surfaces',            assigneeId: 'USR-0007', storyPoints: 5, status: 'DONE',        priority: 'MEDIUM' },
  { id: 'TSK-2016', sprintId: 'SPR-1005', title: 'Publish beta to npm',             assigneeId: 'USR-0004', storyPoints: 1, status: 'TODO',        priority: 'LOW' },
  { id: 'TSK-2017', sprintId: 'SPR-1002', title: 'Google SSO provider',             assigneeId: 'USR-0007', storyPoints: 8, status: 'TODO',        priority: 'MEDIUM' },
  { id: 'TSK-2018', sprintId: 'SPR-1002', title: 'Session refresh tokens',          assigneeId: 'USR-0005', storyPoints: 5, status: 'TODO',        priority: 'LOW' },
  { id: 'TSK-2019', sprintId: 'SPR-1006', title: 'Fan-out queue prototype',         assigneeId: 'USR-0008', storyPoints: 5, status: 'TODO',        priority: 'MEDIUM' },
  { id: 'TSK-2020', sprintId: 'SPR-1006', title: 'Push notification spike',         assigneeId: 'USR-0006', storyPoints: 3, status: 'TODO',        priority: 'LOW' },
]

// ════════════════════════════════════════════════════════════════
//  ENDPOINTS — every function returns a Promise (pages `await`).
//  Each documents its real-backend equivalent: delete the mock body,
//  return the axios call. Signatures never change.
// ════════════════════════════════════════════════════════════════

/**
 * Sign in → { token, user }
 * REAL BACKEND:  const { data } = await http.post('/auth/login', { email, password }); return data
 */
export async function loginRequest({ email, password }) {
  await delay()
  const user = db.users.find((u) => u.email.toLowerCase() === String(email).trim().toLowerCase())
  if (!user || user.password !== password) {
    throw new Error('Invalid email or password.')
  }
  return { token: makeToken(user), user: publicUser(user) }
}

/**
 * Create account → { token, user }
 * `subRole` is only meaningful when role === 'EMPLOYEE'.
 * REAL BACKEND:  const { data } = await http.post('/auth/register', { name, email, password, role, subRole }); return data
 */
export async function registerRequest({ name, email, password, role, subRole = null }) {
  await delay()
  const cleanEmail = String(email).trim().toLowerCase()
  if (!String(name).trim()) throw new Error('Name is required.')
  if (!cleanEmail) throw new Error('Email is required.')
  if (String(password).length < 6) throw new Error('Password must be at least 6 characters.')
  if (!ROLES.includes(role)) throw new Error('Please choose a valid role.')
  if (db.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
    throw new Error('An account with this email already exists.')
  }

  const user = {
    id: `USR-${String(++userSeq).padStart(4, '0')}`,
    name: String(name).trim(),
    email: cleanEmail,
    password,
    role,
    subRole:
      role === 'EMPLOYEE' ? (EMPLOYEE_SUB_ROLES.includes(subRole) ? subRole : 'Developer') : null,
    status: 'active',
    createdAt: new Date().toISOString().slice(0, 10),
  }
  db.users.push(user)
  return { token: makeToken(user), user: publicUser(user) }
}

/**
 * Dashboard numbers → { scope, activeProjects, myProjects, totalUsers, totalTeams }
 * Pass the signed-in user so EMPLOYEE accounts get personal counts.
 * REAL BACKEND:  const { data } = await http.get('/dashboard/stats'); return data
 */
export async function fetchDashboardStats(user) {
  await delay()
  const isEmployee = user?.role === 'EMPLOYEE'
  return {
    scope: isEmployee ? 'personal' : 'organization',
    activeProjects: db.projects.filter((p) => p.status === 'ACTIVE').length,
    myProjects: isEmployee ? db.projects.filter((p) => p.memberIds.includes(user.id)).length : null,
    totalUsers: db.users.length,
    totalTeams: db.teams.length,
  }
}

/**
 * Project list (hydrated with team/lead/member objects).
 * EMPLOYEE accounts only receive projects they are staffed on.
 * REAL BACKEND:  const { data } = await http.get('/projects'); return data
 */
export async function fetchProjects(user) {
  await delay()
  const visible =
    user?.role === 'EMPLOYEE'
      ? db.projects.filter((p) => p.memberIds.includes(user.id))
      : db.projects
  return visible.map(hydrateProject)
}

/**
 * Create a project → hydrated project object.
 * REAL BACKEND:  const { data } = await http.post('/projects', { name, description, teamId, leadId, status, sprint, dueDate, memberIds }); return data
 */
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
  await delay()
  if (!String(name).trim()) throw new Error('Project name is required.')
  if (!teamId) throw new Error('Please choose a team for this project.')

  const project = {
    id: `PRJ-${++projectSeq}`,
    name: String(name).trim(),
    description: String(description).trim(),
    status: PROJECT_STATUSES.includes(status) ? status : 'PLANNING',
    teamId,
    leadId,
    memberIds: [...new Set(memberIds)],
    sprint: String(sprint).trim(),
    dueDate,
    createdAt: new Date().toISOString().slice(0, 10),
  }
  db.projects.unshift(project) // newest first, like the real thing
  return hydrateProject(project)
}

/**
 * Team list (hydrated with lead + member objects).
 * REAL BACKEND:  const { data } = await http.get('/teams'); return data
 */
export async function fetchTeams() {
  await delay()
  return db.teams.map((team) => ({
    ...team,
    lead: db.users.find((u) => u.id === team.leadId)?.name ?? 'Unassigned',
    members: team.memberIds
      .map((id) => db.users.find((u) => u.id === id))
      .filter(Boolean)
      .map(publicUser),
  }))
}

/**
 * Full user directory (ADMIN-only table on the Teams page).
 * REAL BACKEND:  const { data } = await http.get('/users'); return data
 */
export async function fetchUsers() {
  await delay()
  return db.users.map(publicUser)
}

// ════════════════════════════════════════════════════════════════
//  MILESTONE 2 — SPRINTS & TASKS
// ════════════════════════════════════════════════════════════════

/**
 * Sprint list → Sprint[] (hydrated with the project name).
 * Call with no argument for every sprint (Sprints page), or with a
 * projectId to scope it to one project.
 * REAL BACKEND:  const { data } = await http.get('/sprints', { params: projectId ? { projectId } : {} }); return data
 */
export async function fetchSprints(projectId = null) {
  await delay()
  const visible = projectId ? db.sprints.filter((s) => s.projectId === projectId) : db.sprints
  return visible.map(hydrateSprint)
}

/**
 * All tasks in one sprint → Task[] (hydrated with the assignee user object).
 * The board groups them by status client-side; return every status.
 * REAL BACKEND:  const { data } = await http.get(`/sprints/${sprintId}/tasks`); return data
 */
export async function fetchTasksBySprint(sprintId) {
  await delay()
  return db.tasks.filter((t) => t.sprintId === sprintId).map(hydrateTask)
}

/**
 * Create a task in a sprint → hydrated Task.
 * Leadership-only in the UI (ADMIN / PROJECT_LEAD / PROJECT_MANAGER) — the
 * backend must enforce the same rule. `status` presets which board column
 * the task lands in (defaults to TODO).
 * REAL BACKEND:  const { data } = await http.post('/tasks', { sprintId, title, assigneeId, storyPoints, priority, status }); return data
 */
export async function createTask({
  sprintId,
  title,
  assigneeId = null,
  storyPoints = 3,
  priority = 'MEDIUM',
  status = 'TODO',
}) {
  await delay()
  if (!db.sprints.some((s) => s.id === sprintId)) throw new Error('Sprint not found.')
  if (!String(title).trim()) throw new Error('Task title is required.')
  if (!TASK_PRIORITIES.includes(priority)) throw new Error('Please choose a valid priority.')
  if (!TASK_STATUSES.includes(status)) throw new Error('Invalid task status.')
  const points = Number(storyPoints)
  if (!Number.isInteger(points) || points < 1) {
    throw new Error('Story points must be a positive number.')
  }

  const task = {
    id: `TSK-${++taskSeq}`,
    title: String(title).trim(),
    assigneeId: assigneeId || null,
    storyPoints: points,
    status,
    priority,
    sprintId,
  }
  db.tasks.push(task)
  return hydrateTask(task)
}

/**
 * Move a task to another board column → hydrated Task.
 * EMPLOYEEs may only update tasks assigned to them — the backend MUST
 * re-check that per request (hiding the control in the UI is not security).
 * REAL BACKEND:  const { data } = await http.patch(`/tasks/${taskId}/status`, { status: newStatus }); return data
 */
export async function updateTaskStatus(taskId, newStatus) {
  await delay()
  const task = db.tasks.find((t) => t.id === taskId)
  if (!task) throw new Error('Task not found.')
  if (!TASK_STATUSES.includes(newStatus)) throw new Error('Invalid task status.')
  task.status = newStatus
  return hydrateTask(task)
}

/**
 * Pure helper (not an endpoint): true when "today" falls inside the
 * sprint's date range. Used to badge active sprints on the Sprints page
 * and to offer "View board" on project cards.
 */
export function isSprintActive(sprint, today = new Date()) {
  if (!sprint?.startDate || !sprint?.endDate) return false
  const start = new Date(`${sprint.startDate}T00:00:00`)
  const end = new Date(`${sprint.endDate}T23:59:59`)
  return today >= start && today <= end
}



