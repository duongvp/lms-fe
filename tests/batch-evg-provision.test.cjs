const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { transformSync } = require('../../lms-manage-api/node_modules/esbuild');
const compiled = transformSync(fs.readFileSync(path.join(__dirname, '../helper/batchEvgProvision.ts'), 'utf8'), { loader: 'ts', format: 'cjs' }).code;
const mod = { exports: {} };
new Function('module', 'exports', compiled)(mod, mod.exports);
const { runEvgProvisionItems, summarizeEvgProvision } = mod.exports;
const target = calendar_id => ({ calendar_id, code: `program-${calendar_id}`, teacher: 'GV', status: 'pending' });

for (const mode of ['overwrite', 'skip_existing']) {
    test(`${mode}: partial failure, single retry, then retry all preserve original successes and settings`, async () => {
        const calls = [], snapshots = [];
        let active = 0;
        const initial = await runEvgProvisionItems([target(1), target(2), target(3)], mode, 'https://cdn.test/override.jpg', {
            apply: async (id, selectedMode, url) => {
                assert.equal(++active, 1);
                calls.push(id);
                assert.equal(selectedMode, mode);
                assert.equal(url, 'https://cdn.test/override.jpg');
                await Promise.resolve(); active--;
                if (id !== 1) throw Error('Chưa cấu hình banner');
                return { data: { skipped: mode === 'skip_existing' } };
            }, onChange: items => snapshots.push(items),
        });
        assert.deepEqual(calls, [1, 2, 3]);
        assert.equal(summarizeEvgProvision(initial).failed, 2);
        assert.equal(summarizeEvgProvision(initial).current, 3);
        assert.ok(snapshots.some(items => items[1].status === 'running'));
        const success = initial[0];
        const once = await runEvgProvisionItems([initial[1]], mode, undefined, {
            previousItems: initial, onChange: () => {},
            apply: async id => { calls.push(id); return { data: {} }; },
        });
        assert.equal(once[0], success);
        assert.equal(initial[1].status, 'error');
        assert.equal(summarizeEvgProvision(once).failed, 1);
        const final = await runEvgProvisionItems(once.filter(item => item.status === 'error'), mode, undefined, {
            previousItems: once, onChange: () => {},
            apply: async id => { calls.push(id); return { data: {} }; },
        });
        assert.deepEqual(calls, [1, 2, 3, 2, 3]);
        assert.equal(final[0], success);
        assert.equal(summarizeEvgProvision(final).failed, 0);
        assert.equal(summarizeEvgProvision(final).total, 3);
        assert.equal(summarizeEvgProvision(final).current, 3);
        assert.ok(final.every(item => ['created', 'skipped'].includes(item.status)));
    });
}

test('another failed retry keeps the remaining errors and their identities', async () => {
    const old = [{ ...target(1), status: 'created' }, { ...target(2), status: 'error', message: 'old' }];
    const result = await runEvgProvisionItems([old[1]], 'overwrite', undefined, {
        previousItems: old, apply: async () => { throw Error('EVG đang bận'); }, onChange: () => {},
    });
    assert.equal(result[0], old[0]);
    assert.equal(summarizeEvgProvision(result).errors[0].calendar_id, 2);
    assert.equal(summarizeEvgProvision(result).errors[0].message, 'EVG đang bận');
});
