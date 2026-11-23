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
    const programs={data:{data:[{code:'qa-program',subject_name:'QA'},{code:'qa-other',subject_name:'QB'},{code:'qa-empty',subject_name:'Không có lịch'}]},isLoading:false,isValidating:false};
    const moduleFields={data:undefined,isLoading:false,isValidating:false};
    const cache={refreshSchedules:async()=>{},refreshLessons:async()=>{}};
    export const useSchedulesQuery=params=>{if(params)window.qaTableRequest=params;return params?schedules:empty};
    export const useSchedulingProgramsQuery=()=>programs;
    export const useModuleFieldsQuery=()=>moduleFields;
    export const useTeachingStaffQuery=()=>empty;
    export const useScheduleTeacherFilterOptionsQuery=()=>empty;
    export const useScheduleHeaderFilterOptionsQuery=()=>({data:undefined,isLoading:false,isValidating:false});
    export const usePackageCoursesQuery=()=>empty;
    export const useLessonsQuery=()=>empty;
    export const useLmsCache=()=>cache;
  `,
  '@/stores/authStore': `
    const state={user:{userId:1,permissions:['calendar.view','calendar.create'],roles:['admin'],fieldPolicy:{modules:{calendar:{fields:{'*':{visible:true,editable:false}}}}}},can:permission=>permission==='calendar.create',hasPermission:()=>false,currentProgram:'qa-program',setCurrentProgram:()=>{}};
    export const useAuthStore=selector=>selector(state);useAuthStore.getState=()=>state;
  `,
  'next/navigation': `
    const today=new Date().toLocaleDateString('en-CA');
    const params=new URLSearchParams({program:'qa-program',system_type:'topclass',teacher:'Giáo viên trong bộ lọc bảng',from:today,to:today});
    const router={replace:()=>{},push:()=>{},refresh:()=>{}};
    export const useRouter=()=>router;export const useSearchParams=()=>params;export const usePathname=()=>'/schedule';export const useParams=()=>({});
  `,
  '@/components/layouts/AdminLayout/SideMenu': `export const rememberProgramContextUrl=()=>{};`,
  '@/ultils/fetchInstance': `
    const today=new Date().toLocaleDateString('en-CA');
    const row={id:1,key:'qa',code:'qa-program',learn_number:1,lesson_name:'Lịch kiểm thử điện thoại',teacher:'Nguyễn Mỹ Hạnh',assistant_teacher:'Trợ giảng kiểm thử',system_type:'topclass',class_name:'khtn-9-2027',subject:'KHTN 9',room:'lophockhtn-9-2027',session_id:239,package_lesson_mappings:[{lesson_id:169823,package_id:9187,course_id:12345}],start_time:today+'T18:00:00',end_time:today+'T19:00:00',lesson_status:0};
    const rows=[row,{...row,id:2,key:'qa-other',code:'qa-other',system_type:'topuni',lesson_name:'Buổi học chương trình khác'}];
    export const fetchInstance=async url=>{
      const parsed=new URL(url,'http://mock');const q=Object.fromEntries(parsed.searchParams);
      const current=rows.filter(r=>(!q.start_time||r.start_time>=q.start_time.slice(0,19))&&(!q.end_time||r.start_time<=q.end_time.slice(0,19)));
      if(parsed.pathname.includes('/filter-options/cross'))return {data:{program_systems:current.map(r=>({code:r.code,system_type:r.system_type})),programs:current.map(r=>r.code),teachers:[],systems:['topclass','topuni'],statuses:[],weekdays:[]}};
      if(parsed.pathname.endsWith('/livestreams')){
        window.qaCalendarRequests=[...(window.qaCalendarRequests||[]),q];
        const data=current.filter(r=>!q.code||r.code===q.code);
        return {data:{total:data.length,data:data.slice((Number(q.page)-1)*300,Number(q.page)*300)}};
      }
      return {data:[]};
    };`,
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
 await until(()=>window.qaTableRequest?.teacher);const tableBefore=JSON.stringify(window.qaTableRequest);
 switchView('calendar');
 await until(()=>document.querySelector('.fc-timegrid-body'));
 await pause(350);
 const metrics=()=>{const stage=document.querySelector('.schedule-view-stage');const fc=document.querySelector('.fc');return{stage:stage.getBoundingClientRect().height,calendar:fc.getBoundingClientRect().height,width:fc.getBoundingClientRect().width}};
 const first=metrics();
 if(first.stage<300||first.calendar<300)throw Error('Collapsed calendar: '+JSON.stringify(first));
 if(first.width>innerWidth)throw Error('Calendar overflows viewport');
 document.querySelector('.fc-timeGridDay-button').click();
 await until(()=>document.querySelector('.fc-event'));
 await pause(200);
 const cards=[...document.querySelectorAll('.fc-timegrid-event-harness > .fc-event')].map(el=>el.getBoundingClientRect());
 if(cards.some(r=>r.width>321))throw Error('Lesson cards are too wide');
 for(let i=0;i<cards.length;i++)for(let j=i+1;j<cards.length;j++){const a=cards[i],b=cards[j];if(Math.min(a.right,b.right)>Math.max(a.left,b.left)+1&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top)+1)throw Error('Concurrent lessons overlap');}
 const more=document.querySelector('.fc-timegrid-more-link');
 if(more){if(!more.textContent.includes('buổi'))throw Error('Hidden lessons link is unclear');more.click();await until(()=>document.querySelector('.fc-popover .fc-event'));document.querySelector('.fc-popover-close').click();}
 const lessonCount=()=>[...document.querySelectorAll('.fc-timegrid-event-harness > .fc-event')].filter(el=>getComputedStyle(el).visibility!=='hidden').length+[...document.querySelectorAll('.fc-timegrid-more-link')].reduce((n,el)=>n+Number(el.textContent.match(/[0-9]+/)?.[0]||0),0);
 if(window.qaCalendarRequests.some(q=>q.code||q.teacher||q.system_type||q.keyword))throw Error('Table filters leaked into calendar');
 if(document.getElementById('calendar-program'))throw Error('Old all-programs filter must be removed');
 const choose=async label=>{const select=document.getElementById('calendar-create-program').closest('.ant-select');if(!select.classList.contains('ant-select-open'))select.querySelector('.ant-select-selector').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));await pause(100);const popup=document.getElementById('calendar-create-program_list').closest('.ant-select-dropdown');const option=[...popup.querySelectorAll('.ant-select-item-option')].find(o=>o.textContent===label);if(!option)throw Error('Missing calendar program '+label);option.click();await pause(180);};
 const creation=document.getElementById('calendar-create-program');if(!creation)throw Error('Creation program picker missing');
 if(creation.closest('.fc-toolbar-chunk')!==document.querySelector('.fc-today-button').closest('.fc-toolbar-chunk'))throw Error('Creation program picker must be next to Today');
 await choose('qa-program · QA');await until(()=>document.querySelectorAll('.fc-event').length===1);
 await choose('qa-empty · Không có lịch');await until(()=>window.qaCreateModal?.programCode==='qa-empty'&&document.querySelectorAll('.fc-event').length===0);
 if(!document.querySelector('.calendar-create-enabled'))throw Error('Creating in selected program is not enabled');
 const lane=document.querySelector('.fc-timegrid-slot[data-time="09:00:00"].fc-timegrid-slot-lane');
 const endLane=document.querySelector('.fc-timegrid-slot[data-time="10:00:00"].fc-timegrid-slot-lane');
 const from=lane.getBoundingClientRect(),to=endLane.getBoundingClientRect();
 const x=from.left+from.width/2;
 lane.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0,buttons:1,clientX:x,clientY:from.top+2}));
 document.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,buttons:1,clientX:x,clientY:to.top+2}));
 await until(()=>document.querySelector('.calendar-selection-preview'));
 const preview=document.querySelector('.calendar-selection-preview');
 if(!/[0-9]{2}:[0-9]{2} – [0-9]{2}:[0-9]{2}/.test(preview.textContent))throw Error('Missing live drag time range: '+preview.textContent);
 const firstRange=preview.textContent;
 document.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,buttons:1,clientX:x,clientY:to.bottom+4}));
 await until(()=>document.querySelector('.calendar-selection-preview')?.textContent!==firstRange);
 document.dispatchEvent(new MouseEvent('mouseup',{bubbles:true,button:0,clientX:x,clientY:to.bottom+4}));
 // This fixture intentionally has no editable fields, so releasing must clear the preview.
 await until(()=>!document.querySelector('.calendar-selection-preview'));
 if(window.qaCreateModal?.open)throw Error('Creation must still respect field permissions');
 await pause(100);

 const clear=async()=>{document.getElementById('calendar-create-program').closest('.ant-select').querySelector('.ant-select-clear').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));await until(()=>!window.qaCreateModal?.programCode&&lessonCount()===2)};
 await clear();if(document.querySelector('.calendar-create-enabled'))throw Error('Clear must reset creation program');
 await choose('qa-other · QB');await until(()=>document.querySelectorAll('.fc-event').length===1);await clear();
 const previousRange=window.qaCalendarRequests.at(-1).start_time;
 document.querySelector('.fc-next-button').click();await until(()=>window.qaCalendarRequests.at(-1).start_time!==previousRange);
 document.querySelector('.fc-prev-button').click();await until(()=>lessonCount()===2);
 switchView('table');await pause(200);switchView('calendar');await pause(350);
 if(JSON.stringify(window.qaTableRequest)!==tableBefore)throw Error('Calendar filter changed table state');
 if(document.getElementById('calendar-create-program').closest('.ant-select').querySelector('.ant-select-selection-item'))throw Error('Calendar programs must reset on entry');
 const second=metrics();if(second.stage<300||second.calendar<300)throw Error('Collapsed after switching views');
 document.querySelector('.fc-dayGridMonth-button').click();await until(()=>document.querySelector('.fc-daygrid-body'));await pause(200);
 if(!document.getElementById('calendar-create-program'))throw Error('Creation picker lost after calendar view change');
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
 build.onLoad({filter:/.*/,namespace:'qa-empty'},args=>({contents:args.path.endsWith('/ScheduleModal')?'export default function Stub(props){window.qaCreateModal=props;return null}':'export default function Stub(){return null}',loader:'js'}));
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
