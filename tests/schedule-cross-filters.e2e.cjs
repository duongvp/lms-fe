// Isolated real filter forms + hook in Chrome. All API responses are simulated.
// QA_MODE=mobile node tests/schedule-cross-filters.e2e.cjs
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const esbuild=require(path.join(root,'../lms-manage-api/node_modules/esbuild'));
const taskDir=fs.mkdtempSync(path.join(os.tmpdir(),'lms-schedule-cross-'));
const page=fs.readFileSync(path.join(root,'app/(admin)/schedule/page.tsx'),'utf8');
const filters=page.slice(page.indexOf('const ScheduleFilterSheet ='),page.indexOf('type EvgBannerOverrideInputProps'));
const mobile=process.env.QA_MODE==='mobile';
const mocks={
 '@/stores/authStore':`export const useAuthStore=f=>f({user:{userId:1},authSessionVersion:1});`,
 '@/hooks/useLmsQueries':`export const useTeachingStaffQuery=()=>({data:[{username:'old-user',displayName:'Cô An',label:'Cô An (old-user)'}]});`,
 '@/services/livestreamService':`
 const rows=[{code:'A',teacher:'Cô An',system_type:'topclass',time_status:'completed',weekdays:1},{code:'A',teacher:'Cô Bình',system_type:'topuni',time_status:'cancelled',weekdays:2},{code:'B',teacher:'Cô An',system_type:'topuni',time_status:'completed',weekdays:1},{code:'C',teacher:'Cô Cường',system_type:'topuni',time_status:'completed',weekdays:7}];
 export const getCalendarCrossFilterOptions=async q=>{
  window.qaRequests=[...(window.qaRequests||[]),q];await new Promise(r=>setTimeout(r,100));
  if(window.qaFail){window.qaFail=false;throw Error('Simulated failure');}
  const values=key=>[...new Set(rows.filter(r=>['code','teacher','system_type','time_status','weekdays'].every(k=>k===key||!q[k]||String(q[k]).split(',').includes(String(r[k])))).map(r=>r[key]))];
  return {programs:values('code'),teachers:values('teacher').map(value=>({value,label:value})),systems:values('system_type'),statuses:values('time_status'),weekdays:values('weekdays')};
 };`,
};
const fixture=`
import React,{useEffect,useState} from 'react';import {createRoot} from 'react-dom/client';
import {Form,DatePicker,Button,Alert,InputNumber,Space,Typography,Select as AntSelect} from 'antd';
import {CloseOutlined,FilterOutlined} from '@ant-design/icons';import dayjs from 'dayjs';
import Select from '@/components/ui/MobileSelect';
import {useScheduleCrossFilters} from '@/hooks/useScheduleCrossFilters';
import {scheduleFacetOptions} from '@/helper/scheduleFacetOptions';
import {cleanFilterValues,type ScheduleFilterValues} from '@/helper/scheduleFilters';
import {calendarSourceFromCode} from '@/helper/lesson';
const RangePicker=DatePicker.RangePicker,MobileDateRangePicker=RangePicker;
const MobilePopup=({visible,children})=>visible?<div>{children}</div>:null;
const WEEKDAY_OPTIONS=[{value:1,label:'Thứ 2'},{value:2,label:'Thứ 3'},{value:7,label:'Chủ nhật'}];
const CALENDAR_SOURCE_OPTIONS=[{value:'livestream',label:'Livestream'},{value:'feed',label:'Feed'}];
${filters}
const initial={calendar_source:'livestream',code:'A',date_range:[dayjs('2020-11-01'),dayjs('2020-11-30')]};
function App(){const [value,setValue]=useState(initial);const props={value,loading:false,allowFilterWithoutProgram:true,loadingPrograms:false,programOptions:['A','B','C'].map(value=>({value,label:value})),onSearch:v=>{window.qaSubmitted=v;window.qaSubmitCount=(window.qaSubmitCount||0)+1;setValue(v)},onReset:()=>setValue({calendar_source:'livestream'}),onClose:()=>{}};return ${mobile?'<ScheduleFilterSheet {...props} open/>':'<ScheduleInlineFilters {...props}/>'};}
createRoot(document.getElementById('root')).render(<App/>);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const until=async(fn)=>{for(let i=0;i<100;i++){if(fn())return;await wait(70);}throw Error('Timeout: '+window.qaStage)};
const select=id=>document.getElementById(id).closest('.ant-select');
let openId;
const visibleOptions=()=>[...(document.getElementById(openId+'_list')?.closest('.ant-select-dropdown')?.querySelectorAll('.ant-select-item-option')??[])];
const close=async()=>{document.body.click();document.activeElement?.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',keyCode:27,bubbles:true}));await wait(100)};
const open=async id=>{await close();openId=id;select(id).querySelector('.ant-select-selector').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));await wait(150);};
const choose=async(id,label)=>{await open(id);const option=visibleOptions().find(o=>o.textContent===label);if(!option)throw Error('Missing '+label+' in '+visibleOptions().map(o=>o.textContent));option.click();await close();await wait(550)};
const clear=async id=>{await close();const node=select(id).querySelector('.ant-select-clear');if(!node)throw Error('No clear control '+id);node.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));await wait(550)};
const choices=async(id,expected)=>{await open(id);const labels=visibleOptions().map(o=>o.textContent).sort();if(JSON.stringify(labels)!==JSON.stringify(expected.sort()))throw Error(id+' options '+JSON.stringify(labels));await close()};
(async()=>{
 window.qaStage='initial options';await until(()=>window.qaRequests?.length && document.getElementById('teacher'));await wait(600);
 await choices('teacher',['Cô An','Cô Bình']);
 window.qaStage='stable selection while loading';await open('teacher');visibleOptions().find(o=>o.textContent==='Cô An').click();
 for(let i=0;i<18;i++){
  await wait(30);
  const selected=select('teacher').querySelector('.ant-select-selection-item-content')?.textContent;
  if(selected!=='Cô An')throw Error('Selected label flashed: '+selected);
  if(select('teacher').querySelector('.ant-select-selection-overflow-item-rest'))throw Error('Single teacher collapsed into +1');
  if(visibleOptions().length!==2)throw Error('Teacher choices disappeared during reload');
 }
 await close();
 window.qaStage='teacher to system';await choices('system_type',['Topclass']);
 await choices('weekdays',['Thứ 2']);await choices('time_status',['Đã kết thúc']);
 if(window.qaSubmitCount)throw Error('Draft change submitted calendar search');
 window.qaStage='reverse program';await clear('code');await choices('code',['A','B']);
 await choose('code','B');await choices('teacher',['Cô An']);await choices('system_type',['Topuni']);
 if(!window.qaRequests.at(-1).start_time?.startsWith('2020-11-01'))throw Error('Date constraint missing');
 window.qaStage='clear expands';await clear('code');await clear('teacher');await choices('code',['A','B','C']);
 window.qaStage='error retry';window.qaFail=true;await choose('teacher','Cô Cường');await until(()=>document.getElementById('root').textContent.includes('Không tải được lựa chọn lọc chéo'));
 [...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Thử lại').click();await wait(550);await choices('code',['C']);await clear('teacher');
 window.qaStage='submit';await choose('code','A');[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='${mobile?'Tìm kiếm':'Lọc'}').click();
 await until(()=>window.qaSubmitted?.code==='A');
 if(window.qaSubmitCount!==1)throw Error('Unexpected submit count');
 document.getElementById('qa-result').textContent=JSON.stringify({ok:true,mobile:${mobile},crossFilters:true,stableSelection:true,stableDropdown:true,clearExpands:true,draftDoesNotSubmit:true,datesPreserved:true,errorRetry:true});
})().catch(e=>document.getElementById('qa-result').textContent=JSON.stringify({ok:false,error:e.message,stage:window.qaStage}));
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
