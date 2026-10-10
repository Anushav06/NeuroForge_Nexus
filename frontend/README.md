# NeuroForge Nexus — Frontend

**Milestones 1–4: Project Management, Sprints, CI/CD Pipelines, Releases & Monitoring**

Dark "forge / foundry" themed SDLC & project-management frontend. Built with
React 19 + Vite, React Router, Tailwind CSS v4 (`@tailwindcss/vite`), recharts
and lucide-react. All API calls use plain `fetch` (no Axios) through one file:
`src/api/client.js`.

Two backend services are used:

| Service      | Port | Covers                                                        |
| ------------ | ---- | ------------------------------------------------------------- |
| user-service | 8081 | auth, users, projects, teams, sprints, tasks, dashboard stats |
| cicd-service | 8083 | pipelines, builds, deployments, releases, health metrics      |

Last updated: 2026-10-10.

---

## Status at a glance

| Milestone                 | Pages                                                       | Data                         |
| ------------------------- | ----------------------------------------------------------- | ---------------------------- |
| M1 — Project & User Mgmt  | Login, Register, Dashboard, Projects, Teams, Team detail    | Live (user-service)          |
| M2 — Sprint & Task Mgmt   | Sprints (List / Calendar / Timeline), Sprint board (Kanban) | Live (user-service)          |
| M3 — CI/CD Pipeline       | Pipelines (builds, stage tracker, rollback)                 | Live (cicd-service)          |
| M4 — Release & Monitoring | Releases, Deployments, Monitoring                           | Live (cicd-service)          |
| Extras                    | Bug Reports, AI Assistant (floating), Repository (GitHub)   | **Placeholders — see below** |

Full create / edit / delete is wired for Teams, Projects, Sprints, Tasks and
Releases. Deployments support deploy and rollback.

---

## Quick start

```bash
cd frontend
npm install
npm run dev      # → http://localhost:5173
```

Other scripts: `npm run build` (→ `dist/`), `npm run preview`, `npm run lint`.

`frontend/.env` needs **both** service URLs:

```
VITE_API_URL=http://localhost:8081
VITE_CICD_API_URL=http://localhost:8083
```

## Running the full stack locally

Start in this order (Docker Desktop must be running):

1. **Infrastructure** (MongoDB, Zookeeper, Kafka):
   ```bash
   cd infra
   docker-compose up -d mongodb zookeeper kafka
   docker ps      # nexus-kafka must say "Up"
   ```
   If `nexus-kafka` shows `Exited`, it started before Zookeeper was ready:
   run `docker start nexus-kafka`. While Kafka is down, creating or updating
   tasks hangs and the user-service log fills with
   `Connection to node -1 (localhost:9092) could not be established`.
2. **user-service** (PowerShell, in `backend/user-service`):
   ```powershell
   $env:MONGO_URI="mongodb://localhost:27017/nexus_user_db"
   $env:JWT_SECRET="<dev secret>"
   .\mvnw.cmd spring-boot:run
   ```
3. **cicd-service** (separate terminal, in `backend/cicd-service`):
   ```powershell
   $env:MONGO_URI="mongodb://localhost:27017/nexus_cicd_db"
   $env:JWT_SECRET="<same dev secret as user-service>"
   .\mvnw.cmd spring-boot:run
   ```
   `JWT_SECRET` must be identical in both terminals, otherwise cicd-service
   rejects tokens issued by user-service.
4. **Frontend**: `npm run dev`.

## Demo credentials

Login as **admin@neuroforge.dev** / **forge123** (ADMIN). Other seeded accounts
come from `DataSeeder.java` in user-service. You can also register new accounts
from the login page (pick any role) — e.g. register a Developer or Team Member
to see the contributor experience.

---

## Role-based access (frontend)

Two tiers, applied on every page. This mirrors what the backend's
`@PreAuthorize` checks actually accept, so the UI never offers an action the
API would reject.

| Tier             | Roles                                | Can do                                                                                                                                                          |
| ---------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Managers**     | ADMIN, PROJECT_LEAD, PROJECT_MANAGER | Create / edit / delete teams, projects, sprints, tasks. Publish releases. Deploy and roll back. Roll back builds. ADMIN also sees the all-users table on Teams. |
| **Contributors** | DEVELOPER, DESIGNER, QA, EMPLOYEE    | View everything. Change the status of tasks **assigned to them** (`task.assignedTo === user.id`). Nothing else.                                                 |

Dashboard by tier:

- Managers: org-wide stat cards and the "All Projects" table.
- Contributors: "My Dashboard" with a **My Tasks** board (their assigned tasks
  across every project, grouped To Do / In Progress / Done). There is no
  "tasks assigned to me" endpoint, so this fetches each project's tasks and
  filters client-side.

Gating is done with `useAuth().hasRole(...)` inside each page. The frontend
only hides controls — real enforcement must be on the backend (see action
items).

---

## What's implemented

**Auth & shell** — Login / Register (session in `sessionStorage`), protected
routes, persistent sidebar, mobile top bar.

**Dashboard** — manager and contributor views (above). Team, lead and members
are resolved from IDs using `/teams` and `/users`.

**Projects** — card grid, New / Edit / Delete (managers), auto-fills the lead
from the selected team, "View board" link to the active sprint.

**Teams** — team cards with lead, members and project rollups, status pie
chart, New team (managers), admin-only user directory. Team detail page with
Edit / Delete (delete is blocked while projects still use the team).

**Sprints & Kanban** — List / Calendar / Timeline views. Sprint board with
To Do / In Progress / Done columns, velocity and burndown cards, Add task,
Edit / Delete sprint and Delete task (managers). Contributors get a status
dropdown on their own tasks only. Assignee names are resolved from
`task.assignedTo` via the users list.

**Pipelines (M3)** — org-wide stats, per-project expandable build lists with
stage tracker (Build → Test → Sonar → Docker → Deploy), Rollback for managers.
Served from cicd-service; the old `USE_MOCK_PIPELINES` mock fallback has been
removed from `client.js`, so the page is live-only (stats and build lists
degrade to zeros / empty while cicd-service is down).

**Releases (M4)** — per-project release list with status pills
(DRAFT / RELEASED / ROLLED_BACK), New / Edit release, Publish, and a changelog
viewer.

**Deployments (M4)** — current DEV / STAGING / PROD status per project,
deployment history with CPU / memory / replica info, Deploy modal with a real
picker of successful builds and an environment choice, Rollback with a
required reason.

**Monitoring (M4)** — per-project CI/CD stats, per-pipeline health pill,
success-rate trend chart and test-coverage trend chart (recharts). There is
no separate HealthMetric model on the backend; health is computed from
Pipeline / Build / Deployment data, so this page is pipeline-health-centric.

**Repository (GitHub)** — **mock only**, see next section.

**AI Assistant** — floating chat panel. Creates projects from natural
language and answers simple questions from already-fetched data.
**Heuristic placeholder** (`askAssistant()` in `client.js`), not a real LLM.

**Bug Reports** — **mock only** (local state), see next section.

## Placeholders (not real integrations yet)

- **Repository page (`/repository`)** — Connect GitHub, commit feed, PR list
  and webhook status are all simulated from seeded sample data, and reset on
  refresh. A banner on the page says so. A real version needs a GitHub OAuth
  App, a webhook receiver endpoint, and repository storage on the backend.
  When those exist, replace the mock data in `Repository.jsx`; the UI stays.
- **Bug Reports page (`/bugs`)** — report a bug against a project. Fields:
  title, description, project, module, environment, severity, priority,
  status, reported by (automatic), assigned to, created date (automatic).
  Error message and console log are pasted text stored on the bug;
  screenshots, recordings, logs and other files keep file names only
  (name/size — no upload endpoint exists). Workflow: NEW → CONFIRMED
  (triage) → assign → IN_PROGRESS → FIXED → RETEST → CLOSED / REOPENED
  (REOPENED goes back to IN_PROGRESS). A CONFIRMED bug cannot be started
  until someone is assigned (assignment is a manager-only control), and
  only a manager (ADMIN, PROJECT_LEAD, PROJECT_MANAGER) or the assignee
  can change a bug's status. All data is local React state and resets on
  refresh. The intended backend API shape is documented in the header of
  `BugReports.jsx`.
- **AI Assistant** — swap the body of `askAssistant()` for a call to the
  backend's LLM endpoint. The reply shape (`{ type, reply, prefill? }`) is
  already final.

## Not built (on purpose)

- **Requirements** and **Testing / TestCase** pages — the spec lists these
  entities, but neither backend service has any controller for them.
- Backend endpoints that exist but have no UI yet: build trigger / cancel /
  retry / logs / test-results, pipeline create / update / delete / enable,
  and manual deployment health update (`PATCH /deployments/{id}/health`).

---

## Project structure

```
frontend/src/
├── api/
│   └── client.js          ← the ONLY file that talks to a backend
├── context/
│   └── AuthContext.jsx    ← user + token in sessionStorage, hasRole()
├── components/
│   ├── ProtectedRoute.jsx ← ProtectedRoute / RoleRoute / PublicOnlyRoute
│   ├── Layout.jsx         ← sidebar + mobile top bar + <Outlet/>
│   ├── AIAssistant.jsx    ← floating assistant
│   ├── SprintViews.jsx    ← Calendar + Timeline views
│   └── ui.jsx             ← StatusPill, StatCard, Avatar, PageHeader, …
├── pages/
│   ├── Login  Register  Dashboard  Projects  Teams  TeamDetail
│   ├── Sprints  SprintBoard
│   ├── Pipelines  Releases  Deployments  Monitoring  Repository  BugReports
├── index.css              ← Tailwind v4 @theme design tokens
├── App.jsx                ← route map
└── main.jsx               ← providers (BrowserRouter + AuthProvider)
```

Routes: `/`, `/projects`, `/sprints`, `/sprints/:sprintId`, `/pipelines`,
`/releases`, `/deployments`, `/monitoring`, `/repository`, `/bugs`, `/teams`,
`/teams/:teamId`, plus public `/login` and `/register`.

## How `client.js` is organized

- `request()` → user-service (8081), `requestCicd()` → cicd-service (8083).
  Both attach `Authorization: Bearer <token>` from storage and throw an
  `Error` with the backend's `message` field on non-2xx responses.
- Sections: Auth, Dashboard, Users, Teams, Projects, Sprints, Tasks,
  Pipelines (M3), Releases, Deployments, Monitoring (M4), AI Assistant.
- Each area also exports a grouped object (`teamApi`, `releaseApi`, …) and the
  default export bundles them.

---

## API contract

Field names below are the real ones from the backend model / DTO classes
unless marked **unverified**.

### user-service (8081)

| Function                                                           | HTTP                | Path                                                                              |
| ------------------------------------------------------------------ | ------------------- | --------------------------------------------------------------------------------- |
| `loginRequest` / `registerRequest`                                 | POST                | `/auth/login`, `/auth/register`                                                   |
| `fetchDashboardStats`                                              | GET                 | `/dashboard/stats`                                                                |
| `fetchUsers`                                                       | GET                 | `/users`                                                                          |
| `fetchTeams`, `createTeam`, `updateTeam`, `deleteTeam`             | GET/POST/PUT/DELETE | `/teams`, `/teams/{id}`                                                           |
| `fetchProjects`, `createProject`, `updateProject`, `deleteProject` | GET/POST/PUT/DELETE | `/projects`, `/projects/{id}`                                                     |
| `fetchSprints`, `createSprint`, `updateSprint`, `deleteSprint`     | GET/POST/PUT/DELETE | `/projects/{projectId}/sprints[/{id}]`                                            |
| `fetchTasksByProject`, `fetchTasksBySprint`, `fetchSubtasks`       | GET                 | `/projects/{projectId}/tasks`, `/tasks/sprint/{sprintId}`, `/tasks/{id}/subtasks` |
| `createTask`, `updateTask` / `updateTaskStatus`, `deleteTask`      | POST/PUT/DELETE     | `/projects/{projectId}/tasks[/{id}]`                                              |
| `fetchSprintVelocity`, `fetchSprintBurndown`                       | GET                 | `/projects/{projectId}/tasks/sprint/{sprintId}/velocity`, `/burndown`             |

**Task** (verified against `Task.java`):

```json
{
  "id": "6ab8b43fa6c7300cbd6ee14b",
  "projectId": "PRJ-9E6DC0",
  "sprintId": "6aad3b485ca8f61d5c5dfb33",
  "title": "login",
  "description": null,
  "assignedTo": "USR-0004",
  "status": "TODO",
  "priority": "MEDIUM",
  "storyPoints": 3,
  "progress": 0,
  "parentTaskId": null,
  "blockedByTaskId": null,
  "blockerReason": null
}
```

`assignedTo` is a bare user-ID string. There is **no** `assignee` or
`assigneeId` field and no name hydration — the frontend looks the name up in
`/users`. `createTask` sends `assignedTo` (not `assigneeId`).

**Project** (raw): `id`, `name`, `description`, `status`
(`PLANNING | ACTIVE | ON_HOLD | COMPLETED | ARCHIVED` in the UI; `BLOCKED`
also appears in data), `teamId`, `leadId`, `memberIds[]`, `sprint`, `dueDate`,
`createdAt`. Team / lead / members are IDs only.

**User, Team, Sprint** shapes: **unverified** — the UI reads `id`, `name`,
`email`, `role`, `subRole` (User); `id`, `name`, `description`, `leadId`,
`memberIds` (Team); `id`, `name`, `goal`, `startDate`, `endDate`, `status`
(Sprint).

### cicd-service (8083)

Roles for reads = ADMIN, PROJECT_LEAD, PROJECT_MANAGER, TEAM_LEAD, EMPLOYEE.
Roles for writes = ADMIN, PROJECT_LEAD, PROJECT_MANAGER, TEAM_LEAD.

| Function                             | HTTP       | Path                                                             | Auth         |
| ------------------------------------ | ---------- | ---------------------------------------------------------------- | ------------ |
| `fetchPipelines` (composite)         | GET        | `/projects/{projectId}/pipelines`, `/pipelines/{id}/builds`      | read         |
| `fetchProjectCicdStats`              | GET        | `/projects/{projectId}/cicd/stats`                               | none         |
| `fetchReleases` / `createRelease`    | GET / POST | `/projects/{projectId}/releases`                                 | read / write |
| `fetchReleaseById` / `updateRelease` | GET / PUT  | `/releases/{releaseId}`                                          | read / write |
| `publishRelease`                     | POST       | `/releases/{releaseId}/publish?releasedBy=`                      | write        |
| `fetchChangelog`                     | GET        | `/releases/{releaseId}/changelog`                                | read         |
| `deployBuild`                        | POST       | `/builds/{buildId}/deploy` body `{ environment }`                | write        |
| `fetchProjectDeployments`            | GET        | `/projects/{projectId}/deployments?environment=`                 | read         |
| `fetchDeploymentById`                | GET        | `/deployments/{deploymentId}`                                    | read         |
| `fetchCurrentDeployment`             | GET        | `/environments/{env}/current?projectId=`                         | read         |
| `updateDeploymentHealth`             | PATCH      | `/deployments/{deploymentId}/health`                             | write        |
| `rollbackDeployment`                 | POST       | `/deployments/{deploymentId}/rollback` body `{ rollbackReason }` | write        |
| `fetchRollbacks`                     | GET        | `/projects/{projectId}/rollbacks`                                | read         |
| `fetchPipelineHealth`                | GET        | `/pipelines/{pipelineId}/health`                                 | none         |
| `fetchPipelineMetrics`               | GET        | `/pipelines/{pipelineId}/metrics?days=`                          | none         |
| `fetchCoverageTrend`                 | GET        | `/pipelines/{pipelineId}/coverage-trend?last=`                   | read         |

Enums: `Release.status` = `DRAFT | RELEASED | ROLLED_BACK`;
`Deployment.environment` = `DEV | STAGING | PROD`;
`Deployment.status` = `IN_PROGRESS | DEPLOYED | FAILED | ROLLED_BACK`;
Build status = `QUEUED | RUNNING | SUCCESS | FAILED | CANCELLED`.

Build stages come back as `[{ name, status }]`; the UI maps `SUCCESS → PASSED`,
`FAILED → FAILED`, everything else → `PENDING`. `Pipeline.HealthStatus` values
are **unverified** — the UI colors `HEALTHY / DEGRADED / WARNING / CRITICAL`
and shows any other value as a neutral pill.

---

## Backend action items

Confirmed from the controller and model source, not speculation.

1. **Project and Task writes have no auth.** `@PreAuthorize` is commented out
   on create / update / delete in `ProjectController` and `TaskController`.
   Anyone can call these APIs directly; the frontend only hides buttons.
2. **`TEAM_LEAD` role mismatch.** cicd-service `@PreAuthorize` lists accept
   `TEAM_LEAD`, but the role list in the frontend and registration form has no
   such role. Today only ADMIN / PROJECT_LEAD / PROJECT_MANAGER pass those
   checks. Either add TEAM_LEAD as a real role or remove it from the checks.
3. **`HealthMetricsController`**: `getPipelineHealth`, `getProjectStats` and
   `getPipelineMetrics` have no `@PreAuthorize`; only `getCoverageTrend` does.
4. **`SecurityConfig` uses `anyRequest().permitAll()`** in user-service, and
   several controllers use `@CrossOrigin(origins = "*")`.
5. **Kafka producer blocks the request when Kafka is down.** Creating or
   updating a task hangs and the producer retries forever. Catch the send
   error or set short `max.block.ms` / `delivery.timeout.ms`.
6. **`GET /dashboard/stats`** returns the org-wide total as `myProjects` for
   every caller. The frontend no longer depends on it, but it is still wrong.
7. **`GET /projects` has no role filtering** — every caller receives every
   project. Team / lead / members are also not hydrated (IDs only).
8. **Task API has no assignee name.** A response DTO with the assignee's name
   would replace the client-side lookup.
9. **Test results never reach the UI.** `Pipelines.jsx` has a
   `TestResultSummary` that reads `build.testResult`, but `mapBuildForUi()` in
   `client.js` does not copy `testResult` through. One-line frontend fix:
   add `testResult: build?.testResult ?? null` to `mapBuildForUi`. The
   backend already exposes `GET /builds/{buildId}/test-results`.
10. **Changelog 500?** If `GET /releases/{id}/changelog` returns a 500, check
    `ReleaseService` — the `ChangelogResponse` DTO itself is a plain
    getter/constructor class.
11. **Real GitHub integration** (OAuth App + webhook receiver + repo storage)
    to replace the Repository page mock.

---

## cicd-service changes (frontend developer)

Commit `e54d1d8` on branch `fix/cicd-integration` (merged into `main`,
2026-09-25) — *"Fix CI/CD backend security/logging, add test result display,
Team/Project/Sprint edit-delete features, clean up gitignore"*. Its
`backend/cicd-service` scope, per file:

| File | What changed | Why | Committed? |
| ---- | ------------ | --- | ---------- |
| `config/JwtAuthFilter.java` | JWT validation rebuilt around `extractClaims()`; every failure type (expired / bad signature / malformed / unsupported / invalid) logged as a WARN with the request URI; DEBUG log for requests without a token; WARN when a valid token carries no role claim | Security/logging fix — JWT rejections used to be silent; signature failures now hint at a `JWT_SECRET` mismatch between the two services | Yes |
| `config/SecurityConfig.java` | CORS wired into the filter chain: new `CorsConfigurationSource` bean (local Vite origins 5173 / 5174 / 3000, `127.0.0.1:*`, standard methods and headers, credentials allowed, 1 h preflight cache) so OPTIONS preflights are answered instead of rejected as unauthenticated | Security fix — the frontend dev origins were being blocked | Yes |
| `controller/BuildController.java` | `DEVOPS` → `TEAM_LEAD` in `@PreAuthorize` on all 9 endpoints (trigger, builds, single build, logs, cancel, retry, stage update, save + get test-results) | Align role lists with the roles the app actually has | Yes |
| `controller/PipelineController.java` | Same rename on all 6 pipeline endpoints | Same | Yes |
| `controller/DeploymentController.java` | `@PreAuthorize` added to all 7 endpoints (deploy / health / rollback = manager tier; list / get / current / rollback history also allow `EMPLOYEE`) | Security fix — these endpoints previously had no checks | Yes |
| `controller/ReleaseController.java` | `@PreAuthorize` added to all 6 endpoints (create / update / publish = manager tier; reads also allow `EMPLOYEE`) | Same | Yes |
| `controller/HealthMetricsController.java` | `DEVOPS` → `TEAM_LEAD` on `getCoverageTrend` | Same | Yes |
| `config/SecurityConfig.java` (working tree) | Merge-conflict cleanup: removed the commented-out legacy config, a duplicated dead filter chain and a stray conflict hash line left behind by `5278d34`; `.cors(...)` moved back inside the single live chain | Repair the file the Sep 29 merge resolution broke | **No — uncommitted** |

Also uncommitted in the same area: `frontend/src/api/client.js` no longer
contains `USE_MOCK_PIPELINES` or the `mock…` pipeline generators (see Notes),
and the `TestResultSummary` on the Pipelines page is still inert because
`mapBuildForUi()` doesn't pass `testResult` through (action item 9).

## Notes

- The pipeline mock generators were removed from `client.js`
  (`USE_MOCK_PIPELINES` and the `mock…` functions no longer exist) — the
  Pipelines page is live-only and degrades to zeros / empty lists while
  cicd-service is down. Everything else calls the real backends.
- Chart colors in Monitoring are approximate hex values of the design tokens
  (recharts needs literal colors).
- All colors / fonts are Tailwind v4 `@theme` tokens in `src/index.css`
  (`forge-*` surfaces, `ember-*` primary, `steel-*` secondary,
  `signal-success/warning/danger`; Space Grotesk / Inter / JetBrains Mono).
