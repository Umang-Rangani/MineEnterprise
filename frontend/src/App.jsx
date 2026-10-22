import { Navigate, Route, Routes } from 'react-router-dom'

import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import HeroPage from './pages/HeroPage'
import CompanyRegistration from './pages/CompanyRegistration'

import SuperAdminDashboard from './components/superadmin/SuperAdminDashboard'
import SuperAdminRoute from './components/SuperAdminRoute'
import SuperAdminCompanies from './components/superadmin/SuperAdminCompanies'

import CompaniesRoute from './components/company/CompaniesRoute'
import CompanyDashboard from './components/company/CompanyDashboard'

import CompanyEmployees from './components/company/CompanyEmployees'
import CompanyEmployeeDetails from './components/company/CompanyEmployeeDetails'
import EmployeeForm from './components/company/EmployeeForm'

import CompanyRoles from './components/company/CompanyRoles'
import RoleForm from './components/company/RoleForm'

import CompanyProducts from './components/company/CompanyProducts'
import CompanyCategories from './components/company/CompanyCategories'
import CompanyInventory from './components/company/CompanyInventory'

import CompanySuppliers from './components/company/CompanySuppliers'
import CompanyCustomers from './components/company/CompanyCustomers'
import CompanyPurchases from './components/company/CompanyPurchases'
import CompanyOrders from './components/company/CompanyOrders'
import CompanyInvoices from './components/company/CompanyInvoices'
import CompanyPayments from './components/company/CompanyPayments'
import CompanyExpenses from './components/company/CompanyExpenses'
import CompanyWarehouses from './components/company/CompanyWarehouses'
import CompanyReports from './components/company/CompanyReports'
import CompanySettings from './components/company/CompanySettings'

export default function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<HeroPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register-company" element={<CompanyRegistration />} />

      {/* SuperAdmin Routes */}
      <Route element={<ProtectedRoute allowedRoles={['SuperAdmin']} />}>
        <Route path="/superadmin" element={<SuperAdminRoute />}>
          <Route index element={<SuperAdminDashboard />} />
          <Route path="companies" element={<SuperAdminCompanies />} />
        </Route>
      </Route>

      {/* Company Workspace Routes */}
      <Route element={<ProtectedRoute allowedRoles={['CompanyAdmin', 'Employee']} />}>
        <Route path="/company" element={<CompaniesRoute />}>
          {/* Dashboard */}
          <Route index element={<CompanyDashboard />} />

          {/* Products & Inventory */}
          <Route path="products" element={<CompanyProducts />} />
          <Route path="categories" element={<CompanyCategories />} />
          <Route path="inventory" element={<CompanyInventory />} />

          {/* Employees */}
          <Route path="employees" element={<CompanyEmployees />} />
          <Route path="employees/new" element={<EmployeeForm />} />
          <Route path="employees/:id" element={<CompanyEmployeeDetails />} />
          <Route path="employees/:id/edit" element={<EmployeeForm />} />

          {/* Roles & Permissions */}
          <Route path="roles" element={<CompanyRoles />} />
          <Route path="roles/new" element={<RoleForm />} />
          <Route path="roles/:id/edit" element={<RoleForm />} />

          {/* Suppliers */}
          <Route path="suppliers" element={<CompanySuppliers />} />

          {/* Customers */}
          <Route path="customers" element={<CompanyCustomers />} />

          {/* Purchase Management */}
          <Route path="purchases" element={<CompanyPurchases />} />

          {/* Sales & Orders */}
          <Route path="orders" element={<CompanyOrders />} />

          {/* Invoices */}
          <Route path="invoices" element={<CompanyInvoices />} />

          {/* Payments */}
          <Route path="payments" element={<CompanyPayments />} />

          {/* Expenses */}
          <Route path="expenses" element={<CompanyExpenses />} />

          {/* Warehouse */}
          <Route path="warehouses" element={<CompanyWarehouses />} />

          {/* Reports */}
          <Route path="reports" element={<CompanyReports />} />

          {/* Company Settings */}
          <Route path="settings" element={<CompanySettings />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
