// Real form, preview, validators and payload serializers; all network writes are mocked.
const {spawn}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const root=path.resolve(__dirname,'..');const esbuild=require('../../lms-manage-api/node_modules/esbuild');
const taskDir=fs.mkdtempSync(path.join(os.tmpdir(),'lms-reschedule-workflow-'));
const mocks={
 '@/hooks/useCalendarApprovalPolicy':`export const useCalendarApprovalPolicy=()=>({required_operations:window.qaRequiresApproval?['reschedule']:[]});`,
 '@/hooks/useLessonSubjectOptions':`const rows=[];export const useLessonProgramOptions=()=>rows;export const useLessonSubjectOptions=()=>rows;`,
 '@/hooks/useLmsQueries':`const empty={data:{data:{data:[]}},isLoading:false,isValidating:false};const packages={data:{data:[]},isLoading:false,isValidating:false};const cache={refreshLessons:async()=>{}};export const useLmsCache=()=>cache;export const useLessonsQuery=()=>empty;export const usePackageCoursesQuery=()=>packages;const schedules={data:{data:{data:[]}},isLoading:false,isValidating:false};export const useSchedulesQuery=()=>{schedules.data.data.data=window.qaRows;return schedules};`,
 '@/components/shared/TeachingStaffSelect':`import {Select} from 'antd';export default function Staff({teacherType,teacherValueMode,allowQuickCreate,...props}){return <Select {...props} options={teacherType===0?[{value:'tg',label:'Trợ giảng QA'}]:[{value:'Giáo viên QA',label:'Giáo viên QA'}]}/>}`,
 '@/components/shared/HmoMappingSelect':`export default function Mapping(){return null}`,
 '@/stores/authStore':`const state={user:{userId:1},hasPermission:permission=>permission==='calendar.teacher.manage'?window.qaCanAssign!==false:true};export const useAuthStore=selector=>selector(state);useAuthStore.getState=()=>state;`,
 '@/ultils/fetchInstance':`export const fetchInstance=async(url,options={})=>{if(options.method&&options.method!=='GET'){window.qaWrites.push({url,method:options.method,body:JSON.parse(options.body)});if(window.qaFail){window.qaFail=false;throw Error('QA conflict')}return {success:true,data:{approval_required:!!window.qaRequiresApproval}};}return {data:{data:window.qaRows,total:window.qaRows?.length||0}};};`,
};
const fixture=fs.readFileSync(path.join(__dirname,'reschedule-workflow.fixture.txt'),'utf8');
(async()=>{const result=await esbuild.build({stdin:{contents:fixture,resolveDir:root,loader:'tsx'},bundle:true,write:false,outdir:taskDir,platform:'browser',format:'iife',jsx:'automatic',tsconfig:root+'/tsconfig.json',define:{'process.env.NODE_ENV':'"development"','process.env':'{}'},plugins:[{name:'fixture',setup(build){build.onResolve({filter:/^@\//},args=>mocks[args.path]?{path:args.path,namespace:'fixture'}:undefined);build.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:mocks[args.path],loader:'jsx',resolveDir:root}));}}]});
 const css=result.outputFiles.find(file=>file.path.endsWith('.css'))?.text||'';const js=result.outputFiles.find(file=>file.path.endsWith('.js')).text;
 fs.writeFileSync(path.join(taskDir,'qa.html'),'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>#qa-result{display:none}'+css+'</style><div id="root"></div><pre id="qa-result">RUNNING</pre><script>'+js.replaceAll('</script','<\\/script')+'</script>');
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
