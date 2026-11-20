const {spawn}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const esbuild=require(path.join(root,'../lms-manage-api/node_modules/esbuild'));
const taskDir=fs.mkdtempSync(path.join(os.tmpdir(),'lms-groups-ui-'));
const mocks={
 '@/stores/authStore':`const s={user:{userId:1},authSessionVersion:1};export const useAuthStore=f=>f(s);`,
 '@/services/learningGroupService':`
 let data={settings:{code:'QA',teaching_model:'small_group',default_capacity:10},groups:[{id:1,code:'QA',group_code:'N001',name:'Nhóm buổi tối',capacity:10,status:'active'}]};
 export const getProgramGroups=async()=>({data:JSON.parse(JSON.stringify(data))});
 export const saveProgramSettings=async(code,v)=>{window.savedSettings=v;data.settings={...data.settings,...v};};
 export const saveLearningGroup=async(code,v,id)=>{window.savedGroup={code,...v,id};if(id)data.groups=data.groups.map(g=>g.id===id?{...g,...v}:g);else data.groups.push({...v,code,id:2,group_code:v.group_code||'N002'});};
 `,
};
const fixture=`
import React from 'react';import{createRoot}from'react-dom/client';import{ConfigProvider,Form,Button}from'antd';
import ProgramGroups,{ScheduleGroupPicker}from'@/components/shared/ProgramGroups';
const App=()=>{const[f]=Form.useForm();return <ConfigProvider><main style={{padding:16,maxWidth:900}}><h2>Lịch học theo nhóm</h2><ProgramGroups code="QA" canCreate canEdit onFilter={id=>window.selectedGroup=id}/><Form form={f} layout="vertical" onFinish={v=>window.picked=v}><ScheduleGroupPicker code="QA" form={f}/><Button htmlType="submit">Xem trước lịch</Button></Form></main></ConfigProvider>};
createRoot(document.getElementById('root')).render(<App/>);
const wait=ms=>new Promise(r=>setTimeout(r,ms));const until=async(f)=>{for(let i=0;i<160;i++){if(f())return;await wait(50);}throw Error('UI condition timed out');};
const button=t=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===t);
const setInput=(input,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));};
(async()=>{
 await until(()=>button('Mô hình & nhóm học')&&!button('Mô hình & nhóm học').disabled);
 button('Mô hình & nhóm học').click();await until(()=>button('Thêm nhóm'));
 button('Thêm nhóm').click();await until(()=>document.querySelector('input[id$="name"]'));
 const names=[...document.querySelectorAll('input[id$="name"]')];setInput(names[names.length-1],'Nhóm cuối tuần');
 const dialogs=[...document.querySelectorAll('.ant-modal')].filter(d=>d.getBoundingClientRect().height>0);const dialog=dialogs[dialogs.length-1];
 const ok=[...dialog.querySelectorAll('button')].find(b=>b.classList.contains('ant-btn-primary'));ok.click();
 await until(()=>window.savedGroup);if(window.savedGroup.name!=='Nhóm cuối tuần'||window.savedGroup.capacity!==10)throw Error('Group payload incorrect');
 await until(()=>document.body.textContent.includes('Nhóm cuối tuần'));
 if(innerWidth<768&&[...document.querySelectorAll('.ant-modal')].filter(d=>d.getBoundingClientRect().height>0).some(d=>d.getBoundingClientRect().width>innerWidth))throw Error('Modal exceeds mobile width');
 document.getElementById('qa-result').textContent=JSON.stringify({ok:true,viewport:innerWidth,group:window.savedGroup,visibleNewGroup:true});
})().catch(e=>document.getElementById('qa-result').textContent=JSON.stringify({ok:false,error:e.message}));
`;
(async()=>{
const result=await esbuild.build({stdin:{contents:fixture,resolveDir:root,loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',tsconfig:root+'/tsconfig.json',define:{'process.env.NODE_ENV':'"development"','process.env':'{}'},plugins:[{name:'mocks',setup(b){b.onResolve({filter:/^@\//},a=>mocks[a.path]?{path:a.path,namespace:'qa'}:{path:root+'/'+a.path.slice(2)+(fs.existsSync(root+'/'+a.path.slice(2)+'.tsx')?'.tsx':'.ts')});b.onLoad({filter:/.*/,namespace:'qa'},a=>({contents:mocks[a.path],loader:'js'}));}}]});
fs.writeFileSync(path.join(taskDir,'qa.html'),'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><pre id="qa-result">RUNNING</pre><script>'+result.outputFiles[0].text.replaceAll('</script','<\\/script')+'</script>');
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
