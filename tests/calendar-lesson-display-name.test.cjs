const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const esbuild=require('../../lms-manage-api/node_modules/esbuild');
const {code}=esbuild.transformSync(fs.readFileSync(path.join(__dirname,'../helper/calendarLessonDisplayName.ts'),'utf8'),{loader:'ts',format:'cjs',target:'node20'});
const moduleValue={exports:{}};new Function('module','exports',code)(moduleValue,moduleValue.exports);
const {calendarLessonDisplayName}=moduleValue.exports;
test('same naming behavior as existing schedule editing, including repeated occurrence markers',()=>{
 assert.equal(calendarLessonDisplayName('Ôn tập','[Lịch {n}] - ',' - lần {n}'), '[Lịch 1] - Ôn tập - lần 1');
 assert.equal(calendarLessonDisplayName('Ôn tập','{n}/{n} ',' ({n})',3),'3/3 Ôn tập (3)');
 assert.equal(calendarLessonDisplayName('Tên gốc {n}',undefined,null),'Tên gốc {n}');
});
test('preserves spacing and the established 400-character cap without modifying the outline',()=>{
 const original={lesson_name:'Ôn tập'};
 assert.equal(calendarLessonDisplayName(original.lesson_name,' ',' '),' Ôn tập ');
 assert.equal(original.lesson_name,'Ôn tập');
 assert.equal(calendarLessonDisplayName('x'.repeat(399),'[',']'),'['+'x'.repeat(399));
});
