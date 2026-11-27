// Real Ant Design Tour. No backend calls or schedule mutations.
const {spawn}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const esbuild=require('../../lms-manage-api/node_modules/esbuild');
const taskDir=fs.mkdtempSync(path.join(os.tmpdir(),'lms-schedule-tour-'));
const fixture=`
import '@ant-design/v5-patch-for-react-19';
import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import ScheduleFeatureTour from './app/(admin)/schedule/components/ScheduleFeatureTour';
window.calls=0;window.fetch=()=>{window.calls++;return Promise.reject(Error('Unexpected network'));};
localStorage.clear();
const full={create:true,edit:true,delete:true,import:true,export:true,submit:true,review:true,sync:true};
let configure;
function App(){const [helpContainer,setHelpContainer]=useState(null);const [config,setConfig]=useState({accountId:101,viewMode:'table',hasResults:true,access:full,hide:false});configure=patch=>setConfig(c=>({...c,...patch}));const mobile=window.innerWidth<768;
 return <div><ScheduleFeatureTour helpContainer={helpContainer} {...config} isMobile={mobile}/><div style={{display:'flex',flexWrap:'wrap',gap:12}}><span data-testid="tour-help-toolbar" ref={setHelpContainer}/>{['filters','search','view','create','auto','selection','bulk','actions','other','sync'].map(name=><button key={name} data-schedule-tour={name} style={{display:config.hide&&name==='auto'?'none':'block'}} onClick={()=>window.calls++}>{name}</button>)}</div><div data-schedule-tour="content" style={{height:120,padding:12,border:'1px solid #ddd'}}>Lịch học</div></div>;
}
createRoot(document.getElementById('root')).render(<App/>);
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const until=async fn=>{for(let i=0;i<150;i++){if(fn())return;await pause(30)}throw Error('Timed out: '+fn+' '+document.body.innerText.slice(-800));};
const visible=el=>el&&el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden';
const title=()=>[...document.querySelectorAll('.schedule-feature-tour .ant-tour-title')].find(visible)?.textContent;
const button=text=>[...document.querySelectorAll('button')].find(b=>visible(b)&&b.textContent===text);
const assert=(ok,message)=>{if(!ok)throw Error(message)};
async function finishTour(){const titles=[];for(let i=0;i<20;i++){await until(()=>title());const previous=title();titles.push(previous);const panel=[...document.querySelectorAll('.schedule-feature-tour .ant-tour-inner')].find(visible);assert(panel.scrollWidth<=panel.clientWidth+1,'Tour has horizontal overflow');const rect=panel.getBoundingClientRect();assert(rect.width<=window.innerWidth,'Tour wider than viewport');assert(rect.left>=-1&&rect.right<=window.innerWidth+1,'Tour outside viewport');
 const done=button('Hoàn tất');if(done){done.click();await until(()=>!title());return titles;}
 button('Tiếp theo').click();await until(()=>title()!==previous);
 }throw Error('Tour did not finish');}
(async()=>{await pause(300);configure({});await until(()=>button('Hướng dẫn'));
 assert(button('Hướng dẫn').closest('[data-testid="tour-help-toolbar"]'),'Help button must be in the view toolbar');assert(button('Hướng dẫn').querySelector('.anticon-question-circle'),'Help must use a question mark icon');
 assert(!title(),'Tour must wait for user consent to begin');assert(button('Bắt đầu hướng dẫn'),'First visit modal missing');const welcome=document.querySelector('.schedule-tour-welcome .ant-modal');assert(welcome&&visible(welcome),'Welcome modal missing');assert(welcome.scrollWidth<=welcome.clientWidth+1,'Welcome modal overflows horizontally');
 button('Bắt đầu hướng dẫn').click();await until(()=>title()==='Làm quen với Quản lý lịch học');assert(!button('Bắt đầu hướng dẫn'),'Invitation remains after starting');
 button('Tiếp theo').click();await until(()=>title()==='Bắt đầu từ bộ lọc');button('Quay lại').click();await until(()=>title()==='Làm quen với Quản lý lịch học');
 await until(()=>document.activeElement?.classList.contains('ant-tour-next-btn'));
 const dialog=document.querySelector('.schedule-feature-tour [role="dialog"]');assert(dialog,'Dialog semantics missing');
 const closeButton=dialog.querySelector('.ant-tour-close');closeButton.focus();document.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true}));assert(document.activeElement===dialog.querySelector('.ant-tour-next-btn'),'Keyboard focus escaped guide');
 document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await until(()=>!title());await until(()=>document.activeElement?.textContent==='Bắt đầu hướng dẫn'||document.activeElement?.textContent==='Hướng dẫn');
 assert(localStorage.getItem('lms:schedule-tour:v1:101')==='seen','Visit not persisted per account');
 button('Hướng dẫn').click();const fullTitles=await finishTour();assert(fullTitles.includes('Thêm một hoặc nhiều buổi học'),'Create guide missing');assert(fullTitles.includes('Gửi yêu cầu và theo dõi phê duyệt'),'Approval guide missing');
 configure({accountId:202,access:Object.fromEntries(Object.keys(full).map(k=>[k,false])),hasResults:false});await pause(100);await until(()=>button('Bắt đầu hướng dẫn'));button('Để sau').click();await until(()=>!button('Bắt đầu hướng dẫn'));assert(localStorage.getItem('lms:schedule-tour:v1:202')==='seen','Deferring must persist the invitation choice');button('Hướng dẫn').click();const readOnly=await finishTour();assert(readOnly.includes('Khu vực hiển thị lịch'),'Empty list guide missing');assert(!readOnly.some(t=>/Thêm một|Sửa nhiều|Đồng bộ|Gửi yêu cầu/.test(t)),'Unauthorized guide step shown');
 configure({accountId:101,access:full,hide:true,hasResults:true});await pause(100);await until(()=>!button('Bắt đầu hướng dẫn'));button('Hướng dẫn').click();const hidden=await finishTour();assert(!hidden.includes('Tạo lịch theo kế hoạch'),'Hidden control not skipped');
 button('Hướng dẫn').click();await until(()=>title());configure({viewMode:'calendar'});await pause(100);await until(()=>!title());button('Hướng dẫn').click();const calendar=await finishTour();assert(calendar.includes('Đọc thông tin buổi học'),'Calendar guide missing');
 const originalGet=Storage.prototype.getItem,originalSet=Storage.prototype.setItem;Storage.prototype.getItem=()=>{throw Error('Storage blocked')};Storage.prototype.setItem=()=>{throw Error('Storage blocked')};configure({accountId:303});await pause(100);await until(()=>button('Bắt đầu hướng dẫn'));button('Bắt đầu hướng dẫn').click();await until(()=>title());document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await until(()=>!title());Storage.prototype.getItem=originalGet;Storage.prototype.setItem=originalSet;
 configure({accountId:404});await pause(100);await until(()=>button('Bắt đầu hướng dẫn'));document.querySelector('.schedule-tour-welcome .ant-modal-close').click();await until(()=>!button('Bắt đầu hướng dẫn'));assert(localStorage.getItem('lms:schedule-tour:v1:404')==='seen','Closing welcome must persist the choice');
 const previewUrl=new URL(location.href);previewUrl.searchParams.set('tour','welcome');history.replaceState(null,'',previewUrl);configure({accountId:101});await pause(100);await until(()=>button('Bắt đầu hướng dẫn'));assert(localStorage.getItem('lms:schedule-tour:v1:101')==='seen','Preview should not erase visit history');assert(document.querySelector('.schedule-tour-welcome .anticon-question-circle'),'Welcome must use a question mark icon');button('Để sau').click();await until(()=>!button('Bắt đầu hướng dẫn'));previewUrl.searchParams.delete('tour');history.replaceState(null,'',previewUrl);
 assert(window.calls===0,'Tour invoked a business action or network request');
 if(${!!process.env.QA_SCREENSHOT}){configure({accountId:505});await pause(100);await until(()=>button('Bắt đầu hướng dẫn'));}
 document.getElementById('qa-result').textContent=JSON.stringify({ok:true,viewport:innerWidth,fullSteps:fullTitles.length,readOnlySteps:readOnly.length,checks:['manual start and replay','first-visit modal, defer and close persist per account','URL preview reopens welcome for returning users without clearing history','next/back/finish/Escape and focus trap','permissions and hidden targets','empty list and calendar','blocked browser storage','no horizontal overflow','no business action or network call']});
})().catch(error=>{document.getElementById('qa-result').textContent=JSON.stringify({ok:false,error:error.stack})});
`;
(async()=>{
 const result=await esbuild.build({stdin:{contents:fixture,resolveDir:root,loader:'tsx'},bundle:true,write:false,outdir:taskDir,platform:'browser',format:'iife',jsx:'automatic',tsconfig:root+'/tsconfig.json',define:{'process.env.NODE_ENV':'"development"','process.env':'{}'}});
 const css=result.outputFiles.find(file=>file.path.endsWith('.css'))?.text||'';
 const js=result.outputFiles.find(file=>file.path.endsWith('.js')).text;
 fs.writeFileSync(path.join(taskDir,'qa.html'),'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:Arial;padding:12px;box-sizing:border-box}'+css+'</style><div id="root"></div><pre id="qa-result">RUNNING</pre><script>'+js.replaceAll('</script','<\\/script')+'</script>');
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
