import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import HeroPage from './pages/HeroPage'
import SuperAdminDashboard from './components/superadmin/SuperAdminDashboard'
import SuperAdminCompanies from './components/superadmin/SuperAdminCompanies'
import SuperAdminUsers from './components/superadmin/SuperAdminUsers'
import SuperAdminActivity from './components/superadmin/SuperAdminActivity'
import SuperAdminSettings from './components/superadmin/SuperAdminSettings'
import SuperAdminRoute from './components/SuperAdminRoute'
import CompanyRegistration from './pages/CompanyRegistration'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HeroPage />} />

      <Route path="/login" element={<Login />} />

      <Route path="/register-company" element={<CompanyRegistration />} />

      <Route element={<ProtectedRoute allowedRoles={['SuperAdmin']} />}>
        <Route path="/superadmin" element={<SuperAdminRoute />}>
          <Route index element={<SuperAdminDashboard />} />
          <Route path="companies" element={<SuperAdminCompanies />} />
          <Route path="users" element={<SuperAdminUsers />} />
          <Route path="activity" element={<SuperAdminActivity />} />
          <Route path="settings" element={<SuperAdminSettings />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
