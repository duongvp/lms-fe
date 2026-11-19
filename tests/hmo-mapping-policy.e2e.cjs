// Real bulk-edit modal; all services are in-memory fixtures, with no network/DB writes.
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const esbuild=require(path.resolve(root,'../lms-manage-api/node_modules/esbuild'));
const taskDir=fs.mkdtempSync(path.join(os.tmpdir(),'lms-hmo-policy-'));
const mocks={
 '@/services/livestreamService': `
   window.writes=[];window.scenario='partial';
   export const getProgramLessonsForScheduling=async()=>({data:[{id:11,learn_number:44,lesson_name:'Ôn tập thơ lục bát'}]});
   export const getHocmaiSectionsForSchedulingLessons=async()=>{
     if(window.scenario==='load-error')return {data:{by_lesson_id:{11:[]},errors_by_lesson_id:{11:['HMO timeout']}}};
     if(window.scenario==='empty')return {data:{by_lesson_id:{11:[]}}};
     const options=[
       {package_id:'11',course_id:'101',lesson_id:'171388',lesson_name:window.scenario==='partial'?'Ôn tập thơ lục bát':'English listening exercise'},
       {package_id:'22',course_id:'202',lesson_id:'171389',lesson_name:'English vocabulary exercise'},
     ];
     return {data:{by_lesson_id:{11:options}}};
   };
   export const updateLivestreamBulk=async payload=>{window.writes.push(payload);return {data:{count:1}}};
 `,
 '@/components/shared/TeachingStaffSelect': `export default function Stub(){return null}`,
};
const fixture=`
import '@ant-design/v5-patch-for-react-19';
import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import BulkEditModal from './app/(admin)/schedule/components/Modal/BulkEditModal';
window.fetch=()=>Promise.reject(Error('Network is blocked in this test'));
const rows=[{id:1,key:'qa',code:'qa-program',session_id:11,learn_number:44,lesson_name:'Ôn tập thơ lục bát',teacher:'Cô An',start_time:'2020-01-01T20:00:00',end_time:'2020-01-01T21:30:00',lesson_status:0,
 package_lesson_mappings:[{package_id:'11',course_id:'101',lesson_id:'171316'},{package_id:'22',course_id:'202',lesson_id:'171350'},{package_id:'33',course_id:'303',lesson_id:'171399'}]}];
const ids=['1'];let remount;
function App(){const [version,setVersion]=useState(0);remount=()=>setVersion(v=>v+1);return <BulkEditModal key={version} open onClose={()=>{}} onSuccess={()=>{}} requestedIds={ids} initialRows={rows}/>}
createRoot(document.getElementById('root')).render(<App/>);
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const visible=el=>el.getClientRects().length>0;
const button=text=>[...document.querySelectorAll('button')].find(el=>visible(el)&&el.textContent.trim()===text);
const until=async fn=>{for(let i=0;i<160;i++){if(fn())return;await pause(50)}throw Error('Timed out: '+fn.toString()+'; '+document.body.innerText.slice(-1500))};
const assert=(condition,message)=>{if(!condition)throw Error(message)};
const tags=()=>[...document.querySelectorAll('.ant-select-selection-item-content')].filter(visible).map(el=>el.textContent.trim()).filter(text=>/^171/.test(text)).sort();
const chooseRemove=()=>[...document.querySelectorAll('.ant-radio-wrapper')].find(el=>visible(el)&&el.textContent.includes('Xóa mapping cũ')).click();
const sync=async()=>{button('Đồng bộ Lesson ID HMO').click();await pause(350)};
const open=async(mode)=>{
 window.scenario='partial';remount();await pause(80);
 await until(()=>button('Đồng bộ Lesson ID HMO'));
 if(mode==='separate'){
   [...document.querySelectorAll('.ant-segmented-item')].find(el=>el.textContent.includes('Cấu hình riêng')).click();
   await until(()=>[...document.querySelectorAll('.ant-radio-wrapper')].some(el=>visible(el)&&el.textContent.includes('Giữ mapping cũ')));
   await pause(350);
 }
};
(async()=>{
 for(let i=0;i<100&&!remount;i++)await pause(20);
 for(const mode of ['common','separate']){
   await open(mode);
   const keep=[...document.querySelectorAll('.ant-radio-wrapper')].find(el=>visible(el)&&el.textContent.includes('Giữ mapping cũ'));
   assert(keep.querySelector('input').checked,'Default must keep old mappings');
   await sync();
   assert(tags().join(',')==='171350,171388,171399','Default policy lost unmatched/hidden old mappings: '+tags());
   chooseRemove();await sync();
   assert(tags().join(',')==='171388','Remove policy kept stale mapping: '+tags());
   assert(window.writes.length===(mode==='common'?0:1),'Sync wrote data before confirmation');
   window.scenario='none';await sync();
   assert(tags().length===0,'All unmatched mappings were not cleared');
   button('Xem trước').click();
   await until(()=>button('Xác nhận cập nhật'));
   assert(document.body.textContent.includes('Xóa toàn bộ Lesson ID'),'Preview does not disclose complete removal');
   assert(window.writes.length===(mode==='common'?0:1),'Preview wrote data');
   button('Xác nhận cập nhật').click();
   await until(()=>window.writes.length===(mode==='common'?1:2));
   assert(window.writes.at(-1).update_data[0].package_lesson_mappings.length===0,'Empty mapping missing from confirmed payload');
 }
 await open('common');chooseRemove();window.scenario='load-error';await sync();
 assert(tags().join(',')==='171316,171350,171399','Load error must not clear mappings');
 assert(document.body.textContent.includes('Giữ nguyên mapping cũ; không áp dụng xóa'),'Load error guidance missing');
 window.scenario='empty';await sync();assert(tags().length===0,'Valid empty HMO response must clear unmatched mappings when chosen');
 assert(window.writes.length===2,'Unexpected write outside explicit fixture confirmation');
 document.getElementById('qa-result').textContent=JSON.stringify({ok:true,checks:['default keep','partial removal','all unmatched clear','common and separate preview + empty payload','load failure preserves mappings','valid empty options clear'],mockWrites:window.writes});
})().catch(error=>{document.getElementById('qa-result').textContent=JSON.stringify({ok:false,error:error.message})});
`;
(async()=>{
 const result=await esbuild.build({stdin:{contents:fixture,resolveDir:root,loader:'tsx'},bundle:true,write:false,loader:{'.css':'empty'},platform:'browser',format:'iife',jsx:'automatic',tsconfig:root+'/tsconfig.json',define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'fixtures',setup(build){
   build.onResolve({filter:/^@\//},args=>mocks[args.path]?{path:args.path,namespace:'fixture'}:undefined);
   build.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:mocks[args.path],loader:'jsx'}));
 }}]});
 fs.writeFileSync(path.join(taskDir,'qa.html'),'<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="connect-src &apos;none&apos;"><style>'+fs.readFileSync(path.join(root,'app/globals.css'),'utf8').replace(/@import[^;]+;/g,'')+'</style><div id="root"></div><pre id="qa-result">RUNNING</pre><script>'+result.outputFiles[0].text.replaceAll('</script','<\\/script')+'</script>');
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
await call('Emulation.setDeviceMetricsOverride',{width:Number(process.env.QA_VIEWPORT || 1440),height:Number(process.env.QA_HEIGHT || 844),deviceScaleFactor:1,mobile:false},sessionId);
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
