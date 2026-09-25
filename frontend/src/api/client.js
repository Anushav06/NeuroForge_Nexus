/**
 * NeuroForge Nexus - API Client, Constants & Utilities
 * Base URL: http://localhost:8081
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8081';
const CICD_API_BASE_URL = import.meta.env.VITE_CICD_API_URL || 'http://localhost:8083';

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

/**
 * Shared fetch core used by request() (user-service) and requestCicd()
 * (cicd-service). Attaches the stored JWT and normalizes errors into
 * thrown Error objects with the backend's `message` field when present.
 */
async function apiFetch(baseUrl, endpoint, options = {}) {
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
    const response = await fetch(`${baseUrl}${endpoint}`, config);

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

/** user-service (port 8081). */
export async function request(endpoint, options = {}) {
  return apiFetch(API_BASE_URL, endpoint, options);
}

/** cicd-service (port 8083) — same JWT, same error contract. */
export async function requestCicd(endpoint, options = {}) {
  return apiFetch(CICD_API_BASE_URL, endpoint, options);
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

export const updateTeam = (id, teamData) => {
  const tId = extractId(id);
  if (!tId) return Promise.reject(new Error('Team ID is required.'));
  return request(`/teams/${tId}`, {
    method: 'PUT',
    body: teamData,
  });
};

export const deleteTeam = (id) => {
  const tId = extractId(id);
  if (!tId) return Promise.reject(new Error('Team ID is required.'));
  return request(`/teams/${tId}`, {
    method: 'DELETE',
  });
};

export const teamApi = {
  getTeams: fetchTeams,
  fetchTeams,
  getTeamById: fetchTeamById,
  fetchTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
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
// 8. CI/CD PIPELINES — MILESTONE 3 (LIVE cicd-service)
// =========================================================
// The Pipelines page (Pipelines.jsx) consumes three functions:
//   fetchPipelines(projectId)     → recent builds for the project (UI shape)
//   fetchPipelineStats(projectId) → { buildsToday, successRatePercent, avgDeploySeconds }
//   triggerRollback(buildId)      → rolls back the deployment for that build
//
// Real endpoints (cicd-service, port 8083, VITE_CICD_API_URL):
//   GET  /projects/{projectId}/pipelines           → Pipeline[]
//   GET  /pipelines/{pipelineId}/builds?page&size  → Page<Build>  (use .content)
//   GET  /projects/{projectId}/cicd/stats          → { buildsPerDay, successRate, avgDeployMinutes, ... }
//   GET  /projects/{projectId}/deployments         → Deployment[] (buildId links deployment → build)
//   POST /deployments/{deploymentId}/rollback      body { rollbackReason }
//
// Responses are mapped into the historical mock shapes so Pipelines.jsx needs
// no changes. The original in-memory mock generators are kept below, renamed
// with a `mock` prefix; set USE_MOCK_PIPELINES = true to fall back to them
// (useful for UI work while cicd-service is down).

// Flip to true to serve the Pipelines page from the mock generators below.
const USE_MOCK_PIPELINES = false;

// ── cicd-service → UI shape mapping helpers ─────────────────
// The UI stage tracker knows PASSED / FAILED / PENDING; the backend uses
// QUEUED / RUNNING / SUCCESS / FAILED / CANCELLED.
const toUiStageStatus = (status) => {
  if (status === 'SUCCESS') return 'PASSED';
  if (status === 'FAILED') return 'FAILED';
  return 'PENDING';
};

const mapBuildForUi = (build) => ({
  id: build?.id,
  pipelineId: build?.pipelineId,
  projectId: build?.projectId,
  buildNumber: build?.buildNumber,
  branch: build?.branch ?? 'unknown',
  // Backend sends the full commit SHA; the UI shows the short 7-char hash.
  commitHash: String(build?.commitSha ?? '').slice(0, 7),
  commitMessage: build?.commitMessage ?? '',
  triggeredBy: build?.triggeredBy ?? 'unknown',
  status: build?.status ?? 'QUEUED',
  startedAt: build?.startedAt ?? null,
  durationSeconds: build?.durationSeconds ?? 0,
  stages: (build?.stages ?? []).map((stage) => ({
    name: stage?.name ?? 'unknown',
    status: toUiStageStatus(stage?.status),
  })),
});

// Spring Page<T> responses arrive as { content: [...] }; plain lists as [...].
const asArray = (data) => {
  if (Array.isArray(data)) return data;
  return data?.content ?? [];
};

// Deployments only power the ACTIVE-DEPLOYMENT hint and rollback lookups, so
// a failure here degrades gracefully instead of failing the page.
const loadProjectDeployments = async (pId) => {
  try {
    return asArray(await requestCicd(`/projects/${pId}/deployments`));
  } catch {
    return [];
  }
};

// Remembers which project each build belongs to for this session, so
// triggerRollback(build.id) can locate the matching deployment later without
// the page having to pass extra context.
const buildProjectIndex = new Map();

export async function fetchPipelines(projectId) {
  const pId = extractId(projectId);
  if (!pId) return [];
  if (USE_MOCK_PIPELINES) return mockFetchPipelines(pId);

  const pipelines = asArray(await requestCicd(`/projects/${pId}/pipelines`));

  // Build history for every pipeline of the project, in parallel. A single
  // pipeline failing to return builds must not break the whole page.
  const buildLists = await Promise.all(
    pipelines.map((pipeline) => {
      const pipelineId = extractId(pipeline);
      if (!pipelineId) return Promise.resolve([]);
      return requestCicd(`/pipelines/${pipelineId}/builds?page=0&size=20`)
        .then(asArray)
        .catch(() => []);
    }),
  );

  const deployments = await loadProjectDeployments(pId);
  const activeBuildIds = new Set(
    deployments
      .filter((d) => d?.status === 'DEPLOYED')
      .map((d) => extractId(d?.buildId))
      .filter(Boolean),
  );

  return buildLists
    .flat()
    .map((build) => {
      const bId = extractId(build?.id);
      if (bId) buildProjectIndex.set(bId, pId);
      return {
        ...mapBuildForUi(build),
        isActiveDeployment: activeBuildIds.has(bId),
      };
    })
    .sort((a, b) => new Date(b.startedAt ?? 0) - new Date(a.startedAt ?? 0));
}

export async function fetchPipelineStats(projectId) {
  const pId = extractId(projectId);
  if (!pId) return { buildsToday: 0, successRatePercent: 0, avgDeploySeconds: 0 };
  if (USE_MOCK_PIPELINES) return mockFetchPipelineStats(pId);

  try {
    // { buildsPerDay, successRate, avgDeployMinutes, deployTrendPercent }
    const stats = await requestCicd(`/projects/${pId}/cicd/stats`);
    return {
      buildsToday: Number(stats?.buildsPerDay) || 0,
      successRatePercent: Math.round(Number(stats?.successRate) || 0),
      avgDeploySeconds: Math.round((Number(stats?.avgDeployMinutes) || 0) * 60),
    };
  } catch {
    // Stats are secondary — render zeros rather than failing the page.
    return { buildsToday: 0, successRatePercent: 0, avgDeploySeconds: 0 };
  }
}

export async function triggerRollback(buildOrId, maybeProjectId) {
  const bId = extractId(buildOrId);
  if (!bId) throw new Error('Build ID is required for rollback.');
  if (USE_MOCK_PIPELINES) return mockTriggerRollback(bId);

  // The page passes only build.id; resolve its project from the index
  // (populated by fetchPipelines) or from an explicitly passed project.
  const pId = extractId(maybeProjectId) || buildProjectIndex.get(bId);
  if (!pId) {
    throw new Error(
      'Cannot resolve the project for this build — reload the Pipelines page and try again.',
    );
  }

  const deployments = await loadProjectDeployments(pId);
  const forBuild = deployments.filter((d) => extractId(d?.buildId) === bId);
  if (forBuild.length === 0) {
    throw new Error('This build has never been deployed, so there is no deployment to roll back.');
  }

  // Roll back the live deployment if there is one, else the latest record.
  const target =
    forBuild.find((d) => d?.status === 'DEPLOYED') ||
    forBuild.find((d) => d?.status === 'IN_PROGRESS') ||
    forBuild[0];

  const dId = extractId(target?.id);
  if (!dId) throw new Error('Deployment record for this build has no ID.');

  await requestCicd(`/deployments/${dId}/rollback`, {
    method: 'POST',
    body: {
      rollbackReason: `Manual rollback to build ${bId} from the Pipelines page`,
    },
  });

  return {
    id: bId,
    isActiveDeployment: true,
    message: `Rollback of build ${bId} requested.`,
  };
}

const PIPELINE_MOCK_DELAY = 150;
const pipelineSleep = (ms = PIPELINE_MOCK_DELAY) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const PIPELINE_STAGES = ["Build", "Test", "Sonar", "Docker", "Deploy"];
export const BUILD_STATUSES = ["SUCCESS", "FAILED", "RUNNING"];

// Independent in-memory dataset (resets on page refresh, like the old mocks).
let mockPipelines = [];

// ── Deterministic PRNG helpers ──────────────────────────────
// Seeding from the projectId keeps every project's demo build history stable
// across re-fetches within a session.
const hashSeed = (str) => {
  let h = 2166136261;
  const s = String(str);
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const mulberry32 = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const BRANCH_POOL = [
  "main",
  "develop",
  "feature/ci-pipeline",
  "feature/auth-refactor",
  "release/v2.4",
  "hotfix/token-expiry",
  "feature/kanban-drag",
];
const COMMIT_MESSAGE_POOL = [
  "feat: wire pipeline stage runner to queue",
  "fix: flaky checkout integration test",
  "chore: bump node to 22.4 in CI image",
  "feat: sonar gate blocks deploy on hotspots",
  "refactor: extract docker build layer cache",
  "fix: rollback grabs last green build",
  "feat: parallel test shards for build stage",
  "docs: add pipeline runbook",
];
const TRIGGER_POOL = [
  "Maneesh R",
  "Mir Mohammed Kazim",
  "Elena Vasquez",
  "Marcus Lee",
  "Tomiwa Okafor",
  "Ravi Menon",
];

const buildStages = (rand, buildStatus) => {
  if (buildStatus === "SUCCESS") {
    return PIPELINE_STAGES.map((name) => ({ name, status: "PASSED" }));
  }
  if (buildStatus === "FAILED") {
    const failedAt = Math.floor(rand() * PIPELINE_STAGES.length);
    return PIPELINE_STAGES.map((name, i) => ({
      name,
      status: i < failedAt ? "PASSED" : i === failedAt ? "FAILED" : "PENDING",
    }));
  }
  // RUNNING — every stage up to the current one passed, the rest is pending.
  const currentAt = Math.floor(rand() * PIPELINE_STAGES.length);
  return PIPELINE_STAGES.map((name, i) => ({
    name,
    status: i < currentAt ? "PASSED" : "PENDING",
  }));
};

// Lazily populates the mock dataset the first time a project is queried, so
// any real (backend-seeded) projectId gets a plausible recent build history.
const seedPipelinesForProject = (projectId) => {
  if (mockPipelines.some((b) => b.projectId === projectId)) return;

  const rand = mulberry32(hashSeed(projectId));
  const buildCount = 4 + Math.floor(rand() * 3); // 4–6 recent builds
  const now = Date.now();
  let activeDeploymentAssigned = false;

  for (let i = 0; i < buildCount; i += 1) {
    const roll = rand();
    let status;
    if (i === 0 && roll < 0.35) {
      status = "RUNNING"; // only the newest build may still be in flight
    } else {
      status = roll < 0.82 ? "SUCCESS" : "FAILED";
    }

    const hoursAgo = 1.5 + i * (16 + rand() * 26);
    const startedAt = new Date(now - hoursAgo * 3600 * 1000).toISOString();

    const durationSeconds =
      status === "FAILED"
        ? 60 + Math.floor(rand() * 440) // failed builds stop partway through
        : 180 + Math.floor(rand() * 720);

    const build = {
      id: `BLD-${projectId}-${i + 1}`,
      projectId,
      branch: BRANCH_POOL[Math.floor(rand() * BRANCH_POOL.length)],
      commitMessage:
        COMMIT_MESSAGE_POOL[Math.floor(rand() * COMMIT_MESSAGE_POOL.length)],
      commitHash: Math.floor(rand() * 0xfffffff)
        .toString(16)
        .padStart(7, "0"),
      status,
      triggeredBy: TRIGGER_POOL[Math.floor(rand() * TRIGGER_POOL.length)],
      startedAt,
      durationSeconds,
      stages: buildStages(rand, status),
      // The newest SUCCESS build serves traffic; Rollback flips this flag.
      isActiveDeployment: false,
    };

    if (status === "SUCCESS" && !activeDeploymentAssigned) {
      build.isActiveDeployment = true;
      activeDeploymentAssigned = true;
    }

    mockPipelines.push(build);
  }
};

export async function mockFetchPipelines(projectId) {
  const pId = extractId(projectId);
  await pipelineSleep();
  if (!pId) return [];
  seedPipelinesForProject(pId);
  return mockPipelines
    .filter((b) => b.projectId === pId)
    .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
    .map((b) => ({ ...b, stages: b.stages.map((s) => ({ ...s })) }));
}

export async function mockFetchPipelineStats(projectId) {
  const pId = extractId(projectId);
  await pipelineSleep();
  if (!pId) {
    return { buildsToday: 0, successRatePercent: 0, avgDeploySeconds: 0 };
  }
  seedPipelinesForProject(pId);

  const builds = mockPipelines.filter((b) => b.projectId === pId);
  const today = new Date().toDateString();
  const finished = builds.filter((b) => b.status !== "RUNNING");
  const successes = finished.filter((b) => b.status === "SUCCESS");

  return {
    buildsToday: builds.filter(
      (b) => new Date(b.startedAt).toDateString() === today,
    ).length,
    successRatePercent: finished.length
      ? Math.round((successes.length / finished.length) * 100)
      : 0,
    avgDeploySeconds: successes.length
      ? Math.round(
          successes.reduce((sum, b) => sum + b.durationSeconds, 0) /
            successes.length,
        )
      : 0,
  };
}

export async function mockTriggerRollback(buildId) {
  const bId = extractId(buildId);
  await pipelineSleep();

  const build = mockPipelines.find((b) => b.id === bId);
  if (!build) throw new Error("Build not found.");
  if (build.status !== "SUCCESS") {
    throw new Error("Only successful builds can be rolled back to.");
  }
  if (build.isActiveDeployment) {
    throw new Error("This build is already the active deployment.");
  }

  // Flip: the chosen build becomes the active deployment; its project's
  // previous deployment stands down.
  mockPipelines.forEach((b) => {
    if (b.projectId === build.projectId) {
      b.isActiveDeployment = b.id === bId;
    }
  });

  return {
    ...build,
    stages: build.stages.map((s) => ({ ...s })),
    isActiveDeployment: true,
    message: `Rolled back to build ${build.commitHash} on ${build.branch}.`,
  };
}

export const pipelineApi = {
  // Live cicd-service functions (default path).
  getPipelines: fetchPipelines,
  fetchPipelines,
  getPipelineStats: fetchPipelineStats,
  fetchPipelineStats,
  triggerRollback,
  // Original mock generators, kept as a fallback (USE_MOCK_PIPELINES or
  // direct import when cicd-service is unavailable).
  mockGetPipelines: mockFetchPipelines,
  mockFetchPipelines,
  mockGetPipelineStats: mockFetchPipelineStats,
  mockFetchPipelineStats,
  mockTriggerRollback,
};

// =========================================================
// 9. AI ASSISTANT — HEURISTIC PLACEHOLDER (NO REAL AI YET)
// =========================================================
// NOTE(backend-team): Same pattern as the Milestone 3 pipeline mock.
// `askAssistant` runs entirely in the browser on already-fetched data.
// Swap its body for one POST to your AI endpoint when it ships — the
// reply shape below is already final, so nothing else needs to change:
//   { type: 'CREATE_PROJECT', reply, prefill?: { name, teamId, dueDate } }
//   { type: 'ANSWER', reply }

/** Escapes a string for safe use inside a case-insensitive RegExp. */
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Date as a local YYYY-MM-DD string (matches <input type="date">). */
const toIsoDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** Parses "in N days/weeks/months" into a due-date ISO string (local time). */
const parseDueDate = (message) => {
  const match = message.match(/\bin\s+(\d+)\s+(days?|weeks?|months?)\b/i);
  if (!match) return '';
  const amount = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  if (!Number.isFinite(amount) || amount < 0) return '';
  const days = unit.startsWith('day') ? amount : unit.startsWith('week') ? amount * 7 : amount * 30;
  const due = new Date();
  due.setDate(due.getDate() + days);
  return toIsoDate(due);
};

/** Longest team whose name literally appears in the message → its id. */
const matchTeamId = (message, teams) => {
  const lower = message.toLowerCase();
  let best = null;
  let bestLength = 0;
  for (const team of teams || []) {
    const name = String(team?.name || '').trim().toLowerCase();
    if (name.length > bestLength && lower.includes(name)) {
      best = team;
      bestLength = name.length;
    }
  }
  return best ? extractId(best) || '' : '';
};

/**
 * Project name from a CREATE command: quoted text → after "called"/"named" →
 * fallback to the longest run of capitalized words that isn't a team name or
 * generic filler.
 */
const parseProjectName = (message, teams) => {
  // 1) Quoted: "Phoenix Recovery" / 'Phoenix Recovery'
  const quoted = message.match(/["'“”]([^"'“”]{2,})["'“”]/);
  if (quoted?.[1]?.trim()) return quoted[1].trim();

  // 2) "…called Apollo for team X…", "…named …", "…titled …"
  const called = message.match(
    /\b(?:called|named|titled)\s+(.+?)(?=\s+\b(?:for|with|due|in|under|by|team|that|which)\b|[,.!?;:]|$)/i,
  );
  if (called?.[1]?.trim()) return called[1].replace(/\s+/g, ' ').trim();

  // 3) Fallback: longest capitalized run after scrubbing known noise.
  let scrubbed = message;
  for (const team of teams || []) {
    const name = String(team?.name || '').trim();
    if (name) scrubbed = scrubbed.replace(new RegExp(escapeRegExp(name), 'gi'), ' ');
  }
  scrubbed = scrubbed
    .replace(/\b(?:in|due(?:\s+in)?)\s+(?:\d+|a|an)\s+(?:days?|weeks?|months?)\b/gi, ' ')
    .replace(
      /\b(?:please|can|could|you|create|add|make|new|a|an|the|project|called|named|titled|for|with|under|by|team|due|in|on|at)\b/gi,
      ' ',
    )
    .replace(/[^\w\s'-]/g, ' ');
  const runs = (scrubbed.match(/[A-Z][\w'-]*(?:\s+[A-Z][\w'-]*)*/g) || []).map((run) => run.trim());
  const bestRun = runs.sort((a, b) => b.split(/\s+/).length - a.split(/\s+/).length)[0];
  return bestRun || '';
};

/**
 * REAL AI: Replace this heuristic function with a call to the backend's
 * AI endpoint once available, e.g.:
 *   const { data } = await http.post('/ai/assistant', { message: text, context: {...} });
 *   return data; // same shape: { type, reply, prefill? }
 * Backend team will wire this to their LLM API key.
 */
export async function askAssistant(text, { projects = [], teams = [] } = {}) {
  const message = String(text ?? '').trim();
  const lower = message.toLowerCase();

  if (!message) {
    return {
      type: 'ANSWER',
      reply: 'Type a request and I\'ll do my best — e.g. "Create a project called X for team Y, due in 3 weeks".',
    };
  }

  // ── 1. CREATE_PROJECT — starts with "create / add / make / new …" ─────
  if (/^\s*(?:please\s+)?(?:can you\s+|could you\s+)?(?:create|add|make|new)\b/i.test(message)) {
    return {
      type: 'CREATE_PROJECT',
      reply: 'Got it — opening the project form with what I understood.',
      prefill: {
        name: parseProjectName(message, teams),
        teamId: matchTeamId(message, teams),
        dueDate: parseDueDate(message),
      },
    };
  }

  // ── 2. SPRINT_RISK — mentions "risk" / "behind" / "delayed" ───────────
  if (/\b(?:risk|behind|delayed)\b/i.test(lower)) {
    const atRisk = [];

    for (const project of projects || []) {
      const pId = extractId(project);
      if (!pId) continue;
      const sprints = await fetchSprints(pId).catch(() => []);

      for (const sprint of sprints || []) {
        const sId = extractId(sprint);
        if (!sId || !sprint.startDate || !sprint.endDate) continue;

        const start = new Date(`${sprint.startDate}T00:00:00`);
        const end = new Date(`${sprint.endDate}T23:59:59`);
        const now = new Date();
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) continue;
        if (now < start) continue; // not started yet — can't be behind schedule

        // How much of the sprint window has elapsed (capped at 100%).
        const elapsedFraction = Math.min(1, (now - start) / (end - start));

        // How much of the sprint's story points are done.
        const tasks = await fetchTasksBySprint(pId, sId).catch(() => []);
        const pointOf = (t) => t.storyPoints || t.points || 1;
        const totalPoints = (tasks || []).reduce((sum, t) => sum + pointOf(t), 0);
        if (totalPoints <= 0) continue;
        const donePoints = (tasks || [])
          .filter((t) => t.status === 'DONE')
          .reduce((sum, t) => sum + pointOf(t), 0);
        const doneFraction = donePoints / totalPoints;

        // Behind by more than 15 percentage points → at risk.
        if (doneFraction < elapsedFraction - 0.15) {
          atRisk.push({ sprint, project, elapsedFraction, doneFraction });
        }
      }
    }

    if (atRisk.length === 0) {
      return {
        type: 'ANSWER',
        reply: "Nothing looks at risk right now — everything's tracking fine.",
      };
    }

    const lines = atRisk.map(({ sprint, project, elapsedFraction, doneFraction }) => {
      const percentElapsed = Math.round(elapsedFraction * 100);
      const percentDone = Math.round(doneFraction * 100);
      return `• "${sprint.name || 'Untitled sprint'}" on ${project?.name || 'a project'} — ${percentDone}% of story points done vs ${percentElapsed}% of the schedule elapsed (${percentElapsed - percentDone} points behind).`;
    });

    return {
      type: 'ANSWER',
      reply:
        atRisk.length === 1
          ? `1 sprint looks at risk:\n${lines[0]}`
          : `${atRisk.length} sprints look at risk:\n${lines.join('\n')}`,
    };
  }

  // ── 3. Active project count ────────────────────────────────────────────
  if (lower.includes('active projects') || lower.includes('how many projects')) {
    const count = (projects || []).filter(
      (p) => String(p?.status || '').toUpperCase() === 'ACTIVE',
    ).length;
    return {
      type: 'ANSWER',
      reply: `You have ${count} active ${count === 1 ? 'project' : 'projects'} right now.`,
    };
  }

  // ── 4. Fallback — describe what the assistant can do ───────────────────
  return {
    type: 'ANSWER',
    reply:
      'I can help with things like: "Create a project called X for team Y, due in 3 weeks", "Which sprints are at risk?", or "How many active projects do we have?"',
  };
}

export const assistantApi = { askAssistant };

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
  pipeline: pipelineApi,
  assistant: assistantApi,
};

export default client;