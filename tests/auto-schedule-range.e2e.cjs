// Runs the real modal and Ant Design controls in Chrome with mocked services.
// Requires Chrome and the existing esbuild installation in lms-manage-api.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const esbuild = require(path.resolve(root, '../lms-manage-api/node_modules/esbuild'));
const taskDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lms-auto-schedule-'));
const mocks = {
  '@/services/livestreamService': `
    export const getProgramLessonsForScheduling = async code => ({data: Array.from({length: window.qaCount},(_,i)=>({id:String(i+1),learn_number:i+1,lesson_name:'Bài '+(i+1),system_type:window.qaSystem,scheduled_count:0,past_scheduled_count:0}))});
    export const getHocmaiSectionsForSchedulingLesson = async (code,id) => {window.qaHmo.push({code,id}); if(window.qaHoldHmo) return new Promise(resolve=>window.qaHmoReleases.push(()=>resolve({data:[{package_id:'old',course_id:'old',lesson_id:'stale'}]}))); return {data:[]}};
    export const previewAutoSchedule = async payload => {window.qaPayload=payload;return {data:{calendars:[]}}};
    export const commitAutoSchedule = async () => {throw Error('QA must never commit')};
  `,
  '@/hooks/useLessonSubjectOptions': `export const useLessonProgramOptions = () => [{subject_code:'qa',system_type:window.qaSystem}];`,
  '@/hooks/useLmsQueries': `const result={data:[{value:'gv',username:'gv',displayName:'Giáo viên QA',label:'Giáo viên QA'}],isLoading:false,isValidating:false,mutate:async()=>{}};export const useTeachingStaffQuery=()=>result;`,
  '@/stores/authStore': `export const useAuthStore=fn=>fn({hasPermission:()=>false});`,
  '@/services/teacherProfileService': `export const formatTeachingStaffLabel=(name,user)=>name||user;export const getTeacherProfiles=async()=>({data:{data:[]}});export const createTeacherProfile=async()=>({});`,
};

(async () => {
const result=await esbuild.build({stdin:{contents:fs.readFileSync(path.join(__dirname, 'auto-schedule-range.fixture.txt'),'utf8'),resolveDir:root,loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',tsconfig:root+'/tsconfig.json',define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'qa-mocks',setup(build){build.onResolve({filter:/^@\//},args=>mocks[args.path]?{path:args.path,namespace:'qa'}:{path:root+'/'+args.path.slice(2)+(fs.existsSync(root+'/'+args.path.slice(2)+'.tsx')?'.tsx':'.ts')});build.onLoad({filter:/.*/,namespace:'qa'},args=>({contents:mocks[args.path],loader:'ts'}));}}]});
fs.writeFileSync(path.join(taskDir, 'qa.html'), '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+fs.readFileSync(path.join(root, 'app/globals.css'), 'utf8').replace(/@import[^;]+;/g, '')+'</style><div id="root"></div><pre id="qa-result">RUNNING</pre><script>'+result.outputFiles[0].text.replaceAll('</script','<\\/script')+'</script>');

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
await call('Emulation.setDeviceMetricsOverride',{width:Number(process.env.QA_VIEWPORT || 1280),height:1000,deviceScaleFactor:1,mobile:false},sessionId);
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
