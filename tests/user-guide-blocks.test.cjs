const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function loadTypeScript(path) {
    const output = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const exports = {};
    new Function('exports', 'require', output)(exports, require);
    return exports;
}
const { getGuideBlocks, guideSectionText, guideRichHasImage } = loadTypeScript('services/userGuideService.ts');
const { userGuideContent } = loadTypeScript('constants/userGuideContent.ts');
const before = JSON.stringify(userGuideContent);
let sectionCount = 0;
for (const article of userGuideContent.articles) {
    for (const section of article.sections) {
        sectionCount++;
        const blocks = getGuideBlocks(section);
        const converted = { id: section.id, title: section.title, text: '', steps: [], blocks: structuredClone(blocks) };
        assert.deepEqual(getGuideBlocks(converted), blocks);
        assert.equal(guideSectionText(converted), guideSectionText(section));
        if (section.text) assert.equal(blocks.find(b => b.type === 'text').text, section.text);
        if (section.richText) assert.deepEqual(blocks.find(b => b.type === 'text').richText, section.richText);
        if (section.steps.length) assert.deepEqual(blocks.find(b => b.type === 'steps').steps, section.steps);
        if (section.table) assert.deepEqual(blocks.find(b => b.type === 'table').table, section.table);
        if (section.notice !== undefined) assert.equal(blocks.find(b => b.type === 'notice').notice, section.notice);
        if (section.imageUrl !== undefined) assert.equal(blocks.find(b => b.type === 'image').imageUrl, section.imageUrl);
        assert.equal(new Set(blocks.map(b => b.id)).size, blocks.length);
    }
}
assert.equal(JSON.stringify(userGuideContent), before, 'Adapting legacy sections mutated the built-in library');
const legacy = { id: 'section', title: 'Title', text: 'Old text', steps: ['Old step'] };
assert.deepEqual(getGuideBlocks({ ...legacy, blocks: [] }), [], 'Deleted blocks reappeared from legacy fields');
const repeated = [
    { id: 'a', type: 'table', table: { columns: ['First', 'Second'], rows: [['Table one', 'Value']] } },
    { id: 'b', type: 'text', text: 'Paragraph one' },
    { id: 'c', type: 'notice', notice: 'Notice one' },
    { id: 'd', type: 'table', table: { columns: ['Third', 'Fourth'], rows: [['Table two', 'Value']] } },
    { id: 'e', type: 'text', text: 'Paragraph two' },
    { id: 'f', type: 'notice', notice: 'Notice two' },
    { id: 'g', type: 'steps', steps: ['Step one'] },
    { id: 'h', type: 'steps', steps: ['Step two'] },
];
assert.deepEqual(getGuideBlocks({ ...legacy, blocks: repeated }), repeated);
const searchable = guideSectionText({ ...legacy, blocks: repeated });
for (const text of ['Table one', 'Table two', 'Paragraph one', 'Paragraph two', 'Notice one', 'Notice two', 'Step one', 'Step two']) assert(searchable.includes(text));
assert(!searchable.includes('Old text'), 'Search indexed superseded legacy content');
assert(guideRichHasImage({ type: 'doc', content: [{ type: 'image', attrs: { src: 'https://example.com/test.png' } }] }));
for (const src of ['javascript:alert(1)', 'data:image/svg+xml,<svg/>', 'http://example.com/image.png']) assert(!guideRichHasImage({ type: 'image', attrs: { src } }));
console.log(`PASS: ${userGuideContent.articles.length} articles / ${sectionCount} sections preserve legacy content; repeated block search, explicit ordering/deletion, image-only content detection.`);
