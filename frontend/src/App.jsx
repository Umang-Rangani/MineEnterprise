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
import RoleDetails from './components/company/RoleDetails'
import Forbidden from './components/company/Forbidden'

import CompanyProducts from './components/company/CompanyProducts'
import CompanyCategories from './components/company/CompanyCategories'
import CompanyInventory from './components/company/CompanyInventory'

import CompanyWarehouses from './components/company/CompanyWarehouses'
import WarehouseForm from './components/company/WarehouseForm'
import WarehouseDetails from './components/company/WarehouseDetails'

import CategoryForm from './components/company/CategoryForm'
import CategoryDetails from './components/company/CategoryDetails'

import ProductsForm from './components/company/ProductsForm'
import ProductsDetails from './components/company/ProductsDetails'

import InventoryStockForm from './components/company/InventoryStockForm'
import InventoryHistory from './components/company/InventoryHistory'
import StockTransfer from './components/company/StockTransfer'

import CompanySuppliers from './components/company/CompanySuppliers'
import SupplierForm from './components/company/SupplierForm'
import SupplierDetails from './components/company/SupplierDetails'

import CompanyPurchases from './components/company/CompanyPurchases'
import PurchaseForm from './components/company/PurchaseForm'
import PurchaseDetails from './components/company/PurchaseDetails'
import CompanyPurchaseHistory from './components/company/CompanyPurchaseHistory'
import CompanyGoodsReceipts from './components/company/CompanyGoodsReceipts'
import GoodsReceiptForm from './components/company/GoodsReceiptForm'
import GoodsReceiptDetails from './components/company/GoodsReceiptDetails'
import CompanyCustomers from './components/company/CompanyCustomers'
import CustomerForm from './components/company/CustomerForm'
import CustomerDetails from './components/company/CustomerDetails'
import CompanySales from './components/company/CompanySales'
import SalesOrderForm from './components/company/SalesOrderForm'
import SalesOrderDetails from './components/company/SalesOrderDetails'
import SalesDispatchForm from './components/company/SalesDispatchForm'
import CompanyInvoices from './components/company/CompanyInvoices'
import InvoiceForm from './components/company/InvoiceForm'
import InvoiceDetails from './components/company/InvoiceDetails'
import CompanyPayments from './components/company/CompanyPayments'
import PaymentForm from './components/company/PaymentForm'
import PaymentDetails from './components/company/PaymentDetails'
import ExpenseForm from './components/company/ExpenseForm'
import ExpenseDetails from './components/company/ExpenseDetails'
import CompanyExpenses from './components/company/CompanyExpenses'
import CompanyChartOfAccounts from './components/company/CompanyChartOfAccounts'
import ChartOfAccountForm from './components/company/ChartOfAccountForm'
import CompanyJournalEntries from './components/company/CompanyJournalEntries'
import JournalEntryForm from './components/company/JournalEntryForm'
import JournalEntryDetails from './components/company/JournalEntryDetails'
import CompanyGeneralLedger from './components/company/CompanyGeneralLedger'
import CompanyTrialBalance from './components/company/CompanyTrialBalance'
import CompanyProfitLoss from './components/company/CompanyProfitLoss'
import CompanyBalanceSheet from './components/company/CompanyBalanceSheet'
import CompanyReports from './components/company/CompanyReports'
import SalesReport from './components/company/SalesReport'
import PurchaseReport from './components/company/PurchaseReport'
import InventoryReport from './components/company/InventoryReport'
import StockMovementReport from './components/company/StockMovementReport'
import CustomerReport from './components/company/CustomerReport'
import SupplierReport from './components/company/SupplierReport'
import InvoiceReport from './components/company/InvoiceReport'
import PaymentReport from './components/company/PaymentReport'
import ExpenseReport from './components/company/ExpenseReport'
import SuperAdminAllCompanies from './components/superadmin/SuperAdminAllCompanies'
import SuperAdminCompanyDetails from './components/superadmin/SuperAdminCompanyDetails'
import SuperAdminUsers from './components/superadmin/SuperAdminUsers'
import SuperAdminUserDetails from './components/superadmin/SuperAdminUserDetails'
import SuperAdminActivity from './components/superadmin/SuperAdminActivity'
import SuperAdminSettings from './components/superadmin/SuperAdminSettings'
import NotFound from './components/NotFound'

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

          <Route path="all-companies" element={<SuperAdminAllCompanies />} />
          <Route path="companies/:companyId" element={<SuperAdminCompanyDetails />} />

          <Route path="users" element={<SuperAdminUsers />} />
          <Route path="users/:userId" element={<SuperAdminUserDetails />} />

          <Route path="activity" element={<SuperAdminActivity />} />
          <Route path="settings" element={<SuperAdminSettings />} />
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

          {/* Categories */}
          <Route path="categories" element={<CompanyCategories />} />
          <Route path="categories/new" element={<CategoryForm />} />
          <Route path="categories/:id" element={<CategoryDetails />} />
          <Route path="categories/:id/edit" element={<CategoryForm />} />

          {/* Products */}
          <Route path="products" element={<CompanyProducts />} />
          <Route path="products/new" element={<ProductsForm />} />
          <Route path="products/:id" element={<ProductsDetails />} />
          <Route path="products/:id/edit" element={<ProductsForm />} />

          {/* Inventory */}
          <Route path="inventory" element={<CompanyInventory />} />
          <Route path="inventory/:id/stock-in" element={<InventoryStockForm />} />
          <Route path="inventory/:id/stock-out" element={<InventoryStockForm />} />
          <Route path="inventory/:id/history" element={<InventoryHistory />} />
          <Route path="inventory/stock-transfer" element={<StockTransfer />} />

          {/* Warehouses */}
          <Route path="warehouses" element={<CompanyWarehouses />} />
          <Route path="warehouses/new" element={<WarehouseForm />} />
          <Route path="warehouses/:id" element={<WarehouseDetails />} />
          <Route path="warehouses/:id/edit" element={<WarehouseForm />} />

          {/* Suppliers */}
          <Route path="suppliers" element={<CompanySuppliers />} />
          <Route path="suppliers/new" element={<SupplierForm />} />
          <Route path="suppliers/:id" element={<SupplierDetails />} />
          <Route path="suppliers/:id/edit" element={<SupplierForm />} />

          {/* Purchases */}
          <Route path="purchases" element={<CompanyPurchases />} />
          <Route path="purchases/new" element={<PurchaseForm />} />
          <Route path="purchases/:id" element={<PurchaseDetails />} />
          <Route path="purchases/:id/history" element={<CompanyPurchaseHistory />} />
          <Route path="purchases/:id/edit" element={<PurchaseForm />} />

          {/* Goods Receipts / GRN */}
          <Route path="goods-receipts" element={<CompanyGoodsReceipts />} />
          <Route path="goods-receipts/new" element={<GoodsReceiptForm />} />
          <Route path="goods-receipts/:id/edit" element={<GoodsReceiptForm />} />
          <Route path="goods-receipts/:id" element={<GoodsReceiptDetails />} />

          {/* Customers */}
          <Route path="customers" element={<CompanyCustomers />} />
          <Route path="customers/new" element={<CustomerForm />} />
          <Route path="customers/:id" element={<CustomerDetails />} />
          <Route path="customers/:id/edit" element={<CustomerForm />} />

          {/* Sales */}
          <Route path="sales" element={<CompanySales />} />
          <Route path="sales/new" element={<SalesOrderForm />} />
          <Route path="sales/:id" element={<SalesOrderDetails />} />
          <Route path="sales/:id/edit" element={<SalesOrderForm />} />
          <Route path="sales/:id/dispatch" element={<SalesDispatchForm />} />

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

          {/* Accounts */}
          <Route path="chart-of-accounts" element={<CompanyChartOfAccounts />} />
          <Route path="chart-of-accounts/new" element={<ChartOfAccountForm />} />
          <Route path="chart-of-accounts/:id/edit" element={<ChartOfAccountForm />} />

          {/* Journal Entries */}
          <Route path="journal-entries" element={<CompanyJournalEntries />} />
          <Route path="journal-entries/new" element={<JournalEntryForm />} />
          <Route path="journal-entries/:id" element={<JournalEntryDetails />} />
          <Route path="journal-entries/:id/edit" element={<JournalEntryForm />} />

          {/* General Ledger */}
          <Route path="general-ledger" element={<CompanyGeneralLedger />} />

          <Route path="trial-balance" element={<CompanyTrialBalance />} />

          {/* Financial Statements */}
          <Route path="financial-statements/profit-loss" element={<CompanyProfitLoss />} />
          <Route path="financial-statements/balance-sheet" element={<CompanyBalanceSheet />} />

          {/* Reports */}
          <Route path="reports" element={<CompanyReports />} />
          <Route path="reports/sales" element={<SalesReport />} />
          <Route path="reports/purchases" element={<PurchaseReport />} />
          <Route path="reports/inventory" element={<InventoryReport />} />
          <Route path="reports/stock-movements" element={<StockMovementReport />} />
          <Route path="reports/customers" element={<CustomerReport />} />
          <Route path="reports/suppliers" element={<SupplierReport />} />
          <Route path="reports/invoices" element={<InvoiceReport />} />
          <Route path="reports/payments" element={<PaymentReport />} />
          <Route path="reports/expenses" element={<ExpenseReport />} />
        </Route>
      </Route>

      {/* Forbidden */}
      <Route path="/forbidden" element={<Forbidden />} />

      {/* 404 Not Found */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

// આગળનો Issue #8: Default Vite page title client ને યોગ્ય MineERP title થી બદલવો.
