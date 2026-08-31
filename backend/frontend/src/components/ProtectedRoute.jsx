import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Wraps routes that require a signed-in user.
 * Unauthenticated visitors are redirected to /login, and sent back
 * to their original destination after signing in.
 */
export function ProtectedRoute() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}

/**
 * Wraps routes restricted to specific roles.
 * Usage: <Route element={<RoleRoute roles={['ADMIN']} />}> … </Route>
 * Unauthorized (but authenticated) users are redirected to the dashboard.
 */
export function RoleRoute({ roles = [] }) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (!roles.includes(user.role)) {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}

/**
 * Wraps /login and /register so already-authenticated users
 * skip straight to the dashboard.
 */
export function PublicOnlyRoute({ children }) {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }
  return children
}
