const {spawn}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const root=path.resolve(__dirname,'..');const esbuild=require('../../lms-manage-api/node_modules/esbuild');
const taskDir=fs.mkdtempSync(path.join(os.tmpdir(),'lms-schedule-filter-'));
const mocks={
 '@/hooks/useLmsQueries':`export const useScheduleClassificationOptionsQuery=()=>({data:{data:[{code:'math8',subject_name:'Toán',grade:8},{code:'phys9',subject_name:'Vật lí',grade:9},{code:'feed-math8',subject_name:'Toán',grade:8}]},isLoading:false,mutate:()=>{}});`,
 '@/components/shared/TeachingStaffSelect':`import {Select} from 'antd';export default function Staff(props){return <Select {...props} options={props.teacherType===0?[{value:'TG1',label:'Trợ giảng 1'}]:[{value:'GV1',label:'Giáo viên 1'}]}/>}`,
};
const fixture=`
import dayjs from 'dayjs';import '@ant-design/v5-patch-for-react-19';import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import './app/globals.css';import InlinePanel from './app/(admin)/schedule/components/ScheduleFilterPanel';import Sheet from './app/(admin)/schedule/components/ScheduleFilterSheet';const Panel=props=>innerWidth<992?<Sheet {...props} open onClose={()=>{}}/>:<InlinePanel {...props}/>;import {buildScheduleApiParams,buildScheduleUrl} from './helper/scheduleFilters';
window.calls=[];let setConfig;
function App(){const [value,setValue]=useState({calendar_source:'livestream',date_range:[dayjs('2026-11-01'),dayjs('2026-11-30')]});const [required,setRequired]=useState(false);setConfig=setRequired;return <Panel value={value} loading={false} allowFilterWithoutProgram={!required} loadingPrograms={false} programOptions={[{value:'math8',label:'Toán 8'},{value:'phys9',label:'Vật lí 9'},{value:'feed-math8',label:'Feed Toán 8'}]} onSearch={values=>{window.calls.push({values,params:buildScheduleApiParams(values),url:buildScheduleUrl(values)});setValue(values)}} onReset={()=>{setValue({calendar_source:'livestream'});window.reset=true}}/>}
createRoot(document.getElementById('root')).render(<App/>);
const pause=ms=>new Promise(r=>setTimeout(r,ms));const until=async fn=>{for(let i=0;i<160;i++){if(fn())return;await pause(30)}throw Error('Timed out: '+fn+' '+document.body.innerText.slice(-900))};
const visible=element=>element&&element.getClientRects().length>0;
const button=text=>[...document.querySelectorAll('button')].find(b=>visible(b)&&b.textContent===text);
const assert=(condition,text)=>{if(!condition)throw Error(text)};
async function select(name,text){const root=document.getElementById(name)?.closest('.ant-select');assert(root,'Missing select '+name);root.scrollIntoView({block:'center'});await pause(50);root.querySelector('.ant-select-selector').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));await until(()=>[...document.querySelectorAll('.ant-select-item-option-content')].some(option=>visible(option)&&option.textContent===text));[...document.querySelectorAll('.ant-select-item-option-content')].find(option=>visible(option)&&option.textContent===text).click();await pause(40);document.body.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));await pause(40);}
async function submit(){const count=window.calls.length;button('Lọc').click();await until(()=>window.calls.length>count);await pause(100);return window.calls.at(-1);}
(async()=>{await until(()=>document.getElementById('subject_name'));
 const panel=document.querySelector('[data-schedule-tour="filters"]');assert(panel.scrollWidth<=panel.clientWidth+1,'Filter panel has horizontal overflow');assert(document.documentElement.scrollWidth<=innerWidth+1,'Filter layout overflows viewport');
 if(innerWidth>=1600){const sourceBox=document.getElementById('calendar_source').closest('.ant-select').getBoundingClientRect();assert(Math.abs(button('Lọc').getBoundingClientRect().top-sourceBox.top)<3,'Actions must align at end of second row when there is space');}
 if(innerWidth<992){const box=name=>document.getElementById(name).closest('.ant-select').getBoundingClientRect();const date=panel.querySelector('.schedule-mobile-date-range button').getBoundingClientRect();assert([...panel.querySelectorAll('.schedule-mobile-date-range strong')].every(el=>el.scrollWidth<=el.clientWidth),'Date text is clipped');assert(Math.abs(date.height-box('calendar_source').height)<2,'Popup date and select heights differ');assert(button('Lọc').getBoundingClientRect().bottom<=innerHeight,'Popup actions must remain visible');if(innerWidth>=360&&innerWidth<768)assert(Math.abs(box('subject_name').top-box('grade').top)<2,'Mobile subject and grade must align');}
 const labels=[...panel.querySelectorAll('.ant-form-item-label')].map(label=>label.textContent);
 assert(labels.slice(0,6).join('|')==='Chương trình|Kỳ thi|Môn học|Khối|Giáo viên|Trợ giảng','Classification order wrong: '+labels);
 assert(labels.slice(6,12).join('|')==='Khoảng ngày|Thứ|Khoảng bài|Trạng thái|Nguồn lịch|Hệ thống','Condition order wrong');
 assert(document.querySelector('[aria-label="Kỳ thi"]').closest('.ant-select-disabled'),'Exam must be UI-only and disabled');
 await select('subject_name','Toán');await select('grade','Khối 8');await select('teacher','Giáo viên 1');await select('assistant_teachers','Trợ giảng 1');await select('weekdays','Thứ 2');
 const range=document.getElementById('from_learn_number');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(range,'2');range.dispatchEvent(new Event('input',{bubbles:true}));
 let submitted=await submit();assert(submitted.params.subject_name==='Toán'&&submitted.params.grade===8,'Classification not submitted');assert(submitted.params.teacher==='GV1'&&submitted.params.weekdays[0]===1&&submitted.params.from_learn_number===2,'Existing filters lost');assert(submitted.params.assistant_teachers?.[0]==='TG1'&&submitted.url.includes('assistant_teachers=TG1'),'Assistant filter missing from API or URL');assert(!('exam' in submitted.params),'Exam leaked into query');assert(submitted.url.includes('grade=8')&&submitted.url.includes('subject_name='),'Classification missing from URL');
 if(innerWidth>=992){button('Thu gọn').click();await until(()=>button('Mở rộng'));assert(panel.textContent.includes('Toán')&&panel.textContent.includes('Khối 8'),'Collapsed summary missing');const compact=panel.querySelector('[aria-label="Bộ lọc đang áp dụng"]');const more=compact.querySelector('button');assert(more?.textContent==='+5 bộ lọc','Extra filter count is incorrect');assert(!compact.textContent.includes('GV1'),'Secondary filters should be grouped');assert(Math.abs(button('Mở rộng').getBoundingClientRect().top-compact.getBoundingClientRect().top)<6,'Collapsed summary must share header row');more.click();await until(()=>[...document.querySelectorAll('.ant-tooltip-inner')].some(el=>visible(el)&&el.textContent.includes('Trợ giảng: TG1')));button('Mở rộng').click();await until(()=>button('Thu gọn'));}
 await select('code','Vật lí 9');submitted=await submit();assert(!submitted.values.subject_name&&submitted.values.grade===undefined,'Program switch keeps incompatible classification');await select('subject_name','Vật lí');await select('grade','Khối 9');submitted=await submit();assert(submitted.params.grade===9&&submitted.params.subject_name==='Vật lí','Program classification failed');
 await select('calendar_source','Feed');await select('code','Feed Toán 8');await select('subject_name','Toán');await select('grade','Khối 8');submitted=await submit();assert(submitted.params.calendar_source==='feed'&&submitted.params.code==='feed-math8','Source switch lost');
 button('Xóa lọc').click();await until(()=>window.reset);await pause(80);submitted=await submit();assert(Object.keys(submitted.params).filter(key=>submitted.params[key]!==undefined).join(',')==='calendar_source','Reset did not clear all conditions');assert(submitted.params.calendar_source==='livestream','Reset source wrong');
 setConfig(true);await pause(60);const count=window.calls.length;button('Lọc').click();await until(()=>document.querySelector('.ant-form-item-explain-error'));assert(window.calls.length===count,'Required program validation bypassed');
 if(${!!process.env.QA_SCREENSHOT}){setConfig(false);button('Xóa lọc').click();await pause(100);await select('code','Toán 8');await select('subject_name','Toán');await select('grade','Khối 8');await pause(350);if(${!!process.env.QA_COLLAPSED}&&innerWidth>=992){button('Thu gọn').click();await pause(300);}}
 document.getElementById('qa-result').textContent=JSON.stringify({ok:true,viewport:innerWidth,checks:['two field groups and no horizontal overflow','exam UI only','subject/grade with existing filters and URL','collapse summary','program/source changes clear incompatible values','reset defaults','required program preserved']});
})().catch(error=>{document.getElementById('qa-result').textContent=JSON.stringify({ok:false,error:error.stack})});
`;
(async()=>{const result=await esbuild.build({stdin:{contents:fixture,resolveDir:root,loader:'tsx'},bundle:true,write:false,outdir:taskDir,platform:'browser',format:'iife',jsx:'automatic',tsconfig:root+'/tsconfig.json',define:{'process.env.NODE_ENV':'"development"','process.env':'{}'},plugins:[{name:'fixture',setup(build){build.onResolve({filter:/^@\//},args=>mocks[args.path]?{path:args.path,namespace:'fixture'}:undefined);build.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:mocks[args.path],loader:'jsx',resolveDir:root}));}}]});
 const css=result.outputFiles.find(file=>file.path.endsWith('.css'))?.text||'';const js=result.outputFiles.find(file=>file.path.endsWith('.js')).text;
 fs.writeFileSync(path.join(taskDir,'qa.html'),'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:16px;font-family:Arial;box-sizing:border-box}#qa-result{display:none}'+css+'</style><div id="root"></div><pre id="qa-result">RUNNING</pre><script>'+js.replaceAll('</script','<\\/script')+'</script>');
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
 if(value && value!=='RUNNING') {const report=JSON.parse(value);if(report.ok&&Number(process.env.QA_VIEWPORT||1440)>=992){
 const bounds=await call('Runtime.evaluate',{expression:`(()=>{const el=document.querySelector('button[aria-expanded]');el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`,returnByValue:true},sessionId);
 await call('Input.dispatchMouseEvent',{type:'mouseMoved',...bounds.result.value},sessionId);
 await new Promise(resolve=>setTimeout(resolve,300));
 const hover=await call('Runtime.evaluate',{expression:`(()=>{const el=document.querySelector('button[aria-expanded]');return {hovered:el.matches(':hover'),background:getComputedStyle(el).backgroundColor,color:getComputedStyle(el).color}})()`,returnByValue:true},sessionId);
 if(!hover.result.value.hovered||hover.result.value.background!=='rgba(0, 0, 0, 0)'||hover.result.value.color!=='rgb(22, 119, 255)'){report.ok=false;report.error='Toggle hover style: '+JSON.stringify(hover.result.value)}else report.checks.push('real pointer hover keeps toggle background transparent');
 }process.stdout.write(JSON.stringify(report,null,2)+'\n');if(!report.ok)process.exitCode=1;if(process.env.QA_SCREENSHOT){const shot=await call('Page.captureScreenshot',{format:'png'},sessionId);fs.writeFileSync(process.env.QA_SCREENSHOT,Buffer.from(shot.data,'base64'));}return;}
}
throw Error('Test result not produced');
})().catch(e=>{process.stderr.write(String(e)+'\n');process.exitCode=1}).finally(async()=>{clearTimeout(timer);await call('Browser.close').catch(()=>{});child.kill();fs.rmSync(taskDir,{recursive:true,force:true})});

})().catch(error => {fs.rmSync(taskDir,{recursive:true,force:true});process.stderr.write(String(error)+"\n");process.exitCode=1;});
