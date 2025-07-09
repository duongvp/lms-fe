import { PermissionKey } from "@/types/permissions";

export const protectedRoutes = [
    { path: '/dashboard', permission: PermissionKey.DASHBOARD_VIEW },
    { path: '/products', permission: PermissionKey.PRODUCT_VIEW },
    { path: '/categories', permission: PermissionKey.CATEGORY_VIEW },
    { path: '/transactions/inventory-checks', permission: PermissionKey.STOCK_CHECK_VIEW },
    { path: '/transactions/invoices', permission: PermissionKey.INVOICE_VIEW },
    { path: '/transactions/purchase-orders', permission: PermissionKey.IMPORT_VIEW },
    { path: '/transactions/returns', permission: PermissionKey.RETURN_VIEW },
    { path: '/partners/customers', permission: PermissionKey.CUSTOMER_VIEW },
    { path: '/partners/suppliers', permission: PermissionKey.SUPPLIER_VIEW },
    { path: '/branches', permission: PermissionKey.BRANCH_VIEW },
    { path: '/users', permission: PermissionKey.USER_VIEW },
    { path: '/member-roles', permission: PermissionKey.USER_VIEW },
];
