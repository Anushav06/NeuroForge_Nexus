import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Login from './pages/Login.jsx'
import Projects from './pages/Projects.jsx'
import Register from './pages/Register.jsx'
import Teams from './pages/Teams.jsx'

/**
 * Route map:
 *   /login, /register → public (authenticated users are bounced to /)
 *   /, /projects, /teams → behind ProtectedRoute (redirects to /login)
 *
 * Role-gated routes: wrap any <Route> in <RoleRoute roles={[...]}>
 * (see src/components/ProtectedRoute.jsx). Milestone 1 gates sensitive
 * content inline instead — the New-project form (ADMIN / PROJECT_LEAD /
 * PROJECT_MANAGER) and the Teams user table (ADMIN).
 */
export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <Register />
          </PublicOnlyRoute>
        }
      />

      {/* Authenticated app shell */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="projects" element={<Projects />} />
          <Route path="teams" element={<Teams />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
