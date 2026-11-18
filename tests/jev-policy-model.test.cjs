const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const api = path.resolve(root, '../lms-manage-api');
const seed = require(path.join(api, 'tests/fixtures/jev-c2-r2.json'));
const { updatePolicyFramework } = require(path.join(root, 'app/(admin)/jev/policyEditorModel.ts'));
const { prepareJevDraft } = require(path.join(api, 'src/modules/jev/jev.draft.ts'));
const { compileJevCompactBundle } = require(path.join(api, 'src/modules/jev/vendor/chat-jev/compact-contract.ts'));
const { compileDynamicJevRubric } = require(path.join(api, 'src/modules/jev/vendor/chat-jev/dynamic-storage.ts'));
const clone = value => JSON.parse(JSON.stringify(value));
const validate = value => compileJevCompactBundle(prepareJevDraft(value, 'classroom-en-c2', 2));

test('display-name edits preserve AI criteria and all unrelated policy data; Live compiler accepts the draft', () => {
  const source = clone(seed);
  source.rubric.questions.category.criteria.ABUSE_BULLYING += '\nCustom instruction retained.';
  const categories = source.policy.framework.categories.map((item, index) => index ? item : { ...item, label: 'Xúc phạm, bắt nạt' });
  const next = updatePolicyFramework(source, 'categories', categories);
  assert.deepEqual(next.rubric.framework, next.policy.framework);
  assert.deepEqual(next.rubric.questions, source.rubric.questions);
  assert.deepEqual(next.policy.rules, seed.policy.rules);
  assert.deepEqual(next.policy.templates, seed.policy.templates);
  assert.deepEqual(next.policy.counters, seed.policy.counters);
  assert.equal(source.policy.framework.categories[0].label, seed.policy.framework.categories[0].label);
  assert.ok(validate(next).bundleHash);
});

test('group definition edits regenerate the affected AI criterion exactly like the Live rubric compiler', () => {
  const categories = seed.policy.framework.categories.map((item, index) => index ? item : { ...item, definition: item.definition + ' Clarification.' });
  const next = updatePolicyFramework(seed, 'categories', categories);
  const expected = compileDynamicJevRubric({ model_version: seed.rubric.modelVersion, common_instructions: '',
    category_instructions: seed.rubric.questions.category.instructions, severity_instructions: seed.rubric.questions.severity.instructions,
    threat_instructions: seed.rubric.questions.threat.instructions, distress_instructions: seed.rubric.questions.distress.instructions,
    framework: next.policy.framework });
  assert.equal(next.rubric.questions.category.criteria.ABUSE_BULLYING, expected.questions.category.criteria.ABUSE_BULLYING);
  for (const code of Object.keys(seed.rubric.questions.category.criteria).filter(code => code !== 'ABUSE_BULLYING')) {
    assert.equal(next.rubric.questions.category.criteria[code], seed.rubric.questions.category.criteria[code]);
  }
  assert.deepEqual(next.policy.rules, seed.policy.rules);
  assert.ok(validate(next).bundleHash);
});

test('pair and severity edits stay synchronized with AI criteria and preserve rule coverage', () => {
  const pairs = seed.policy.framework.pairs.map(pair => pair.category === 'ABUSE_BULLYING' && pair.severity === 'LOW' ? { ...pair, criterion: 'Clarified low-level criterion.' } : pair);
  const next = updatePolicyFramework(seed, 'pairs', pairs);
  assert.match(next.rubric.questions.category.criteria.ABUSE_BULLYING, /LOW: Clarified low-level criterion\./);
  assert.deepEqual(next.policy.rules, seed.policy.rules);
  const levels = next.policy.framework.levels.map(level => level.code === 'LOW' ? { ...level, instructions: level.instructions + ' Clarification.' } : level);
  const updated = updatePolicyFramework(next, 'levels', levels);
  assert.equal(updated.rubric.questions.severity.criteria.LOW, levels.find(level => level.code === 'LOW').instructions);
  assert.deepEqual(updated.policy.rules, seed.policy.rules);
  assert.ok(validate(updated).bundleHash);
});
