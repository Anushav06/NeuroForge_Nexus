import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Login from './pages/Login.jsx'
import Pipelines from './pages/Pipelines.jsx'
import Releases from './pages/Releases.jsx'
import Deployments from './pages/Deployments.jsx'
import Monitoring from './pages/Monitoring.jsx'
import Repository from './pages/Repository.jsx'
import BugReports from './pages/BugReports.jsx'
import Projects from './pages/Projects.jsx'
import Register from './pages/Register.jsx'
import {SprintBoard} from './pages/SprintBoard.jsx'
import Sprints from './pages/Sprints.jsx'
import Teams from './pages/Teams.jsx'
import TeamDetail from './pages/TeamDetail.jsx'

export default function App() {
  return (
    <Routes>
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

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="projects" element={<Projects />} />
          <Route path="sprints" element={<Sprints />} />
          <Route path="sprints/:sprintId" element={<SprintBoard />} />
          <Route path="pipelines" element={<Pipelines />} />
          <Route path="releases" element={<Releases />} />
          <Route path="deployments" element={<Deployments />} />
          <Route path="monitoring" element={<Monitoring />} />
          <Route path="repository" element={<Repository />} />
          <Route path="bugs" element={<BugReports />} />
          <Route path="teams" element={<Teams />} />
          <Route path="teams/:teamId" element={<TeamDetail />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}