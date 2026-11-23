// Real week table in Chrome, with simulated list responses; never connects to DB.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const esbuild=require(path.join(root,'../lms-manage-api/node_modules/esbuild'));
const taskDir=fs.mkdtempSync(path.join(os.tmpdir(),'lms-schedule-week-'));
const mobile=process.env.QA_MODE==='mobile';
const mocks={
 '@/stores/authStore':`export const useAuthStore=f=>f({user:{userId:1},authSessionVersion:1});`,
 '@/services/livestreamService':`
 const row=(id,code,date,teacher,extra={})=>({id,code,start_time:date+'T19:00:00',end_time:date+'T20:30:00',subject:'Toán',lesson_name:'Bài kiểm tra '+id,teacher,assistant_teacher:'tg-qa',system_type:'topclass',...extra});
 const rows=[row(1,'A','2026-11-23','Cô An'),row(2,'B','2026-11-24','Cô Bình',{lesson_status:1}),row(3,'EXAM','2026-11-29','Cô Chi',{system_type:'topuni'}),row(4,'A','2026-11-30','Tuần kế tiếp'),...Array.from({length:300},(_,i)=>row(100+i,'A','2026-11-23','Giáo viên B'))];
 export const getCalendarCrossFilterOptions=async q=>{
  window.qaFacetRequests=[...(window.qaFacetRequests||[]),q];await new Promise(r=>setTimeout(r,50));
  const current=rows.filter(r=>r.start_time>=q.start_time.slice(0,19)&&r.start_time<=q.end_time.slice(0,19));
  return {program_systems:[...new Map(current.map(r=>[r.code+':'+r.system_type,{code:r.code,system_type:r.system_type}])).values()]};
 };
 export const getLivestreams=async q=>{
  window.qaRequests=[...(window.qaRequests||[]),q];await new Promise(r=>setTimeout(r,50));
  if(window.qaFail){window.qaFail=false;throw Error('Simulated list failure');}
  const filtered=rows.filter(r=>r.start_time>=q.start_time.slice(0,19)&&r.start_time<=q.end_time.slice(0,19)&&(!q.teacher||q.teacher===r.teacher)&&(!q.code||q.code===r.code)&&(!q.system_type||q.system_type.includes(r.system_type)));
  return {data:{total:filtered.length,data:filtered.slice((q.page-1)*q.limit,q.page*q.limit)}};
 };`,
};
const fixture=`
import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import dayjs from 'dayjs';
import ScheduleWeekTable from '@/app/(admin)/schedule/components/ScheduleWeekTable';
const programs=[{code:'A',grade:8,subject_name:'Toán 8',curriculum_subject_name:'Toán'},{code:'B',grade:9,subject_name:'Văn 9',curriculum_subject_name:'Ngữ văn'},{code:'EXAM',grade:null,subject_name:'Tiếng Anh',curriculum_subject_name:'Tiếng Anh'},{code:'NO-SCHEDULE',grade:10,subject_name:'Sinh học',curriculum_subject_name:'Sinh học'}],assistantNames=new Map([['tg-qa','Trợ giảng QA']]);
const RealDate=Date;window.Date=class extends RealDate{constructor(...args){super(...(args.length?args:['2026-11-23T08:00:00Z']))}static now(){return new RealDate('2026-11-23T08:00:00Z').getTime()}};
window.qaTableQuery={system_type:'topclass',from:'2026-11-23',to:'2026-11-23',teacher:'Cô An',program:'A'};
function App(){const [view,setView]=useState('table'),[admin,setAdmin]=useState(true),[detail,setDetail]=useState(null);
 return <><button onClick={()=>setView('table')}>Dạng bảng</button><button onClick={()=>setView('week')}>Bảng tuần</button><button onClick={()=>setAdmin(false)}>Cần chọn chương trình</button><div id="detail">{detail?.lesson_name}</div>{view==='table'?<pre id="table-filters">{JSON.stringify(window.qaTableQuery)}</pre>:<ScheduleWeekTable key={String(admin)} programs={programs} assistantNames={assistantNames} allowAllPrograms={admin} onOpen={setDetail}/>}</>;
}
createRoot(document.getElementById('root')).render(<App/>);
const wait=ms=>new Promise(r=>setTimeout(r,ms));const until=async fn=>{for(let i=0;i<120;i++){if(fn())return;await wait(70);}throw Error('Timeout: '+window.qaStage)};
const button=name=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===name||b.getAttribute('aria-label')===name);
const cards=()=>[...document.querySelectorAll('.schedule-week-card')];
const choose=async(id,label)=>{const root=document.getElementById(id).closest('.ant-select');if(!root.classList.contains('ant-select-open'))root.querySelector('.ant-select-selector').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));await wait(100);const dropdown=document.getElementById(id+'_list').closest('.ant-select-dropdown');const option=[...dropdown.querySelectorAll('.ant-select-item-option')].find(o=>o.textContent===label);if(!option)throw Error('Missing option '+label);option.click();document.getElementById(id).dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',keyCode:27,bubbles:true}));await wait(120)};
const clear=async id=>{document.getElementById(id).closest('.ant-select').querySelector('.ant-select-clear').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));await wait(120)};
const choices=async(id,expected)=>{document.getElementById(id).closest('.ant-select').querySelector('.ant-select-selector').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));await wait(100);const dropdown=document.getElementById(id+'_list').closest('.ant-select-dropdown');const actual=[...dropdown.querySelectorAll('.ant-select-item-option')].map(o=>o.textContent).sort();if(JSON.stringify(actual)!==JSON.stringify(expected.sort()))throw Error(id+' options '+JSON.stringify(actual));document.getElementById(id).dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',keyCode:27,bubbles:true}));await wait(150)};
(async()=>{
 window.qaStage='independent tab';await until(()=>button('Bảng tuần'));const originalTableFilters=document.getElementById('table-filters').textContent;button('Bảng tuần').click();
 window.qaStage='all pages';await until(()=>cards().length===303);
 if(window.qaRequests.some(q=>q.teacher||q.code||q.system_type||q.start_time.startsWith('2026-11-23')&&q.end_time.startsWith('2026-11-23')))throw Error('Table filters leaked into week query');
 await choices('week-program',['A · Toán 8','B · Văn 9','EXAM · Tiếng Anh']);await choices('week-subject',['Toán','Ngữ văn','Tiếng Anh']);
 if(!window.qaRequests.some(q=>q.page===2))throw Error('Second page not loaded');
 const headers=[...document.querySelectorAll('thead th')].map(n=>n.textContent);
 if(headers.length!==8||!headers[1].includes('23/11/2026')||!headers[7].includes('29/11/2026'))throw Error('Incorrect week headers');
 const rows=[...document.querySelectorAll('tbody tr')];if(rows.map(r=>r.querySelector('th').textContent).join(',')!=='Lớp 8,Lớp 9,EXAM')throw Error('Wrong grade groups');
 const sunday=cards().find(c=>c.querySelector('.schedule-week-lesson').textContent==='Bài kiểm tra 3');if(sunday.closest('td').cellIndex!==7)throw Error('Sunday card in wrong cell');
 if(!document.querySelector('.schedule-week-cancelled')?.textContent.includes('Nghỉ học'))throw Error('Cancellation missing');
 if(!cards()[0].textContent.includes('Trợ giảng: Trợ giảng QA')||cards()[0].textContent.includes('tg-qa'))throw Error('Assistant display name missing');
 if(cards().some(card=>/Top Uni|Top Class/.test(card.textContent)))throw Error('System labels must be removed from cards');
 cards()[0].click();await until(()=>document.getElementById('detail').textContent.includes('Bài kiểm tra'));
 const scroll=document.querySelector('.schedule-week-scroll');const header=document.querySelector('thead th:nth-child(2)'),first=rows[0].querySelector('th');
 const y=header.getBoundingClientRect().top,x=first.getBoundingClientRect().left;scroll.scrollTop=100;scroll.scrollLeft=200;await wait(100);
 if(Math.abs(header.getBoundingClientRect().top-y)>2||Math.abs(first.getBoundingClientRect().left-x)>2)throw Error('Week headers not sticky');
 if(document.documentElement.scrollWidth>innerWidth+2)throw Error('Horizontal page overflow');
 const filterHeight=id=>document.getElementById(id).closest('.ant-select').getBoundingClientRect().height;
 const initialHeights={program:filterHeight('week-program'),subject:filterHeight('week-subject')};
 window.qaStage='multiple programs and subjects';await choose('week-program','A · Toán 8');await until(()=>cards().length===301);await choose('week-program','B · Văn 9');await until(()=>cards().length===302);
 await choices('week-subject',['Toán','Ngữ văn']);await choose('week-subject','Toán');await until(()=>cards().length===301);await choose('week-subject','Ngữ văn');await until(()=>cards().length===302);
 if(filterHeight('week-program')>initialHeights.program+2||filterHeight('week-subject')>initialHeights.subject+2)throw Error('Multiple selections increased filter height');
 for(const id of ['week-program','week-subject']){
  const field=document.getElementById(id).closest('.ant-select');field.style.width='130px';await wait(100);
  if(field.getBoundingClientRect().height>initialHeights.subject+2)throw Error('Narrow multiple select wrapped onto two lines');
  const tag=field.querySelector('.ant-select-selection-overflow-item:not(.ant-select-selection-overflow-item-rest) .ant-select-selection-item');
  const rest=field.querySelector('.ant-select-selection-overflow-item-rest .ant-select-selection-item');
  if(tag&&rest&&Math.abs(tag.getBoundingClientRect().top-rest.getBoundingClientRect().top)>2)throw Error('Selection count moved to another line');
  field.style.width='';
 }
 await clear('week-program');await until(()=>cards().length===302);await choices('week-program',['A · Toán 8','B · Văn 9']);await clear('week-subject');await until(()=>cards().length===303);
 window.qaStage='compact program filter';await choose('week-program','B · Văn 9');await until(()=>cards().length===1&&cards()[0].textContent.includes('Nghỉ học'));
 await choices('week-subject',['Ngữ văn']);if(![...document.querySelectorAll('.schedule-week-systems label')].find(n=>n.textContent==='Top Uni').querySelector('input').disabled)throw Error('Top Uni enabled for Top Class program');
 await clear('week-program');await until(()=>cards().length===303);
 window.qaStage='compact subject filter';await choose('week-subject','Toán');await until(()=>cards().length===301);await clear('week-subject');await until(()=>cards().length===303);
 window.qaStage='compact system filter';[...document.querySelectorAll('.schedule-week-systems .ant-radio-button-wrapper')].find(n=>n.textContent==='Top Uni').click();await until(()=>cards().length===1&&cards()[0].textContent.includes('EXAM'));
 await choices('week-program',['EXAM · Tiếng Anh']);await choices('week-subject',['Tiếng Anh']);
 [...document.querySelectorAll('.schedule-week-systems .ant-radio-button-wrapper')].find(n=>n.textContent==='Tất cả').click();await until(()=>cards().length===303);
 if(document.documentElement.scrollWidth>innerWidth+2)throw Error('Compact filters overflow page');
 if(!document.querySelector('[aria-label="Chọn tuần"]').value.includes('23/11/2026 – 29/11/2026'))throw Error('Week picker range changed');
 window.qaStage='next week';button('Tuần tiếp theo').click();await until(()=>cards().length===1&&cards()[0].textContent.includes('Tuần kế tiếp'));
 await choices('week-program',['A · Toán 8']);await choices('week-subject',['Toán']);
 if(![...document.querySelectorAll('.schedule-week-systems label')].find(n=>n.textContent==='Top Uni').querySelector('input').disabled)throw Error('System with no schedules in next week enabled');
 if(button('Tuần tiếp theo').disabled)throw Error('Table date range restricted next week');
 window.qaStage='previous week';button('Tuần trước').click();await until(()=>cards().length===303);
 if(button('Tuần trước').disabled)throw Error('Table date range restricted previous week');
 window.qaStage='restore table and reset week';await choose('week-program','B · Văn 9');await until(()=>cards().length===1);button('Dạng bảng').click();await until(()=>document.getElementById('table-filters'));
 if(document.getElementById('table-filters').textContent!==originalTableFilters)throw Error('Week filters changed table state');
 button('Bảng tuần').click();await until(()=>cards().length===303);
 if(document.getElementById('week-program').closest('.ant-select').textContent.includes('B · Văn 9'))throw Error('Week did not reset when revisited');
 window.qaStage='require permitted program';const before=window.qaRequests.length;button('Cần chọn chương trình').click();await until(()=>document.getElementById('root').textContent.includes('Chọn chương trình để xem lịch tuần'));await wait(150);
 if(window.qaRequests.length!==before)throw Error('Non-admin requested all programs');
 await choose('week-program','A · Toán 8');await until(()=>cards().length===301);
 if(window.qaRequests.at(-1).code!=='A')throw Error('Selected program not sent');
 await choose('week-program','B · Văn 9');await until(()=>cards().length===302);
 if(window.qaRequests.slice(before).some(q=>!q.code||q.code.includes(',')))throw Error('Multi-program filter bypassed scoped list requests');
 document.getElementById('qa-result').textContent=JSON.stringify({ok:true,mobile:${mobile},allPages:true,grades:true,details:true,filters:true,weekNavigation:true,sticky:true,independentTabs:true,requiresProgram:true});
})().catch(e=>document.getElementById('qa-result').textContent=JSON.stringify({ok:false,error:e.message,stage:window.qaStage,cards:cards().length,lastRequest:window.qaRequests?.at(-1),picker:document.querySelector('[aria-label="Chọn tuần"]')?.value,subject:document.getElementById('week-subject')?.closest('.ant-select').textContent,alert:document.querySelector('.ant-alert')?.textContent,system:document.querySelector('.schedule-week-systems input:checked')?.value}));
`;
(async()=>{
const result=await esbuild.build({stdin:{contents:fixture,resolveDir:root,loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',tsconfig:path.join(root,'tsconfig.json'),define:{'process.env.NODE_ENV':'"development"','process.env':'{}'},plugins:[{name:'mocks',setup(b){b.onResolve({filter:/^@\//},a=>mocks[a.path]?{path:a.path,namespace:'qa'}:{path:path.join(root,a.path.slice(2))+(fs.existsSync(path.join(root,a.path.slice(2)+'.tsx'))?'.tsx':'.ts')});b.onLoad({filter:/.*/,namespace:'qa'},a=>({contents:mocks[a.path],loader:'js',resolveDir:root}));}}]});
fs.writeFileSync(path.join(taskDir,'qa.html'),'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><pre id="qa-result">RUNNING</pre><script>'+result.outputFiles[0].text.replaceAll('</script','<\\/script')+'</script>');
const child=spawn(process.env.CHROME||'/usr/bin/google-chrome',['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--allow-file-access-from-files','--disable-background-timer-throttling','--disable-renderer-backgrounding','--remote-debugging-pipe','about:blank'],{stdio:['ignore','ignore','pipe','pipe','pipe']});
let buffer='',nextId=1;const pending=new Map();
child.stdio[4].on('data',chunk=>{buffer+=chunk.toString();let i;while((i=buffer.indexOf('\0'))>=0){const msg=JSON.parse(buffer.slice(0,i));buffer=buffer.slice(i+1);if(msg.id){const p=pending.get(msg.id);pending.delete(msg.id);msg.error?p?.reject(Error(JSON.stringify(msg.error))):p?.resolve(msg.result)}}});
const call=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=nextId++;pending.set(id,{resolve,reject});child.stdio[3].write(JSON.stringify({id,method,params,...sessionId?{sessionId}:{}})+'\0')});
const timer=setTimeout(()=>{child.kill();process.stderr.write('Browser timeout\n');process.exitCode=1},45000);
try{
 const {targetId}=await call('Target.createTarget',{url:'file://'+path.join(taskDir,'qa.html')});const {sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});
 await call('Emulation.setDeviceMetricsOverride',{width:mobile?390:1440,height:900,deviceScaleFactor:1,mobile:false},sessionId);
 await call('Page.bringToFront',{},sessionId);
 for(let i=0;i<120;i++){await new Promise(r=>setTimeout(r,250));const result=await call('Runtime.evaluate',{expression:'document.getElementById("qa-result")?.textContent',returnByValue:true},sessionId);const value=result.result?.value;if(value&&value!=='RUNNING'){const report=JSON.parse(value);process.stdout.write(JSON.stringify(report)+'\n');if(!report.ok)process.exitCode=1;return;}}
 throw Error('No test result');
}finally{clearTimeout(timer);await call('Browser.close').catch(()=>{});child.kill();fs.rmSync(taskDir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;fs.rmSync(taskDir,{recursive:true,force:true});});
