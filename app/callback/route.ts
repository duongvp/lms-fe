import { NextRequest } from 'next/server';
import { GET as proxyAuthRequest } from '../api/auth/[...path]/route';

export const dynamic = 'force-dynamic';

// Keep Google's public callback on the frontend origin so the browser sends
// the HttpOnly login-context cookie. The API validates it and creates a session.
export const GET = (request: NextRequest) => proxyAuthRequest(request, {
    params: Promise.resolve({ path: ['google', 'callback'] }),
});
