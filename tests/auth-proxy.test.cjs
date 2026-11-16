const assert = require('node:assert/strict');
const test = require('node:test');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('../../lms-manage-api/node_modules/esbuild');

const { code } = esbuild.transformSync(fs.readFileSync(path.join(__dirname, '../app/api/auth/[...path]/route.ts'), 'utf8'), {
    loader: 'ts', format: 'cjs', target: 'node20',
});
const proxyModule = { exports: {} };
new Function('module', 'exports', 'require', code)(proxyModule, proxyModule.exports, require);
const proxy = proxyModule.exports;

test('auth proxy handles Nginx upgrade headers with real Node fetch while preserving OAuth cookies and POST bodies', async () => {
    const requests = [];
    const server = http.createServer(async (req, res) => {
        let body = '';
        for await (const chunk of req) body += chunk;
        requests.push({ url: req.url, method: req.method, headers: req.headers, body });
        res.setHeader('Connection', 'keep-alive, x-internal-response');
        res.setHeader('X-Internal-Response', 'connection-specific');
        res.setHeader('Keep-Alive', 'timeout=5');
        res.setHeader('Cache-Control', 'no-store');
        if (req.url.startsWith('/api/auth/google/callback')) {
            res.setHeader('Set-Cookie', [
                'googleLogin=; Path=/callback; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly',
                'refreshToken=session; Path=/; HttpOnly; Secure; SameSite=Lax',
            ]);
            res.writeHead(302, { Location: '/auth/google/complete' });
            res.end();
        } else {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, data: { accessToken: 'new-access' } }));
        }
    });
    const previousUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL;
    try {
        await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
        process.env.NEXT_PUBLIC_BACKEND_API_URL = `http://127.0.0.1:${server.address().port}`;
        const request = (method, search = '', body = '') => ({
            method,
            nextUrl: new URL(`https://liveops.hocmai.io.vn/callback${search}`),
            headers: new Headers({
                connection: 'upgrade, x-internal-request',
                upgrade: 'websocket', 'keep-alive': 'timeout=5',
                'x-internal-request': 'connection-specific',
                'proxy-connection': 'keep-alive', 'proxy-authorization': 'private-proxy-credential',
                te: 'trailers', trailer: 'x-checksum', 'transfer-encoding': 'chunked',
                expect: '100-continue', 'content-length': '999',
                host: 'liveops.hocmai.io.vn', origin: 'https://liveops.hocmai.io.vn',
                cookie: 'googleLogin=context; refreshToken=old-session',
                authorization: 'Bearer access-token', 'content-type': 'application/json',
            }),
            arrayBuffer: async () => new TextEncoder().encode(body).buffer,
        });
        const callback = await proxy.GET(request('GET', '?code=google%2Bcode&state=state'), {
            params: Promise.resolve({ path: ['google', 'callback'] }),
        });
        assert.equal(callback.status, 302);
        assert.equal(callback.headers.get('location'), '/auth/google/complete');
        assert.equal(callback.headers.get('cache-control'), 'no-store');
        assert.equal(callback.headers.getSetCookie().length, 2);
        assert.ok(callback.headers.getSetCookie()[0].includes('Path=/callback'));
        for (const name of ['connection', 'keep-alive', 'transfer-encoding', 'x-internal-response']) {
            assert.equal(callback.headers.get(name), null, name);
        }
        assert.equal(requests[0].url, '/api/auth/google/callback?code=google%2Bcode&state=state');
        assert.equal(requests[0].headers.cookie, 'googleLogin=context; refreshToken=old-session');
        assert.equal(requests[0].headers.authorization, 'Bearer access-token');
        // Node may add its own Connection header; the inbound upgrade is gone.
        assert.notEqual(requests[0].headers.connection, 'upgrade, x-internal-request');
        for (const name of ['upgrade', 'x-internal-request', 'proxy-connection', 'proxy-authorization', 'te', 'trailer', 'expect', 'origin']) {
            assert.equal(requests[0].headers[name], undefined, name);
        }
        const refresh = await proxy.POST(request('POST', '', '{"rememberMe":true}'), {
            params: Promise.resolve({ path: ['refresh-token'] }),
        });
        assert.equal(refresh.status, 200);
        assert.equal((await refresh.json()).data.accessToken, 'new-access');
        assert.equal(requests[1].url, '/api/auth/refresh-token');
        assert.equal(requests[1].body, '{"rememberMe":true}');
    } finally {
        if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_BACKEND_API_URL;
        else process.env.NEXT_PUBLIC_BACKEND_API_URL = previousUrl;
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
    }
});
