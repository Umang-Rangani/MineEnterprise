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
import CompanyEmployees from './components/company/CompanyEmployees'
import CompanyRoles from './components/company/CompanyRoles'
import CompanyEmployeeDetails from './components/company/CompanyEmployeeDetails'
import CompanyProducts from './components/company/CompanyProducts'
import CompanyCategories from './components/company/CompanyCategories'
import CompanyInventory from './components/company/CompanyInventory'
import EmployeeForm from './components/company/EmployeeForm'

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

      <Route element={<ProtectedRoute allowedRoles={['CompanyAdmin', 'Employee']} />}>
        <Route path="/company" element={<CompaniesRoute />}>
          <Route index element={<CompanyDashboard />} />
          <Route path="categories" element={<CompanyCategories />} />
          <Route path="products" element={<CompanyProducts />} />
          <Route path="inventory" element={<CompanyInventory />} />
          <Route path="employees" element={<CompanyEmployees />} />

          <Route path="/company/employees/new" element={<EmployeeForm />} />
          <Route path="/company/employees/:id/edit" element={<EmployeeForm />} />

          <Route path="employees/:id" element={<CompanyEmployeeDetails />} />
          <Route path="roles" element={<CompanyRoles />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
