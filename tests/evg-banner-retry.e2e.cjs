// Real schedule page and quick-banner modal in Chrome; network services are mocked.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const esbuild = require(path.resolve(root, '../lms-manage-api/node_modules/esbuild'));
const taskDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lms-evg-retry-'));
const existingBanner = process.env.QA_EXISTING === '1';
const unavailableSuggestions = process.env.QA_BANNER_LIST_ERROR === '1';
const mocks = {
  '@/hooks/useLmsQueries': `
    const today=new Date().toLocaleDateString('en-CA');
    const row={id:1,key:'qa',code:'qa-program',learn_number:1,lesson_name:'Lịch kiểm thử điện thoại',teacher:'Nguyễn Mỹ Hạnh',assistant_teacher:'Trợ giảng kiểm thử',system_type:'topclass',class_name:'khtn-9-2027',subject:'KHTN 9',room:'lophockhtn-9-2027',session_id:239,student_synced_at:'2026-10-20',package_lesson_mappings:[{lesson_id:169823,package_id:9187,course_id:12345}],start_time:today+'T18:00:00',end_time:today+'T19:00:00',lesson_status:0};
    const rows=[1,2,3].map(id=>({...row,id,key:String(id),teacher:'GV '+id,lesson_name:'Bài kiểm thử '+id}));
    const schedules={data:{data:{data:rows,total:3}},isLoading:false,isValidating:false};
    const empty={data:[],isLoading:false,isValidating:false};
    const programs={data:{data:[{code:'qa-program',subject_name:'QA'}]},isLoading:false,isValidating:false};
    const moduleFields={data:undefined,isLoading:false,isValidating:false};
    const cache={refreshSchedules:async()=>{},refreshLessons:async()=>{}};
    export const useSchedulesQuery=params=>params?schedules:empty;
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
    const state={user:{userId:1,permissions:['*'],roles:['admin'],fieldPolicy:{modules:{calendar:{fields:{'*':{visible:true,editable:false}}}}}},can:()=>true,hasPermission:()=>true,currentProgram:'qa-program',setCurrentProgram:()=>{}};
    export const useAuthStore=selector=>selector(state);useAuthStore.getState=()=>state;
  `,
  'next/navigation': `
    const today=new Date().toLocaleDateString('en-CA');
    const params=new URLSearchParams({program:'qa-program',from:today,to:today});
    const router={replace:()=>{},push:()=>{},refresh:()=>{}};
    export const useRouter=()=>router;export const useSearchParams=()=>params;export const usePathname=()=>'/schedule';export const useParams=()=>({});
  `,
  '@/components/layouts/AdminLayout/SideMenu': `export const rememberProgramContextUrl=()=>{};`,
  '@/ultils/fetchInstance': `
    window.evgCalls=[];window.savedBanners=[];window.bannerSaveCalls=[];
    const banners=[{id:10,program_code:'old-program',teacher_profile_id:2,username:'gv2',display_name:'GV 2',banner_url:'https://cdn.test/reuse.jpg',status:1}${existingBanner ? ",{id:30,program_code:'qa-program',teacher_profile_id:3,username:'gv3',display_name:'GV 3',banner_url:'https://cdn.test/inactive.jpg',status:0}" : ''}];
    export const fetchInstance=async(url,options={})=>{
      if(url.includes('/program-teacher-banners/options'))return {data:{teachers:[1,2,3].map(id=>({id,username:'gv'+id,display_name:'GV '+id}))}};
      if(url.includes('/program-teacher-banners')){
        if(options.method==='POST'||options.method==='PUT'){
          if(window.failNextSave){window.failNextSave=false;throw Error('Lưu banner thất bại, thử lại');}
          const payload=JSON.parse(options.body);window.bannerSaveCalls.push({url,method:options.method});window.savedBanners.push(payload);
          const saved={...payload,id:100+window.savedBanners.length,username:'gv'+payload.teacher_profile_id};
          banners.push(saved);return {data:saved};
        }
        ${unavailableSuggestions ? "throw Error('Không tải được banner');" : ''}
        return {data:{data:banners,pagination:{total:banners.length}}};
      }
      if(url.includes('/evg-stream')){
        const id=Number(url.match(/\\/(\\d+)\\/evg-stream/)[1]);
        window.evgCalls.push({id,...JSON.parse(options.body)});
        if(id!==1&&!window.savedBanners.some(b=>b.teacher_profile_id===id))throw Error('Chưa cấu hình banner cho chương trình qa-program và giáo viên GV '+id);
        return {data:{stream_id:id}};
      }
      return {data:[]};
    };
  `,
};
const fixture=`
import '@ant-design/v5-patch-for-react-19';
import React from 'react';import {createRoot} from 'react-dom/client';
import Page from './app/(admin)/schedule/page';
window.addEventListener('error',event=>{document.getElementById('qa-result').textContent=JSON.stringify({ok:false,error:event.message})});
window.addEventListener('unhandledrejection',event=>{document.getElementById('qa-result').textContent=JSON.stringify({ok:false,error:String(event.reason)})});
createRoot(document.getElementById('root')).render(<Page/>);
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const assert=(condition,message)=>{if(!condition)throw Error(message)};
const until=async fn=>{for(let i=0;i<160;i++){if(fn())return;await pause(50)}throw Error('Timed out: '+fn.toString()+'; '+document.body.innerText.slice(-1600))};
const button=(text,root=document)=>[...root.querySelectorAll('button')].find(el=>el.textContent.trim()===text);
const progress=()=>[...document.querySelectorAll('.ant-modal')].find(el=>el.textContent.includes('Tiến trình tạo/đồng bộ EVG'));
const quick=()=>[...document.querySelectorAll('.ant-modal')].find(el=>el.textContent.includes('Tạo banner nhanh cho EVG'));
const setInput=(input,text)=>{
 Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,text);
 input.dispatchEvent(new Event('input',{bubbles:true}));
};
const errorRow=id=>[...progress().querySelectorAll('.ant-list-item')].find(el=>el.textContent.includes('ID lịch '+id));
(async()=>{
 const rowCheckboxes=()=>document.querySelectorAll(innerWidth<768?'.responsive-table-card input[type="checkbox"]':'.schedule-row-checkbox');
 await until(()=>rowCheckboxes().length===3);
 for(const checkbox of rowCheckboxes()){checkbox.click();await pause(100)}
 await pause(350);
 if(innerWidth<768){
   document.querySelector('button[aria-label="Mở menu thao tác"]').click();
   await until(()=>[...document.querySelectorAll('.ant-collapse-header')].some(el=>el.textContent.includes('Đồng bộ')));
   [...document.querySelectorAll('.ant-collapse-header')].find(el=>el.textContent.includes('Đồng bộ')).click();
   await until(()=>[...document.querySelectorAll('button')].some(el=>el.textContent.includes('Tạo/đồng bộ EVG')));
   [...document.querySelectorAll('button')].find(el=>el.textContent.includes('Tạo/đồng bộ EVG')).click();
 }else{
   button('Đồng bộ').click();
   await until(()=>[...document.querySelectorAll('.ant-dropdown-menu-item')].some(el=>el.textContent.includes('Tạo/đồng bộ EVG')));
   [...document.querySelectorAll('.ant-dropdown-menu-item')].find(el=>el.textContent.includes('Tạo/đồng bộ EVG')).click();
 }
 await until(()=>button('Thực hiện'));
 button('Thực hiện').click();
 await until(()=>progress()?.querySelectorAll('.ant-list-item').length===2);
 assert(window.evgCalls.length===3,'Initial EVG requests missing');
 await pause(${process.env.QA_EVG_SCREENSHOT ? 400 : 0});
 window.qaEvgReady=true;await pause(${process.env.QA_EVG_SCREENSHOT ? 750 : 0});
 button('Tạo banner nhanh',errorRow(2)).click();
 await until(()=>quick()?.querySelector('.ant-select-auto-complete input'));
 await until(()=>!button('Lưu banner',quick()).disabled);
 window.qaQuickReady=true;await pause(650);
 const urlInput=quick().querySelector('.ant-select-auto-complete input');
 if(${unavailableSuggestions}){
   assert(quick().textContent.includes('Bạn vẫn có thể nhập URL ảnh mới'),'Missing fallback guidance');
   setInput(urlInput,'https://cdn.test/reuse.jpg');
 }else{
   urlInput.focus();
   await until(()=>document.querySelector('.ant-select-item-option'));
   setInput(urlInput,'old-program');
   await until(()=>document.querySelector('.ant-select-item-option'));
   [...document.querySelectorAll('.ant-select-item-option')].find(el=>el.textContent.includes('old-program')).click();
 }
 button('Lưu banner',quick()).click();button('Lưu banner',quick()).click();
 await until(()=>window.savedBanners.length===1);
 await pause(350);
 assert(window.savedBanners[0].banner_url==='https://cdn.test/reuse.jpg','Existing banner URL was not reused');
 assert(window.savedBanners[0].teacher_profile_id===2&&window.savedBanners[0].program_code==='qa-program','Banner saved for the wrong calendar context');
 button('Thử lại',errorRow(2)).click();
 await until(()=>progress().querySelectorAll('.ant-list-item').length===1);
 assert(window.evgCalls.length===4&&window.evgCalls.at(-1).id===2,'Single retry reran successful calendars');
 button('Tạo banner nhanh',errorRow(3)).click();
 await until(()=>quick()?.querySelector('.ant-select-auto-complete input'));
 const saveButton=()=>button('Lưu banner',quick())||button('Cập nhật và bật banner',quick());
 await until(()=>!saveButton().disabled);
 setInput(quick().querySelector('.ant-select-auto-complete input'),'not-a-url');
 saveButton().click();await pause(150);
 assert(window.savedBanners.length===1,'Invalid URL was saved');
 setInput(quick().querySelector('.ant-select-auto-complete input'),'https://cdn.test/new.jpg');
 window.failNextSave=true;saveButton().click();await pause(250);
 assert(window.savedBanners.length===1&&quick(),'Server error closed the banner modal or lost the form');
 assert(quick().querySelector('.ant-select-auto-complete input').value==='https://cdn.test/new.jpg','Server error lost the entered URL');
 saveButton().click();
 await until(()=>window.savedBanners.length===2);await pause(350);
 assert(window.bannerSaveCalls[1].method===${existingBanner ? "'PUT'" : "'POST'"},'Existing inactive banner was not updated');
 assert(window.savedBanners[1].banner_url==='https://cdn.test/new.jpg'&&window.savedBanners[1].status===1,'Manual URL or active status lost');
 button('Thử lại tất cả lịch lỗi',progress()).click();
 await until(()=>!progress().querySelector('.ant-list-item'));
 assert(window.evgCalls.map(call=>call.id).join(',')==='1,2,3,2,3','Retry-all reran successful calendars');
 assert(window.evgCalls.every(call=>call.mode==='overwrite'),'Retry changed the selected mode');
 assert([...rowCheckboxes()].filter(el=>el.checked).length===3,'EVG cleared the original selection');
 assert(progress().textContent.includes('Thất bại: 0'),'Final failure count was not cleared');
 document.getElementById('qa-result').textContent=JSON.stringify({ok:true,viewport:innerWidth,calls:window.evgCalls,saved:window.savedBanners});
})().catch(error=>{document.getElementById('qa-result').textContent=JSON.stringify({ok:false,error:error.message})});
`;
(async()=>{
 const result=await esbuild.build({stdin:{contents:fixture,resolveDir:root,loader:'tsx'},bundle:true,write:false,loader:{'.css':'empty'},platform:'browser',format:'iife',jsx:'automatic',tsconfig:root+'/tsconfig.json',define:{'process.env.NODE_ENV':'"development"','process.env':'{}'},plugins:[{name:'qa-mocks',setup(build){
 build.onResolve({filter:/^\.\/components\/Modal\//},args=>args.importer.endsWith('/schedule/page.tsx')&&!args.path.includes('QuickEvgBannerModal')?{path:args.path,namespace:'qa-empty'}:undefined);
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
await call('Emulation.setDeviceMetricsOverride',{width:Number(process.env.QA_VIEWPORT || 1366),height:Number(process.env.QA_HEIGHT || 844),deviceScaleFactor:1,mobile:false},sessionId);
await call('Page.bringToFront',{},sessionId);
let quickCaptured=false;
let evgCaptured=false;
for(let i=0;i<160;i++){
 await new Promise(r=>setTimeout(r,300));
 const result=await call('Runtime.evaluate',{expression:'document.getElementById("qa-result")?.textContent',returnByValue:true},sessionId);
 if(process.env.QA_EVG_SCREENSHOT&&!evgCaptured){
   const ready=await call('Runtime.evaluate',{expression:'Boolean(window.qaEvgReady)',returnByValue:true},sessionId);
   if(ready.result?.value){const shot=await call('Page.captureScreenshot',{format:'png'},sessionId);fs.writeFileSync(process.env.QA_EVG_SCREENSHOT,Buffer.from(shot.data,'base64'));evgCaptured=true;}
 }
 if(process.env.QA_QUICK_SCREENSHOT&&!quickCaptured){
   const ready=await call('Runtime.evaluate',{expression:'Boolean(window.qaQuickReady)',returnByValue:true},sessionId);
   if(ready.result?.value){const shot=await call('Page.captureScreenshot',{format:'png'},sessionId);fs.writeFileSync(process.env.QA_QUICK_SCREENSHOT,Buffer.from(shot.data,'base64'));quickCaptured=true;}
 }
 const value=result.result?.value;
 if(value && value!=='RUNNING') {const report=JSON.parse(value);process.stdout.write(JSON.stringify(report,null,2)+'\n');if(!report.ok)process.exitCode=1;if(process.env.QA_SCREENSHOT){const shot=await call('Page.captureScreenshot',{format:'png'},sessionId);fs.writeFileSync(process.env.QA_SCREENSHOT,Buffer.from(shot.data,'base64'));}return;}
}
throw Error('Test result not produced');
})().catch(e=>{process.stderr.write(String(e)+'\n');process.exitCode=1}).finally(async()=>{clearTimeout(timer);await call('Browser.close').catch(()=>{});child.kill();fs.rmSync(taskDir,{recursive:true,force:true})});

})().catch(error => {fs.rmSync(taskDir,{recursive:true,force:true});process.stderr.write(String(error)+"\n");process.exitCode=1;});
