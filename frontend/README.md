# NeuroForge Nexus — Frontend

**Milestone 1: Project & User Management**

Dark "forge / foundry" themed SDLC & project-management frontend. Built with
React 19 + Vite, React Router, Tailwind CSS v4 (`@tailwindcss/vite`), Axios and
lucide-react. It runs entirely on a **mock API layer** — no backend required.

---

## Quick start

```bash
cd frontend
npm install
npm run dev      # → http://localhost:5173
```

Other scripts: `npm run build` (production build → `dist/`), `npm run preview`,
`npm run lint` (oxlint).

## Demo credentials

All seeded accounts share the password **`forge123`**.
(The Login page shows this hint and has a one-click *"Fill demo credentials"* button.)

| Email | Role | Sub-role |
| --- | --- | --- |
| `admin@neuroforge.dev` | ADMIN | — |
| `marcus.lee@neuroforge.dev` | PROJECT_LEAD | — |
| `elena.vasquez@neuroforge.dev` | PROJECT_MANAGER | — |
| `tomiwa.okafor@neuroforge.dev` | TEAM_LEAD | — |
| `ravi.menon@neuroforge.dev` | EMPLOYEE | Developer |
| `sara.lindqvist@neuroforge.dev` | EMPLOYEE | Tester |
| `daniel.cho@neuroforge.dev` | EMPLOYEE | Senior |
| `amara.diallo@neuroforge.dev` | EMPLOYEE | Junior |

- Log in as **admin@neuroforge.dev** to see everything, including the
  admin-only user table on the Teams page and the "New project" button.
- Log in as **ravi.menon@neuroforge.dev** to see the EMPLOYEE experience —
  the dashboard shows **"My Projects"** (personal stats) instead of
  "Active Projects".
- You can also **register** new accounts; choosing EMPLOYEE reveals the
  sub-role dropdown (Developer / Tester / Junior / Senior).

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
- Roles: `ADMIN`, `PROJECT_LEAD`, `PROJECT_MANAGER`, `TEAM_LEAD`, `EMPLOYEE`
  (+ sub-role for EMPLOYEE only)

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
├── index.css              ← Tailwind v4 @theme design tokens (colors/fonts)
├── App.jsx                ← route map
└── main.jsx               ← providers (BrowserRouter + AuthProvider)
```

---

## Connecting the real backend later

Everything backend-related is isolated in **`src/api/client.js`** — pages
import its functions and never touch axios themselves, so swapping to the real
API changes **one file only**.

1. **Point the client at your API** — `frontend/.env` (git-ignored) already ships
   with the default; `.env.example` is the committed template:

   ```ini
   VITE_API_BASE_URL=http://localhost:8080/api
   ```

   `src/api/client.js` reads it via `import.meta.env.VITE_API_BASE_URL` — change
   the value, restart the dev server, done.

2. **The axios instance is already set up.** `client.js` exports a configured
   `http` instance that (a) attaches the `Authorization: Bearer <token>`
   header from sessionStorage and (b) handles global 401s by clearing the
   session and redirecting to `/login`.

3. **Swap each mock body for the documented axios call.** Every function has a
   `REAL BACKEND:` comment showing the exact replacement:

   | Function | Real call |
   | --- | --- |
   | `loginRequest` | `POST /auth/login` |
   | `registerRequest` | `POST /auth/register` |
   | `fetchDashboardStats(user)` | `GET /dashboard/stats` |
   | `fetchProjects(user)` | `GET /projects` |
   | `createProject(payload)` | `POST /projects` |
   | `fetchTeams()` | `GET /teams` |
   | `fetchUsers()` | `GET /users` |
   | `fetchSprints(projectId?)` | `GET /sprints?projectId=…` |
   | `fetchTasksBySprint(sprintId)` | `GET /sprints/{sprintId}/tasks` |
   | `createTask(payload)` | `POST /tasks` |
   | `updateTaskStatus(taskId, newStatus)` | `PATCH /tasks/{taskId}/status` |

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

- `role` ∈ `ADMIN` | `PROJECT_LEAD` | `PROJECT_MANAGER` | `TEAM_LEAD` | `EMPLOYEE`
- `subRole` is `null` except for `EMPLOYEE`, where it ∈ `Developer` | `Tester` | `Junior` | `Senior`

**Project** (hydrated — the UI needs the resolved `team`, `lead` and `members`):

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
  "createdAt": "2026-06-01",
  "team": "Core Forge",
  "lead": "Marcus Lee",
  "members": ["…User objects, same shape as above…"]
}
```

- `status` ∈ `PLANNING` | `ACTIVE` | `BLOCKED` | `COMPLETED`
- `leadId` may be `null` → `lead` renders as `"Unassigned"`; `sprint`/`dueDate` may be `""`

**Team** (hydrated):

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

**Task** (hydrated — the UI needs the resolved `assignee` user object):

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

**Sprint** (hydrated — the UI needs the resolved `project` name):

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

| # | `client.js` function | HTTP | Path |
| --- | --- | --- | --- |
| 1 | `loginRequest` | POST | `/auth/login` |
| 2 | `registerRequest` | POST | `/auth/register` |
| 3 | `fetchDashboardStats` | GET | `/dashboard/stats` |
| 4 | `fetchProjects` | GET | `/projects` |
| 5 | `createProject` | POST | `/projects` |
| 6 | `fetchTeams` | GET | `/teams` |
| 7 | `fetchUsers` | GET | `/users` |
| 8 | `fetchSprints` | GET | `/sprints?projectId=…` |
| 9 | `fetchTasksBySprint` | GET | `/sprints/{sprintId}/tasks` |
| 10 | `createTask` | POST | `/tasks` |
| 11 | `updateTaskStatus` | PATCH | `/tasks/{taskId}/status` |

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
  "subRole": "Developer"
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

**4. `fetchProjects` → `GET /projects`**

Response `200` — `Project[]` (hydrated shape). If the caller's `role` is `EMPLOYEE`, return only projects whose `memberIds` include them — the dashboard "My Projects" table and the Projects grid render exactly what you return.

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

Response `201` — the created **Project** (hydrated, same shape as `GET /projects` items); the UI prepends it to the grid.
Failure: `400` with `{ "message": "Project name is required." }` or `{ "message": "Please choose a team for this project." }`

**6. `fetchTeams` → `GET /teams`**

Response `200` — `Team[]` (hydrated shape above).

**7. `fetchUsers` → `GET /users`**

Response `200` — `User[]`. Powers the admin-only directory table; restrict to callers with `role === "ADMIN"`.

**8. `fetchSprints` → `GET /sprints`**

Optional query: `?projectId=PRJ-1036` scopes the list to one project (the Projects page uses this per card); no query returns every sprint (the Sprints page).

Response `200` — `Sprint[]` (hydrated shape above). The frontend computes "active" from the date range — `startDate ≤ today ≤ endDate` — so return real dates.

**9. `fetchTasksBySprint` → `GET /sprints/{sprintId}/tasks`**

Response `200` — `Task[]` (hydrated shape above), every status included; the Kanban board groups by `status` client-side.

**10. `createTask` → `POST /tasks`**

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

Response `201` — the created **Task** (hydrated); the UI appends it to the board.
Failure: `400` with `{ "message": "Task title is required." }` / `{ "message": "Story points must be a positive number." }` / invalid priority; `404` with `{ "message": "Sprint not found." }`

**11. `updateTaskStatus` → `PATCH /tasks/{taskId}/status`**

Request:

```json
{ "status": "DONE" }
```

Response `200` — the updated **Task** (hydrated).
Failure: `404` with `{ "message": "Task not found." }`; `400` for an invalid status; **`403` when an EMPLOYEE attempts to move a task not assigned to them** — the UI only shows the control for their own tasks, but the server must re-check ownership per request.

## Notes & assumptions

- The mock database lives in memory and **resets on page refresh** — register
  and log in again after a reload (sessionStorage tokens survive the refresh,
  so you may need to sign out/in after adding new mock data).
- Auth tokens are mock strings; `AuthContext` uses `sessionStorage` (swap to
  `localStorage` there if sessions should survive closing the tab).
- All colors/fonts are Tailwind v4 `@theme` tokens in `src/index.css`
  (`forge-*` graphite surfaces, `ember-*` primary accent, `steel-*` secondary,
  `signal-success/warning/danger` status colors; Space Grotesk / Inter /
  JetBrains Mono). Restyling never requires touching raw hex in components.
