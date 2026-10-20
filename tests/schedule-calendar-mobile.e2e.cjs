// Real schedule page + FullCalendar in Chrome; services/navigation are mocked.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const esbuild = require(path.resolve(root, '../lms-manage-api/node_modules/esbuild'));
const taskDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lms-calendar-mobile-'));
const mocks = {
  '@/hooks/useLmsQueries': `
    const today=new Date().toLocaleDateString('en-CA');
    const row={id:1,key:'qa',code:'qa-program',learn_number:1,lesson_name:'Lịch kiểm thử điện thoại',teacher:'Nguyễn Mỹ Hạnh',assistant_teacher:'Trợ giảng kiểm thử',system_type:'topclass',class_name:'khtn-9-2027',subject:'KHTN 9',room:'lophockhtn-9-2027',session_id:239,student_synced_at:'2026-10-20',package_lesson_mappings:[{lesson_id:169823,package_id:9187,course_id:12345}],start_time:today+'T18:00:00',end_time:today+'T19:00:00',lesson_status:0};
    const schedules={data:{data:{data:[row],total:1}},isLoading:false,isValidating:false};
    const empty={data:[],isLoading:false,isValidating:false};
    const programs={data:{data:[{code:'qa-program',subject_name:'QA'}]},isLoading:false,isValidating:false};
    const moduleFields={data:undefined,isLoading:false,isValidating:false};
    const cache={refreshSchedules:async()=>{},refreshLessons:async()=>{}};
    export const useSchedulesQuery=params=>params?schedules:empty;
    export const useSchedulingProgramsQuery=()=>programs;
    export const useModuleFieldsQuery=()=>moduleFields;
    export const useTeachingStaffQuery=()=>empty;
    export const useScheduleTeacherFilterOptionsQuery=()=>empty;
    export const usePackageCoursesQuery=()=>empty;
    export const useLessonsQuery=()=>empty;
    export const useLmsCache=()=>cache;
  `,
  '@/stores/authStore': `
    const state={user:{userId:1,permissions:['calendar.view'],roles:['admin'],fieldPolicy:{modules:{calendar:{fields:{'*':{visible:true,editable:false}}}}}},can:()=>false,hasPermission:()=>false,currentProgram:'qa-program',setCurrentProgram:()=>{}};
    export const useAuthStore=selector=>selector(state);useAuthStore.getState=()=>state;
  `,
  'next/navigation': `
    const today=new Date().toLocaleDateString('en-CA');
    const params=new URLSearchParams({program:'qa-program',from:today,to:today});
    const router={replace:()=>{},push:()=>{},refresh:()=>{}};
    export const useRouter=()=>router;export const useSearchParams=()=>params;export const usePathname=()=>'/schedule';export const useParams=()=>({});
  `,
  '@/components/layouts/AdminLayout/SideMenu': `export const rememberProgramContextUrl=()=>{};`,
  '@/ultils/fetchInstance': `export const fetchInstance=async()=>({data:[]});`,
};
const fixture=`
import React from 'react';import {createRoot} from 'react-dom/client';
import Page from './app/(admin)/schedule/page';
window.addEventListener('error',e=>{document.getElementById('qa-result').textContent=JSON.stringify({ok:false,error:e.message})});
createRoot(document.getElementById('root')).render(<div className="ant-layout-content" style={{display:'flex',flexDirection:'column',minHeight:'100vh',height:innerWidth>=992?'100vh':'auto',padding:12}}><Page/></div>);
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const until=async fn=>{for(let i=0;i<120;i++){if(fn())return;await pause(50)}throw Error('UI condition timed out: '+fn.toString()+'; '+document.body.innerText.slice(0,500))};
const switchView=mode=>{const el=Array.from(document.querySelectorAll('.ant-segmented-item')).find(el=>el.textContent.includes(mode==='calendar'?'Dạng lịch':'Dạng bảng'));if(!el)throw Error('View switch missing');el.click()};
(async()=>{
 await until(()=>document.querySelector('.ant-segmented-item'));
 switchView('calendar');
 await until(()=>document.querySelector('.fc-timegrid-body'));
 await pause(350);
 const metrics=()=>{const stage=document.querySelector('.schedule-view-stage');const fc=document.querySelector('.fc');return{stage:stage.getBoundingClientRect().height,calendar:fc.getBoundingClientRect().height,width:fc.getBoundingClientRect().width}};
 const first=metrics();
 if(first.stage<300||first.calendar<300)throw Error('Collapsed calendar: '+JSON.stringify(first));
 if(first.width>innerWidth)throw Error('Calendar overflows viewport');
 if(!document.querySelector('.fc-event'))throw Error('Lesson missing');
 switchView('table');await pause(200);switchView('calendar');await pause(350);
 const second=metrics();if(second.stage<300||second.calendar<300)throw Error('Collapsed after switching views');
 document.querySelector('.fc-dayGridMonth-button').click();await until(()=>document.querySelector('.fc-daygrid-body'));await pause(200);
 if(!document.querySelector('.fc-event'))throw Error('Month lesson missing');
 document.querySelector('.fc-event').click();
 await until(()=>document.querySelector('.ant-modal .schedule-detail'));
 await pause(250);
 const detail=document.querySelector('.ant-modal .schedule-detail');
 const sections=detail.querySelectorAll('.schedule-detail-section');
 if(sections.length!==3)throw Error('Lesson details should have three information groups');
 for(const section of sections){
  const items=section.querySelectorAll('.schedule-detail-grid > .schedule-detail-item');
  if(items.length>=2){const a=items[0].getBoundingClientRect(),b=items[1].getBoundingClientRect();
   if(Math.abs(a.top-b.top)>2||b.left<=a.left)throw Error('Short lesson fields should share a row');
  }
 }
 if(detail.scrollWidth>detail.clientWidth+1)throw Error('Lesson details overflow horizontally');
 if(!detail.textContent.includes('169823')||!detail.textContent.includes('Trợ giảng kiểm thử'))throw Error('Lesson detail fields missing');
 const modalBody=document.querySelector('.ant-modal-body');
 if(innerWidth<768&&modalBody.getBoundingClientRect().bottom>innerHeight)throw Error('Details scroll area exceeds screen');
 document.getElementById('qa-result').textContent=JSON.stringify({ok:true,viewport:innerWidth,first,afterSwitch:second,detailGroups:sections.length,detailWidth:detail.clientWidth});
})().catch(e=>{document.getElementById('qa-result').textContent=JSON.stringify({ok:false,error:e.message})});
`;
(async()=>{
 const result=await esbuild.build({stdin:{contents:fixture,resolveDir:root,loader:'tsx'},bundle:true,write:false,loader:{'.css':'empty'},platform:'browser',format:'iife',jsx:'automatic',tsconfig:root+'/tsconfig.json',define:{'process.env.NODE_ENV':'"development"','process.env':'{}'},plugins:[{name:'qa-mocks',setup(build){
 build.onResolve({filter:/^\.\/components\/Modal\//},args=>args.importer.endsWith('/schedule/page.tsx')?{path:args.path,namespace:'qa-empty'}:undefined);
 build.onLoad({filter:/.*/,namespace:'qa-empty'},()=>({contents:'export default function Stub(){return null}',loader:'js'}));
 build.onResolve({filter:/^(@\/|next\/navigation$)/},args=>mocks[args.path]?{path:args.path,namespace:'qa'}:args.path.startsWith('@/')?{path:root+'/'+args.path.slice(2)+(fs.existsSync(root+'/'+args.path.slice(2)+'.tsx')?'.tsx':'.ts')}:undefined);
 build.onLoad({filter:/.*/,namespace:'qa'},args=>({contents:mocks[args.path],loader:'js'}));
 }}]});
 fs.writeFileSync(path.join(taskDir,'qa.html'),'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+fs.readFileSync(path.join(root,'app/globals.css'),'utf8').replace(/@import[^;]+;/g,'')+'</style><div id="root"></div><pre id="qa-result">RUNNING</pre><script>window.addEventListener("error",e=>{document.getElementById("qa-result").textContent=JSON.stringify({ok:false,error:e.message})});</script><script>'+result.outputFiles[0].text.replaceAll('</script','<\\/script')+'</script>');
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

})().catch(error => {fs.rmSync(taskDir,{recursive:true,force:true});process.stderr.write(String(error)+"\n");process.exitCode=1;});
