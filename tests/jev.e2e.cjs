const {spawn}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const esbuild=require(path.resolve(root,'../lms-manage-api/node_modules/esbuild'));
const taskDir=fs.mkdtempSync(path.join(os.tmpdir(),'lms-jev-ui-'));
const seed=JSON.parse(fs.readFileSync(path.join(root,'../lms-manage-api/tests/fixtures/jev-c2-r2.json'),'utf8'));
const mocks={
'@/stores/authStore': `export const useAuthStore=selector=>selector({hasPermission:()=>true});`,
'@/services/jevService': `
let policy={id:3,policy_key:'classroom-en-c2',revision:2,edit_revision:1,status:'DRAFT',config_json:${JSON.stringify(seed)}};
const settings={mode:'off',modelVersion:'jev-1.14.0',maxSpendMicroUsd:10000000,limits:{maxInFlight:30,maxQueue:500,maxPerRoom:50,deadlineMs:10000,httpTimeoutMs:1500,requestsPerSecond:30,maxDailyAttempts:50000,reservedInputTokens:64000},circuitBreaker:{enabled:true,failureThreshold:3,cooldownMs:180000}};
window.jevCalls=[];let createdPolicy=null;window.jevOriginalSource=JSON.parse(JSON.stringify(policy));
let savedBindings=[{id:1,scope_type:'GLOBAL',scope_key:'*',mode:'off',policy_version_id:null,revision:1}];
const calendars=[101,102].map((id,index)=>({id,code:'qa-program',learn_number:2,lesson_name:'Same lesson',start_time:'2026-11-'+(17+index)+'T18:00:00Z',end_time:'2026-11-'+(17+index)+'T19:00:00Z'}));
export async function jevRequest(path,method='GET',body){
 window.jevCalls.push({path,method,body});
 if(window.jevLoadError)throw Error('Không thể xử lý cấu hình JEV; kiểm tra DB và migration Chat');
 if(path.startsWith('/policies?')){const rows=[...(createdPolicy?[createdPolicy]:[]),...(window.jevEmptyPolicies?[]:[policy])];return {data:{rows,total:rows.length}};}
 if(path.startsWith('/bindings?'))return {data:{rows:savedBindings,total:savedBindings.length}};
 if(path.startsWith('/scope/programs?'))return {data:[{code:'qa-program'},{code:'qa-next'}]};
 if(path.startsWith('/scope/calendars?')){const q=new URLSearchParams(path.split('?')[1]);return {data:{rows:q.get('code')==='qa-program'?calendars:[],page:1,hasMore:false}};}
 if(path.startsWith('/scope/calendars/'))return {data:calendars.find(row=>row.id===Number(path.split('/').at(-1)))};
 if(path==='/bindings'&&method==='PUT'){
  const calendar=calendars.find(row=>String(row.id)===body.scopeKey);
  const row={id:2,scope_type:body.scopeType,scope_key:body.scopeKey,mode:body.mode,policy_version_id:body.policyVersionId,revision:1,calendar};
  savedBindings=[savedBindings[0],row];return {data:row,sync:{confirmed:true,message:'Đã đồng bộ'}};
 }
 if(path==='/runtime')return {data:{revision:1,settings}};
 if(path==='/status')return {data:{policy:{source:'database',snapshotHash:'test-hash',loadedAt:'2026-11-17'},runtimeStatus:{mode:'off',reason:'OFF'}}};
 if(path==='/policies/from-template'&&method==='POST'){
  createdPolicy={id:4,policy_key:body.policyKey,revision:body.revision,edit_revision:1,status:'DRAFT',config_json:JSON.parse(JSON.stringify(policy.config_json))};
  createdPolicy.config_json.policy.version=body.policyKey+':r'+body.revision;
  window.jevSourceAfterCreate=JSON.parse(JSON.stringify(policy));return {data:JSON.parse(JSON.stringify(createdPolicy))};
 }
 if(path==='/policies/4'&&method==='GET')return {data:JSON.parse(JSON.stringify(createdPolicy))};
 if(path==='/policies/3'&&method==='GET')return {data:JSON.parse(JSON.stringify(policy))};
 if(path==='/policies/3'&&method==='PUT'){policy={...policy,edit_revision:policy.edit_revision+1,config_json:body.config};return {data:JSON.parse(JSON.stringify(policy))}};
 if(path.endsWith('/validate'))return {data:{valid:true,bundleHash:'test-hash'}};
 if(path.endsWith('/publish')){policy.status='PUBLISHED';return {data:{versionId:3}}};
 if(path==='/reload')return {data:{confirmed:false,message:'Đã lưu, chưa xác nhận đồng bộ'}};
 if(path==='/preview')return {data:{preview:{eligibleActions:['BLOCK']},externalCalls:0}};
 throw Error('Unhandled '+method+' '+path);
}`};
const fixture=`
import '@ant-design/v5-patch-for-react-19';import React from 'react';import {createRoot} from 'react-dom/client';import Page from './app/(admin)/jev/page';
window.jevLoadError=${process.env.QA_JEV_LOAD_ERROR === '1' ? 'true' : 'false'};
window.jevEmptyPolicies=${process.env.QA_CREATE_POLICY === 'empty' ? 'true' : 'false'};
createRoot(document.getElementById('root')).render(<Page/>);
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const until=async fn=>{for(let i=0;i<160;i++){if(fn())return;await pause(30)}throw Error('Condition timed out: '+fn)};
const visible=el=>el&&el.getBoundingClientRect().width>0;
const button=(root,text)=>[...(root?.querySelectorAll('button')||[])].find(el=>el.textContent.trim()===text);
const tab=(root,text)=>[...(root?.querySelectorAll('[role=tab]')||[])].find(el=>el.textContent.trim()===text);
const drawer=()=>[...document.querySelectorAll('.ant-drawer-body')].find(visible);
(async()=>{
 if(window.jevLoadError){
   await until(()=>window.jevCalls.length>=4&&document.querySelector('.ant-message-notice-error'));
   await pause(150);
   const errors=[...document.querySelectorAll('.ant-message-notice-error')];
   if(errors.length!==1)throw Error('Expected one error notification, got '+errors.length);
   if(!errors[0].textContent.includes('Không thể xử lý cấu hình JEV'))throw Error('Missing error message');
   document.getElementById('qa-result').textContent=JSON.stringify({ok:true,checks:['concurrent JEV load failures show one error notification']});
   return;
 }
 if(${process.env.QA_CREATE_POLICY ? 'true' : 'false'}) {
   await until(()=>button(document,'Tạo bản nháp'));
   await pause(100);
   button(document,'Tạo bản nháp').click();await until(()=>document.querySelector('[aria-label="Bộ cấu hình làm mẫu"]'));
   let creationModal=[...document.querySelectorAll('.ant-modal-body')].find(visible);
   if(creationModal.querySelector('textarea')||creationModal.textContent.includes('Bundle JSON'))throw Error('Create form must not require JSON');
   button(document,'Hủy').click();await pause(350);
   if(window.jevCalls.some(call=>call.method==='POST'))throw Error('Cancel must not create a policy');
   button(document,'Tạo bản nháp').click();await until(()=>document.querySelector('[aria-label="Bộ cấu hình làm mẫu"]'));
   await until(()=>!button(document,'Tạo và mở cấu hình').disabled);
   if(${process.env.QA_CREATE_POLICY === 'live' ? 'true' : 'false'}) {
     const field=document.querySelector('[aria-label="Bộ cấu hình làm mẫu"]').closest('.ant-select');
     field.querySelector('.ant-select-selector').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));
     await until(()=>[...document.querySelectorAll('.ant-select-item-option')].some(el=>visible(el)&&el.textContent.includes('Mẫu chuẩn từ Live')));
     [...document.querySelectorAll('.ant-select-item-option')].find(el=>visible(el)&&el.textContent.includes('Mẫu chuẩn từ Live')).click();await pause(50);
   }
   const expectedExisting=${process.env.QA_CREATE_POLICY === 'existing' ? 'true' : 'false'};
   const code=document.querySelector('input[aria-label="Mã bộ cấu hình mới"]').value;
   const revision=Number(document.querySelector('input[aria-label="Phiên bản bộ cấu hình mới"]').value);
   if(code!==(expectedExisting?'classroom-en-c2':'jev-classroom')||revision!==(expectedExisting?3:1))throw Error('Template identity/version suggestions incorrect');
   if(${process.env.QA_CREATE_LAYOUT === '1' ? 'true' : 'false'}) {
     creationModal=[...document.querySelectorAll('.ant-modal-body')].find(visible);
     if(creationModal.scrollWidth>creationModal.clientWidth+1)throw Error('Create form overflows horizontally');
     document.getElementById('qa-result').textContent=JSON.stringify({ok:true,viewport:window.innerWidth,checks:['create form fits viewport','no JSON required','template selector and prefilled identity visible']});return;
   }
   button(document,'Tạo và mở cấu hình').click();await until(()=>window.jevCalls.some(call=>call.path==='/policies/from-template'));
   const creation=window.jevCalls.find(call=>call.path==='/policies/from-template');
   if('config' in creation.body)throw Error('Create form must not send client-generated bundles');
   if(expectedExisting?creation.body.sourcePolicyId!==3:'sourcePolicyId' in creation.body)throw Error('Incorrect template source');
   await until(()=>drawer()?.textContent.includes('Bạn muốn làm gì?'));
   if(JSON.stringify(window.jevOriginalSource)!==JSON.stringify(window.jevSourceAfterCreate))throw Error('Creation changed source policy');
   if(window.jevCalls.some(call=>call.path==='/reload'||call.path.endsWith('/publish')))throw Error('Creation must not reload or publish');
   document.getElementById('qa-result').textContent=JSON.stringify({ok:true,source:expectedExisting?'existing':'Live seed',checks:['cancel makes no mutation','create without JSON','source selection and next revision','draft opens in structured editor','source unchanged','no publish/reload']});return;
 }
 await until(()=>button(document,'Mở'));
 button(document,'Mở').click();await until(()=>drawer()?.textContent.includes('Bạn muốn làm gì?'));
 if(drawer().querySelector('textarea'))throw Error('Policy overview must not expose raw JSON or long AI text by default');
 if(!drawer().textContent.includes('7')||!drawer().textContent.includes('Lưu nháp'))throw Error('Policy overview missing summary or workflow');
 if(${process.env.QA_POLICY_LAYOUT === '1' ? 'true' : 'false'}) {
   await pause(300);
   if(drawer().scrollWidth>drawer().clientWidth+1)throw Error('Policy overview overflows horizontally');
   const header=drawer().closest('.ant-drawer-content').querySelector('.ant-drawer-header');
   const title=header.querySelector('.ant-drawer-header-title').getBoundingClientRect();
   const actions=header.querySelector('.ant-drawer-extra').getBoundingClientRect();
   if(Math.min(title.right,actions.right)>Math.max(title.left,actions.left)+1&&Math.min(title.bottom,actions.bottom)>Math.max(title.top,actions.top)+1)throw Error('Policy header title and actions overlap');
   document.getElementById('qa-result').textContent=JSON.stringify({ok:true,viewport:window.innerWidth,checks:['policy opens to a readable overview','summary and workflow visible','no raw JSON by default','overview fits viewport']});return;
 }
 tab(drawer(),'Nhóm nội dung và mức độ').click();
 await until(()=>[...drawer().querySelectorAll('.ant-collapse-header')].some(el=>el.textContent.includes('Xúc phạm, bắt nạt')));
 [...drawer().querySelectorAll('.ant-collapse-header')].find(el=>el.textContent.includes('Xúc phạm, bắt nạt')).click();
 await until(()=>drawer().querySelector('input[aria-label="Tên nhóm ABUSE_BULLYING"]'));
 const nameField=drawer().querySelector('input[aria-label="Tên nhóm ABUSE_BULLYING"]');
 Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(nameField,'Nhóm xúc phạm thử nghiệm');nameField.dispatchEvent(new Event('input',{bubbles:true}));
 await until(()=>drawer().textContent.includes('Có thay đổi chưa lưu'));
 if(!button(document,'Phát hành').disabled)throw Error('Publish must require validation');
 tab(drawer(),'Quy tắc xử lý').click();await until(()=>button(drawer(),'Chi tiết'));
 button(drawer(),'Chi tiết').click();await until(()=>document.querySelectorAll('.ant-drawer-body').length===2);
 const actionDrawer=[...document.querySelectorAll('.ant-drawer-body')].find(el=>el.textContent.includes('Xác suất nhóm tối thiểu'));
 const toggle=actionDrawer.querySelector('[role=switch]');if(!toggle)throw Error('Missing action switch');toggle.click();
 [...document.querySelectorAll('.ant-drawer-close')].at(-1).click();await pause(400);
 button(document,'Lưu nháp').click();await until(()=>window.jevCalls.some(c=>c.method==='PUT'));
 const saved=window.jevCalls.find(c=>c.method==='PUT');if(saved.body.expectedEditRevision!==1)throw Error('Save must send CAS revision');
 if(saved.body.config.policy.framework.categories[0].label!=='Nhóm xúc phạm thử nghiệm')throw Error('Structured group edit was not saved');
 if(JSON.stringify(saved.body.config.policy.framework)!==JSON.stringify(saved.body.config.rubric.framework))throw Error('Framework must stay in sync with rubric');
 const original=${JSON.stringify(seed)};
 if(JSON.stringify(saved.body.config.policy.rules[0])!==JSON.stringify(original.policy.rules[0]))throw Error('Filtered table edited the wrong rule index');
 if(JSON.stringify(saved.body.config.policy.templates)!==JSON.stringify(original.policy.templates))throw Error('Editing group/rule changed unrelated template data');
 await until(()=>!button(document,'Kiểm tra').disabled);
 button(document,'Kiểm tra').click();await until(()=>!button(document,'Phát hành').disabled);
 tab(drawer(),'Thông báo cho người dùng').click();await until(()=>button(drawer(),'Chỉnh sửa'));
 button(drawer(),'Chỉnh sửa').click();await until(()=>document.querySelector('textarea[aria-label="Nội dung distress_student"]'));
 const notice=document.querySelector('textarea[aria-label="Nội dung distress_student"]');
 const noticeText=notice.value+' Kiểm tra giao diện.';
 Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(notice,noticeText);notice.dispatchEvent(new Event('input',{bubbles:true}));
 button(document,'Xong').click();await pause(400);
 button(document,'Lưu nháp').click();await until(()=>window.jevCalls.filter(c=>c.path==='/policies/3'&&c.method==='PUT').length===2);
 const noticeSave=window.jevCalls.filter(c=>c.path==='/policies/3'&&c.method==='PUT').at(-1);
 if(noticeSave.body.config.policy.templates[0].body!==noticeText)throw Error('Template form did not save edited message');
 if(noticeSave.body.config.policy.templates[0].guidance!==original.policy.templates[0].guidance)throw Error('Template form changed unrelated guidance');
 tab(drawer(),'Thử tình huống').click();await until(()=>drawer().querySelector('[aria-label="Nhóm tình huống"]'));
 const pickPreview=async(label,text)=>{
   const select=drawer().querySelector('[aria-label="'+label+'"]').closest('.ant-select');
   select.querySelector('.ant-select-selector').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));
   await until(()=>[...document.querySelectorAll('.ant-select-item-option')].some(el=>visible(el)&&el.textContent.includes(text)));
   [...document.querySelectorAll('.ant-select-item-option')].find(el=>visible(el)&&el.textContent.includes(text)).click();await pause(50);
 };
 await pickPreview('Nhóm tình huống','Nhóm xúc phạm thử nghiệm');
 await pickPreview('Mức tình huống','Nặng');
 button(drawer(),'Chạy giả lập').click();await until(()=>window.jevCalls.some(call=>call.path==='/preview'));
 const previewCall=window.jevCalls.find(call=>call.path==='/preview').body;
 if(previewCall.pCategory!==0.95||previewCall.pSeverity!==0.95||previewCall.categoryConfidence!==0.95||previewCall.severityConfidence!==0.95)throw Error('Preview percentages must convert to the Live 0..1 contract');
 if(typeof previewCall.priorCounts!=='object'||previewCall.priorCounts.SPAM!==0)throw Error('Preview counters must be numeric fields, not JSON strings');
 await until(()=>drawer().textContent.includes('Kết quả thử'));
 if(${process.env.QA_PREVIEW_LAYOUT === '1' ? 'true' : 'false'}) {
   await pause(250);
   const panel=drawer().querySelector('[data-testid="jev-policy-preview"]');
   if(panel.scrollWidth>panel.clientWidth+1||drawer().scrollWidth>drawer().clientWidth+1)throw Error('Scenario preview overflows horizontally');
   if(window.innerWidth>1000) {
     const context=panel.querySelector('[aria-label="Bối cảnh tình huống"]').closest('.ant-select').getBoundingClientRect();
     const group=panel.querySelector('[aria-label="Nhóm tình huống"]').closest('.ant-select').getBoundingClientRect();
     const level=panel.querySelector('[aria-label="Mức tình huống"]').closest('.ant-select').getBoundingClientRect();
     if(Math.abs(context.top-group.top)>2||Math.abs(context.top-level.top)>2)throw Error('Scenario selectors must share one row on desktop');
   }
   document.getElementById('qa-result').textContent=JSON.stringify({ok:true,viewport:window.innerWidth,checks:['grouped scenario selectors','content and safety scores grouped separately','numeric history fields','separate preview result','preview fits viewport']});return;
 }
 const scoreInput=drawer().querySelector('input[aria-label="Xác suất đúng nhóm"]');
 Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(scoreInput,'90');scoreInput.dispatchEvent(new Event('input',{bubbles:true}));
 await until(()=>!drawer().textContent.includes('Kết quả thử'));
 button(drawer(),'Đặt lại').click();await pause(100);
 if(drawer().querySelector('input[aria-label="Xác suất đúng nhóm"]').value!=='95')throw Error('Reset must restore the default percentage');
 button(document,'Kiểm tra').click();await until(()=>!button(document,'Phát hành').disabled);
 tab(drawer(),'Thiết lập nâng cao').click();
 await until(()=>[...drawer().querySelectorAll('.ant-collapse-header')].some(el=>el.textContent.includes('Toàn bộ cấu hình (JSON)')));
 [...drawer().querySelectorAll('.ant-collapse-header')].find(el=>el.textContent.includes('Toàn bộ cấu hình (JSON)')).click();
 await until(()=>drawer().querySelector('textarea[aria-label="Bundle cấu hình"]'));
 const input=drawer().querySelector('textarea[aria-label="Bundle cấu hình"]');
 Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,'{broken');input.dispatchEvent(new Event('input',{bubbles:true}));
 await until(()=>drawer().textContent.includes('JSON chưa hợp lệ'));
 if(!button(document,'Lưu nháp').disabled)throw Error('Invalid JSON must prevent save');
 document.querySelector('.ant-drawer-close').click();await until(()=>document.querySelector('.ant-modal-confirm .ant-btn-primary'));document.querySelector('.ant-modal-confirm .ant-btn-primary').click();await pause(400);
 tab(document,'Vận hành toàn hệ thống').click();await until(()=>document.body.textContent.includes('Revision GLOBAL'));
 if(!document.body.textContent.includes('Policy mặc định'))throw Error('Shared GLOBAL revision must be explained');
 if(${process.env.QA_NUMBER_FORMAT === '1' ? 'true' : 'false'}) {
   const form=document.querySelector('[data-testid=jev-runtime-form]');
   const budget=form.querySelector('input[aria-label="Ngân sách ước tính"]');
   if(budget.value!=='10.000.000')throw Error('Budget must show Vietnamese thousands separators: '+budget.value);
   if(form.querySelector('input[aria-label="HTTP timeout (ms)"]').value!=='1.500')throw Error('Timeout must show thousands separators');
   if(form.querySelector('input[aria-label="Thời gian nghỉ"]').value!=='180.000')throw Error('Cooldown must show thousands separators');
   budget.focus();
   Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(budget,'');budget.dispatchEvent(new Event('input',{bubbles:true}));
   await pause(50);budget.blur();await pause(50);
   if(budget.value!=='')throw Error('Clearing must keep the field empty');
   budget.focus();
   Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(budget,'1.234.567');budget.dispatchEvent(new Event('input',{bubbles:true}));
   await pause(50);budget.blur();await until(()=>budget.value==='1.234.567');
   button(form,'Lưu vận hành').click();await until(()=>button(document,'Lưu'));button(document,'Lưu').click();
   await until(()=>window.jevCalls.some(c=>c.path==='/runtime'&&c.method==='PUT'));
   const saved=window.jevCalls.find(c=>c.path==='/runtime'&&c.method==='PUT');
   if(saved.body.settings.maxSpendMicroUsd!==1234567)throw Error('Formatted budget must save as a number');
   if(saved.body.settings.limits.httpTimeoutMs!==1500)throw Error('Formatting changed timeout data');
   document.getElementById('qa-result').textContent=JSON.stringify({ok:true,checks:['grouped budget and time inputs','clearing preserves empty input','pasted grouped number parsed correctly','API receives numeric values without separators']});
   return;
 }

 if(${process.env.QA_RUNTIME_LAYOUT === '1' ? 'true' : 'false'}) {
   await pause(200);
   const form=document.querySelector('[data-testid=jev-runtime-form]');
   const mode=form.querySelector('[aria-label="Chế độ toàn hệ thống"]').closest('.ant-select').getBoundingClientRect();
   const model=form.querySelector('[aria-label="Model JEV"]').getBoundingClientRect();
   if(Math.abs(mode.top-model.top)>2||mode.width>300||model.width>260)throw Error('Mode and model must be compact and aligned');
   if(form.scrollWidth>form.clientWidth+1)throw Error('Runtime form overflows horizontally');
   if(!button(form,'Lưu vận hành'))throw Error('Save action missing');
   document.getElementById('qa-result').textContent=JSON.stringify({ok:true,viewport:window.innerWidth,formHeight:form.getBoundingClientRect().height,checks:['compact aligned mode and model','responsive runtime layout without overflow','save action visible']});
   return;
 }
 tab(document,'Phạm vi áp dụng').click();await until(()=>button(document,'Thêm phạm vi'));button(document,'Thêm phạm vi').click();
 await until(()=>document.querySelector('.ant-modal-body')?.textContent.includes('Mã chương trình'));
 const modal=()=>[...document.querySelectorAll('.ant-modal-body')].find(visible);
 if(modal().textContent.includes('calendar.id'))throw Error('Calendar IDs must not be entered manually');
 const choose=async(label,text)=>{
  const input=modal().querySelector('input[aria-label="'+label+'"]');
  const select=input.closest('.ant-select');
  select.querySelector('.ant-select-selector').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));
  await until(()=>[...document.querySelectorAll('.ant-select-item-option')].some(el=>visible(el)&&el.textContent.includes(text)));
  [...document.querySelectorAll('.ant-select-item-option')].find(el=>visible(el)&&el.textContent.includes(text)).click();await pause(50);
 };
 await choose('Mã chương trình','qa-program');
 await until(()=>window.jevCalls.some(call=>call.path.startsWith('/scope/calendars?')&&call.path.includes('qa-program')));
 await choose('Lịch học','18/11/2026');
 await choose('Mã chương trình','qa-next');
 button(document,'Lưu và đồng bộ').click();await pause(100);
 if(window.jevCalls.some(call=>call.path==='/bindings'&&call.method==='PUT'))throw Error('Changing program must clear the previous calendar');
 if(document.querySelector('.ant-message-notice-error'))throw Error('Missing required selection should use inline validation');
 await choose('Mã chương trình','qa-program');await pause(350);
 await choose('Lịch học','18/11/2026');
 if(${process.env.QA_SCOPE_LAYOUT === '1' ? 'true' : 'false'}) {
   await pause(300);
   if(modal().scrollWidth>modal().clientWidth+1)throw Error('Schedule picker overflows');
   document.getElementById('qa-result').textContent=JSON.stringify({ok:true,viewport:window.innerWidth,checks:['program and schedule picker layout without horizontal overflow']});
   return;
 }
 button(document,'Lưu và đồng bộ').click();
 await until(()=>window.jevCalls.some(call=>call.path==='/bindings'&&call.method==='PUT'));
 const bound=window.jevCalls.find(call=>call.path==='/bindings'&&call.method==='PUT').body;
 if(bound.scopeType!=='CALENDAR'||bound.scopeKey!=='102')throw Error('Selected schedule must supply its actual calendar ID');
 if('programCode' in bound)throw Error('Picker-only fields must not leak into binding payload');
 await until(()=>document.body.textContent.includes('18/11/2026'));
 await until(()=>!modal());
 const bindingRow=[...document.querySelectorAll('tr.ant-table-row')].find(row=>row.textContent.includes('qa-program'));
 if(!bindingRow)throw Error('Binding list must show the program and schedule');
 button(bindingRow,'Cấu hình').click();
 await until(()=>window.jevCalls.some(call=>call.path==='/scope/calendars/102'));
 await until(()=>modal()?.textContent.includes('18/11/2026'));
 button(document,'Hủy').click();await pause(300);
 tab(document,'Trạng thái đồng bộ').click();await until(()=>document.body.textContent.includes('test-hash'));
 button(document,'Thử đồng bộ lại').click();await until(()=>document.body.textContent.includes('Đã lưu, chưa xác nhận đồng bộ'));
 document.getElementById('qa-result').textContent=JSON.stringify({ok:true,viewport:window.innerWidth,checks:['readable policy overview','structured group edit preserves identities and syncs framework','filtered rule edit preserves source index','unrelated templates unchanged','template form preserves guidance','preview converts percentages and numeric counters to Live contract','preview clears stale result and resets inputs','publish requires validation','matrix edit and CAS save','invalid JSON blocks save','GLOBAL revision notice','program and schedule picker resolves actual calendar ID','changing program clears stale calendar','existing schedule label restored','reload retry and pending sync']});
})().catch(e=>document.getElementById('qa-result').textContent=JSON.stringify({ok:false,error:e.message,body:document.body.innerText.slice(-3500),closes:[...document.querySelectorAll('.ant-drawer-close')].map(el=>({visible:visible(el),parent:el.closest('.ant-drawer')?.className}))}));
`;
(async()=>{
const result=await esbuild.build({stdin:{contents:fixture,resolveDir:root,loader:'tsx'},bundle:true,write:false,outdir:taskDir,platform:'browser',format:'iife',jsx:'automatic',tsconfig:root+'/tsconfig.json',define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'qa',setup(build){
build.onResolve({filter:/^@\//},args=>mocks[args.path]?{path:args.path,namespace:'qa'}:{path:root+'/'+args.path.slice(2)+(fs.existsSync(root+'/'+args.path.slice(2)+'.tsx')?'.tsx':'.ts')});
build.onLoad({filter:/.*/,namespace:'qa'},args=>({contents:mocks[args.path],loader:'js'}));
}}]});
fs.writeFileSync(path.join(taskDir,'qa.html'),'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+result.outputFiles.filter(file=>file.path.endsWith('.css')).map(file=>file.text).join('\n')+'</style><div id="root"></div><pre id="qa-result">RUNNING</pre><script>'+result.outputFiles.find(file=>file.path.endsWith('.js')).text.replaceAll('</script','<\\/script')+'</script>');
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

})().catch(error => {fs.rmSync(taskDir,{recursive:true,force:true});process.stderr.write(String(error)+"\n");process.exitCode=1;});
