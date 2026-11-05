// Run with: node tests/pagination-spinner.e2e.cjs
// Real schedule page in Chrome; services/navigation are mocked.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const esbuild = require(path.resolve(root, '../lms-manage-api/node_modules/esbuild'));
const taskDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lms-pagination-spinner-'));
const mocks = {
  '@/hooks/useLmsQueries': `
    const today=new Date().toLocaleDateString('en-CA');
    const row={id:1,key:'qa',code:'qa-program',learn_number:1,lesson_name:'Lịch kiểm thử điện thoại',teacher:'Nguyễn Mỹ Hạnh',assistant_teacher:'Trợ giảng kiểm thử',system_type:'topclass',class_name:'khtn-9-2027',subject:'KHTN 9',room:'lophockhtn-9-2027',session_id:239,student_synced_at:'2026-10-20',package_lesson_mappings:[{lesson_id:169823,package_id:9187,course_id:12345}],start_time:today+'T18:00:00',end_time:today+'T19:00:00',lesson_status:0};
    const rows=Array.from({length:171},(_,i)=>({...row,id:i+1,key:'qa-'+i,learn_number:i+1}));const responses=new Map();
    const empty={data:[],isLoading:false,isValidating:false};
    const programs={data:{data:[{code:'qa-program',subject_name:'QA'},{code:'qa-small',subject_name:'QA small'},{code:'qa-empty',subject_name:'QA empty'}]},isLoading:false,isValidating:false};
    const moduleFields={data:undefined,isLoading:false,isValidating:false};
    const cache={refreshSchedules:async()=>{},refreshLessons:async()=>{}};
    import {useEffect,useReducer} from 'react';
    const waiting={data:undefined,isLoading:true,isValidating:true};
    export const useSchedulesQuery=params=>{
      window.qaQueryRenders=(window.qaQueryRenders||0)+1;
      const key=JSON.stringify(params);if(params?.limit===200)window.qaQuery200Cached=responses.has(key);if(params?.code==='qa-empty')window.qaEmptyQueryCached=responses.has(key);const [,update]=useReducer(n=>n+1,0);
      useEffect(()=>{
        if(!params||responses.has(key))return;
        const timer=setTimeout(()=>{const matchingRows=params.code==='qa-empty'?[]:params.code==='qa-small'?rows.slice(0,3).map(row=>({...row,code:'qa-small'})):rows;responses.set(key,{data:{data:{data:matchingRows.slice(((params.page||1)-1)*(params.limit||25),(params.page||1)*(params.limit||25)),total:params.code==='qa-empty'?169:matchingRows.length}},isLoading:false,isValidating:false});update()},800);
        return ()=>clearTimeout(timer);
      },[key]);
      return !params?empty:responses.get(key)||waiting;
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
createRoot(document.getElementById('root')).render(<div className="ant-layout-content" style={{padding:12,height:720,overflowY:"auto"}}><Page/></div>);
const pause=ms=>new Promise(r=>setTimeout(r,ms));const until=async fn=>{for(let i=0;i<200;i++){if(fn())return;await pause(25)}throw Error('UI timeout: '+fn.toString())};
const table=()=>document.querySelector('.schedule-data-table');
const spinning=()=>!!table()?.querySelector('.ant-spin-spinning');
const first=()=>table()?.querySelector('tbody tr[data-row-key]')?.dataset.rowKey;
const size=async n=>{
 table().querySelector('.ant-pagination-options .ant-select-selector').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));
 await until(()=>Array.from(document.querySelectorAll('.ant-select-item-option')).some(e=>e.textContent.includes(n)));
 window.qaLastOptionClickedAt=performance.now();
 Array.from(document.querySelectorAll('.ant-select-item-option')).find(e=>e.textContent.includes(n)).click();
};
(async()=>{
 await until(()=>first()==='1');await pause(100);
 table().querySelector('.ant-pagination-next button').click();
 await pause(100);if(spinning())throw Error('Uncached page must not show table spinner');
 await pause(400);if(spinning())throw Error('Uncached page must remain without spinner during request');
 await until(()=>first()==='26');await pause(100);
 table().querySelector('.ant-pagination-prev button').click();
 await until(()=>spinning());
 await pause(150);if(!spinning())throw Error('Cached page spinner must remain visible for at least 250ms');
 await until(()=>!spinning());
 await size('50');await pause(100);if(spinning())throw Error('Uncached page size must not show spinner');
 await until(()=>table().querySelectorAll('tbody tr[data-row-key]').length===50);await pause(100);
 await size('25');await until(()=>spinning());
 await pause(150);if(!spinning())throw Error('Cached page size spinner must remain visible');
 await until(()=>!spinning());
 // Reproduce changing 25 -> 300 while the admin page is scrolled down.
 const scroller=document.querySelector('.ant-layout-content');
 scroller.scrollTop=scroller.scrollHeight;
 await pause(50);
 await size('300');await until(()=>!!table()?.querySelector('.ant-spin-spinning .ant-spin-dot')); 
 const dot=table().querySelector('.ant-spin-spinning .ant-spin-dot');
 if(!dot)throw Error('Missing spinner indicator');
 const dotRect=dot.getBoundingClientRect();const viewport=scroller.getBoundingClientRect();
 if(dotRect.top<Math.max(0,viewport.top)||dotRect.bottom>Math.min(innerHeight,viewport.bottom))throw Error('Spinner must be inside the visible scrolled table: '+JSON.stringify({dotTop:dotRect.top,dotBottom:dotRect.bottom,viewportTop:viewport.top,viewportBottom:viewport.bottom}));
 if(!document.elementFromPoint(dotRect.x+dotRect.width/2,dotRect.y+dotRect.height/2)?.closest('.ant-spin'))throw Error('Spinner must be visible above the table');
 const spinnerCenters=[dotRect.top+dotRect.height/2];let trackSpinner=true;
 const observeSpinner=()=>{
   if(!trackSpinner)return;
   const currentDot=table()?.querySelector('.ant-spin-spinning .ant-spin-dot');
   if(currentDot){const r=currentDot.getBoundingClientRect();spinnerCenters.push(r.top+r.height/2)}
   requestAnimationFrame(observeSpinner);
 };
 requestAnimationFrame(observeSpinner);
 await until(()=>!spinning());trackSpinner=false;
 const spinnerDrift=Math.max(...spinnerCenters)-Math.min(...spinnerCenters);
 if(spinnerDrift>1)throw Error('Spinner moved during 25 -> 300: '+JSON.stringify({spinnerDrift,spinnerCenters}));
 await size('200');await until(()=>window.qaQuery200Cached);await pause(100);await until(()=>!spinning());
 scroller.scrollTop=scroller.scrollHeight;await pause(50);
 const beforeRenders=window.qaQueryRenders;
 await size('300');
 await new Promise(resolve=>requestAnimationFrame(resolve));
 const firstPaintMs=Math.round(performance.now()-window.qaLastOptionClickedAt);
 const selected=table().querySelector('.ant-pagination-options .ant-select-selection-item')?.textContent;
 if(!selected?.includes('300'))throw Error('Page size must show 300 on the first paint: '+selected);
 if(window.qaQueryRenders!==beforeRenders)throw Error('Heavy parent rendering must wait until after pagination feedback is painted');
 if(!spinning())throw Error('Spinner must be visible on the first paint of 200 -> 300');
 await until(()=>window.qaQueryRenders>beforeRenders);
 await until(()=>!spinning());
 const returnChecks=[];
 for(const largeSize of ['300','200']) {
   await size(largeSize);await until(()=>table().querySelectorAll('tbody tr[data-row-key]').length===171);await until(()=>!spinning());
   scroller.scrollTop=scroller.scrollHeight;await pause(50);
   let tracking=true;const blankFrames=[];let frames=0;
   const observe=()=>{
     if(!tracking)return;
     frames++;
     const clip=scroller.getBoundingClientRect();
     const rows=Array.from(table().querySelectorAll('tbody tr[data-row-key]'));
     const visible=rows.some(row=>{const r=row.getBoundingClientRect();return r.bottom>clip.top&&r.top<clip.bottom});
     if(!visible)blankFrames.push({rows:rows.length,scrollTop:scroller.scrollTop,scrollHeight:scroller.scrollHeight,tableBottom:table().getBoundingClientRect().bottom});
     requestAnimationFrame(observe);
   };
   requestAnimationFrame(observe);
   await size('25');
   await until(()=>table().querySelectorAll('tbody tr[data-row-key]').length===25);
   await until(()=>!spinning());await pause(100);tracking=false;
   if(blankFrames.length)throw Error('Blank frame when returning '+largeSize+' -> 25: '+JSON.stringify(blankFrames));
   returnChecks.push({from:largeSize,to:25,frames,blankFrames:blankFrames.length});
 }
 const filterProgram=async label=>{
   scroller.scrollTop=0;
   document.querySelector('.schedule-inline-filters .ant-select-selector').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));
   await until(()=>Array.from(document.querySelectorAll('.ant-select-item-option')).some(e=>e.textContent.includes(label)));
   Array.from(document.querySelectorAll('.ant-select-item-option')).find(e=>e.textContent.includes(label)).click();
   document.querySelector('.schedule-inline-filters button[type=submit]').click();
 };
 await filterProgram('QA small');
 await pause(100);
 if(table().querySelector('.ant-pagination'))throw Error('New filter must hide pagination from previous results while loading');
 await pause(300);
 if(table().querySelector('.ant-pagination'))throw Error('Stale pagination must remain hidden during the filter request');
 await until(()=>table().querySelector('.ant-pagination-total-text')?.textContent.includes('Tổng 3 buổi học'));
 if(table().querySelectorAll('tbody tr[data-row-key]').length!==3)throw Error('Pagination must return together with rows and total for the new filter');
 await filterProgram('QA empty');
 await pause(100);
 if(table().querySelector('.ant-pagination'))throw Error('Submitting the top filter must hide old pagination while loading');
 await until(()=>window.qaEmptyQueryCached&&!document.querySelector('.schedule-inline-filters button[type=submit]').classList.contains('ant-btn-loading'));
 await pause(100);
 if(table().querySelectorAll('tbody tr[data-row-key]').length)throw Error('Empty filter fixture must contain no visible rows');
 if(table().querySelector('.ant-pagination'))throw Error('Empty table must not show pagination even if API total is still 169');
 document.getElementById('qa-result').textContent=JSON.stringify({ok:true,topFilterSubmit:true,emptyTableHidesPagination:true,newFilterHidesStalePagination:true,newFilterTotal:3,spinnerDrift,returnTo25:returnChecks,immediate200To300:true,firstPaintMs,scrolled25To300SpinnerVisible:true,cachedPageVisible:true,cachedSizeVisible:true,uncachedPageNoSpinner:true,uncachedSizeNoSpinner:true});
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
 if(value && value!=='RUNNING') {const report=JSON.parse(value);process.stdout.write(JSON.stringify(report,null,2)+'\n');if(!report.ok)process.exitCode=1;return;}
}
throw Error('Test result not produced');
})().catch(e=>{process.stderr.write(String(e)+'\n');process.exitCode=1}).finally(async()=>{clearTimeout(timer);await call('Browser.close').catch(()=>{});child.kill();fs.rmSync(taskDir,{recursive:true,force:true})});

})().catch(error => {fs.rmSync(taskDir,{recursive:true,force:true});process.stderr.write(String(error)+"\n");process.exitCode=1;});
