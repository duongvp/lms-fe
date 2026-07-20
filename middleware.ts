import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { protectedRoutes } from './constants/protectedRoutes';

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    console.log('All Cookies:', req.cookies.getAll());
    // const refreshToken = req.cookies.get('refreshToken')?.value;
    // const userCookie = req.cookies.get('user')?.value;

    // // 👇 Nếu chưa đăng nhập → chuyển hướng đến login
    // if (!userCookie || !refreshToken) {
    //     return NextResponse.redirect(new URL('/auth/login', req.url));
    // }

    // const userData = JSON.parse(decodeURIComponent(userCookie));

    // // 👇 Nếu vào "/", chuyển hướng đến route đầu tiên user có quyền truy cập
    // if (pathname === '/') {
    //     const firstAccessibleRoute = protectedRoutes.find(route =>
    //         userData.permissions?.includes(route.permission)
    //     );

    //     if (firstAccessibleRoute) {
    //         return NextResponse.redirect(new URL(firstAccessibleRoute.path, req.url));
    //     } else {
    //         // Nếu không có quyền nào phù hợp → chuyển đến /403
    //         return NextResponse.redirect(new URL('/403', req.url));
    //     }
    // }

    // // 👇 Kiểm tra permission của các route còn lại
    // const matched = protectedRoutes.find((r) => pathname.startsWith(r.path));
    // if (matched) {
    //     if (!userData.permissions?.includes(matched.permission)) {
    //         return NextResponse.redirect(new URL('/403', req.url));
    //     }
    // }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!_next|api|auth|403|.*\\.(?:png|jpg|jpeg|svg|webp|ico|woff2?|ttf)).*)',
    ],
};
