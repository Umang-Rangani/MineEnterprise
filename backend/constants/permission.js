const ROLES = {
  USER: 'User',
  SUPER_ADMIN: 'SuperAdmin',
  COMPANY_ADMIN: 'CompanyAdmin',
  EMPLOYEE: 'Employee',
  MANAGER: 'Manager',
  ACCOUNTANT: 'Accountant',
  INVENTORY_MANAGER: 'InventoryManager',
  SALES_MANAGER: 'SalesManager',
}

const SYSTEM_ROLES = [ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN, ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.ACCOUNTANT, ROLES.INVENTORY_MANAGER, ROLES.SALES_MANAGER]

const PLATFORM_ROLES = [ROLES.SUPER_ADMIN]

const COMPANY_ADMIN_ROLES = [ROLES.COMPANY_ADMIN]

const EMPLOYEE_ROLES = [ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.ACCOUNTANT, ROLES.INVENTORY_MANAGER, ROLES.SALES_MANAGER]

const ROLE_HIERARCHY = [ROLES.EMPLOYEE, ROLES.ACCOUNTANT, ROLES.INVENTORY_MANAGER, ROLES.SALES_MANAGER, ROLES.MANAGER, ROLES.COMPANY_ADMIN, ROLES.SUPER_ADMIN]

const SECTION_KEYS = {
  Dashboard: 'Dashboard',
  Employee: 'Employee',
  Role: 'Role',
  Category: 'Category',
  Product: 'Product',
  Inventory: 'Inventory',
  Warehouse: 'Warehouse',
  Supplier: 'Supplier',
  Customer: 'Customer',
  Purchase: 'Purchase',
  Sales: 'Sales',
  Invoice: 'Invoice',
  Payment: 'Payment',
  Expense: 'Expense',
  Accounting: 'Accounting',
  Reports: 'Reports',
  Settings: 'Settings',
}

const ACTIONS = {
  Dashboard: {
    VIEW: 'dashboard:view',
  },

  Employee: {
    LIST: 'employee:list',
    VIEW: 'employee:view',
    CREATE: 'employee:create',
    UPDATE: 'employee:update',
    UPDATE_STATUS: 'employee:update-status',
    DELETE: 'employee:delete',
    ASSIGN_ROLE: 'employee:assign-role',
    MANAGE_PERMISSIONS: 'employee:manage-permissions',
    EXPORT: 'employee:export',
  },

  Role: {
    LIST: 'role:list',
    VIEW: 'role:view',
    CREATE: 'role:create',
    UPDATE: 'role:update',
    UPDATE_STATUS: 'role:update-status',
    DELETE: 'role:delete',
  },

  Category: {
    LIST: 'category:list',
    VIEW: 'category:view',
    CREATE: 'category:create',
    UPDATE: 'category:update',
    UPDATE_STATUS: 'category:update-status',
    DELETE: 'category:delete',
    EXPORT: 'category:export',
  },

  Product: {
    LIST: 'product:list',
    VIEW: 'product:view',
    CREATE: 'product:create',
    UPDATE: 'product:update',
    UPDATE_STATUS: 'product:update-status',
    DELETE: 'product:delete',
    EXPORT: 'product:export',
  },

  Inventory: {
    VIEW: 'inventory:view',
    VIEW_STOCK: 'inventory:view-stock',
    ADJUST_STOCK: 'inventory:adjust-stock',
    TRANSFER_STOCK: 'inventory:transfer-stock',
    VIEW_HISTORY: 'inventory:view-history',
  },

  Warehouse: {
    LIST: 'warehouse:list',
    VIEW: 'warehouse:view',
    CREATE: 'warehouse:create',
    UPDATE: 'warehouse:update',
    UPDATE_STATUS: 'warehouse:update-status',
    DELETE: 'warehouse:delete',
    EXPORT: 'warehouse:export',
  },

  Supplier: {
    LIST: 'supplier:list',
    VIEW: 'supplier:view',
    CREATE: 'supplier:create',
    UPDATE: 'supplier:update',
    DELETE: 'supplier:delete',
  },

  Customer: {
    LIST: 'customer:list',
    VIEW: 'customer:view',
    CREATE: 'customer:create',
    UPDATE: 'customer:update',
    DELETE: 'customer:delete',
  },

  Purchase: {
    LIST: 'purchase:list',
    VIEW: 'purchase:view',
    CREATE: 'purchase:create',
    UPDATE: 'purchase:update',
    DELETE: 'purchase:delete',
    APPROVE: 'purchase:approve',
    CANCEL: 'purchase:cancel',
  },

  Sales: {
    LIST: 'sales:list',
    VIEW: 'sales:view',
    CREATE: 'sales:create',
    UPDATE: 'sales:update',
    DELETE: 'sales:delete',
    APPROVE: 'sales:approve',
    CANCEL: 'sales:cancel',
  },

  Invoice: {
    LIST: 'invoice:list',
    VIEW: 'invoice:view',
    CREATE: 'invoice:create',
    UPDATE: 'invoice:update',
    DELETE: 'invoice:delete',
    DOWNLOAD: 'invoice:download',
  },

  Payment: {
    LIST: 'payment:list',
    VIEW: 'payment:view',
    RECORD: 'payment:record',
    UPDATE: 'payment:update',
    REFUND: 'payment:refund',
  },

  Expense: {
    LIST: 'expense:list',
    VIEW: 'expense:view',
    CREATE: 'expense:create',
    UPDATE: 'expense:update',
    DELETE: 'expense:delete',
    APPROVE: 'expense:approve',
  },

  Accounting: {
    VIEW: 'accounting:view',
    VIEW_LEDGER: 'accounting:view-ledger',
    MANAGE_ACCOUNTS: 'accounting:manage-accounts',
    JOURNAL_ENTRY: 'accounting:journal-entry',
    RECONCILE: 'accounting:reconcile',
  },

  Reports: {
    VIEW: 'reports:view',
    EXPORT: 'reports:export',
    FINANCIAL: 'reports:financial',
    INVENTORY: 'reports:inventory',
    SALES: 'reports:sales',
    PURCHASE: 'reports:purchase',
  },

  Settings: {
    VIEW: 'settings:view',
    UPDATE_COMPANY: 'settings:update-company',
    UPDATE_PREFERENCES: 'settings:update-preferences',
  },
}

const ALL_SECTION_ACTIONS = Object.fromEntries(Object.entries(ACTIONS).map(([section, actions]) => [SECTION_KEYS[section], Object.values(actions)]))

const READ_ONLY_PERMISSIONS = {
  [SECTION_KEYS.Dashboard]: [ACTIONS.Dashboard.VIEW],
  [SECTION_KEYS.Product]: [ACTIONS.Product.LIST, ACTIONS.Product.VIEW],
  [SECTION_KEYS.Category]: [ACTIONS.Category.LIST, ACTIONS.Category.VIEW],
  [SECTION_KEYS.Inventory]: [ACTIONS.Inventory.VIEW, ACTIONS.Inventory.VIEW_STOCK, ACTIONS.Inventory.VIEW_HISTORY],
  [SECTION_KEYS.Warehouse]: [ACTIONS.Warehouse.LIST, ACTIONS.Warehouse.VIEW],
  [SECTION_KEYS.Supplier]: [ACTIONS.Supplier.LIST, ACTIONS.Supplier.VIEW],
  [SECTION_KEYS.Customer]: [ACTIONS.Customer.LIST, ACTIONS.Customer.VIEW],
}

const ROLE_DEFAULT_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: null,

  [ROLES.COMPANY_ADMIN]: ALL_SECTION_ACTIONS,

  [ROLES.MANAGER]: {
    ...READ_ONLY_PERMISSIONS,
    [SECTION_KEYS.Employee]: [ACTIONS.Employee.LIST, ACTIONS.Employee.VIEW],
    [SECTION_KEYS.Role]: [ACTIONS.Role.LIST, ACTIONS.Role.VIEW, ACTIONS.Role.UPDATE_STATUS],
    [SECTION_KEYS.Purchase]: Object.values(ACTIONS.Purchase),
    [SECTION_KEYS.Sales]: Object.values(ACTIONS.Sales),
    [SECTION_KEYS.Invoice]: Object.values(ACTIONS.Invoice),
    [SECTION_KEYS.Reports]: Object.values(ACTIONS.Reports),
  },

  [ROLES.ACCOUNTANT]: {
    [SECTION_KEYS.Dashboard]: [ACTIONS.Dashboard.VIEW],
    [SECTION_KEYS.Customer]: [ACTIONS.Customer.LIST, ACTIONS.Customer.VIEW],
    [SECTION_KEYS.Supplier]: [ACTIONS.Supplier.LIST, ACTIONS.Supplier.VIEW],
    [SECTION_KEYS.Sales]: [ACTIONS.Sales.LIST, ACTIONS.Sales.VIEW],
    [SECTION_KEYS.Purchase]: [ACTIONS.Purchase.LIST, ACTIONS.Purchase.VIEW],
    [SECTION_KEYS.Invoice]: Object.values(ACTIONS.Invoice),
    [SECTION_KEYS.Payment]: Object.values(ACTIONS.Payment),
    [SECTION_KEYS.Expense]: Object.values(ACTIONS.Expense),
    [SECTION_KEYS.Accounting]: Object.values(ACTIONS.Accounting),
    [SECTION_KEYS.Reports]: [ACTIONS.Reports.VIEW, ACTIONS.Reports.EXPORT, ACTIONS.Reports.FINANCIAL, ACTIONS.Reports.SALES, ACTIONS.Reports.PURCHASE],
  },

  [ROLES.INVENTORY_MANAGER]: {
    [SECTION_KEYS.Dashboard]: [ACTIONS.Dashboard.VIEW],
    [SECTION_KEYS.Product]: Object.values(ACTIONS.Product),
    [SECTION_KEYS.Category]: Object.values(ACTIONS.Category),
    [SECTION_KEYS.Inventory]: Object.values(ACTIONS.Inventory),
    [SECTION_KEYS.Warehouse]: Object.values(ACTIONS.Warehouse),
    [SECTION_KEYS.Supplier]: [ACTIONS.Supplier.LIST, ACTIONS.Supplier.VIEW, ACTIONS.Supplier.CREATE, ACTIONS.Supplier.UPDATE],
    [SECTION_KEYS.Purchase]: [ACTIONS.Purchase.LIST, ACTIONS.Purchase.VIEW, ACTIONS.Purchase.CREATE, ACTIONS.Purchase.UPDATE],
    [SECTION_KEYS.Reports]: [ACTIONS.Reports.VIEW, ACTIONS.Reports.INVENTORY, ACTIONS.Reports.PURCHASE],
  },

  [ROLES.SALES_MANAGER]: {
    [SECTION_KEYS.Dashboard]: [ACTIONS.Dashboard.VIEW],
    [SECTION_KEYS.Product]: [ACTIONS.Product.LIST, ACTIONS.Product.VIEW],
    [SECTION_KEYS.Customer]: Object.values(ACTIONS.Customer),
    [SECTION_KEYS.Sales]: Object.values(ACTIONS.Sales),
    [SECTION_KEYS.Invoice]: Object.values(ACTIONS.Invoice),
    [SECTION_KEYS.Payment]: [ACTIONS.Payment.LIST, ACTIONS.Payment.VIEW, ACTIONS.Payment.RECORD],
    [SECTION_KEYS.Reports]: [ACTIONS.Reports.VIEW, ACTIONS.Reports.SALES, ACTIONS.Reports.EXPORT],
  },

  [ROLES.EMPLOYEE]: {
    [SECTION_KEYS.Dashboard]: [ACTIONS.Dashboard.VIEW],
    [SECTION_KEYS.Product]: [ACTIONS.Product.LIST, ACTIONS.Product.VIEW],
    [SECTION_KEYS.Inventory]: [ACTIONS.Inventory.VIEW, ACTIONS.Inventory.VIEW_STOCK],
  },

  [ROLES.USER]: {},
}

module.exports = {
  ROLES,
  SYSTEM_ROLES,
  PLATFORM_ROLES,
  COMPANY_ADMIN_ROLES,
  EMPLOYEE_ROLES,
  ROLE_HIERARCHY,
  SECTION_KEYS,
  ACTIONS,
  ALL_SECTION_ACTIONS,
  READ_ONLY_PERMISSIONS,
  ROLE_DEFAULT_PERMISSIONS,
}
