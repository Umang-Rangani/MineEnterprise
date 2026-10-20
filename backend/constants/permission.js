const ROLES = {
  USER: 'User',
  SUPER_ADMIN: 'SuperAdmin',
  ADMIN: 'Admin',
  CATALOG_MANAGER: 'CatalogManager',
  ORDER_MANAGER: 'OrderManager',
  SUPPORT: 'Support',
}

/** Roles allowed into the admin panel */
const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.CATALOG_MANAGER, ROLES.ORDER_MANAGER, ROLES.SUPPORT]

/** Employee roles creatable from Users page + (not SuperAdmin, not User) */
const EMPLOYEE_ROLES = [ROLES.ADMIN, ROLES.CATALOG_MANAGER, ROLES.ORDER_MANAGER, ROLES.SUPPORT]

/** Higher index = higher privilege */
const ROLE_HIERARCHY = [ROLES.SUPPORT, ROLES.CATALOG_MANAGER, ROLES.ORDER_MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN]

const SECTION_KEYS = {
  Dashboard: 'Dashboard',
  Category: 'Category',
  SubCategory: 'SubCategory',
  Brand: 'Brand',
  Product: 'Product',
  Order: 'Order',
  User: 'User',
  Notification: 'Notification',
  Contact: 'Contact',
}

const ACTIONS = {
  Dashboard: {
    VIEW: 'dash:view',
  },
  Category: {
    LISTING: 'cat:listing',
    VIEW: 'cat:view',
    CREATE: 'cat:create',
    UPDATE: 'cat:update',
    DELETE: 'cat:delete',
  },
  SubCategory: {
    LISTING: 'sub:listing',
    VIEW: 'sub:view',
    CREATE: 'sub:create',
    UPDATE: 'sub:update',
    DELETE: 'sub:delete',
  },
  Brand: {
    LISTING: 'br:listing',
    VIEW: 'br:view',
    CREATE: 'br:create',
    UPDATE: 'br:update',
    DELETE: 'br:delete',
  },
  Product: {
    LISTING: 'prd:listing',
    VIEW: 'prd:view',
    CREATE: 'prd:create',
    UPDATE: 'prd:update',
    DELETE: 'prd:delete',
  },
  Order: {
    LISTING: 'ord:listing',
    VIEW: 'ord:view',
    UPDATE_STATUS: 'ord:update-status',
    CONFIRM_PAYMENT: 'ord:confirm-payment',
    RETURN_REVIEW: 'ord:return-review',
    ITEM_RECEIVED: 'ord:item-received',
    REFUND: 'ord:refund',
    DELETE: 'ord:delete',
  },
  User: {
    LISTING: 'usr:listing',
    VIEW: 'usr:view',
    CREATE: 'usr:create',
    UPDATE_STATUS: 'usr:update-status',
    DELETE: 'usr:delete',
    MANAGE_PERMISSIONS: 'usr:manage-permissions',
  },
  Notification: {
    LISTING: 'ntf:listing',
    VIEW: 'ntf:view',
    UPDATE: 'ntf:update',
    DELETE: 'ntf:delete',
  },
  Contact: {
    LISTING: 'ctc:listing',
    VIEW: 'ctc:view',
    REPLY: 'ctc:reply',
    UPDATE_STATUS: 'ctc:update-status',
    DELETE: 'ctc:delete',
  },
}

const CATALOG_FULL = {
  [SECTION_KEYS.Category]: Object.values(ACTIONS.Category),
  [SECTION_KEYS.SubCategory]: Object.values(ACTIONS.SubCategory),
  [SECTION_KEYS.Brand]: Object.values(ACTIONS.Brand),
  [SECTION_KEYS.Product]: Object.values(ACTIONS.Product),
}

const CATALOG_READ = {
  [SECTION_KEYS.Category]: [ACTIONS.Category.LISTING, ACTIONS.Category.VIEW],
  [SECTION_KEYS.SubCategory]: [ACTIONS.SubCategory.LISTING, ACTIONS.SubCategory.VIEW],
  [SECTION_KEYS.Brand]: [ACTIONS.Brand.LISTING, ACTIONS.Brand.VIEW],
  [SECTION_KEYS.Product]: [ACTIONS.Product.LISTING, ACTIONS.Product.VIEW],
}


const ROLE_DEFAULT_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: {},
  [ROLES.ADMIN]: {
    [SECTION_KEYS.Dashboard]: [ACTIONS.Dashboard.VIEW],
    ...CATALOG_FULL,
    [SECTION_KEYS.Order]: Object.values(ACTIONS.Order),
    [SECTION_KEYS.User]: [ACTIONS.User.LISTING, ACTIONS.User.VIEW, ACTIONS.User.CREATE, ACTIONS.User.UPDATE_STATUS, ACTIONS.User.DELETE],
    [SECTION_KEYS.Notification]: Object.values(ACTIONS.Notification),
    [SECTION_KEYS.Contact]: Object.values(ACTIONS.Contact),
  },
  [ROLES.CATALOG_MANAGER]: {
    [SECTION_KEYS.Dashboard]: [ACTIONS.Dashboard.VIEW],
    ...CATALOG_FULL,
  },
  [ROLES.ORDER_MANAGER]: {
    [SECTION_KEYS.Dashboard]: [ACTIONS.Dashboard.VIEW],
    ...CATALOG_READ,
    [SECTION_KEYS.Order]: Object.values(ACTIONS.Order),
    [SECTION_KEYS.Notification]: Object.values(ACTIONS.Notification),
  },
  [ROLES.SUPPORT]: {
    [SECTION_KEYS.Order]: [ACTIONS.Order.LISTING, ACTIONS.Order.VIEW],
    [SECTION_KEYS.Notification]: [ACTIONS.Notification.LISTING, ACTIONS.Notification.VIEW, ACTIONS.Notification.UPDATE],
    [SECTION_KEYS.Contact]: Object.values(ACTIONS.Contact),
  },
}

module.exports = {
  ROLES,
  ADMIN_ROLES,
  EMPLOYEE_ROLES,
  ROLE_HIERARCHY,
  SECTION_KEYS,
  ACTIONS,
  ROLE_DEFAULT_PERMISSIONS,
}
