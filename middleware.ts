// // middleware.ts
// import { NextResponse } from 'next/server';
// import type { NextRequest } from 'next/server';
// import { PermissionKey } from './types/permissions';

// const protectedRoutes = [
//     // { path: '/dashboard', permission: 'dashboard_view' },
//     { path: '/products', permission: PermissionKey.PRODUCT_VIEW },
//     { path: '/categories', permission: PermissionKey.CATEGORY_VIEW },
//     { path: '/transactions/inventory-checks', permission: PermissionKey.STOCK_CHECK_VIEW },
//     { path: '/transactions/invoices', permission: PermissionKey.INVOICE_VIEW },
//     { path: '/transactions/purchase-orders', permission: PermissionKey.IMPORT_VIEW },
//     { path: '/transactions/returns', permission: PermissionKey.RETURN_VIEW },
//     { path: '/partners/customers', permission: PermissionKey.CUSTOMER_VIEW },
//     { path: '/partners/suppliers', permission: PermissionKey.SUPPLIER_VIEW },
//     { path: '/branches', permission: PermissionKey.BRANCH_VIEW },
//     { path: '/users', permission: PermissionKey.USER_VIEW },
//     { path: '/member-roles', permission: PermissionKey.USER_VIEW },
// ];

// export function middleware(req: NextRequest) {
//     console.log('Request URL:', req.url);
//     console.log('All headers:', Object.fromEntries(req.headers.entries()));
//     console.log('All cookies:', req.cookies.getAll());
//     const { pathname } = req.nextUrl;

//     const token = req.cookies.get('refreshToken')?.value;
//     const userCookie = req.cookies.get('user')?.value;

//     // 👇 Nếu truy cập vào "/", xử lý chuyển hướng
//     if (pathname === '/') {
//         if (userCookie) {
//             return NextResponse.redirect(new URL('/dashboard', req.url));
//         } else {
//             return NextResponse.redirect(new URL('/auth/login', req.url));
//         }
//     }

//     console.log("🚀 ~ middleware ~ userCookie lại11:", userCookie, token)

//     if (!userCookie) {
//         return NextResponse.redirect(new URL('/auth/login', req.url));
//     }

//     const userData = JSON.parse(decodeURIComponent(userCookie));
//     const matched = protectedRoutes.find((r) => req.nextUrl.pathname.startsWith(r.path));

//     if (matched) {
//         if (!userData.permissions?.includes(matched.permission)) {
//             return NextResponse.redirect(new URL('/403', req.url));
//         }
//     }

//     return NextResponse.next();
// }

// export const config = {
//     matcher: [
//         /*
//          * Match all paths except:
//          * - /_next (static assets)
//          * - /api (API routes)
//          * - /auth (login/register)
//          * - /403 (forbidden page)
//         */
//         // '/((?!_next|api|auth|403).*)',
//         '/((?!_next|api|auth|403|.*\\.(?:png|jpg|jpeg|svg|webp|ico|woff2?|ttf)).*)',
//     ],
// };

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { protectedRoutes } from './constants/protectedRoutes';

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    const token = req.cookies.get('refreshToken')?.value;
    const userCookie = req.cookies.get('user')?.value;

    // 👇 Nếu chưa đăng nhập → chuyển hướng đến login
    if (!userCookie) {
        return NextResponse.redirect(new URL('/auth/login', req.url));
    }

    const userData = JSON.parse(decodeURIComponent(userCookie));

    // 👇 Nếu vào "/", chuyển hướng đến route đầu tiên user có quyền truy cập
    if (pathname === '/') {
        const firstAccessibleRoute = protectedRoutes.find(route =>
            userData.permissions?.includes(route.permission)
        );

        if (firstAccessibleRoute) {
            return NextResponse.redirect(new URL(firstAccessibleRoute.path, req.url));
        } else {
            // Nếu không có quyền nào phù hợp → chuyển đến /403
            return NextResponse.redirect(new URL('/403', req.url));
        }
    }

    // 👇 Kiểm tra permission của các route còn lại
    const matched = protectedRoutes.find((r) => pathname.startsWith(r.path));
    if (matched) {
        if (!userData.permissions?.includes(matched.permission)) {
            return NextResponse.redirect(new URL('/403', req.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!_next|api|auth|403|.*\\.(?:png|jpg|jpeg|svg|webp|ico|woff2?|ttf)).*)',
    ],
};
