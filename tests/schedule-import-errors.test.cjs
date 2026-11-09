const assert=require('node:assert/strict');
const test=require('node:test');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const source=fs.readFileSync(path.resolve(__dirname,'../helper/scheduleImportErrors.ts'),'utf8');
const moduleObject={exports:{}};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:moduleObject,exports:moduleObject.exports});
const p=moduleObject.exports;

test('past schedule identifies original session and shows a useful fix without shifting Vietnam time',()=>{
 const error=p.presentScheduleImportError({row:11,field:'start_time',errorCode:'INVALID_ROW',reasonCode:'PAST_SCHEDULE',message:'Lịch gốc đã bắt đầu nên không thể thay đổi thông tin qua import.',calendar:{code:'math',learnNumber:10,lessonCount:0,lessonName:'Hàm số',startTime:'2026-09-08T20:00:00.000Z'}});
 assert.equal(error.rowLabel,'11');
 assert.equal(error.field,'Lịch đã bắt đầu');
 assert.equal(error.originalTime,'20:00 ngày 08/09/2026');
 assert.match(error.context,/Chương trình: math.*Bài 10.*Lần học 0.*Hàm số/);
 assert.match(error.suggestion,/bỏ dòng/);
});
test('fields and technical error codes receive readable labels and specific suggestions',()=>{
 for(const [field,label] of [['key','Mã định danh lịch'],['learn_number','Bài'],['lesson_count','Lần học'],['system_type','Hệ thống'],['ID course','ID khóa học']]) assert.equal(p.importFieldLabel(field),label);
 const profile=p.presentScheduleImportError({row:3,field:'Tên GV',errorCode:'INVALID_ROW',message:'Tên giáo viên trùng nhiều tài khoản'});
 assert.match(profile.suggestion,/tài khoản/);
 const lesson=p.presentScheduleImportError({row:3,field:'learn_number',errorCode:'LESSON_NOT_FOUND',message:'Chương trình chưa có bài'});
 assert.match(lesson.suggestion,/số bài/);
 assert.doesNotMatch(lesson.suggestion,/HMO/);
 const ids=p.presentScheduleImportError({row:3,field:'ID khóa học',errorCode:'INVALID_COURSE_ID',message:'ID không khớp mapping của bài',packageId:'100',courseId:'200'});
 assert.match(ids.suggestion,/quản lý nội dung/);
 assert.equal(ids.ids,'Gói học: 100 · Khóa học: 200');
});
test('backend guidance is preserved; global errors and duplicate rows are actionable',()=>{
 assert.equal(p.presentScheduleImportError({row:0,field:'file',message:'Lỗi tải',suggestion:'Bật quyền xem link'}).suggestion,'Bật quyền xem link');
 assert.equal(p.presentScheduleImportError({row:1,field:'file',message:'Lỗi tải'}).rowLabel,'Toàn bộ');
 assert.match(p.presentScheduleImportError({row:4,field:'calendar',errorCode:'DUPLICATE_SCHEDULE_IN_FILE',duplicateWithRow:2,message:'Trùng lịch'}).suggestion,/dòng 2/);
 assert.match(p.presentScheduleImportError({row:4,field:'key',errorCode:'INVALID_ROW',message:'Lịch long-key đã diễn ra, không thể cập nhật'}).suggestion,/lịch đã qua/);
});
