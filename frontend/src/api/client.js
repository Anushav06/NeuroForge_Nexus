

// /**
//  * ═══════════════════════════════════════════════════════════════
//  *  NeuroForge Nexus — UNIFIED DRY RUN CLIENT (TEAM-SYNCED)
//  * ═══════════════════════════════════════════════════════════════
//  *  - Automatically syncs Team rosters & Project counts for Teams.jsx
//  *  - Auto-hydrates Sprints when Projects are created for Sprints.jsx
//  *  - Full simulated JWT auth, RBAC scoping, and Kanban mutations
//  */

// const MOCK_DELAY = 120
// const sleep = (ms = MOCK_DELAY) => new Promise((resolve) => setTimeout(resolve, ms))

// // ── Domain Constants ────────────────────────────────────────────
// export const ROLES = ['ADMIN', 'PROJECT_LEAD', 'PROJECT_MANAGER', 'TEAM_LEAD', 'EMPLOYEE']
// export const EMPLOYEE_SUB_ROLES = ['Developer', 'Tester', 'Junior', 'Senior']
// export const PROJECT_STATUSES = ['PLANNING', 'ACTIVE', 'BLOCKED', 'COMPLETED']
// export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE']
// export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
// export const ROLE_LABELS = {
//   ADMIN: 'Admin',
//   PROJECT_LEAD: 'Project Lead',
//   PROJECT_MANAGER: 'Project Manager',
//   TEAM_LEAD: 'Team Lead',
//   EMPLOYEE: 'Employee',
// }

// export const DEMO_CREDENTIALS = { email: 'admin@neuroforge.dev', password: 'password123' }

// // ── In-Memory Datasets ──────────────────────────────────────────
// let mockUsers = [
//   {
//     id: '6a9bc068625a0a9467b3983b',
//     name: 'Maneesh R',
//     email: 'admin@neuroforge.dev',
//     role: 'ADMIN',
//     subRole: 'Senior',
//     status: 'ACTIVE',
//     createdAt: '2026-08-10',
//   },
//   {
//     id: 'USR-0002',
//     name: 'Mir Mohammed Kazim',
//     email: 'kazim@neuroforge.dev',
//     role: 'PROJECT_LEAD',
//     subRole: 'Senior',
//     status: 'ACTIVE',
//     createdAt: '2026-08-12',
//   },
//   {
//     id: 'USR-0003',
//     name: 'Elena Vasquez',
//     email: 'elena@neuroforge.dev',
//     role: 'EMPLOYEE',
//     subRole: 'Developer',
//     status: 'ACTIVE',
//     createdAt: '2026-08-18',
//   },
//   {
//     id: 'USR-0004',
//     name: 'Marcus Lee',
//     email: 'marcus@neuroforge.dev',
//     role: 'EMPLOYEE',
//     subRole: 'Tester',
//     status: 'ACTIVE',
//     createdAt: '2026-08-20',
//   },
// ]

// let mockTeams = [
//   {
//     id: 'TEAM-001',
//     name: 'Core Infrastructure',
//     description: 'Cloud orchestration, Kafka telemetry, and high-performance microservices.',
//     leadId: '6a9bc068625a0a9467b3983b',
//     memberIds: ['6a9bc068625a0a9467b3983b', 'USR-0002'],
//   },
//   {
//     id: 'TEAM-002',
//     name: 'Product Engineering',
//     description: 'User-facing web platforms, design systems, and responsive client workflows.',
//     leadId: 'USR-0002',
//     memberIds: ['USR-0003', 'USR-0004'],
//   },
// ]

// let mockProjects = [
//   {
//     id: 'PRJ-93E6EA',
//     name: 'NeuroForge Nexus',
//     description: 'Local microservices and distributed workspace platform',
//     teamId: 'TEAM-001',
//     leadId: '6a9bc068625a0a9467b3983b',
//     status: 'ACTIVE',
//     sprint: 'Sprint 1',
//     dueDate: '2026-10-30',
//     memberIds: ['6a9bc068625a0a9467b3983b', 'USR-0002'],
//     createdAt: '2026-09-01',
//   },
//   {
//     id: 'PRJ-88A1B2',
//     name: 'Neural Pipeline Gateway',
//     description: 'Real-time telemetry event streaming and monitoring service',
//     teamId: 'TEAM-001',
//     leadId: '6a9bc068625a0a9467b3983b',
//     status: 'PLANNING',
//     sprint: 'Sprint 1',
//     dueDate: '2026-11-15',
//     memberIds: ['6a9bc068625a0a9467b3983b', 'USR-0003'],
//     createdAt: '2026-09-03',
//   },
//   {
//     id: 'PRJ-77C3D4',
//     name: 'Sentinel Access Shield',
//     description: 'Zero-trust JWT authentication and role-based policy enforcement',
//     teamId: 'TEAM-002',
//     leadId: 'USR-0002',
//     status: 'COMPLETED',
//     sprint: 'Sprint 12',
//     dueDate: '2026-08-30',
//     memberIds: ['USR-0002', 'USR-0003'],
//     createdAt: '2026-08-15',
//   },
//   {
//     id: 'PRJ-66E5F6',
//     name: 'Data Synapse Engine',
//     description: 'Low-latency analytics indexing and caching cluster',
//     teamId: 'TEAM-002',
//     leadId: 'USR-0002',
//     status: 'BLOCKED',
//     sprint: 'Sprint 3',
//     dueDate: '2026-12-01',
//     memberIds: ['USR-0003', 'USR-0004'],
//     createdAt: '2026-09-04',
//   },
// ]

// let mockSprints = [
//   {
//     id: '6a9bc6858a17bee1a6647174',
//     projectId: 'PRJ-93E6EA',
//     name: 'Sprint 1 - Foundation & Kafka Pipeline',
//     goal: 'Establish Kafka pipelines and core task workflows',
//     startDate: '2026-09-01',
//     endDate: '2026-09-15',
//     status: 'ACTIVE',
//   },
//   {
//     id: 'SPR-1002',
//     projectId: 'PRJ-88A1B2',
//     name: 'Sprint 1 - Gateway Ingestion',
//     goal: 'Configure WebSocket feeds and event schemas',
//     startDate: '2026-09-05',
//     endDate: '2026-09-20',
//     status: 'ACTIVE',
//   },
// ]

// let mockTasks = [
//   {
//     id: '6a9bc6c58a17bee1a6647175',
//     projectId: 'PRJ-93E6EA',
//     sprintId: '6a9bc6858a17bee1a6647174',
//     title: 'Integrate Kafka Broker & Task Events',
//     assigneeId: '6a9bc068625a0a9467b3983b',
//     assignedTo: '6a9bc068625a0a9467b3983b',
//     status: 'IN_PROGRESS',
//     priority: 'HIGH',
//     storyPoints: 5,
//   },
//   {
//     id: 'TSK-1002',
//     projectId: 'PRJ-93E6EA',
//     sprintId: '6a9bc6858a17bee1a6647174',
//     title: 'Wire up SprintBoard Kanban Status Controls',
//     assigneeId: 'USR-0002',
//     assignedTo: 'USR-0002',
//     status: 'TODO',
//     priority: 'MEDIUM',
//     storyPoints: 3,
//   },
//   {
//     id: 'TSK-1003',
//     projectId: 'PRJ-93E6EA',
//     sprintId: '6a9bc6858a17bee1a6647174',
//     title: 'Configure JWT Auth Filter in Spring Boot',
//     assigneeId: '6a9bc068625a0a9467b3983b',
//     assignedTo: '6a9bc068625a0a9467b3983b',
//     status: 'DONE',
//     priority: 'URGENT',
//     storyPoints: 5,
//   },
//   {
//     id: 'TSK-2001',
//     projectId: 'PRJ-88A1B2',
//     sprintId: 'SPR-1002',
//     title: 'Design Event Telemetry Protocol',
//     assigneeId: 'USR-0003',
//     assignedTo: 'USR-0003',
//     status: 'DONE',
//     priority: 'HIGH',
//     storyPoints: 8,
//   },
// ]

// let mockSeq = 9000

// // ── Hydration Helpers ───────────────────────────────────────────
// const hydrateSprint = (sprint) => {
//   const proj = mockProjects.find((p) => p.id === sprint.projectId)
//   const team = proj ? mockTeams.find((t) => t.id === proj.teamId) : null
//   return {
//     ...sprint,
//     project: proj ? (team ? `${proj.name} (${team.name})` : proj.name) : sprint.projectId || 'NeuroForge Nexus',
//     teamName: team ? team.name : 'Unassigned Team',
//   }
// }

// const hydrateTask = (task) => {
//   const assigneeId = task.assigneeId || task.assignedTo
//   const assigneeObj = mockUsers.find((u) => u.id === assigneeId)
//   return {
//     ...task,
//     assigneeId,
//     assignedTo: assigneeId,
//     assignee: assigneeObj || (assigneeId ? { id: assigneeId, name: assigneeId } : null),
//   }
// }

// const hydrateProject = (project) => {
//   const teamObj = mockTeams.find((t) => t.id === project.teamId)
//   const leadObj = mockUsers.find((u) => u.id === project.leadId)
//   const memberList = (project.memberIds || []).map(
//     (id) => mockUsers.find((u) => u.id === id) || { id, name: id, role: 'EMPLOYEE' }
//   )
//   return {
//     ...project,
//     team: teamObj ? teamObj.name : project.team || 'Unassigned',
//     lead: leadObj ? leadObj.name : project.lead || 'Unassigned',
//     members: memberList,
//   }
// }

// const hydrateTeam = (team) => {
//   const leadObj = mockUsers.find((u) => u.id === team.leadId)
//   const memberList = (team.memberIds || []).map(
//     (id) => mockUsers.find((u) => u.id === id) || { id, name: id, role: 'EMPLOYEE' }
//   )
//   return {
//     ...team,
//     lead: leadObj ? leadObj.name : 'Unassigned',
//     members: memberList,
//   }
// }

// /* ==================== AUTHENTICATION & USERS ==================== */

// export async function loginRequest({ email, password }) {
//   await sleep()
//   const user = mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase()) || mockUsers[0]
//   const mockToken = `dry-run-jwt-token-${Date.now()}`
//   sessionStorage.setItem('nf_token', mockToken)
//   sessionStorage.setItem('nf_user', JSON.stringify(user))
//   return { token: mockToken, user }
// }

// export async function registerRequest({ name, email, password, role, subRole = null }) {
//   await sleep()
//   const newUser = {
//     id: `USR-${++mockSeq}`,
//     name,
//     email,
//     role: role || 'EMPLOYEE',
//     subRole: role === 'EMPLOYEE' ? subRole || 'Developer' : null,
//     status: 'ACTIVE',
//     createdAt: new Date().toISOString().split('T')[0],
//   }
//   mockUsers.push(newUser)
//   const mockToken = `dry-run-jwt-token-${Date.now()}`
//   sessionStorage.setItem('nf_token', mockToken)
//   sessionStorage.setItem('nf_user', JSON.stringify(newUser))
//   return { token: mockToken, user: newUser }
// }

// export async function fetchUsers() {
//   await sleep()
//   return [...mockUsers]
// }

// /* ==================== DASHBOARD & STATS ==================== */

// export async function fetchDashboardStats(user) {
//   await sleep()
//   const isEmployee = user?.role === 'EMPLOYEE'
//   const myProjectsCount = mockProjects.filter(
//     (p) => Array.isArray(p.memberIds) && p.memberIds.includes(user?.id)
//   ).length

//   return {
//     scope: isEmployee ? 'personal' : 'organization',
//     activeProjects: mockProjects.filter((p) => p.status === 'ACTIVE').length,
//     myProjects: myProjectsCount,
//     totalUsers: mockUsers.length,
//     totalTeams: mockTeams.length,
//   }
// }

// /* ==================== TEAMS ==================== */

// export async function fetchTeams() {
//   await sleep()
//   return mockTeams.map(hydrateTeam)
// }

// /* ==================== PROJECTS ==================== */

// export async function fetchProjects(user = null) {
//   await sleep()
//   const isEmployee = user?.role === 'EMPLOYEE'
//   const visible = isEmployee
//     ? mockProjects.filter((p) => Array.isArray(p.memberIds) && p.memberIds.includes(user.id))
//     : mockProjects

//   return visible.map(hydrateProject)
// }

// export async function createProject(projectData) {
//   await sleep()
//   const newProjectId = `PRJ-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

//   const newProject = {
//     id: newProjectId,
//     status: 'PLANNING',
//     memberIds: [],
//     ...projectData,
//     createdAt: new Date().toISOString().split('T')[0],
//   }

//   mockProjects.unshift(newProject)

//   // 1. Synchronize project members & lead with the selected Team
//   if (projectData.teamId) {
//     const targetTeam = mockTeams.find((t) => t.id === projectData.teamId)
//     if (targetTeam) {
//       const allMembers = new Set([...(targetTeam.memberIds || []), ...(projectData.memberIds || [])])
//       if (projectData.leadId) allMembers.add(projectData.leadId)
//       targetTeam.memberIds = Array.from(allMembers)
//     }
//   }

//   // 2. Auto-generate linked Sprint for Sprints.jsx
//   if (projectData.sprint && String(projectData.sprint).trim()) {
//     const today = new Date().toISOString().split('T')[0]
//     const twoWeeksLater = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

//     const newSprint = {
//       id: `SPR-${++mockSeq}`,
//       projectId: newProjectId,
//       name: String(projectData.sprint).trim(),
//       goal: projectData.description || `Initial sprint for ${projectData.name}`,
//       startDate: today,
//       endDate: projectData.dueDate || twoWeeksLater,
//       status: 'ACTIVE',
//     }
//     mockSprints.unshift(newSprint)
//   }

//   return hydrateProject(newProject)
// }

// /* ==================== SPRINTS ==================== */

// export async function fetchSprints(projectId = null) {
//   await sleep()
//   const visible = projectId ? mockSprints.filter((s) => s.projectId === projectId) : mockSprints
//   return visible.map(hydrateSprint)
// }

// export async function createSprint(projectId, sprintData) {
//   await sleep()
//   const newSprint = {
//     id: `SPR-${++mockSeq}`,
//     projectId,
//     status: 'PLANNED',
//     ...sprintData,
//   }
//   mockSprints.push(newSprint)
//   return hydrateSprint(newSprint)
// }

// export function isSprintActive(sprint, today = new Date()) {
//   if (!sprint?.startDate || !sprint?.endDate) return true
//   const start = new Date(`${sprint.startDate}T00:00:00`)
//   const end = new Date(`${sprint.endDate}T23:59:59`)
//   return today >= start && today <= end
// }

// /* ==================== TASKS ==================== */

// export async function fetchTasks(projectId = null) {
//   await sleep()
//   const list = projectId ? mockTasks.filter((t) => t.projectId === projectId) : mockTasks
//   return list.map(hydrateTask)
// }

// export async function fetchTasksBySprint(sprintId, projectId = null) {
//   await sleep()
//   const list = mockTasks.filter((t) => {
//     const matchSprint = sprintId ? t.sprintId === sprintId : true
//     const matchProj = projectId ? t.projectId === projectId : true
//     return matchSprint && matchProj
//   })
//   return list.map(hydrateTask)
// }

// export async function createTask({
//   sprintId,
//   projectId = 'PRJ-93E6EA',
//   title,
//   assigneeId = null,
//   assignedTo = null,
//   storyPoints = 3,
//   priority = 'MEDIUM',
//   status = 'TODO',
//   description = '',
// }) {
//   await sleep()
//   if (!String(title).trim()) throw new Error('Task title is required.')
//   if (!TASK_PRIORITIES.includes(priority)) throw new Error('Please choose a valid priority.')
//   if (!TASK_STATUSES.includes(status)) throw new Error('Invalid task status.')

//   const points = Number(storyPoints)
//   if (!Number.isInteger(points) || points < 1) {
//     throw new Error('Story points must be a positive integer.')
//   }

//   const effectiveSprintId = sprintId || '6a9bc6858a17bee1a6647174'
//   const effectiveAssignee = assigneeId || assignedTo || mockUsers[0].id

//   const task = {
//     id: `TSK-${++mockSeq}`,
//     sprintId: effectiveSprintId,
//     projectId,
//     title: String(title).trim(),
//     description,
//     assigneeId: effectiveAssignee,
//     assignedTo: effectiveAssignee,
//     storyPoints: points,
//     status,
//     priority,
//   }

//   mockTasks.push(task)
//   return hydrateTask(task)
// }

// export async function updateTask(projectId, taskId, updatedData) {
//   await sleep()
//   const index = mockTasks.findIndex((t) => t.id === taskId)
//   if (index === -1) throw new Error('Task not found.')
//   mockTasks[index] = { ...mockTasks[index], ...updatedData }
//   return hydrateTask(mockTasks[index])
// }

// export async function updateTaskStatus(taskId, newStatus, projectId = 'PRJ-93E6EA', existingTask = {}) {
//   await sleep()
//   const index = mockTasks.findIndex((t) => t.id === taskId)
//   if (index === -1) throw new Error('Task not found.')
//   if (!TASK_STATUSES.includes(newStatus)) throw new Error('Invalid task status.')

//   mockTasks[index] = { ...mockTasks[index], ...existingTask, status: newStatus }
//   return hydrateTask(mockTasks[index])
// }

// export async function deleteTask(taskId, projectId = 'PRJ-93E6EA') {
//   await sleep()
//   mockTasks = mockTasks.filter((t) => t.id !== taskId)
//   return { message: 'Task deleted successfully' }
// }

// /* ==================== SPRINT METRICS ==================== */

// export async function fetchSprintVelocity(projectId = 'PRJ-93E6EA', sprintId = '6a9bc6858a17bee1a6647174') {
//   await sleep()
//   const sprintTasks = mockTasks.filter((t) => t.sprintId === sprintId)
//   const velocity = sprintTasks
//     .filter((t) => t.status === 'DONE')
//     .reduce((acc, curr) => acc + (curr.storyPoints || 0), 0)
//   return { projectId, sprintId, velocity }
// }

// export async function fetchSprintBurndown(projectId = 'PRJ-93E6EA', sprintId = '6a9bc6858a17bee1a6647174') {
//   await sleep()
//   const sprintTasks = mockTasks.filter((t) => t.sprintId === sprintId)
//   const total = sprintTasks.reduce((acc, curr) => acc + (curr.storyPoints || 0), 0)
//   const completed = sprintTasks
//     .filter((t) => t.status === 'DONE')
//     .reduce((acc, curr) => acc + (curr.storyPoints || 0), 0)
//   return {
//     projectId,
//     sprintId,
//     totalStoryPoints: total,
//     completedStoryPoints: completed,
//     remainingStoryPoints: total - completed,
//     completionPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
//   }
// }






/**
 * NeuroForge Nexus - API Client & Constants
 * Base URL: http://localhost:8081
 */







/**
 * NeuroForge Nexus - API Client, Constants & Utilities
 * Base URL: http://localhost:8081
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8081';

// =========================================================
// CONSTANTS & ENUMS
// =========================================================

export const USER_ROLES = [
  'ADMIN',
  'PROJECT_MANAGER',
  'PROJECT_LEAD',
  'DEVELOPER',
  'DESIGNER',
  'QA',
  'EMPLOYEE',
];

// ROLES is an array for .map() in UI forms, with static keys for object lookups (e.g. ROLES.ADMIN)
export const ROLES = [
  'ADMIN',
  'PROJECT_MANAGER',
  'PROJECT_LEAD',
  'DEVELOPER',
  'DESIGNER',
  'QA',
  'EMPLOYEE',
];

ROLES.ADMIN = 'ADMIN';
ROLES.PROJECT_MANAGER = 'PROJECT_MANAGER';
ROLES.PROJECT_LEAD = 'PROJECT_LEAD';
ROLES.DEVELOPER = 'DEVELOPER';
ROLES.DESIGNER = 'DESIGNER';
ROLES.QA = 'QA';
ROLES.EMPLOYEE = 'EMPLOYEE';

export const EMPLOYEE_SUB_ROLES = [
  'FRONTEND_DEVELOPER',
  'BACKEND_DEVELOPER',
  'FULLSTACK_DEVELOPER',
  'DEVOPS_ENGINEER',
  'UI_UX_DESIGNER',
  'QA_TESTER',
  'DATA_ENGINEER',
  'SCRUM_MASTER',
];

export const ROLE_LABELS = {
  ADMIN: 'Administrator',
  PROJECT_MANAGER: 'Project Manager',
  PROJECT_LEAD: 'Project Lead',
  DEVELOPER: 'Developer',
  DESIGNER: 'UI/UX Designer',
  QA: 'QA Engineer',
  EMPLOYEE: 'Team Member',
};

export const SUB_ROLE_LABELS = {
  FRONTEND_DEVELOPER: 'Frontend Developer',
  BACKEND_DEVELOPER: 'Backend Developer',
  FULLSTACK_DEVELOPER: 'Full Stack Developer',
  DEVOPS_ENGINEER: 'DevOps Engineer',
  UI_UX_DESIGNER: 'UI/UX Designer',
  QA_TESTER: 'QA Tester',
  DATA_ENGINEER: 'Data Engineer',
  SCRUM_MASTER: 'Scrum Master',
};

export const PROJECT_STATUSES = [
  'PLANNING',
  'ACTIVE',
  'ON_HOLD',
  'COMPLETED',
  'ARCHIVED',
];

export const STATUS_LABELS = {
  PLANNING: 'Planning',
  ACTIVE: 'Active',
  ON_HOLD: 'On Hold',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  BLOCKED: 'Blocked',
  DONE: 'Done',
};

export const TASK_STATUSES = [
  'TODO',
  'IN_PROGRESS',
  'IN_REVIEW',
  'BLOCKED',
  'DONE',
];

export const TASK_PRIORITIES = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
];

export const PRIORITY_LABELS = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export const SPRINT_STATUSES = [
  'PLANNED',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
];

// =========================================================
// HELPER UTILITY FUNCTIONS
// =========================================================

// Defensive ID extractor for both string IDs and MongoDB objects { id, _id }
export const extractId = (val) => {
  if (!val) return null;
  if (typeof val === 'object') {
    return val.id || val._id || null;
  }
  const str = String(val).trim();
  return str === 'undefined' || str === 'null' || str === '' ? null : str;
};

export const isSprintActive = (sprint) => {
  if (!sprint) return false;
  if (typeof sprint === 'string') {
    return sprint.toUpperCase() === 'ACTIVE';
  }
  if (sprint.status) {
    return sprint.status.toUpperCase() === 'ACTIVE';
  }
  if (sprint.startDate && sprint.endDate) {
    const now = new Date();
    const start = new Date(sprint.startDate);
    const end = new Date(sprint.endDate);
    return now >= start && now <= end;
  }
  return false;
};

export const calculateSprintProgress = (tasks = []) => {
  if (!tasks || tasks.length === 0) return 0;
  const doneTasks = tasks.filter((t) => t.status === 'DONE');
  return Math.round((doneTasks.length / tasks.length) * 100);
};

export const formatStatus = (status) => {
  if (!status) return '';
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
};

// =========================================================
// CORE FETCH WRAPPER
// =========================================================

export async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (response.status === 204) {
      return null;
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage =
        data?.message ||
        data?.error ||
        `Request to ${endpoint} failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    return data;
  } catch (error) {
    console.error(`[API Error] ${options.method || 'GET'} ${endpoint}:`, error.message);
    throw error;
  }
}

// =========================================================
// 1. AUTHENTICATION
// =========================================================

export const loginRequest = (credentials) =>
  request('/auth/login', {
    method: 'POST',
    body: credentials,
  });

export const registerRequest = (userData) =>
  request('/auth/register', {
    method: 'POST',
    body: userData,
  });

export const logoutRequest = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
};

export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
  try {
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

export const authApi = {
  login: loginRequest,
  register: registerRequest,
  logout: logoutRequest,
  getCurrentUser,
};

// =========================================================
// 2. DASHBOARD & STATS
// =========================================================

export const fetchDashboardStats = () => request('/dashboard/stats');
export const getDashboardStats = fetchDashboardStats;

export const dashboardApi = {
  getStats: fetchDashboardStats,
  fetchDashboardStats,
};

// =========================================================
// 3. USERS
// =========================================================

export const fetchUsers = () => request('/users');
export const getUsers = fetchUsers;
export const getAllUsers = fetchUsers;

export const userApi = {
  getAllUsers: fetchUsers,
  getUsers: fetchUsers,
  fetchUsers,
};

// =========================================================
// 4. TEAMS
// =========================================================

export const fetchTeams = () => request('/teams');
export const getTeams = fetchTeams;

export const fetchTeamById = (id) => {
  const tId = extractId(id);
  if (!tId) return Promise.resolve(null);
  return request(`/teams/${tId}`);
};
export const getTeamById = fetchTeamById;

export const createTeam = (teamData) =>
  request('/teams', {
    method: 'POST',
    body: teamData,
  });

export const teamApi = {
  getTeams: fetchTeams,
  fetchTeams,
  getTeamById: fetchTeamById,
  fetchTeamById,
  createTeam,
};

// =========================================================
// 5. PROJECTS
// =========================================================

export const fetchProjects = () => request('/projects');
export const getProjects = fetchProjects;

export const fetchProjectById = (id) => {
  const pId = extractId(id);
  if (!pId) return Promise.resolve(null);
  return request(`/projects/${pId}`);
};
export const getProjectById = fetchProjectById;

export const createProject = (projectData) =>
  request('/projects', {
    method: 'POST',
    body: projectData,
  });

export const updateProject = (id, projectData) => {
  const pId = extractId(id);
  if (!pId) return Promise.reject(new Error('Project ID is required.'));
  return request(`/projects/${pId}`, {
    method: 'PUT',
    body: projectData,
  });
};

export const deleteProject = (id) => {
  const pId = extractId(id);
  if (!pId) return Promise.reject(new Error('Project ID is required.'));
  return request(`/projects/${pId}`, {
    method: 'DELETE',
  });
};

export const projectApi = {
  getProjects: fetchProjects,
  fetchProjects,
  getProjectById: fetchProjectById,
  fetchProjectById,
  createProject,
  updateProject,
  deleteProject,
};

// =========================================================
// 6. SPRINTS (Flexible ID & Single/Double Argument Support)
// =========================================================

export const fetchSprints = (projectId) => {
  const pId = extractId(projectId);
  if (!pId) return Promise.resolve([]);
  return request(`/projects/${pId}/sprints`);
};
export const getSprints = fetchSprints;

export const fetchSprintById = async (arg1, arg2) => {
  const id1 = extractId(arg1);
  const id2 = extractId(arg2);

  // If called with two args: (projectId, sprintId)
  if (id1 && id2) {
    return request(`/projects/${id1}/sprints/${id2}`);
  }

  // If called with a single arg (just sprintId), we query all projects or use direct lookup
  if (id1 && !id2) {
    try {
      // Try direct sprint endpoint if available, or search across projects
      const projects = await request('/projects').catch(() => []);
      for (const p of projects) {
        const pId = p.id || p._id;
        try {
          const sprints = await request(`/projects/${pId}/sprints`);
          const found = (sprints || []).find(s => (s.id || s._id) === id1);
          if (found) return found;
        } catch {
          // continue searching
        }
      }
    } catch {
      // fallback
    }
  }
  return null;
};
export const getSprintById = fetchSprintById;

export const createSprint = (projectId, sprintData) => {
  const pId = extractId(projectId);
  if (!pId) return Promise.reject(new Error('Project ID is required to create a sprint.'));
  return request(`/projects/${pId}/sprints`, {
    method: 'POST',
    body: sprintData,
  });
};

export const updateSprint = (projectId, sprintId, sprintData) => {
  const pId = extractId(projectId);
  const sId = extractId(sprintId);
  if (!pId || !sId) return Promise.reject(new Error('Project ID and Sprint ID are required.'));
  return request(`/projects/${pId}/sprints/${sId}`, {
    method: 'PUT',
    body: sprintData,
  });
};

export const deleteSprint = (projectId, sprintId) => {
  const pId = extractId(projectId);
  const sId = extractId(sprintId);
  if (!pId || !sId) return Promise.reject(new Error('Project ID and Sprint ID are required.'));
  return request(`/projects/${pId}/sprints/${sId}`, {
    method: 'DELETE',
  });
};

export const sprintApi = {
  getSprints: fetchSprints,
  fetchSprints,
  getSprintById: fetchSprintById,
  fetchSprintById,
  createSprint,
  updateSprint,
  deleteSprint,
};
// =========================================================
// 7. TASKS & KANBAN (Defensive against undefined IDs)
// =========================================================

export const fetchTasksByProject = (projectId) => {
  const pId = extractId(projectId);
  if (!pId) return Promise.resolve([]);
  return request(`/projects/${pId}/tasks`);
};
export const getTasksByProject = fetchTasksByProject;

export const fetchTasksBySprint = (projectId, sprintId) => {
  const pId = extractId(projectId);
  const sId = extractId(sprintId);
  if (!pId || !sId) return Promise.resolve([]);
  return request(`/projects/${pId}/tasks/sprint/${sId}`);
};
export const getTasksBySprint = fetchTasksBySprint;

export const fetchTaskById = (projectId, taskId) => {
  const pId = extractId(projectId);
  const tId = extractId(taskId);
  if (!pId || !tId) return Promise.resolve(null);
  return request(`/projects/${pId}/tasks/${tId}`);
};
export const getTaskById = fetchTaskById;

export const fetchSubtasks = (projectId, taskId) => {
  const pId = extractId(projectId);
  const tId = extractId(taskId);
  if (!pId || !tId) return Promise.resolve([]);
  return request(`/projects/${pId}/tasks/${tId}/subtasks`);
};
export const getSubtasks = fetchSubtasks;

export const createTask = (projectId, taskData) => {
  const pId = extractId(projectId);
  if (!pId) return Promise.reject(new Error('Project ID is required to create a task.'));
  return request(`/projects/${pId}/tasks`, {
    method: 'POST',
    body: taskData,
  });
};

export const updateTask = (projectId, taskId, taskData) => {
  const pId = extractId(projectId);
  const tId = extractId(taskId);
  if (!pId || !tId) return Promise.reject(new Error('Project ID and Task ID are required.'));
  return request(`/projects/${pId}/tasks/${tId}`, {
    method: 'PUT',
    body: taskData,
  });
};

/**
 * Handles status and progress mutations during Kanban drag-and-drop actions.
 */
export const updateTaskStatus = (projectId, taskId, statusOrData, maybeProgress) => {
  const pId = extractId(projectId);
  const tId = extractId(taskId);
  if (!pId || !tId) return Promise.reject(new Error('Project ID and Task ID are required.'));

  const payload =
    typeof statusOrData === 'object' && statusOrData !== null
      ? statusOrData
      : {
          status: statusOrData,
          ...(maybeProgress !== undefined ? { progress: maybeProgress } : {}),
        };

  return updateTask(pId, tId, payload);
};

export const deleteTask = (projectId, taskId) => {
  const pId = extractId(projectId);
  const tId = extractId(taskId);
  if (!pId || !tId) return Promise.reject(new Error('Project ID and Task ID are required.'));
  return request(`/projects/${pId}/tasks/${tId}`, {
    method: 'DELETE',
  });
};

export const fetchSprintVelocity = (projectId, sprintId) => {
  const pId = extractId(projectId);
  const sId = extractId(sprintId);
  if (!pId || !sId) return Promise.resolve(null);
  return request(`/projects/${pId}/tasks/sprint/${sId}/velocity`);
};
export const getSprintVelocity = fetchSprintVelocity;

export const fetchSprintBurndown = (projectId, sprintId) => {
  const pId = extractId(projectId);
  const sId = extractId(sprintId);
  if (!pId || !sId) return Promise.resolve([]);
  return request(`/projects/${pId}/tasks/sprint/${sId}/burndown`);
};
export const getSprintBurndown = fetchSprintBurndown;

export const taskApi = {
  getTasksByProject: fetchTasksByProject,
  fetchTasksByProject,
  getTasksBySprint: fetchTasksBySprint,
  fetchTasksBySprint,
  getTaskById: fetchTaskById,
  fetchTaskById,
  getSubtasks: fetchSubtasks,
  fetchSubtasks,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getSprintVelocity: fetchSprintVelocity,
  fetchSprintVelocity,
  getSprintBurndown: fetchSprintBurndown,
  fetchSprintBurndown,
};

// =========================================================
// DEFAULT BUNDLED EXPORT
// =========================================================

const client = {
  USER_ROLES,
  EMPLOYEE_SUB_ROLES,
  ROLES,
  ROLE_LABELS,
  SUB_ROLE_LABELS,
  PROJECT_STATUSES,
  STATUS_LABELS,
  TASK_STATUSES,
  TASK_PRIORITIES,
  PRIORITY_LABELS,
  SPRINT_STATUSES,
  extractId,
  isSprintActive,
  calculateSprintProgress,
  formatStatus,
  request,
  auth: authApi,
  dashboard: dashboardApi,
  user: userApi,
  team: teamApi,
  project: projectApi,
  sprint: sprintApi,
  task: taskApi,
};

export default client;