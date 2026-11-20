const {spawn}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const root=path.resolve(__dirname,'..');const esbuild=require(path.join(root,'../lms-manage-api/node_modules/esbuild'));
const taskDir=fs.mkdtempSync(path.join(os.tmpdir(),'lms-salary-ui-'));
const mode=process.env.QA_MODE||'report';
const mocks={
 '@/stores/authStore':`const s={user:{userId:1},authSessionVersion:1,hasPermission:()=>true};export const useAuthStore=f=>f(s);`,
 '@ant-design/charts':`export const Column=()=>null;`,
 '@/services/teacherSalaryService':`
 let status='pending_review';
 const detail=()=>({period:{id:'7',name:'Lương tháng 11/2020',status,revision:4,calculation_hash:'qa-calculation-hash',scope:['QA'],snapshot:{issues:[]}},teachers:[{id:1,name:'Giáo viên QA',sessions:1,base:'200000',adjustment:'50000',total:'250000',paid:'0',unpaid:'250000'}],items:[{id:'8',snapshot:{teacher:{name:'Giáo viên QA'},lesson_name:'Bài QA',service_date:'2020-11-01',actual_seconds:3600,rate:{amount:'200000'}},amount:'200000'}],adjustments:[],payments:[],total:'250000',paid:'0',unpaid:'250000'});
 export const salaryGet=async(path)=>{
  if(path==='options')return {teachers:[{id:1,username:'gv-qa',display_name:'Giáo viên QA',status:1}],programs:['QA']};
  if(path==='overview')return {estimated:'0',confirmed:'250000',unpaid:'250000',teachers:[],periods:[]};
  if(path==='periods')return {rows:[detail().period],pagination:{total:1}};
  if(path==='rates')return {rows:[],pagination:{total:0}};
  if(path.startsWith('periods/'))return detail();
  return {rows:[{id:1,calendar_id:1,code:'QA',group_label:'Chương trình 1–n',lesson_name:'Bài QA',teacher:'Giáo viên QA',teacher_profile_id:1,start_time:'2020-11-01T19:00:00Z',end_time:'2020-11-01T20:00:00Z',scheduled_seconds:3600,progress:'ended',session_kind:'regular',confirmation_status:'unconfirmed',record_ids:[],issues:[],shared_candidate_ids:[],source_hash:'qa-source-hash'}],pagination:{total:1},summary:{assigned:1,completed:0,needs_confirmation:1},charts:{daily:[]}};
 };
 export const salaryWrite=async(path,body)=>{window.saved={path,body};if(path.endsWith('approve'))status='approved';return {id:'7'};};
 export const salaryExport=async()=>{};
 `,
};
const fixture=`
import React from 'react';import{createRoot}from'react-dom/client';import{ConfigProvider}from'antd';import Page from '@/components/teacher-salary/TeacherSalaryPage';
createRoot(document.getElementById('root')).render(<ConfigProvider><Page mode="${mode}"/></ConfigProvider>);
const wait=ms=>new Promise(r=>setTimeout(r,ms));const until=async(f)=>{for(let i=0;i<200;i++){if(f())return;await wait(50);}throw Error('UI timed out');};
const button=t=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===t);
const set=(element,value)=>{Object.getOwnPropertyDescriptor(element instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(element,value);element.dispatchEvent(new Event('input',{bubbles:true}));element.dispatchEvent(new Event('change',{bubbles:true}));};
(async()=>{
 const mode='${mode}';
 if(mode==='report'){
  await until(()=>button('Xác nhận công'));button('Xác nhận công').click();await until(()=>document.getElementById('evidence'));
  set(document.getElementById('evidence'),'Đối soát ghi hình QA');set(document.getElementById('reason'),'Xác nhận QA');
 }else if(mode==='payroll'){
  await until(()=>button('Lương tháng 11/2020'));button('Lương tháng 11/2020').click();await until(()=>button('Duyệt và chốt'));
  button('Duyệt và chốt').click();await until(()=>document.getElementById('reason'));set(document.getElementById('reason'),'Duyệt QA');
 }else{
  await until(()=>button('Thêm phiên bản đơn giá'));button('Thêm phiên bản đơn giá').click();await until(()=>document.getElementById('name'));
  set(document.getElementById('name'),'Đơn giá QA');set(document.getElementById('amount'),'300000');set(document.getElementById('reason'),'Đơn giá QA');
 }
 const modal=[...document.querySelectorAll('.ant-modal')].filter(d=>d.getBoundingClientRect().height>0).pop();
 if(modal.getBoundingClientRect().width>innerWidth)throw Error('Modal exceeds viewport');
 const ok=modal.querySelector('.ant-modal-footer .ant-btn-primary');ok.click();await until(()=>window.saved);
 const {path,body}=window.saved;
 if(mode==='report'&&(path!=='teaching-records/confirm'||body.source_hashes['1']!=='qa-source-hash'||body.actual_start_time!=='2020-11-01T19:00:00Z'))throw Error('Confirmation payload invalid: '+JSON.stringify(window.saved));
 if(mode==='payroll'&&(!path.endsWith('/approve')||body.expected_version!==4||body.calculation_hash!=='qa-calculation-hash'))throw Error('Approval payload invalid');
 if(mode==='rates'&&(path!=='rates'||body.amount!=='300000'||body.dimensions.role!=='teacher'))throw Error('Rate payload invalid');
 document.getElementById('qa-result').textContent=JSON.stringify({ok:true,mode,viewport:innerWidth,path});
})().catch(e=>document.getElementById('qa-result').textContent=JSON.stringify({ok:false,error:e.message}));
`;
(async()=>{
const result=await esbuild.build({stdin:{contents:fixture,resolveDir:root,loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',tsconfig:root+'/tsconfig.json',define:{'process.env.NODE_ENV':'"development"','process.env':'{}'},plugins:[{name:'mocks',setup(b){b.onResolve({filter:/^@\/|^@ant-design\/charts$/},a=>mocks[a.path]?{path:a.path,namespace:'qa'}:{path:root+'/'+a.path.slice(2)+(fs.existsSync(root+'/'+a.path.slice(2)+'.tsx')?'.tsx':'.ts')});b.onLoad({filter:/.*/,namespace:'qa'},a=>({contents:mocks[a.path],loader:'js'}));}}]});
fs.writeFileSync(path.join(taskDir,'qa.html'),'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><pre id="qa-result" style="white-space:pre-wrap;overflow-wrap:anywhere">RUNNING</pre><script>'+result.outputFiles[0].text.replaceAll('</script','<\\/script')+'</script>');
const child=spawn(process.env.CHROME || '/usr/bin/google-chrome',['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--allow-file-access-from-files','--disable-background-timer-throttling','--disable-renderer-backgrounding','--remote-debugging-pipe','about:blank'],{stdio:['ignore','ignore','pipe','pipe','pipe']});
child.on('error', error => { process.stderr.write(String(error)+'\n'); process.exitCode=1; });
child.on('exit', () => { for (const entry of pending.values()) entry.reject(Error('Chrome exited')); pending.clear(); });
let buffer='',nextId=1;
const pending=new Map();
child.stdio[4].on('data',chunk=>{buffer+=chunk.toString();let i;while((i=buffer.indexOf('\0'))>=0){const msg=JSON.parse(buffer.slice(0,i));buffer=buffer.slice(i+1);if(msg.id){const p=pending.get(msg.id);pending.delete(msg.id);msg.error?p?.reject(Error(JSON.stringify(msg.error))):p?.resolve(msg.result)}}});
const call=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=nextId++;pending.set(id,{resolve,reject});child.stdio[3].write(JSON.stringify({id,method,params,...sessionId?{sessionId}:{}})+'\0')});
const timer=setTimeout(()=>{child.kill();process.stderr.write('Browser test timeout\n');process.exitCode=1},60000);
(async()=>{
const {targetId}=await call('Target.createTarget',{url:'file://'+path.join(taskDir, 'qa.html')});
const {sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});
await call('Emulation.setDeviceMetricsOverride',{width:Number(process.env.QA_VIEWPORT || 390),height:Number(process.env.QA_HEIGHT || 844),deviceScaleFactor:1,mobile:false},sessionId);
await call('Page.bringToFront',{},sessionId);
for(let i=0;i<160;i++){
 await new Promise(r=>setTimeout(r,300));
 const result=await call('Runtime.evaluate',{expression:'document.getElementById("qa-result")?.textContent',returnByValue:true},sessionId);
 const value=result.result?.value;
 if(value && value!=='RUNNING') {const report=JSON.parse(value);process.stdout.write(JSON.stringify(report,null,2)+'\n');if(!report.ok)process.exitCode=1;if(process.env.QA_SCREENSHOT){const shot=await call('Page.captureScreenshot',{format:'png'},sessionId);fs.writeFileSync(process.env.QA_SCREENSHOT,Buffer.from(shot.data,'base64'));}return;}
}
throw Error('Test result not produced');
})().catch(e=>{process.stderr.write(String(e)+'\n');process.exitCode=1}).finally(async()=>{clearTimeout(timer);await call('Browser.close').catch(()=>{});child.kill();fs.rmSync(taskDir,{recursive:true,force:true})});

})().catch(e=>{fs.rmSync(taskDir,{recursive:true,force:true});console.error(e);process.exitCode=1});
