// Run with: node tests/schedule-column-filters.e2e.cjs
// Real schedule page in Chrome; services/navigation are mocked.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const esbuild = require(path.resolve(root, '../lms-manage-api/node_modules/esbuild'));
const taskDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lms-column-filters-'));
const mocks = {
  '@/hooks/useLmsQueries': `
    const empty={data:[],isLoading:false,isValidating:false};
    const row={code:'qa-program',lesson_name:'QA',teacher:'Teacher',assistant_teacher:'alice',system_type:'topclass',start_time:'2020-01-01T08:00:00',end_time:'2020-01-01T09:00:00',lesson_status:0};
    const rows=Array.from({length:1000},(_,i)=>({...row,id:i+1,key:String(i+1),learn_number:i+1}));
    Object.assign(rows[500],{assistant_teacher:'alice,zoe',start_time:'2030-01-01T08:00:00',end_time:'2030-01-01T09:00:00',lesson_status:1});
    Object.assign(rows[700],{assistant_teacher:'zoe',start_time:'2031-01-01T08:00:00',end_time:'2031-01-01T09:00:00'});
    const responses=new Map();
    export const useSchedulesQuery=params=>{
      if(!params)return empty;
      window.qaRequests=[...(window.qaRequests||[]),params];
      const key=JSON.stringify(params);
      if(!responses.has(key)){
        const scopedRows=params.code==='qa-unassigned'?rows.slice(0,3).map(row=>({...row,code:'qa-unassigned',assistant_teacher:[null,'[NULL]',''][row.id-1]})):rows;
        const filtered=scopedRows.filter(r=>(!params.live_dates?.length||params.live_dates.includes(r.start_time.slice(0,10)))
          &&(!params.assistant_teachers?.length||params.assistant_teachers.some(a=>String(/^(?:\[null\]|null)?$/i.test(String(r.assistant_teacher??'').trim())?'-':r.assistant_teacher).split(',').includes(a)))
          &&(!params.time_status?.length||[].concat(params.time_status).includes(r.lesson_status===1?'cancelled':r.start_time.startsWith('2020')?'completed':'upcoming'))
          &&(!params.progress_statuses?.length||params.progress_statuses.includes(r.lesson_status===1?'cancelled':r.start_time.startsWith('2020')?'completed':'upcoming')));
        responses.set(key,{data:{data:{data:filtered.slice(((params.page||1)-1)*(params.limit||25),(params.page||1)*(params.limit||25)),total:filtered.length}},isLoading:false,isValidating:false});
      }
      return responses.get(key);
    };
    const programs={data:{data:[{code:'qa-program',subject_name:'QA'},{code:'qa-unassigned',subject_name:'QA unassigned'}]},isLoading:false,isValidating:false};
    const fields={data:{fields:[{fieldCode:'learn_number',fieldLabel:'Bài học',fieldType:'number',sortOrder:1},{fieldCode:'lesson_name',fieldLabel:'Tên bài học',fieldType:'text',sortOrder:2},{fieldCode:'assistant_teacher',fieldLabel:'Trợ giảng',fieldType:'select',sortOrder:3},{fieldCode:'lesson_status',fieldLabel:'Tiến độ',fieldType:'select',sortOrder:4}]}};
    const options={data:{live_dates:['2020-01-01','2030-01-01','2031-01-01'],assistant_teachers:['alice','zoe'],progress_statuses:['completed','upcoming','cancelled']},isLoading:false,isValidating:false};
    const unassigned={data:{live_dates:['2020-01-01'],assistant_teachers:['-','[NULL]'],progress_statuses:['completed']},isLoading:false,isValidating:false};
    export const useScheduleHeaderFilterOptionsQuery=params=>{window.qaHeaderParams=params;return params?.code==='qa-unassigned'?unassigned:options};
    export const useScheduleTeacherFilterOptionsQuery=()=>empty;
    export const useSchedulingProgramsQuery=()=>programs;
    export const useModuleFieldsQuery=()=>fields;
    const staff={data:[{value:'outside-user',label:'Unrelated staff member'}],isLoading:false,isValidating:false};export const useTeachingStaffQuery=()=>staff;
    export const usePackageCoursesQuery=()=>empty;
    export const useLessonsQuery=()=>empty;
    const cache={refreshSchedules:async()=>{},refreshLessons:async()=>{}};
    export const useLmsCache=()=>cache;
  `,
  '@/stores/authStore': `
    const state={user:{userId:1,permissions:['calendar.view'],roles:['admin'],fieldPolicy:{modules:{calendar:{fields:{'*':{visible:true,editable:false}}}}}},can:()=>false,hasPermission:()=>false,currentProgram:'qa-program',setCurrentProgram:()=>{}};
    export const useAuthStore=selector=>selector(state);useAuthStore.getState=()=>state;
  `,
  'next/navigation': `
    const today=new Date().toLocaleDateString('en-CA');
    import {useSyncExternalStore} from 'react';
    let params=new URLSearchParams({program:'qa-program'});
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
createRoot(document.getElementById('root')).render(<div className="ant-layout-content" style={{padding:12,height:720,overflowY:'auto'}}><Page/></div>);
const pause=ms=>new Promise(r=>setTimeout(r,ms));const until=async fn=>{for(let i=0;i<240;i++){if(fn())return;await pause(25)}throw Error('UI timeout: '+fn.toString())};
const table=()=>document.querySelector('.schedule-data-table');
const ids=()=>Array.from(table()?.querySelectorAll('tbody tr[data-row-key]')||[],e=>e.dataset.rowKey);
const total=()=>table()?.querySelector('.ant-pagination-total-text')?.textContent;
const query=()=>window.qaRequests?.filter(p=>p.limit===25).at(-1);
const dropdown=()=>Array.from(document.querySelectorAll('.ant-dropdown:not(.ant-dropdown-hidden) .ant-table-filter-dropdown')).find(e=>e.getBoundingClientRect().width>0);
const open=async (title,expected)=>{
 const th=Array.from(table().querySelectorAll('thead th')).find(e=>e.textContent.includes(title));
 if(!th?.querySelector('.ant-table-filter-trigger'))throw Error('Missing header filter: '+title);
 th.querySelector('.ant-table-filter-trigger').click();await until(()=>dropdown()&&dropdown().textContent.includes(expected||(title==='Tiến độ'?'Chưa bắt đầu':title==='Trợ giảng'?'zoe':'01/01/2020')));
};
const choose=async(title,value)=>{
 await open(title);await until(()=>Array.from(dropdown()?.querySelectorAll('span[title]')||[]).some(e=>e.title===value));
 Array.from(dropdown().querySelectorAll('span[title]')).find(e=>e.title===value).closest('label').click();
 await until(()=>dropdown()?.querySelector('button.ant-btn-primary'));
 Array.from(dropdown().querySelectorAll('button')).find(e=>e.textContent.startsWith('Áp dụng')).click();
 await until(()=>!dropdown());
};
const clear=async title=>{await open(title);Array.from(dropdown().querySelectorAll('button')).find(e=>e.textContent.includes('Xóa bộ lọc')).click();await until(()=>!dropdown())};
(async()=>{
 await until(()=>ids().length===25&&total()?.includes('1000'));await pause(100);
 window.qaStage='top cancelled';
 const statusField=Array.from(document.querySelectorAll('.schedule-inline-filters .ant-form-item')).find(e=>e.querySelector('label')?.textContent==='Trạng thái');
 statusField.querySelector('.ant-select-selector').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));
 await until(()=>Array.from(document.querySelectorAll('.ant-select-item-option')).some(e=>e.textContent==='Nghỉ học'));
 const cancelledOption=Array.from(document.querySelectorAll('.ant-select-item-option')).find(e=>e.textContent==='Nghỉ học');
 const red=getComputedStyle(cancelledOption.querySelector('span')).color;
 if(red!=='rgb(207, 19, 34)')throw Error('Cancelled top option must be red: '+red);
 cancelledOption.click();
 document.querySelector('.schedule-inline-filters button[type=submit]').click();
 await until(()=>query()?.time_status?.includes('cancelled')&&ids().join(',')==='501');
 const cancelledCell=Array.from(table().querySelectorAll('tbody .ant-tag')).find(e=>e.textContent==='Nghỉ học');
 if(!cancelledCell?.classList.contains('ant-tag-red'))throw Error('Cancelled progress must be red');
 window.qaNavigate('/schedule?program=qa-program');
 await until(()=>!query()?.time_status?.length&&ids().length===25);await pause(100);
 window.qaStage='first date';await choose('Ngày live','01/01/2030');
 await until(()=>query()?.live_dates?.[0]==='2030-01-01'&&ids().join(',')==='501'&&total()?.includes('Tổng 1 '));
 window.qaStage='clear date';await clear('Ngày live');await until(()=>ids().length===25&&total()?.includes('1000'));
 table().querySelector('.ant-pagination-next button').click();await until(()=>ids()[0]==='26');await pause(500);
 window.qaStage='assistant';await choose('Trợ giảng','zoe');
 await until(()=>query()?.assistant_teachers?.[0]==='zoe'&&query()?.page===1&&ids().join(',')==='501,701');
 window.qaStage='cancelled';await choose('Tiến độ','Nghỉ học');
 await until(()=>query()?.progress_statuses?.includes('cancelled')&&ids().join(',')==='501');
 await choose('Tiến độ','Chưa bắt đầu');
 await until(()=>query()?.progress_statuses?.length===2&&ids().join(',')==='501,701');
 await choose('Ngày live','01/01/2031');
 await until(()=>query()?.live_dates?.[0]==='2031-01-01'&&ids().join(',')==='701'&&total()?.includes('Tổng 1 '));
 await clear('Tiến độ');await until(()=>!query()?.progress_statuses?.length&&ids().join(',')==='701');
 document.querySelector('.schedule-inline-filters .ant-select-selector').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));
 await until(()=>Array.from(document.querySelectorAll('.ant-select-item-option')).some(e=>e.textContent.includes('QA unassigned')));
 Array.from(document.querySelectorAll('.ant-select-item-option')).find(e=>e.textContent.includes('QA unassigned')).click();
 document.querySelector('.schedule-inline-filters button[type=submit]').click();
 await until(()=>ids().length===3&&window.qaHeaderParams?.code==='qa-unassigned');
 const expectedChoices=[['Trợ giảng','1 giá trị',['-']],['Tiến độ','Đã kết thúc',['Đã kết thúc']],['Ngày live','01/01/2020',['01/01/2020']]];
 for(const [title,marker,expected] of expectedChoices){
   await open(title,marker);
   const actual=Array.from(dropdown().querySelectorAll('label span[title]'),e=>e.title);
   if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error(title+' must contain only actual top-filter values: '+JSON.stringify(actual));
   Array.from(dropdown().querySelectorAll('button')).find(e=>e.textContent==='Hủy').click();await until(()=>!dropdown());
 }
 document.getElementById('qa-result').textContent=JSON.stringify({ok:true,choicesOnlyFromTopFilter:true,unassignedOnlyDash:true,noUnrelatedStaff:true,noUnusedProgressStates:true,dateBeyond300:true,assistantBeyondPage:true,resetsToFirstPage:true,cancelled:true,multiStatus:true,combinedFilters:true,totalMatches:true,clearPreservesOtherFilters:true});
})().catch(e=>{document.getElementById('qa-result').textContent=JSON.stringify({ok:false,stage:window.qaStage,query:query(),ids:ids(),error:e.stack||String(e)})});
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
