/**
 * ═══════════════════════════════════════════════════════════════
 *  NeuroForge Nexus — API CLIENT
 *  Milestone 1: Project & User Management (MOCK implementation)
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



