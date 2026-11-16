const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('../../lms-manage-api/node_modules/esbuild');

function load(relative) {
    const { code } = esbuild.transformSync(fs.readFileSync(path.join(__dirname, relative), 'utf8'), {
        loader: 'ts', format: 'cjs', target: 'node20',
    });
    const module = { exports: {} };
    new Function('module', 'exports', 'require', code)(module, module.exports, require);
    return module.exports;
}
const { readJsonResponse } = load('../ultils/apiResponse.ts');
const { runClassroomAssignmentItems } = load('../helper/batchClassroomAssignment.ts');

test('HTML gateway errors retain status/request ID without showing HTML or JSON parser errors', async () => {
    for (const status of [502, 503, 504]) {
        await assert.rejects(readJsonResponse(new Response('<html><h1>upstream error</h1></html>', {
            status, headers: { 'content-type': 'text/html', 'x-request-id': 'req-classroom-12' },
        })), error => {
            assert.equal(error.status, status);
            assert.match(error.message, new RegExp(`HTTP ${status}`));
            assert.match(error.diagnostic, /text\/html/);
            assert.match(error.diagnostic, /req-classroom-12/);
            assert.doesNotMatch(error.message, /Unexpected token|<html>/);
            return true;
        });
    }
    await assert.rejects(readJsonResponse(new Response('<html>login redirect</html>', { status: 200 })), /không phải JSON/);
});

test('JSON success and business error details remain available to existing callers', async () => {
    const body = { success: true, data: { moved_count: 10 } };
    assert.deepEqual(await readJsonResponse(new Response(JSON.stringify(body))), body);
    await assert.rejects(readJsonResponse(new Response(JSON.stringify({
        message: 'Chưa cấu hình classroom', fields: ['classroom_id'],
    }), { status: 400 })), error => {
        assert.equal(error.message, 'Chưa cấu hình classroom');
        assert.equal(error.status, 400);
        assert.deepEqual(error.detail.fields, ['classroom_id']);
        return true;
    });
});

test('batch continues after errors; retries preserve original results and apply mode, only run target calendars', async () => {
    const items = ['1', '2', '3'].map(calendarId => ({ calendarId, code: 'test', status: 'pending' }));
    const calls = [], snapshots = [];
    let active = 0;
    const options = {
        onChange: rows => snapshots.push(rows),
        apply: async (id, maxStudents, mode) => {
            assert.equal(++active, 1, 'requests must stay sequential');
            assert.equal(maxStudents, undefined);
            assert.equal(mode, 'unlearned_only');
            calls.push(id);
            await Promise.resolve();
            active--;
            if (id === '2') {
                return readJsonResponse(new Response('<html>gateway</html>', {
                    status: 504, headers: { 'content-type': 'text/html', 'x-request-id': 'failed-2' },
                }));
            }
            if (id === '3') throw new Error('Chưa cấu hình classroom');
            return { data: { total_students: 100, eligible_students: 80, moved_count: 80 } };
        },
    };
    const initial = await runClassroomAssignmentItems(items, 'unlearned_only', options);
    assert.deepEqual(calls, ['1', '2', '3']);
    assert.deepEqual(initial.items.map(item => item.status), ['success', 'error', 'error']);
    assert.equal(initial.successCount, 1);
    assert.equal(initial.failedCount, 2);
    assert.match(initial.items[1].message, /HTTP 504/);
    assert.match(initial.items[1].errorDetails, /failed-2/);
    assert.equal(initial.items[2].message, 'Chưa cấu hình classroom');
    const successfulRow = initial.items[0];
    assert.ok(snapshots.some(rows => rows[1].status === 'running'));

    const retriedCalls = [];
    const retry = await runClassroomAssignmentItems([initial.items[1]], 'unlearned_only', {
        previousItems: initial.items,
        onChange: () => {},
        apply: async (id, _, mode) => {
            retriedCalls.push(id);
            assert.equal(mode, 'unlearned_only');
            return { data: { total_students: 100, eligible_students: 80, moved_count: 80 } };
        },
    });
    assert.deepEqual(retriedCalls, ['2']);
    assert.equal(retry.items[0], successfulRow);
    assert.deepEqual(retry.items.map(item => item.status), ['success', 'success', 'error']);
    assert.equal(retry.items[1].errorDetails, undefined);
    assert.equal(retry.items.length, 3);
    assert.equal(initial.items[1].status, 'error', 'previous snapshots must not be mutated');

    const final = await runClassroomAssignmentItems(retry.items.filter(item => item.status === 'error'), 'unlearned_only', {
        previousItems: retry.items,
        onChange: () => {},
        apply: async id => {
            assert.equal(id, '3');
            return { data: { total_students: 100, eligible_students: 0, moved_count: 0 } };
        },
    });
    assert.deepEqual(final.items.map(item => item.status), ['success', 'success', 'skipped']);
    assert.equal(final.skippedCount, 1);
});

test('all-student mode is retained, and retry failures keep clear network or legacy parser errors', async () => {
    const target = { calendarId: '7', code: 'test', status: 'error' };
    for (const message of ['Failed to fetch', 'Unexpected token \'<\', not valid JSON']) {
        const result = await runClassroomAssignmentItems([target], 'all', {
            previousItems: [target], onChange: () => {},
            apply: async (_, __, mode) => { assert.equal(mode, 'all'); throw new Error(message); },
        });
        assert.equal(result.failedCount, 1);
        assert.equal(result.items[0].status, 'error');
        assert.notEqual(result.items[0].message, message);
        assert.equal(result.items[0].errorDetails, message);
    }
});

test('shared fetch keeps token refresh, JSON errors and blob downloads working with the new response reader', async () => {
    const built = await esbuild.build({
        entryPoints: [path.join(__dirname, '../ultils/fetchInstance.ts')],
        bundle: true, write: false, platform: 'node', format: 'cjs',
        define: { 'process.env.NODE_ENV': '"production"' },
        plugins: [{ name: 'auth-fixture', setup(build) {
            build.onResolve({ filter: /^@\/stores\/authStore$/ }, () => ({ path: 'auth', namespace: 'fixture' }));
            build.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `
                const state={accessToken:'old-token',setAccessToken(token){state.accessToken=token},logout(){throw Error('Unexpected logout')}};
                export const useAuthStore={getState:()=>state};
            `, loader: 'js' }));
        } }],
    });
    const module = { exports: {} };
    new Function('module', 'exports', 'require', built.outputFiles[0].text)(module, module.exports, require);
    const { fetchInstance } = module.exports;
    const originalFetch = global.fetch;
    try {
        const calls = [];
        global.fetch = async (url, options) => {
            calls.push({ url, authorization: options.headers?.Authorization });
            if (url === '/api/auth/refresh-token') {
                return new Response(JSON.stringify({ data: { accessToken: 'new-token' } }));
            }
            if (calls.length === 1) return new Response('<html>unauthorized</html>', { status: 401 });
            return new Response(JSON.stringify({ data: { moved_count: 12 } }));
        };
        assert.deepEqual(await fetchInstance('/api/livestreams/12/classroom-assignment/apply'), { data: { moved_count: 12 } });
        assert.deepEqual(calls.map(call => call.url), [
            '/api/livestreams/12/classroom-assignment/apply', '/api/auth/refresh-token', '/api/livestreams/12/classroom-assignment/apply',
        ]);
        assert.equal(calls[2].authorization, 'Bearer new-token');
        global.fetch = async () => new Response('<html>gateway</html>', { status: 502 });
        await assert.rejects(fetchInstance('/api/test'), error => error.status === 502 && !/Unexpected token/.test(error.message));
        global.fetch = async () => new Response(JSON.stringify({ message: 'Không có quyền' }), { status: 403 });
        await assert.rejects(fetchInstance('/api/test'), error => error.status === 403 && error.message === 'Không có quyền');
        global.fetch = async () => new Response('spreadsheet-data');
        const file = await fetchInstance('/api/export', {}, 'blob');
        assert.equal(await file.text(), 'spreadsheet-data');
    } finally {
        global.fetch = originalFetch;
    }
});
