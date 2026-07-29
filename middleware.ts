import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const refreshToken = req.cookies.get('refreshToken')?.value;
    if (!refreshToken) {
        const loginUrl = new URL('/auth/login', req.url);
        loginUrl.searchParams.set('returnTo', pathname);
        return NextResponse.redirect(loginUrl);
    }

    if (pathname === '/') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!_next|api|auth|403|.*\\.(?:png|jpg|jpeg|svg|webp|ico|woff2?|ttf)).*)',
    ],
};
