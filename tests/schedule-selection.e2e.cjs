// Run with: node tests/schedule-selection.e2e.cjs
// Real schedule page in Chrome; services/navigation are mocked.
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
    const rows=Array.from({length:171},(_,i)=>({...row,id:i+1,key:'qa-'+i,learn_number:i+1}));const responses=new Map();
    const empty={data:[],isLoading:false,isValidating:false};
    const programs={data:{data:[{code:'qa-program',subject_name:'QA'}]},isLoading:false,isValidating:false};
    const moduleFields={data:undefined,isLoading:false,isValidating:false};
    const cache={refreshSchedules:async()=>{},refreshLessons:async()=>{}};
    export const useSchedulesQuery=params=>{
      if(!params)return empty;
      const key=JSON.stringify(params);
      if(!responses.has(key))responses.set(key,{data:{data:{data:rows.slice(((params.page||1)-1)*(params.limit||25),(params.page||1)*(params.limit||25)),total:171}},isLoading:false,isValidating:false});
      return responses.get(key);
    };
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
    const state={user:{userId:1,permissions:['calendar.view'],roles:['admin'],fieldPolicy:{modules:{calendar:{fields:{'*':{visible:true,editable:false}}}}}},can:()=>false,hasPermission:()=>false,currentProgram:'qa-program',setCurrentProgram:()=>{}};
    export const useAuthStore=selector=>selector(state);useAuthStore.getState=()=>state;
  `,
  'next/navigation': `
    const today=new Date().toLocaleDateString('en-CA');
    import {useSyncExternalStore} from 'react';
    let params=new URLSearchParams({program:'qa-program',from:today,to:today});
    const listeners=new Set();
    const navigate=url=>queueMicrotask(()=>{
      params=new URLSearchParams(url.split('?')[1]||'');
      window.qaUrl=url;
      listeners.forEach(listener=>listener());
    });
    window.qaNavigate=navigate;
    const router={replace:navigate,push:navigate,refresh:()=>{}};
    const subscribe=listener=>{listeners.add(listener);return ()=>listeners.delete(listener)};
    export const useRouter=()=>router;export const useSearchParams=()=>useSyncExternalStore(subscribe,()=>params,()=>params);export const usePathname=()=>'/schedule';export const useParams=()=>({});
  `,
  '@/components/layouts/AdminLayout/SideMenu': `export const rememberProgramContextUrl=()=>{};`,
  '@/ultils/fetchInstance': `export const fetchInstance=async()=>{window.qaFetchCalls=(window.qaFetchCalls||0)+1;return {data:[]}};`,
};
const fixture=`
import React from 'react';import {createRoot} from 'react-dom/client';import Page from './app/(admin)/schedule/page';
createRoot(document.getElementById('root')).render(<div className="ant-layout-content" style={{padding:12}}><Page/></div>);
const pause=ms=>new Promise(r=>setTimeout(r,ms));const until=async fn=>{for(let i=0;i<200;i++){if(fn())return;await pause(25)}throw Error('UI timeout: '+fn.toString())};
const header=()=>document.querySelector('.schedule-data-table thead input[type=checkbox]');
const rows=()=>Array.from(document.querySelectorAll('.schedule-data-table tbody input[type=checkbox]'));
const status=()=>Array.from(document.querySelectorAll('[role=status]')).find(e=>e.textContent.includes('Đã chọn'))?.textContent||'';
(async()=>{
 await until(()=>rows().length===25);await pause(100);
 header().click();
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 if(!rows().every(e=>e.checked))throw Error('Visible rows must be checked on the first paint');
 if(!status().includes('Đã chọn 171'))throw Error('Selection notice must update with the checkboxes on the first paint');
 await until(()=>status().includes('Đã chọn 171'));
 if(window.qaFetchCalls)throw Error('Select all must reuse the complete filter dataset');
 document.querySelector('.schedule-data-table .ant-pagination-next button').click();
 await until(()=>document.querySelector('.schedule-data-table tbody tr[data-row-key]')?.dataset.rowKey==='26');
 await until(()=>window.qaUrl?.includes('page=2'));
 await pause(150);
 if(!rows().every(e=>e.checked)||!status().includes('Đã chọn 171'))throw Error('Selection must survive pagination and URL hydration');
 rows()[0].click();
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 if(!status().includes('Đã chọn 170'))throw Error('Notice must immediately reflect a deselected row');
 await until(()=>status().includes('Đã chọn 170'));
 if(header().checked||!header().indeterminate)throw Error('Partial selection must be indeterminate');
 rows()[0].click();await until(()=>status().includes('Đã chọn 171'));
 if(!header().checked||header().indeterminate)throw Error('Selecting the omitted row must restore checked header');
 header().click();
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 if(status())throw Error('Notice must disappear with the cleared checkboxes');
 await until(()=>!status());
 if(rows().some(e=>e.checked))throw Error('Clear all must clear rows');
 document.querySelector('.schedule-data-table .ant-pagination-options .ant-select-selector').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));
 await until(()=>Array.from(document.querySelectorAll('.ant-select-item-option')).some(e=>e.textContent.includes('300')));
 Array.from(document.querySelectorAll('.ant-select-item-option')).find(e=>e.textContent.includes('300')).click();
 await until(()=>rows().length===171);await pause(200);
 const started=performance.now();header().click();
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 const firstPaintMs=Math.round(performance.now()-started);
 if(!rows().every(e=>e.checked))throw Error('All 171 rows must be checked on the first paint');
 if(!status().includes('Đã chọn 171'))throw Error('Selection notice must not wait for the deferred table render');
 await until(()=>status().includes('Đã chọn 171'));
 header().click();
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 if(status())throw Error('Notice must disappear with the cleared checkboxes');
 await until(()=>!status());
 rows()[0].click();
 rows()[4].dispatchEvent(new MouseEvent('click',{bubbles:true,shiftKey:true}));
 await until(()=>status().includes('Đã chọn 5'));
 if(!rows().slice(0,5).every(e=>e.checked))throw Error('Shift selection must select a range');
 rows()[0].focus();
 document.getElementById('qa-result').textContent='KEYBOARD';
 await until(()=>!rows()[0].checked && status().includes('Đã chọn 4'));
 document.getElementById('qa-result').textContent='RUNNING';
 window.qaNavigate(window.qaUrl+'&q=changed-filter');
 await until(()=>!status());
 if(rows().some(e=>e.checked))throw Error('A changed filter must reset selection');
 document.getElementById('qa-result').textContent=JSON.stringify({ok:true,urlHydration:true,filterChangeResets:true,firstPaintMs,cachedSelectAll:true,preserveAcrossPages:true,recheckHeader:true,shiftRange:true,keyboardSpace:true,immediateNotice:true});
})().catch(e=>{document.getElementById('qa-result').textContent=JSON.stringify({ok:false,error:String(e)})});
`;

(async()=>{
 const result=await esbuild.build({stdin:{contents:fixture,resolveDir:root,loader:'tsx'},bundle:true,write:false,loader:{'.css':'empty'},platform:'browser',format:'iife',jsx:'automatic',tsconfig:root+'/tsconfig.json',define:{'process.env.NODE_ENV':'"development"','process.env':'{}'},plugins:[{name:'qa-mocks',setup(build){
 build.onResolve({filter:/^\.\/components\/Modal\//},args=>args.importer.endsWith('/schedule/page.tsx')?{path:args.path,namespace:'qa-empty'}:undefined);
 build.onLoad({filter:/.*/,namespace:'qa-empty'},()=>({contents:'export default function Stub(){return null}',loader:'js'}));
 build.onResolve({filter:/^(@\/|next\/navigation$)/},args=>mocks[args.path]?{path:args.path,namespace:'qa'}:args.path.startsWith('@/')?{path:root+'/'+args.path.slice(2)+(fs.existsSync(root+'/'+args.path.slice(2)+'.tsx')?'.tsx':'.ts')}:undefined);
 build.onLoad({filter:/.*/,namespace:'qa'},args=>({contents:mocks[args.path],loader:'js',resolveDir:root}));
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
await call('Emulation.setDeviceMetricsOverride',{width:1440,height:Number(process.env.QA_HEIGHT || 844),deviceScaleFactor:1,mobile:false},sessionId);
await call('Page.bringToFront',{},sessionId);
for(let i=0;i<160;i++){
 await new Promise(r=>setTimeout(r,300));
 const result=await call('Runtime.evaluate',{expression:'document.getElementById("qa-result")?.textContent',returnByValue:true},sessionId);
 const value=result.result?.value;
 if(value==='KEYBOARD') {
   if(process.env.QA_SCREENSHOT){const shot=await call('Page.captureScreenshot',{format:'png'},sessionId);fs.writeFileSync(process.env.QA_SCREENSHOT,Buffer.from(shot.data,'base64'));}
   await call('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32},sessionId);
   await call('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32},sessionId);
   continue;
 }
 if(value && value!=='RUNNING') {const report=JSON.parse(value);process.stdout.write(JSON.stringify(report,null,2)+'\n');if(!report.ok)process.exitCode=1;return;}
}
throw Error('Test result not produced');
})().catch(e=>{process.stderr.write(String(e)+'\n');process.exitCode=1}).finally(async()=>{clearTimeout(timer);await call('Browser.close').catch(()=>{});child.kill();fs.rmSync(taskDir,{recursive:true,force:true})});

})().catch(error => {fs.rmSync(taskDir,{recursive:true,force:true});process.stderr.write(String(error)+"\n");process.exitCode=1;});
