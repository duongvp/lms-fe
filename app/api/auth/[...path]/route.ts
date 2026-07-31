import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const getBackendBaseUrl = () => {
    const configuredUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL;
    if (!configuredUrl) {
        throw new Error('NEXT_PUBLIC_BACKEND_API_URL is not configured');
    }

    return configuredUrl.replace(/\/$/, '');
};

const proxyAuthRequest = async (
    request: NextRequest,
    context: { params: Promise<{ path: string[] }> }
) => {
    try {
        const { path } = await context.params;
        const targetUrl = new URL(
            `/api/auth/${path.map(encodeURIComponent).join('/')}${request.nextUrl.search}`,
            getBackendBaseUrl()
        );
        const headers = new Headers(request.headers);

        // Let the API generate its own host/CORS response. Cookies from the
        // incoming same-origin request are still forwarded through this proxy.
        headers.delete('host');
        headers.delete('origin');
        headers.delete('content-length');

        const upstreamResponse = await fetch(targetUrl, {
            method: request.method,
            headers,
            body: request.method === 'GET' || request.method === 'HEAD'
                ? undefined
                : await request.arrayBuffer(),
            cache: 'no-store',
            redirect: 'manual',
        });
        const responseHeaders = new Headers(upstreamResponse.headers);

        // fetch may decode the body before it is returned to the browser.
        responseHeaders.delete('content-encoding');
        responseHeaders.delete('content-length');

        return new Response(upstreamResponse.body, {
            status: upstreamResponse.status,
            statusText: upstreamResponse.statusText,
            headers: responseHeaders,
        });
    } catch (error) {
        console.error('Auth proxy error:', error);
        return Response.json(
            { success: false, message: 'Authentication service is unavailable' },
            { status: 502 }
        );
    }
};

export const GET = proxyAuthRequest;
export const POST = proxyAuthRequest;
export const PUT = proxyAuthRequest;
export const PATCH = proxyAuthRequest;
export const DELETE = proxyAuthRequest;
export const OPTIONS = proxyAuthRequest;
