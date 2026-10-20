import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import HeroPage from './pages/HeroPage'
import SuperAdminDashboard from './components/superadmin/SuperAdminDashboard'
import SuperAdminRoute from './components/SuperAdminRoute'
import CompanyRegistration from './pages/CompanyRegistration'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HeroPage />} />

      <Route path="/login" element={<Login />} />


      <Route path="/aa" element={<CompanyRegistration />} />


      <Route element={<ProtectedRoute allowedRoles={['SuperAdmin']} />}>
        <Route path="/superadmin" element={<SuperAdminRoute />}>
          <Route index element={<SuperAdminDashboard />} />
        
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
