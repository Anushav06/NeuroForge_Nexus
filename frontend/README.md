# NeuroForge Nexus — Frontend

**Milestones 1–3: Project Management, Sprints & CI/CD Pipelines**

Dark "forge / foundry" themed SDLC & project-management frontend. Built with
React 19 + Vite, React Router, Tailwind CSS v4 (`@tailwindcss/vite`), Axios and
lucide-react. Backend split: **Milestones 1 & 2** (auth, users, projects,
teams, dashboard, sprints, tasks) call the **real Spring Boot backend**;
**Milestone 3 (CI/CD Pipelines) is fully mock** — it runs on self-contained
in-memory data inside `client.js` until the backend ships the pipeline
endpoints.

---

## Backend Team: Known Gaps & Action Items

_Compiled 2026-09-11 from a direct read of the backend source — these are
**confirmed** issues, not speculation; each one names the file that proves it._

- **Dashboard stats not personalized** — `GET /dashboard/stats` returns
  `"myProjects": totalProjects` (the org-wide total) for every caller,
  regardless of role; it should filter to projects the caller is staffed on.
  Confirmed in `DashboardController.java`.
- **No role-based filtering on `GET /projects`** — every caller sees every
  project, including EMPLOYEE accounts that should only see projects they're
  staffed on. Confirmed in `ProjectController.java` / `ProjectService.java`.
- **No hydration on `GET /projects`** — the response only carries
  `teamId`/`leadId`/`memberIds` as raw ID strings: no resolved team name, lead
  name, or member objects. The frontend currently renders these as blank/dash
  everywhere (Dashboard, Projects, Teams pages).
- **Write endpoints have no auth enforcement** — POST/PUT/DELETE on
  `/projects` carry `// @PreAuthorize removed temporarily for development`
  comments, so anyone can create/edit/delete any project right now. Confirmed
  intentional per `SecurityConfig.java`'s `anyRequest().permitAll() // Set to
  authenticated() when your JWT filter is fully wired` — flagged so it isn't
  forgotten before submission.

## Milestone 3 Update Log

_2026-09-11_

- Milestone 2 (sprints/tasks) confirmed connected to the real backend.
- Milestone 3 (CI/CD Pipelines) built as a self-contained mock — no backend
  endpoints exist yet.
- Sprints page got new Calendar and Timeline view tabs alongside the existing
  List view.
- `Register.jsx` fixed to match the new sub-role list.

## Quick start

```bash
cd frontend
npm install
npm run dev      # → http://localhost:5173
```

Other scripts: `npm run build` (production build → `dist/`), `npm run preview`,
`npm run lint` (oxlint).

## Running the full stack locally

The backend infrastructure requires **Docker Desktop running** — it provides
MongoDB, Kafka, Zookeeper and Keycloak via `infra/docker-compose.yml`.

1. Start the infrastructure:

   ```bash
   cd infra
   docker compose up
   ```

2. Run the backend: open `backend/user-service` in IntelliJ and run
   `UserServiceApplication.java` — it listens on **http://localhost:8081**.

3. Run the frontend:

   ```bash
   cd frontend
   npm run dev      # → http://localhost:5173
   ```

## Demo credentials

<!-- TODO(backend-team): These specific accounts are UNCONFIRMED — the role
     system changed (see ROLES / EMPLOYEE_SUB_ROLES in src/api/client.js) and
     the former TEAM_LEAD role and Developer/Tester/Junior/Senior sub-roles no
     longer exist. Ask the backend team to confirm the DataSeeder's real demo
     accounts (emails, roles, sub-roles, password) and update this table. -->

All seeded accounts share the password **`forge123`**.
(The Login page shows this hint and has a one-click _"Fill demo credentials"_ button.)

These credentials are expected to work against the **real backend** now —
provided the backend seeds the same demo accounts (see TODO above).

| Email                           | Role            | Sub-role  |
| ------------------------------- | --------------- | --------- |
| `admin@neuroforge.dev`          | ADMIN           | —         |
| `marcus.lee@neuroforge.dev`     | PROJECT_LEAD    | —         |
| `elena.vasquez@neuroforge.dev`  | PROJECT_MANAGER | —         |
| `ravi.menon@neuroforge.dev`     | EMPLOYEE        | —         |
| `sara.lindqvist@neuroforge.dev` | EMPLOYEE        | —         |
| `daniel.cho@neuroforge.dev`     | EMPLOYEE        | —         |
| `amara.diallo@neuroforge.dev`   | EMPLOYEE        | —         |

- Log in as **admin@neuroforge.dev** to see everything, including the
  admin-only user table on the Teams page and the "New project" button.
- Log in as **ravi.menon@neuroforge.dev** to see the EMPLOYEE experience —
  the dashboard shows **"My Projects"** (personal stats) instead of
  "Active Projects".
- You can also **register** new accounts; choosing EMPLOYEE reveals the
  sub-role dropdown (Frontend Developer / Backend Developer / Full Stack
  Developer / DevOps Engineer / UI/UX Designer / QA Tester / Data Engineer /
  Scrum Master).

## What's implemented

- Login / Register (session persisted in `sessionStorage`)
- Persistent left sidebar layout, protected routes (`→ /login` when signed out)
- Dashboard: stat cards (Active Projects / My Projects, Total Users, Total
  Teams) + projects table with status pills
- Projects: card grid + role-gated "New project" modal
  (ADMIN / PROJECT_LEAD / PROJECT_MANAGER only)
- Teams: team cards with member rosters, per-team project rollups + admin-only full user table
- Sprints & Kanban board (Milestone 2): sprint list with per-sprint progress, three-column
  board (To Do / In Progress / Done), task creation restricted to ADMIN / PROJECT_LEAD /
  PROJECT_MANAGER, and EMPLOYEEs updating the status of their own tasks
- Sprints page views: List/Calendar/Timeline tab switcher — Calendar shows sprint pills
  positioned by date range with month navigation and today highlighting; Timeline shows
  sprints as horizontal Gantt-style bars on a date axis with weekly/monthly tick marks;
  both new views use the same `fetchSprints()` data already documented in the API Contract —
  no new backend endpoints or `client.js` functions were needed
- Pipelines (Milestone 3 — fully mock): org-wide stat cards (Builds Today,
  Success Rate, Avg Deploy Time) aggregated across projects, per-project
  expandable build lists with stage trackers (Build → Test → Sonar → Docker →
  Deploy), and role-gated Rollback (ADMIN / PROJECT_LEAD / PROJECT_MANAGER
  only, on SUCCESS builds that aren't the active deployment)
- AI Assistant (heuristic placeholder): floating chat-style assistant — an ember
  round button pinned bottom-right on every authenticated page — that opens a
  slide-up chat panel. It can create projects from natural language (e.g.
  "Create a project called X for team Y, due in 3 weeks" parses the name, team
  and due date, then opens the New Project form pre-filled with a "review
  before creating" banner) and answer questions from already-fetched data
  ("Which sprints are at risk?" compares elapsed schedule vs. story-point
  progress per sprint; "How many active projects do we have?" counts ACTIVE
  projects). Answers come from the local `askAssistant()` heuristic in
  `client.js`, marked with a REAL AI comment — pending the backend team wiring
  it to their actual LLM API key.
- Roles: `ADMIN`, `PROJECT_MANAGER`, `PROJECT_LEAD`, `DEVELOPER`, `DESIGNER`,
  `QA`, `EMPLOYEE` (+ EMPLOYEE sub-roles: Frontend Developer, Backend
  Developer, Full Stack Developer, DevOps Engineer, UI/UX Designer, QA Tester,
  Data Engineer, Scrum Master)

## Project structure

```
frontend/src/
├── api/
│   └── client.js          ← ★ the ONLY file that talks to a backend
├── context/
│   └── AuthContext.jsx    ← user + token in sessionStorage
├── components/
│   ├── ProtectedRoute.jsx ← ProtectedRoute / RoleRoute / PublicOnlyRoute
│   ├── Layout.jsx         ← sidebar + mobile top bar + <Outlet/>
│   └── ui.jsx             ← StatusPill, StatCard, Avatar, AuthShell, …
├── pages/
│   ├── Login.jsx  Register.jsx  Dashboard.jsx  Projects.jsx  Teams.jsx
│   ├── Sprints.jsx  SprintBoard.jsx  Pipelines.jsx
├── index.css              ← Tailwind v4 @theme design tokens (colors/fonts)
├── App.jsx                ← route map
└── main.jsx               ← providers (BrowserRouter + AuthProvider)
```

---

## Backend connection status

Everything backend-related is isolated in **`src/api/client.js`** — pages
import its functions and never touch axios themselves, so swapping a mock
body for the real call changes **one file only**.

**Current connection status:**

- **LIVE against the real backend — Milestones 1 & 2 (functions 1–11):**
  `loginRequest`, `registerRequest`, `fetchDashboardStats`, `fetchProjects`,
  `createProject`, `fetchTeams`, `fetchUsers`, `fetchSprints`,
  `fetchTasksBySprint`, `createTask`, `updateTaskStatus` (auth, users,
  projects, teams, dashboard, sprints, tasks) all make real HTTP calls to
  `VITE_API_BASE_URL`.

- **Still mock — Milestone 3 (Pipelines, functions 12–14):** `fetchPipelines`,
  `fetchPipelineStats`, `triggerRollback` run on self-contained in-memory data
  inside `client.js` pending the backend pipeline endpoints. They will be
  swapped the same way once those endpoints exist.

The axios instance is already set up: `client.js` exports a configured `http`
instance that reads the base URL from `import.meta.env.VITE_API_BASE_URL`
(`frontend/.env`, git-ignored; committed template `.env.example` — default
`http://localhost:8081`), attaches the `Authorization: Bearer <token>` header
from sessionStorage, and handles global 401s by clearing the session and
redirecting to `/login`.

Every function has a `REAL BACKEND:` comment showing the exact replacement
(the table below covers both the live and pending functions):

| Function                                    | Real call                                           |
| ------------------------------------------- | --------------------------------------------------- |
| `loginRequest`                              | `POST /auth/login`                                  |
| `registerRequest`                           | `POST /auth/register`                               |
| `fetchDashboardStats()`                     | `GET /dashboard/stats`                              |
| `fetchProjects()`                           | `GET /projects`                                     |
| `createProject(payload)`                    | `POST /projects`                                    |
| `fetchTeams()`                              | `GET /teams`                                        |
| `fetchUsers()`                              | `GET /users`                                        |
| `fetchSprints(projectId)`                   | `GET /projects/{projectId}/sprints`                 |
| `fetchTasksBySprint(projectId, sprintId)`   | `GET /projects/{projectId}/tasks/sprint/{sprintId}` |
| `createTask(projectId, payload)`            | `POST /projects/{projectId}/tasks`                  |
| `updateTaskStatus(projectId, taskId, data)` | `PUT /projects/{projectId}/tasks/{taskId}`          |
| `fetchPipelines(projectId)`                 | `GET /projects/{projectId}/pipelines`               |
| `fetchPipelineStats(projectId)`             | `GET /projects/{projectId}/pipelines/stats`         |
| `triggerRollback(buildId)`                  | `POST /pipelines/{buildId}/rollback`                |

Note: `fetchDashboardStats()` and `fetchProjects()` now take **zero
arguments** — passing a `user` argument is currently a no-op (call sites such
as `Dashboard.jsx` still pass it).

Keep the function names, arguments and return shapes identical and **no
page or component needs to change**.

## API Contract for Backend Team

Build the endpoints below and the frontend works with zero changes to pages —
only the mock bodies in `src/api/client.js` get replaced. Field names are
**exact** and mirror the mock data structure the UI already renders.

**Conventions**

- Base URL comes from `VITE_API_BASE_URL` (see `.env` / `.env.example`).
- The axios interceptor in `client.js` adds `Authorization: Bearer <token>` to every request.
- Responses are consumed as-is (`return data` in each swapped function) — no `{ success, data }` envelope; return exactly the JSON shown.
- Errors: respond `4xx`/`5xx` with `{ "message": "Human-readable reason" }` — the UI prints `err.message` in its form alerts. Any `401` clears the session and redirects to `/login`.
- **Never include `password` in a returned user object.** Login/register responses are cached verbatim in `sessionStorage`.
- Dates are `YYYY-MM-DD` strings; empty optional values are `""` (not `null`), except `leadId`/`subRole` which are `null`.

### Shared shapes

> ⚠ **UNVERIFIED — original planned contract.** The **User**, **Team**,
> **Task** and **Sprint** shapes below have **not** been confirmed against the
> actual backend model classes; don't treat them as ground truth. Only the
> **Project** shape reflects the real `Project.java` fields (see its note).

**User** (public — password stripped):

```json
{
  "id": "USR-0001",
  "name": "Priya Sharma",
  "email": "admin@neuroforge.dev",
  "role": "ADMIN",
  "subRole": null,
  "status": "active",
  "createdAt": "2026-01-12"
}
```

- `role` ∈ `ADMIN` | `PROJECT_MANAGER` | `PROJECT_LEAD` | `DEVELOPER` | `DESIGNER` | `QA` | `EMPLOYEE`
- `subRole` is `null` except for `EMPLOYEE`, where it ∈ `FRONTEND_DEVELOPER` | `BACKEND_DEVELOPER` | `FULLSTACK_DEVELOPER` | `DEVOPS_ENGINEER` | `UI_UX_DESIGNER` | `QA_TESTER` | `DATA_ENGINEER` | `SCRUM_MASTER`

**Project** (raw backend shape — mirrors the real `Project.java` fields):

```json
{
  "id": "PRJ-1036",
  "name": "Atlas Auth Service",
  "description": "OAuth2, SSO and session hardening for the platform.",
  "status": "ACTIVE",
  "teamId": "TEAM-001",
  "leadId": "USR-0002",
  "memberIds": ["USR-0002", "USR-0005", "USR-0007"],
  "sprint": "Sprint 14",
  "dueDate": "2026-09-18",
  "createdAt": "2026-06-01"
}
```

- `teamId`/`leadId`/`memberIds` are raw ID strings — **team/lead/members are
  NOT hydrated by the backend**; the frontend currently shows blank/dash for
  these until hydration is added on either side.
- `status` ∈ `PLANNING` | `ACTIVE` | `ON_HOLD` | `COMPLETED` | `ARCHIVED`
  (per `PROJECT_STATUSES` in `client.js` — backend enum values to confirm)
- `leadId` may be `null`; `sprint`/`dueDate` may be `""`

**Team** (planned shape — unverified, see the Shared-shapes note above):

```json
{
  "id": "TEAM-001",
  "name": "Core Forge",
  "description": "Platform, auth & core services",
  "leadId": "USR-0002",
  "memberIds": ["USR-0002", "USR-0005", "USR-0007"],
  "lead": "Marcus Lee",
  "members": ["…User objects, same shape as above…"]
}
```

**Task** (planned shape — unverified, see the Shared-shapes note above; the UI
wants the resolved `assignee` user object):

```json
{
  "id": "TSK-2001",
  "title": "Add refresh-token rotation",
  "assigneeId": "USR-0005",
  "storyPoints": 5,
  "status": "IN_PROGRESS",
  "priority": "HIGH",
  "sprintId": "SPR-1001",
  "assignee": { "…User object, same shape as above…" }
}
```

- `status` ∈ `TODO` | `IN_PROGRESS` | `DONE`
- `priority` ∈ `LOW` | `MEDIUM` | `HIGH` | `URGENT`
- `assigneeId`/`assignee` may be `null` (the task renders as "Unassigned")

**Sprint** (planned shape — unverified, see the Shared-shapes note above; the
UI wants the resolved `project` name):

```json
{
  "id": "SPR-1001",
  "projectId": "PRJ-1036",
  "name": "Sprint 14",
  "goal": "Ship OAuth2 login and MFA enrollment.",
  "startDate": "2026-08-24",
  "endDate": "2026-09-06",
  "project": "Atlas Auth Service"
}
```

### Endpoints

| #   | `client.js` function  | HTTP  | Path                        |
| --- | --------------------- | ----- | --------------------------- |
| 1   | `loginRequest`        | POST  | `/auth/login`               |
| 2   | `registerRequest`     | POST  | `/auth/register`            |
| 3   | `fetchDashboardStats` | GET   | `/dashboard/stats`          |
| 4   | `fetchProjects`       | GET   | `/projects`                 |
| 5   | `createProject`       | POST  | `/projects`                 |
| 6   | `fetchTeams`          | GET   | `/teams`                    |
| 7   | `fetchUsers`          | GET   | `/users`                    |
| 8   | `fetchSprints`        | GET   | `/projects/{projectId}/sprints`                 |
| 9   | `fetchTasksBySprint`  | GET   | `/projects/{projectId}/tasks/sprint/{sprintId}` |
| 10  | `createTask`          | POST  | `/projects/{projectId}/tasks`                   |
| 11  | `updateTaskStatus`    | PUT   | `/projects/{projectId}/tasks/{taskId}`          |
| 12  | `fetchPipelines`      | GET   | `/projects/{projectId}/pipelines`       |
| 13  | `fetchPipelineStats`  | GET   | `/projects/{projectId}/pipelines/stats` |
| 14  | `triggerRollback`     | POST  | `/pipelines/{buildId}/rollback`         |

**1. `loginRequest` → `POST /auth/login`**

Request:

```json
{ "email": "admin@neuroforge.dev", "password": "forge123" }
```

Response `200` — signs the user in immediately:

```json
{
  "token": "…opaque JWT/session string…",
  "user": {
    "id": "USR-0001",
    "name": "Priya Sharma",
    "email": "admin@neuroforge.dev",
    "role": "ADMIN",
    "subRole": null,
    "status": "active",
    "createdAt": "2026-01-12"
  }
}
```

Failure: `401` with `{ "message": "Invalid email or password." }`

**2. `registerRequest` → `POST /auth/register`**

Request:

```json
{
  "name": "Ada Lovelace",
  "email": "ada@neuroforge.dev",
  "password": "…plaintext, sent over HTTPS…",
  "role": "EMPLOYEE",
  "subRole": "FRONTEND_DEVELOPER"
}
```

- `subRole` is `null` unless `role` is `EMPLOYEE`.
- The form already enforces 8+ characters with a number before submit is allowed.

Response `201` — same shape as login: `{ "token", "user" }` (auto sign-in).
Failure: `409` with `{ "message": "An account with this email already exists." }`, or `400` with a field-validation message.

**3. `fetchDashboardStats` → `GET /dashboard/stats`**

Response `200`:

```json
{
  "scope": "organization",
  "activeProjects": 3,
  "myProjects": null,
  "totalUsers": 8,
  "totalTeams": 3
}
```

- `activeProjects`: org-wide count of projects with `status === "ACTIVE"` (non-EMPLOYEE dashboard card).
- `myProjects`: count of projects whose `memberIds` include the caller — `null` for non-EMPLOYEE callers; the EMPLOYEE dashboard card ("My Projects") uses this instead.

> ⚠ **Known gap:** the backend currently returns the org-wide total for
> `myProjects` for every caller — see "Backend Team: Known Gaps & Action Items".

**4. `fetchProjects` → `GET /projects`**

Response `200` — `Project[]` (raw shape above — team/lead/members are NOT
hydrated; see the Project shape note). If the caller's `role` is `EMPLOYEE`,
return only projects whose `memberIds` include them — the dashboard "My
Projects" table and the Projects grid render exactly what you return.

> ⚠ **Known gap:** role-based filtering is not implemented yet — every caller
> currently receives every project. See "Backend Team: Known Gaps & Action Items".

**5. `createProject` → `POST /projects`**

Request:

```json
{
  "name": "Phoenix Recovery Tooling",
  "description": "",
  "teamId": "TEAM-001",
  "leadId": null,
  "status": "PLANNING",
  "sprint": "Sprint 14",
  "dueDate": "2026-10-30",
  "memberIds": ["USR-0005", "USR-0007"]
}
```

- `leadId` is `null` when the form leaves the lead "Unassigned".
- The form blocks submit without `name`/`teamId`, but validate server-side anyway.

Response `201` — the created **Project** (same raw shape as `GET /projects` items); the UI prepends it to the grid.
Failure: `400` with `{ "message": "Project name is required." }` or `{ "message": "Please choose a team for this project." }`

**6. `fetchTeams` → `GET /teams`**

Response `200` — `Team[]` (planned shape above — unverified).

**7. `fetchUsers` → `GET /users`**

Response `200` — `User[]`. Powers the admin-only directory table; restrict to callers with `role === "ADMIN"`.

**8. `fetchSprints` → `GET /projects/{projectId}/sprints`**

Path parameter required: the frontend calls this **per project** (Projects page
per card, Sprints page across all projects) and flattens the results —
`client.js` returns `[]` when no `projectId` is supplied. The backend also
exposes `POST /projects/{projectId}/sprints` (sprint creation): `client.js` has
a matching `createSprint()`, but no page calls it yet.

Response `200` — `Sprint[]` (planned shape above — unverified). The frontend
computes "active" from the date range — `startDate ≤ today ≤ endDate` — so
return real dates.

**9. `fetchTasksBySprint` → `GET /projects/{projectId}/tasks/sprint/{sprintId}`**

Response `200` — `Task[]` (planned shape above — unverified), every status
included; the Kanban board groups by `status` client-side.

**10. `createTask` → `POST /projects/{projectId}/tasks`**

Request:

```json
{
  "sprintId": "SPR-1001",
  "title": "Add rate limiting to refresh endpoint",
  "assigneeId": "USR-0005",
  "storyPoints": 3,
  "priority": "HIGH",
  "status": "TODO"
}
```

- `status` presets the board column the task was created from (defaults `TODO`); `assigneeId` may be `null` ("Unassigned").
- The form is only reachable by ADMIN / PROJECT_LEAD / PROJECT_MANAGER — **enforce that on the server too**.

Response `201` — the created **Task** (planned shape above — unverified); the UI appends it to the board.
Failure: `400` with `{ "message": "Task title is required." }` / `{ "message": "Story points must be a positive number." }` / invalid priority; `404` with `{ "message": "Sprint not found." }`

**11. `updateTaskStatus` → `PUT /projects/{projectId}/tasks/{taskId}`**

This single PUT endpoint handles **both** general task updates and status /
progress changes — there is **no separate PATCH endpoint**. The frontend's
`updateTaskStatus(projectId, taskId, statusOrData, maybeProgress)` wraps
`updateTask` and PUTs the payload (e.g. `{ "status": "DONE" }`, optionally with
`progress`) to it.

Request:

```json
{ "status": "DONE" }
```

Response `200` — the updated **Task** (planned shape above — unverified).
Failure: `404` with `{ "message": "Task not found." }`; `400` for an invalid status; **`403` when an EMPLOYEE attempts to move a task not assigned to them** — the UI only shows the control for their own tasks, but the server must re-check ownership per request.

**12. `fetchPipelines` → `GET /projects/{projectId}/pipelines`**

Response `200` — `Build[]` (newest first). The Pipelines page fetches the
project list live (function 4), then calls this endpoint per project.

```json
{
  "id": "BLD-0001",
  "projectId": "PRJ-1036",
  "branch": "main",
  "commitMessage": "feat: wire pipeline stage runner to queue",
  "commitHash": "a3f2c1d",
  "status": "SUCCESS",
  "triggeredBy": "Elena Vasquez",
  "startedAt": "2026-09-09T07:12:00.000Z",
  "durationSeconds": 412,
  "stages": [
    { "name": "Build", "status": "PASSED" },
    { "name": "Test", "status": "PASSED" },
    { "name": "Sonar", "status": "PASSED" },
    { "name": "Docker", "status": "PASSED" },
    { "name": "Deploy", "status": "PASSED" }
  ],
  "isActiveDeployment": true
}
```

- `status` ∈ `SUCCESS` | `FAILED` | `RUNNING`; stage `status` ∈ `PASSED` |
  `FAILED` | `PENDING`; stage `name` is one of `Build`, `Test`, `Sonar`,
  `Docker`, `Deploy` (in that order, exactly five stages).
- `isActiveDeployment` marks the build currently serving traffic — the
  Rollback button hides for it and for any non-`SUCCESS` build.

**13. `fetchPipelineStats` → `GET /projects/{projectId}/pipelines/stats`**

Response `200`:

```json
{
  "buildsToday": 4,
  "successRatePercent": 82,
  "avgDeploySeconds": 386
}
```

**14. `triggerRollback` → `POST /pipelines/{buildId}/rollback`**

Marks the build as its project's active deployment (the previous deployment
stands down). Response `200` — the updated **Build** (same shape as 12) plus
a `message` field. Failure: `404` unknown build; `400` when the build isn't
`SUCCESS` or is already the active deployment; **`403` for any caller without
the ADMIN / PROJECT_LEAD / PROJECT_MANAGER role** — the UI hides the button,
but the server must re-check the role per request.

## Notes & assumptions

- The Milestone 3 pipeline mock data lives in memory inside `client.js` and
  **resets on page refresh** — seeded build history and any rollbacks revert.
  (Milestones 1 & 2 data is real now and persists, backed by the backend.)
- Auth tokens are mock strings; `AuthContext` uses `sessionStorage` (swap to
  `localStorage` there if sessions should survive closing the tab).
- All colors/fonts are Tailwind v4 `@theme` tokens in `src/index.css`
  (`forge-*` graphite surfaces, `ember-*` primary accent, `steel-*` secondary,
  `signal-success/warning/danger` status colors; Space Grotesk / Inter /
  JetBrains Mono). Restyling never requires touching raw hex in components.
