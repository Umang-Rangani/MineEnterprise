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
import SupplierForm from './components/company/SupplierForm'
import SupplierDetails from './components/company/SupplierDetails'
import CustomerForm from './components/company/CustomerForm'
import CustomerDetails from './components/company/CustomerDetails'
import PurchaseForm from './components/company/PurchaseForm'
import PurchaseDetails from './components/company/PurchaseDetails'
import OrderForm from './components/company/OrderForm'
import OrderDetails from './components/company/OrderDetails'
import InvoiceForm from './components/company/InvoiceForm'
import InvoiceDetails from './components/company/InvoiceDetails'
import PaymentForm from './components/company/PaymentForm'
import PaymentDetails from './components/company/PaymentDetails'
import ExpenseForm from './components/company/ExpenseForm'
import ExpenseDetails from './components/company/ExpenseDetails'
import WarehouseForm from './components/company/WarehouseForm'
import WarehouseDetails from './components/company/WarehouseDetails'
import RoleDetails from './components/company/RoleDetails'

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

          {/* Employees */}
          <Route path="employees" element={<CompanyEmployees />} />
          <Route path="employees/new" element={<EmployeeForm />} />
          <Route path="employees/:id" element={<CompanyEmployeeDetails />} />
          <Route path="employees/:id/edit" element={<EmployeeForm />} />

          {/* Roles & Permissions */}
          <Route path="roles" element={<CompanyRoles />} />
          <Route path="roles/new" element={<RoleForm />} />
          <Route path="roles/:id" element={<RoleDetails />} />
          <Route path="roles/:id/edit" element={<RoleForm />} />

          {/* Products & Inventory */}
          <Route path="products" element={<CompanyProducts />} />
          <Route path="categories" element={<CompanyCategories />} />
          <Route path="inventory" element={<CompanyInventory />} />

          {/* Suppliers */}
          <Route path="suppliers" element={<CompanySuppliers />} />
          <Route path="suppliers/new" element={<SupplierForm />} />
          <Route path="suppliers/:id" element={<SupplierDetails />} />
          <Route path="suppliers/:id/edit" element={<SupplierForm />} />

          {/* Customers */}
          <Route path="customers" element={<CompanyCustomers />} />
          <Route path="customers/new" element={<CustomerForm />} />
          <Route path="customers/:id" element={<CustomerDetails />} />
          <Route path="customers/:id/edit" element={<CustomerForm />} />

          {/* Purchase Management */}
          <Route path="purchases" element={<CompanyPurchases />} />
          <Route path="purchases/new" element={<PurchaseForm />} />
          <Route path="purchases/:id" element={<PurchaseDetails />} />
          <Route path="purchases/:id/edit" element={<PurchaseForm />} />

          {/* Sales & Orders */}
          <Route path="orders" element={<CompanyOrders />} />
          <Route path="orders/new" element={<OrderForm />} />
          <Route path="orders/:id" element={<OrderDetails />} />
          <Route path="orders/:id/edit" element={<OrderForm />} />

          {/* Invoices */}
          <Route path="invoices" element={<CompanyInvoices />} />
          <Route path="invoices/new" element={<InvoiceForm />} />
          <Route path="invoices/:id" element={<InvoiceDetails />} />
          <Route path="invoices/:id/edit" element={<InvoiceForm />} />

          {/* Payments */}
          <Route path="payments" element={<CompanyPayments />} />
          <Route path="payments/new" element={<PaymentForm />} />
          <Route path="payments/:id" element={<PaymentDetails />} />
          <Route path="payments/:id/edit" element={<PaymentForm />} />

          {/* Expenses */}
          <Route path="expenses" element={<CompanyExpenses />} />
          <Route path="expenses/new" element={<ExpenseForm />} />
          <Route path="expenses/:id" element={<ExpenseDetails />} />
          <Route path="expenses/:id/edit" element={<ExpenseForm />} />

          {/* Warehouses */}
          <Route path="warehouses" element={<CompanyWarehouses />} />
          <Route path="warehouses/new" element={<WarehouseForm />} />
          <Route path="warehouses/:id" element={<WarehouseDetails />} />
          <Route path="warehouses/:id/edit" element={<WarehouseForm />} />

          {/* Reports */}
          {/* <Route path="reports" element={<CompanyReports />} /> */}

          {/* Company Settings */}
          {/* <Route path="settings" element={<CompanySettings />} /> */}
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
