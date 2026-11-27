const assert=require('node:assert/strict');
const test=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto').webcrypto;
const esbuild=require('../../lms-manage-api/node_modules/esbuild');
const express=require('../../lms-manage-api/node_modules/express');

function loadSource(relative,dependencies,origin) {
 const module={exports:{}};
 const {code}=esbuild.transformSync(fs.readFileSync(path.resolve(__dirname,'..',relative),'utf8').replace("import('@/components/calendar-approvals/requestApprovalReason')","Promise.resolve(require('@/components/calendar-approvals/requestApprovalReason'))"),{loader:'ts',format:'cjs',target:'node20'});
 new Function('module','exports','require','fetch','process','crypto',code)(module,module.exports,id=>{
  if(!(id in dependencies))throw Error('Unexpected dependency: '+id);
  return dependencies[id];
 },fetch,{env:{NODE_ENV:'test',NEXT_PUBLIC_BACKEND_API_URL:origin}},crypto);
 return module.exports;
}

test('schedule service → fetchInstance → Express parses JSON once and preserves approval headers',async()=>{
 const app=express();app.use(express.json());
 const received=[];
 app.post('/api/livestreams/single',(req,res)=>{
  received.push({headers:req.headers,body:req.body});
  if(!req.body?.code)return res.status(400).json({success:false,message:'Không xác định được Chương trình'});
  if(req.body.needsApproval&&!req.header('X-Calendar-Approval-Reason'))return res.status(409).json({success:false,code:'APPROVAL_REASON_REQUIRED',operation:'create',message:'Nhập lý do gửi duyệt'});
  if(req.body.deny)return res.status(403).json({success:false,message:'Tài khoản chưa có quyền gửi yêu cầu duyệt lịch.'});
  return res.status(202).json({success:true,data:{approval_required:true,program:req.body.code}});
 });
 const uploads=[];
 app.post('/api/livestreams/import',(req,res)=>{const chunks=[];req.on('data',chunk=>chunks.push(chunk));req.on('end',()=>{uploads.push({headers:req.headers,body:Buffer.concat(chunks).toString()});if(!req.header('X-Calendar-Approval-Reason'))return res.status(409).json({success:false,code:'APPROVAL_REASON_REQUIRED',operation:'create',message:'Nhập lý do gửi duyệt'});res.status(202).json({success:true,data:{approval_required:true}});});});
 app.post('/upload',(req,res)=>{received.push({headers:req.headers});req.resume();res.json({success:true});});
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 try {
  const apiResponse=loadSource('ultils/apiResponse.ts',{},origin);
  const auth={useAuthStore:{getState:()=>({user:{userId:1},authSessionVersion:1,accessToken:'test-only-token',setAccessToken:()=>{},logout:()=>{throw Error('Unexpected logout');}})}};
  const base=loadSource('ultils/fetchInstance.ts',{'@/stores/authStore':auth,'./apiResponse':apiResponse},origin);
  let refreshed=0,prompts=0,cancelReason=false;
  class CalendarApprovalCancelledError extends Error{constructor(){super('Cancelled');this.name='CalendarApprovalCancelledError';}}
  const schedule=loadSource('services/livestreamService.ts',{
   '@/helper/calendarApprovalCancellation':{CalendarApprovalCancelledError},'@/helper/convertDate':{},'@/ultils/fetchInstance':base,'@/stores/authStore':auth,
   '@/components/calendar-approvals/requestApprovalReason':{requestApprovalReason:async()=>{prompts++;if(cancelReason)throw new CalendarApprovalCancelledError();return {reason:'Điều chỉnh theo kế hoạch mới',title:'Bổ sung buổi ôn tập'};}},
   './calendarApprovalService':{CalendarApprovalCancelledError,isApprovalResponse:r=>!!r?.data?.approval_required,refreshApprovalViews:()=>{refreshed++;}},
  },origin);
  const payload={system_type:'topclass',code:'nguvan-8',session_id:'484',learn_number:31,lesson_name:'Ôn tập giữa kì I (P2)',teacher:'Cô An',assistant_teacher:'',start_time:'2026-11-26T15:02:00.000Z',end_time:'2026-11-26T17:02:00.000Z',lesson_status:0,package_lesson_mappings:[],allow_shared_staff_schedule:false};
  const broken=await fetch(origin+'/api/livestreams/single',{method:'POST',headers:{'content-type':'application/json','Content-Type':'application/json'},body:JSON.stringify(payload)});
  assert.equal(broken.status,400);assert.equal(received[0].body,undefined);
  assert.equal(received[0].headers['content-type'],'application/json, application/json');
  received.length=0;
  const result=await schedule.createLivestream(payload);
  assert.equal(result.data.program,'nguvan-8');assert.deepEqual(received[0].body,payload);
  assert.equal(received[0].headers['content-type'],'application/json');
  assert.equal(received[0].headers.authorization,'Bearer test-only-token');
  assert.equal(received[0].headers['x-calendar-submit-approval'],'true');
  assert.match(received[0].headers['idempotency-key'],/^[a-f0-9-]{36}$/);assert.equal(refreshed,1);
  const business={...payload,needsApproval:true,reason:'Lý do nghiệp vụ giữ nguyên',change_reason:'Nội dung thông báo giữ nguyên'};
  received.length=0;
  await schedule.createLivestream(business);
  assert.equal(prompts,1);assert.equal(received.length,2);
  assert.deepEqual(received[0].body,business);assert.deepEqual(received[1].body,business);
  assert.equal(received[0].headers['idempotency-key'],received[1].headers['idempotency-key']);
  assert.equal(decodeURIComponent(received[1].headers['x-calendar-approval-reason']),'Điều chỉnh theo kế hoạch mới');
  assert.equal(decodeURIComponent(received[1].headers['x-calendar-approval-title']),'Bổ sung buổi ôn tập');
  assert.equal(refreshed,2,'Only the confirmed successful submission refreshes workflow');
  cancelReason=true;received.length=0;
  await assert.rejects(schedule.createLivestream(business),error=>error.name==='CalendarApprovalCancelledError');
  assert.equal(received.length,1,'Cancelling must not send the confirmed request');assert.equal(refreshed,2);
  cancelReason=false;
  for(const headers of [{ 'content-type':'application/json' },new Headers({'Content-Type':'application/json'}),[['content-type','application/json']]]) {
   await base.fetchInstance(origin+'/api/livestreams/single',{method:'POST',headers,body:JSON.stringify(payload)});
   assert.equal(received.at(-1).headers['content-type'],'application/json');assert.deepEqual(received.at(-1).body,payload);
  }
  await assert.rejects(schedule.createLivestream({...payload,deny:true}),error=>error.status===403&&error.message==='Tài khoản chưa có quyền gửi yêu cầu duyệt lịch.');
  await schedule.importLivestreamsFile(new File(['lesson,data'],'calendar.csv',{type:'text/csv'}),'nguvan-8');
  assert.equal(uploads.length,2);assert.equal(prompts,3);
  for(const upload of uploads){assert.match(upload.headers['content-type'],/^multipart\/form-data; boundary=/);assert.ok(upload.body.includes('lesson,data'));assert.ok(upload.body.includes('calendar.csv'));}
  assert.equal(uploads[0].headers['idempotency-key'],uploads[1].headers['idempotency-key']);
  assert.equal(decodeURIComponent(uploads[1].headers['x-calendar-approval-reason']),'Điều chỉnh theo kế hoạch mới');
  const form=new FormData();form.set('file','test');
  await base.fetchInstance(origin+'/upload',{method:'POST',body:form});
  assert.match(received.at(-1).headers['content-type'],/^multipart\/form-data; boundary=/);
 } finally {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
