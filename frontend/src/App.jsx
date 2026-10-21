import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import HeroPage from './pages/HeroPage'
import SuperAdminDashboard from './components/superadmin/SuperAdminDashboard'
import SuperAdminRoute from './components/SuperAdminRoute'
import CompanyRegistration from './pages/CompanyRegistration'
import SuperAdminCompanies from './components/superadmin/SuperAdminCompanies'
import CompaniesRoute from './components/company/CompaniesRoute'
import CompanyDashboard from './components/company/CompanyDashboard'

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
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['CompanyAdmin']} />}>
        <Route path="/company" element={<CompaniesRoute />}>
          <Route index element={<CompanyDashboard />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
