const {spawn}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const root=path.resolve(__dirname,'..');const esbuild=require(path.join(root,'../lms-manage-api/node_modules/esbuild'));
const taskDir=fs.mkdtempSync(path.join(os.tmpdir(),'lms-salary-ui-'));
const mode=process.env.QA_MODE||'report';
const pageMode=['personnel','filters','hours','roles','loading','systems'].includes(mode)?'report':mode;
const mocks={
 '@/stores/authStore':`const s={user:{userId:1},authSessionVersion:1,hasPermission:()=>true};export const useAuthStore=f=>f(s);`,
 '@ant-design/charts':`export const Column=()=>null;export const Bar=()=>null;export const Line=()=>null;`,
 '@/services/teachingReportService':`
 export const reportGet=async(path,params={})=>{
  if(path==='options' && '${mode}'==='roles')return {subjects:['Toán','Ngữ văn'],programs:['QA','QB','QC','QD'],teachers:[{id:1,username:'gv-qa',display_name:'Giáo viên QA'},{id:3,username:'gv-qb',display_name:'Giáo viên QB'}],assistants:[{id:2,username:'tg-qa',display_name:'Trợ giảng QA'},{id:4,username:'tg-qc',display_name:'Trợ giảng QC'}],assignments:[{code:'QA',system_type:'topclass',subject:'Toán',grade:6,teacher_id:1,assistant_ids:[2],has_teacher:true,has_assistant:true},{code:'QB',system_type:'topuni',subject:'Ngữ văn',grade:7,teacher_id:3,assistant_ids:[],has_teacher:true,has_assistant:false},{code:'QC',system_type:'topclass',subject:'Toán',grade:7,teacher_id:null,assistant_ids:[4],has_teacher:false,has_assistant:true},{code:'QD',system_type:'topclass',subject:'Toán',grade:8,teacher_id:null,assistant_ids:[],has_teacher:true,has_assistant:false}]};
  if(path==='options')return {subjects:['Toán','Ngữ văn'],programs:['QA','QB','QC'],teachers:[{id:1,username:'gv-qa',display_name:'Giáo viên QA'},{id:3,username:'gv-qb',display_name:'Giáo viên QB'}],assistants:[{id:2,username:'tg-qa',display_name:'Trợ giảng QA'},{id:4,username:'tg-qb',display_name:'Trợ giảng QB'}],assignments:[{code:'QA',system_type:'topclass',subject:'Toán',grade:6,teacher_id:1,assistant_ids:[2]},{code:'QB',system_type:'topuni',subject:'Ngữ văn',grade:7,teacher_id:3,assistant_ids:[4]},{code:'QC',system_type:'topclass',subject:'Toán',grade:7,teacher_id:1,assistant_ids:[4]}]};
  window.reportRequest=params;
  if('${mode}'==='sticky'){
   const rows=Array.from({length:50},(_,index)=>params.collection==='teachers'?{id:(index+1)+':teacher',teacher_profile_id:index+1,name:'Giáo viên '+index,username:'gv-'+index,role:'teacher',assigned:10,ended:10,cancelled:0,scheduled_hours:15,ended_hours:15,overlapping_calendars:0}:{id:index+1,code:'QA',lesson_name:'Bài học kiểm tra header '+index,subject:'Toán',grade:6,teacher:'Giáo viên QA',assistant_teacher:'Trợ giảng QA',start_time:'2026-11-01T19:00:00Z',end_time:'2026-11-01T20:00:00Z',scheduled_seconds:3600,progress:'ended',issues:[],overlaps:[]});
   return {collection:params.collection,rows,pagination:{total:50},summary:{assigned:50},charts:{daily:[],teachers:[],assistants:[]}};
  }

  if('${mode}'==='loading'){
   window.reportFetches=(window.reportFetches||0)+1;
   await new Promise(resolve=>setTimeout(resolve,700));
   if(window.rejectNextReport){window.rejectNextReport=false;throw Error('Không tải được báo cáo kiểm thử');}
  }
  if('${mode}'==='staff-charts'){
   const teachers=params.role==='assistant'||params.code==='QC'?[]:[{id:'1:teacher',teacher_profile_id:1,name:'Giáo viên QA Nguyễn Thị Thanh Huyền với tên dài',username:'gv-qa',assigned:3,scheduled_hours:3,ended_hours:params.hours_mode==='per_assignment'?2:1.5},...(!params.code?[{id:'3:teacher',teacher_profile_id:3,name:'Giáo viên QB',username:'gv-qb',assigned:2,scheduled_hours:2,ended_hours:1},...Array.from({length:10},(_,i)=>({id:(10+i)+':teacher',teacher_profile_id:10+i,name:'Giáo viên phụ '+i,username:'gv-'+i,assigned:1,scheduled_hours:1,ended_hours:.01}))]:[])];
   const assistants=params.role==='teacher'||params.code==='QC'?[]:[{id:'2:assistant',teacher_profile_id:2,name:'Trợ giảng QA Nguyễn Trọng Trường Anh với tên dài',username:'tg-qa',assigned:3,scheduled_hours:3,ended_hours:params.hours_mode==='per_assignment'?2:1.5}];
   return {collection:params.collection,rows:[],pagination:{total:0},metadata:{hours_mode:params.hours_mode},summary:{assigned:3},charts:{daily:[],teachers:teachers.filter(row=>(!params.teacher_id||row.teacher_profile_id===params.teacher_id)&&(!params.person_id||row.teacher_profile_id===params.person_id)),assistants:assistants.filter(row=>(!params.assistant_id||row.teacher_profile_id===params.assistant_id)&&(!params.person_id||row.teacher_profile_id===params.person_id))}};
  }
  if(params.collection==='teachers'){await new Promise(r=>setTimeout(r,250));return {collection:'teachers',rows:[{id:'2:assistant',teacher_profile_id:2,role:'assistant',name:'Trợ giảng QA',username:'tg-qa',assigned:1,ended:1,overlapping_calendars:2}],pagination:{total:1},summary:{assigned:1},charts:{daily:[{date:params.from,assigned:2},{date:new Date(+new Date(params.from+'T00:00:00Z')+86400000).toISOString().slice(0,10),assigned:3}]}};}
  return {collection:'sessions',rows:[{id:1,code:'QA',lesson_name:'Bài QA',teacher:'Giáo viên QA',assistant_teacher:'Trợ giảng QA',start_time:'2020-11-01T19:00:00Z',end_time:'2020-11-01T20:00:00Z',scheduled_seconds:3600,progress:'ended',issues:[],overlaps:[{person_id:1,name:'Giáo viên QA',role:'teacher',count:1,calendars:[{id:2,code:'QB',start_time:'2020-11-01T19:30:00Z',end_time:'2020-11-01T20:30:00Z'}]}]}],pagination:{total:1},metadata:{hours_mode:params.hours_mode??'union'},summary:{assigned:1,ended:1,teacher_hours:params.hours_mode==='per_assignment'?2:1.5},charts:{daily:[{date:params.from,assigned:2},{date:new Date(+new Date(params.from+'T00:00:00Z')+86400000).toISOString().slice(0,10),assigned:3}]}};
 };
 export const reportExport=async params=>{window.exportRequest=params;};
 `,
};
if(['chart','staff-charts'].includes(mode))delete mocks['@ant-design/charts'];
const fixture=`
import React from 'react';import{createRoot}from'react-dom/client';import{ConfigProvider}from'antd';import Page from '@/components/teaching-reports/TeachingReportsPage';
window.uiErrors=[];window.addEventListener('error',e=>window.uiErrors.push(e.message));
createRoot(document.getElementById('root')).render(<ConfigProvider>{'${mode}'==='sticky'?<><div style={{height:64,background:'#fff',position:'relative',zIndex:1000}}>Thanh điều hướng</div><div id='qa-scroll' className='ant-layout-content' style={{height:'calc(100vh - 64px)',overflow:'auto',padding:innerWidth>=1200?24:12}}><Page/></div></>:<Page/>}</ConfigProvider>);
const wait=ms=>new Promise(r=>setTimeout(r,ms));const until=async(f)=>{for(let i=0;i<200;i++){if(window.uiErrors.length)throw Error(window.uiErrors.join('; '));if(f())return;await wait(50);}throw Error('UI timed out: '+(window.qaStage??'unknown')+' request='+JSON.stringify(window.reportRequest));};
const button=t=>[...document.querySelectorAll('button')].find(b=>(b.getAttribute('aria-label')||b.textContent.trim())===t);
(async()=>{
 const mode='${mode}';
 if(mode==='sticky'){
  await until(()=>document.getElementById('qa-scroll'));const scroller=document.getElementById('qa-scroll');
  const check=async(label)=>{
   await until(()=>document.querySelector('.teaching-report-table .ant-table-sticky-holder')&&document.querySelector('[aria-label="Kết quả báo cáo"]').getAttribute('aria-busy')==='false');
   const table=document.querySelector('.teaching-report-table');const holder=table.querySelector('.ant-table-sticky-holder');
   scroller.scrollTop+=table.getBoundingClientRect().top-scroller.getBoundingClientRect().top+180;await wait(200);
   const first=holder.getBoundingClientRect();scroller.scrollTop+=140;await wait(200);const second=holder.getBoundingClientRect();
   if(getComputedStyle(holder).position!=='sticky'||Math.abs(first.top-second.top)>2)throw Error('Header must stay fixed: '+label+' '+JSON.stringify({first:first.top,second:second.top}));
   if(second.top>scroller.getBoundingClientRect().top+30||second.bottom<scroller.getBoundingClientRect().top)throw Error('Header must remain visible: '+label);
   const body=table.querySelector('.ant-table-body');if(body.clientHeight+1<body.scrollHeight)throw Error('Do not add a nested vertical scroll');
   body.scrollLeft=160;body.dispatchEvent(new Event('scroll',{bubbles:true}));await wait(200);
   if(Math.abs(holder.scrollLeft-body.scrollLeft)>1)throw Error('Header/body horizontal scroll must stay aligned');
   return {top:second.top,scrollLeft:body.scrollLeft};
  };
  const sessions=await check('Lịch giảng dạy');
  [...document.querySelectorAll('[role=tab]')].find(tab=>tab.textContent==='Theo nhân sự').click();
  await until(()=>document.querySelector('.teaching-report-table .ant-table-thead')?.textContent.includes('Nhân sự'));
  const personnel=await check('Theo nhân sự');
  document.getElementById('qa-result').textContent=JSON.stringify({ok:true,mode,viewport:innerWidth,sessions,personnel});return;
 }else if(mode==='loading'){
  const header=document.querySelector('.ant-collapse-header');if(header?.getAttribute('aria-expanded')==='false')header.click();
  const results=()=>document.querySelector('[aria-label="Kết quả báo cáo"]');
  await until(()=>results()?.getAttribute('aria-busy')==='false'&&!button('Xem báo cáo').disabled);
  const run=async(label,other,fail=false)=>{
   const before=window.reportFetches;window.rejectNextReport=fail;button(label).click();
   await until(()=>button(label).classList.contains('ant-btn-loading')&&results().getAttribute('aria-busy')==='true');
   if(!button(other).disabled)throw Error('Other filter action must be disabled while loading');
   if(!results().querySelector('.ant-table-tbody')?.textContent.includes('Bài QA'))throw Error('Keep current results visible while loading');
   button(label).click();await until(()=>results().getAttribute('aria-busy')==='false');
   if(window.reportFetches!==before+1)throw Error('Action must trigger exactly one fresh fetch: '+label+' '+window.reportFetches+'/'+before);
  };
  await run('Xem báo cáo','Đặt lại');
  const progress=document.getElementById('progress');progress.closest('.ant-select').querySelector('.ant-select-selector').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));await wait(150);
  [...document.querySelectorAll('.ant-select-item-option')].find(item=>item.textContent.includes('Đã kết thúc theo lịch')).click();
  await run('Xem báo cáo','Đặt lại');if(window.reportRequest.progress!=='ended')throw Error('New filters were not applied');
  await run('Đặt lại','Xem báo cáo');if(window.reportRequest.progress)throw Error('Reset did not clear filters');
  await run('Đặt lại','Xem báo cáo');
  await run('Xem báo cáo','Đặt lại',true);
  if(!document.querySelector('.ant-alert-error')?.textContent.includes('Không tải được báo cáo kiểm thử'))throw Error('Error must be visible after loading ends');
  await run('Xem báo cáo','Đặt lại');
  if(document.querySelector('.ant-alert-error'))throw Error('Retry must clear old error');
  await run('Làm mới','Xem báo cáo');
  document.getElementById('qa-result').textContent=JSON.stringify({ok:true,mode,viewport:innerWidth,unchangedFilters:true,newFilters:true,cachedReset:true,noDuplicateRequests:true,errorAndRetry:true});return;
 }else if(mode==='staff-charts'){
  const section=()=>document.querySelector('[aria-label="Biểu đồ giáo viên và trợ giảng"]');
  window.qaStage='initial charts';await until(()=>section()?.querySelectorAll('canvas').length===2);await wait(600);
  if(!section().textContent.includes('10 / 12 người')||!section().textContent.includes('1 người'))throw Error('All filtered personnel must appear');
  if(section().querySelectorAll('.ant-card').length!==2)throw Error('Teachers and assistants must have separate boxes');
  const hover=async(index,label,value)=>{
   section().querySelectorAll('canvas').forEach(c=>{c.dispatchEvent(new PointerEvent('pointerleave',{bubbles:true}));c.dispatchEvent(new MouseEvent('mouseleave',{bubbles:true}));});await wait(120);
   const canvas=section().querySelectorAll('canvas')[index];canvas.scrollIntoView({block:'center'});await wait(300);const box=canvas.getBoundingClientRect();let tooltip='';
   for(let y=1;y<10;y++){for(let x=2;x<9;x++){
    const coords={bubbles:true,clientX:box.left+box.width*x/10,clientY:box.top+box.height*y/10,pointerType:'mouse'};canvas.dispatchEvent(new PointerEvent('pointermove',coords));canvas.dispatchEvent(new MouseEvent('mousemove',coords));await wait(35);
    tooltip=[...document.querySelectorAll('.g2-tooltip')].filter(e=>{const s=getComputedStyle(e);return s.visibility!=='hidden'&&s.display!=='none'&&s.opacity!=='0';}).map(e=>e.textContent).join(' ');if(tooltip.includes(label)&&tooltip.includes(value)&&tooltip.includes(index===1?'Trợ giảng QA':'Giáo viên QA')){window.chartHovered={canvas,coords};return tooltip;}
   }}throw Error('Personnel tooltip invalid: '+tooltip+' expected '+label+' / '+value);
  };
  window.qaStage='show all';button('Xem tất cả (12)').click();await until(()=>section().textContent.includes('12 người')&&!section().textContent.includes('10 / 12'));button('Thu gọn').click();await wait(450);
  const teacherTooltip=await hover(0,'Giờ lịch đã kết thúc','1.50');
  if(!teacherTooltip.includes('Giáo viên QA Nguyễn Thị Thanh Huyền với tên dài')||teacherTooltip.includes('ended_hours'))throw Error('Teacher tooltip not localized');
  const assistantTooltip=await hover(1,'Giờ lịch đã kết thúc','1.50');if(!assistantTooltip.includes('Trợ giảng QA Nguyễn Trọng Trường Anh với tên dài'))throw Error('Assistant name missing');
  const choose=async(id,label)=>{document.getElementById(id).closest('.ant-select').querySelector('.ant-select-selector').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));await wait(180);const item=[...document.querySelectorAll('.ant-select-item-option')].find(e=>e.textContent.includes(label));if(!item)throw Error('Missing option '+label);item.click();await wait(150);};
  await choose('personnel_chart_metric','Số lịch phân công');await wait(350);await hover(0,'Số lịch phân công','3');
  await choose('personnel_chart_metric','Giờ lịch đã kết thúc');
  const header=document.querySelector('.ant-collapse-header');if(header?.getAttribute('aria-expanded')==='false')header.click();
  await until(()=>document.getElementById('code')&&!document.getElementById('code').disabled);
  await choose('code','QA');await choose('hours_mode','Cộng theo từng lịch phân công');
  if(window.reportRequest.code)throw Error('Chart filters must wait for submit');button('Xem báo cáo').click();await until(()=>window.reportRequest.code==='QA'&&section()?.textContent.includes('1 người'));await wait(600);
  await hover(0,'Giờ lịch đã kết thúc','2.00');
  await choose('role','Trợ giảng');button('Xem báo cáo').click();await until(()=>window.reportRequest.role==='assistant'&&section()?.querySelectorAll('canvas').length===1);
  if(section().querySelector('[data-personnel-role=teacher]'))throw Error('Role must hide teacher chart');
  await choose('code','QC');button('Xem báo cáo').click();await until(()=>window.reportRequest.code==='QC'&&section()?.textContent.includes('Không có nhân sự phù hợp'));
  button('Đặt lại').click();await until(()=>section()?.querySelectorAll('canvas').length===2);await wait(600);
  await hover(0,'Giờ lịch đã kết thúc','1.50');
  const {canvas}=window.chartHovered;const bounds=canvas.getBoundingClientRect();const coords={bubbles:true,clientX:bounds.left+bounds.width*.5,clientY:bounds.top+bounds.height*.1,pointerType:'mouse'};canvas.dispatchEvent(new PointerEvent('pointerdown',coords));canvas.dispatchEvent(new PointerEvent('pointerup',coords));canvas.dispatchEvent(new MouseEvent('click',{...coords,detail:1}));
  window.qaStage='drilldown';await until(()=>window.reportRequest.person_id===1&&window.reportRequest.role==='teacher');
  if(window.reportRequest.teacher_id!==1||!document.getElementById('teacher_id').closest('.ant-select').textContent.includes('Giáo viên QA'))throw Error('Chart selection must select teacher filter');
  if(document.getElementById('root').textContent.includes('Chi tiết:'))throw Error('Remove detail information');
  if(section().querySelectorAll('.ant-card').length!==1||!section().querySelector('[data-personnel-role=teacher]'))throw Error('Selected role must have its own box');

  await until(()=>section()?.querySelector('button')?.textContent.includes('Quay lại tổng quan')&&!section().querySelector('button').disabled);
  section().querySelector('button').click();await until(()=>section()?.querySelectorAll('canvas').length===2&&!section().textContent.includes('Chi tiết:'));
  button('Xuất Excel').click();await until(()=>window.exportRequest&&!window.exportRequest.person_id&&!window.exportRequest.role);
  if(window.exportRequest.collection!=='sessions'||window.exportRequest.hours_mode!=='union')throw Error('Chart back must restore original report');

  button('Đặt lại').click();await until(()=>section()?.querySelectorAll('canvas').length===2);await wait(600);section().scrollIntoView({block:'start'});
  const scrollBox=section().querySelector('canvas').parentElement.parentElement;if(scrollBox.scrollWidth>scrollBox.clientWidth+1)throw Error('Personnel chart must not overflow horizontally');
  document.getElementById('qa-result').textContent=JSON.stringify({ok:true,mode,viewport:innerWidth,teacherTooltip,assistantTooltip,filterAndHoursMode:true,role:true,empty:true,top10:true,drilldown:true,backToOverview:true});return;
 }else if(mode==='chart'){
  await until(()=>document.querySelector('canvas'));
  let canvas=document.querySelector('canvas');canvas.scrollIntoView({block:'center'});await wait(800);
  let box=canvas.getBoundingClientRect();
  let tooltip='';
  for(let step=1;step<10&&!tooltip.includes('Số lịch giảng dạy');step++){
    const coords={bubbles:true,clientX:box.left+box.width*step/10,clientY:box.top+box.height*.5,pointerType:'mouse'};
    canvas.dispatchEvent(new PointerEvent('pointermove',coords));canvas.dispatchEvent(new MouseEvent('mousemove',coords));await wait(150);
    tooltip=[...document.querySelectorAll('.g2-tooltip')].map(e=>e.textContent).join(' ');
  }
  if(!tooltip.includes('Số lịch giảng dạy')||tooltip.includes('assigned'))throw Error('Tooltip label invalid: '+tooltip);
  document.getElementById('schedule_trend_period').closest('.ant-select').querySelector('.ant-select-selector').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));await wait(150);
  [...document.querySelectorAll('.ant-select-item-option')].find(e=>e.textContent.includes('Theo tháng')).click();await wait(500);canvas=document.querySelector('canvas');canvas.scrollIntoView({block:'center'});await wait(200);box=canvas.getBoundingClientRect();
  canvas.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:box.left+box.width*.5,clientY:box.top+box.height*.5,pointerType:'mouse'}));await wait(250);
  const monthly=[...document.querySelectorAll('.g2-tooltip')].map(e=>e.textContent).join(' ');if(!monthly.includes('Số lịch giảng dạy')||!monthly.includes('5'))throw Error('Monthly trend total missing: '+monthly);
  document.getElementById('schedule_trend_period').closest('.ant-select').querySelector('.ant-select-selector').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));await wait(150);
  [...document.querySelectorAll('.ant-select-item-option')].find(e=>e.textContent.includes('Theo ngày')).click();await wait(450);
  if(!document.getElementById('schedule_trend_period').closest('.ant-select').textContent.includes('Theo ngày'))throw Error('Daily trend not selected');
  const initialRange=document.querySelector('.ant-slider');if(!initialRange)throw Error('Zoom slider missing');
  const lastValue=()=>Number(document.querySelectorAll('.ant-slider [role=slider]')[1].getAttribute('aria-valuenow'));
  const firstValue=()=>Number(document.querySelector('.ant-slider [role=slider]').getAttribute('aria-valuenow'));
  const initialCount=lastValue()-firstValue()+1;
  button('Phóng to').click();await wait(350);if(lastValue()-firstValue()+1>=initialCount)throw Error('Zoom in did not narrow range');
  button('Thu nhỏ').click();await wait(350);if(lastValue()-firstValue()+1<=Math.round(initialCount/2))throw Error('Zoom out did not expand range');
  button('Toàn bộ').click();await wait(200);
  const reportBefore=JSON.stringify(window.reportRequest);
  button('Phóng to').click();await wait(200);
  const first=firstValue();document.querySelector('.ant-slider [role=slider]').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',code:'ArrowRight',keyCode:39,which:39,bubbles:true}));await wait(200);
  if(firstValue()!==first+1)throw Error('Slider handle did not change visible range');
  if(JSON.stringify(window.reportRequest)!==reportBefore)throw Error('Zoom must not alter report filters');
  const header=document.querySelector('.ant-collapse-header');if(header?.getAttribute('aria-expanded')==='false')header.click();
  const rangeInput=document.getElementById('range');rangeInput.focus();rangeInput.click();await wait(250);
  const yearPreset=[...document.querySelectorAll('.ant-picker-presets li')].find(item=>item.textContent==='Năm nay');if(!yearPreset)throw Error('Year range preset unavailable');yearPreset.click();await wait(250);
  button('Xem báo cáo').click();await until(()=>window.reportRequest.from.endsWith('-01-01')&&window.reportRequest.to.endsWith('-01-01'));
  await wait(500);if(lastValue()-firstValue()+1!==30)throw Error('Long daily ranges must default to 30 days');
  button('Toàn bộ').click();await wait(250);if(lastValue()-firstValue()+1<365)throw Error('Full-year overview missing');
  if(button('30 ngày cuối'))throw Error('Last 30 days button must be removed');
  document.querySelector('.ant-slider').closest('.ant-card').scrollIntoView({block:'start'});


  const table=document.querySelector('.ant-table-tbody');if(!table?.textContent.includes('Trợ giảng QA'))throw Error('Assistant display name missing');
  document.getElementById('qa-result').textContent=JSON.stringify({ok:true,mode,tooltip,zoom:true,slider:true,reportUnchanged:true});return;
 }else if(mode==='hours'){
  const header=document.querySelector('.ant-collapse-header');if(header?.getAttribute('aria-expanded')==='false')header.click();
  window.qaStage='initial';await until(()=>document.getElementById('hours_mode') && window.reportRequest);
  if(window.reportRequest.hours_mode!=='union')throw Error('Default must retain union');
  window.qaStage='overlap tag';await until(()=>document.querySelector('.ant-table-tbody')?.textContent.includes('trùng 1 lịch'));
  [...document.querySelectorAll('.ant-tag')].find(t=>t.textContent.includes('trùng 1 lịch')).click();
  window.qaStage='tooltip';await until(()=>document.querySelector('.ant-tooltip-inner')?.textContent.includes('Lịch #2 · QB'));
  document.getElementById('hours_mode').closest('.ant-select').querySelector('.ant-select-selector').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));await wait(200);
  [...document.querySelectorAll('.ant-select-item-option')].find(e=>e.textContent.includes('Cộng theo từng lịch phân công')).click();
  window.qaStage='submit mode';button('Xem báo cáo').click();await until(()=>window.reportRequest.hours_mode==='per_assignment' && document.getElementById('root').textContent.includes('Giờ nhân sự cộng đủ'));
  button('Xuất Excel').click();await until(()=>window.exportRequest?.hours_mode==='per_assignment');
  [...document.querySelectorAll('[role=tab]')].find(t=>t.textContent.trim()==='Theo nhân sự').click();
  await until(()=>button('Trợ giảng QA'));
  if(window.reportRequest.hours_mode!=='per_assignment')throw Error('Tab lost hours mode');
  if(!document.querySelector('thead').textContent.includes('Lịch trùng giờ'))throw Error('Personnel overlaps missing');
  window.qaStage='reset';button('Đặt lại').click();await until(()=>document.getElementById('root').textContent.includes('Giờ nhân sự gộp các khoảng trùng') && document.querySelector('[role=tab][aria-selected=true]')?.textContent==='Lịch giảng dạy');
  [...document.querySelectorAll('[role=tab]')].find(t=>t.textContent.trim()==='Theo nhân sự').click();
  await until(()=>window.reportRequest.collection==='teachers' && window.reportRequest.hours_mode==='union');
  document.getElementById('qa-result').textContent=JSON.stringify({ok:true,mode,overlapDetails:true,exportMode:true,reset:true,viewport:innerWidth});return;
 }else if(mode==='filters'||mode==='roles'||mode==='systems'){
  const header=document.querySelector('.ant-collapse-header');if(header?.getAttribute('aria-expanded')==='false')header.click();
  await until(()=>document.getElementById('code') && !document.getElementById('code').disabled);
  const choices=id=>{const list=document.getElementById(document.getElementById(id).getAttribute('aria-controls'));return [...(list?.closest('.ant-select-dropdown')?.querySelectorAll('.ant-select-item-option')??[])];};
  const show=async id=>{document.getElementById(id).closest('.ant-select').querySelector('.ant-select-selector').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));await wait(150);};
  const choose=async(id,label)=>{await show(id);const item=choices(id).find(e=>e.textContent.includes(label));if(!item)throw Error('Missing choice '+id+': '+label);item.click();await wait(150);};
  const expectChoices=async(id,expected)=>{await show(id);const text=choices(id).map(e=>e.textContent);if(text.length!==expected.length||expected.some(v=>!text.some(t=>t.includes(v))))throw Error('Wrong linked options '+id+': '+JSON.stringify(text));document.getElementById(id).dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true}));await wait(150);};
  if(mode==='systems'){
   await expectChoices('system_type',['Top Class','Top Uni']);
   await choose('system_type','Top Uni');await expectChoices('code',['QB']);await expectChoices('teacher_id',['gv-qb']);await expectChoices('assistant_id',['tg-qb']);await expectChoices('subject',['Ngữ văn']);await expectChoices('grade',['Lớp 7']);
   await choose('code','QB');await expectChoices('system_type',['Top Uni']);
   if(window.reportRequest.system_type)throw Error('System must not auto-submit');
   button('Xem báo cáo').click();await until(()=>window.reportRequest.system_type==='topuni'&&window.reportRequest.code==='QB'&&document.querySelector('[aria-label="Kết quả báo cáo"]').getAttribute('aria-busy')==='false');
   button('Xuất Excel').click();await until(()=>window.exportRequest?.system_type==='topuni');
   button('Đặt lại').click();await until(()=>!window.reportRequest.system_type&&document.querySelector('[aria-label="Kết quả báo cáo"]').getAttribute('aria-busy')==='false');await expectChoices('system_type',['Top Class','Top Uni']);
   await choose('teacher_id','gv-qa');await expectChoices('system_type',['Top Class']);
   button('Đặt lại').click();await wait(200);await choose('subject','Ngữ văn');await expectChoices('system_type',['Top Uni']);
   button('Đặt lại').click();await wait(200);await choose('assistant_id','tg-qb');await expectChoices('system_type',['Top Class','Top Uni']);
   await choose('system_type','Top Class');await expectChoices('code',['QC']);await expectChoices('teacher_id',['gv-qa']);await expectChoices('grade',['Lớp 7']);await expectChoices('role',['Giáo viên','Trợ giảng']);
   document.getElementById('qa-result').textContent=JSON.stringify({ok:true,mode,viewport:innerWidth,bidirectional:true,exportFilter:true,reset:true});return;
  }
  if(mode==='roles'){
   await choose('role','Trợ giảng');await expectChoices('code',['QA','QC']);await expectChoices('teacher_id',['gv-qa']);await expectChoices('assistant_id',['tg-qa','tg-qc']);await expectChoices('subject',['Toán']);await expectChoices('grade',['Lớp 6','Lớp 7']);
   await choose('code','QC');await expectChoices('role',['Trợ giảng']);await expectChoices('assistant_id',['tg-qc']);
   if(window.reportRequest.role)throw Error('Role must not auto-submit');
   button('Xem báo cáo').click();await until(()=>window.reportRequest.role==='assistant' && window.reportRequest.code==='QC');
   button('Đặt lại').click();await wait(200);
   await choose('role','Giáo viên');await expectChoices('code',['QA','QB','QD']);await expectChoices('assistant_id',['tg-qa']);
   await choose('subject','Ngữ văn');await expectChoices('code',['QB']);await expectChoices('role',['Giáo viên']);await expectChoices('teacher_id',['gv-qb']);
   button('Đặt lại').click();await wait(200);await choose('teacher_id','gv-qb');await expectChoices('role',['Giáo viên']);
   button('Đặt lại').click();await wait(200);await choose('assistant_id','tg-qc');await expectChoices('role',['Trợ giảng']);
   button('Đặt lại').click();await wait(200);await choose('grade','Lớp 8');await expectChoices('role',['Giáo viên']);await expectChoices('code',['QD']);
   document.getElementById('qa-result').textContent=JSON.stringify({ok:true,mode,viewport:innerWidth,bidirectional:true,unmatchedStaffPreserved:true});return;
  }
  await choose('code','QA');await expectChoices('teacher_id',['gv-qa']);await expectChoices('assistant_id',['tg-qa']);await expectChoices('subject',['Toán']);await expectChoices('grade',['Lớp 6']);
  button('Đặt lại').click();await wait(200);
  await choose('teacher_id','gv-qb');await expectChoices('code',['QB']);await expectChoices('assistant_id',['tg-qb']);
  button('Đặt lại').click();await wait(200);
  await choose('assistant_id','tg-qb');await expectChoices('code',['QB','QC']);
  await choose('subject','Toán');await expectChoices('code',['QC']);await expectChoices('grade',['Lớp 7']);
  await choose('grade','Lớp 7');await expectChoices('code',['QC']);
  await choose('code','QC');await expectChoices('teacher_id',['gv-qa']);
  if(document.getElementById('group_id'))throw Error('Group filter must be removed');
  if(window.reportRequest.assistant_id||window.reportRequest.code)throw Error('Options should not submit the report automatically');
  button('Xem báo cáo').click();await until(()=>window.reportRequest.code==='QC'&&window.reportRequest.assistant_id===4&&window.reportRequest.subject==='Toán'&&window.reportRequest.grade===7);
  document.getElementById('qa-result').textContent=JSON.stringify({ok:true,mode,viewport:innerWidth,bidirectional:true});return;

 }else{
  await until(()=>window.reportRequest);
  const tab=[...document.querySelectorAll('[role=tab]')].find(t=>t.textContent.trim()==='Theo nhân sự');tab.click();
  await until(()=>button('Trợ giảng QA'));
  if(!button('Trợ giảng QA').closest('tr').textContent.includes('—'))throw Error('Missing duration should not crash');
  button('Trợ giảng QA').click();await until(()=>window.reportRequest.person_id===2&&window.reportRequest.role==='assistant');
  if(window.reportRequest.assistant_id!==2||!document.getElementById('assistant_id').closest('.ant-select').textContent.includes('Trợ giảng QA'))throw Error('Personnel selection must select assistant filter');
  if(document.getElementById('root').textContent.includes('Chi tiết:'))throw Error('Detail information must be removed');

  await until(()=>button('Quay lại tổng quan')&&!button('Quay lại tổng quan').disabled);
  button('Quay lại tổng quan').click();await until(()=>document.querySelector('[role=tab][aria-selected=true]')?.textContent==='Theo nhân sự'&&!button('Quay lại tổng quan'));
  if(document.getElementById('role').closest('.ant-select').textContent.includes('Trợ giảng'))throw Error('Back must clear role added by drilldown');
  const header=document.querySelector('.ant-collapse-header');if(header?.getAttribute('aria-expanded')==='false')header.click();
  const choose=async(id,label)=>{document.getElementById(id).closest('.ant-select').querySelector('.ant-select-selector').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));await wait(150);[...document.querySelectorAll('.ant-select-item-option')].find(item=>item.textContent.includes(label)).click();await wait(150);};
  await choose('code','QA');await choose('role','Trợ giảng');await choose('hours_mode','Cộng theo từng lịch phân công');button('Xem báo cáo').click();
  await until(()=>window.reportRequest.code==='QA'&&window.reportRequest.hours_mode==='per_assignment'&&document.querySelector('[aria-label="Kết quả báo cáo"]').getAttribute('aria-busy')==='false');
  button('Trợ giảng QA').click();await until(()=>window.reportRequest.person_id===2&&!button('Quay lại tổng quan')?.disabled);
  button('Quay lại tổng quan').click();await until(()=>!button('Quay lại tổng quan')&&document.querySelector('[role=tab][aria-selected=true]')?.textContent==='Theo nhân sự');
  button('Xuất Excel').click();await until(()=>window.exportRequest?.code==='QA'&&!window.exportRequest.person_id);
  if(window.exportRequest.role!=='assistant'||window.exportRequest.hours_mode!=='per_assignment'||window.exportRequest.collection!=='teachers'||window.exportRequest.assistant_id)throw Error('Back must preserve explicit filters and original tab');

  if(/Xác nhận công|Xác nhận trợ giảng|Công xác nhận|Bảng lương/.test(document.getElementById('root').textContent))throw Error('Retired UI remains');
  document.getElementById('qa-result').textContent=JSON.stringify({ok:true,mode,backRestoresFilters:true,backRestoresTab:true});
 }
})().catch(e=>document.getElementById('qa-result').textContent=JSON.stringify({ok:false,error:e.message}));
`;
(async()=>{
const result=await esbuild.build({stdin:{contents:fixture,resolveDir:root,loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',tsconfig:root+'/tsconfig.json',define:{'process.env.NODE_ENV':'"development"','process.env':'{}'},plugins:[{name:'mocks',setup(b){b.onResolve({filter:/^@\/|^@ant-design\/charts$/},a=>mocks[a.path]?{path:a.path,namespace:'qa'}:a.path.startsWith('@/')?{path:root+'/'+a.path.slice(2)+(fs.existsSync(root+'/'+a.path.slice(2)+'.tsx')?'.tsx':'.ts')}:undefined);b.onLoad({filter:/.*/,namespace:'qa'},a=>({contents:mocks[a.path],loader:'js',resolveDir:root}));}}]});
fs.writeFileSync(path.join(taskDir,'qa.html'),'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><pre id="qa-result" style="white-space:pre-wrap;overflow-wrap:anywhere">RUNNING</pre><script>'+result.outputFiles[0].text.replaceAll('</script','<\\/script')+'</script>');
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
