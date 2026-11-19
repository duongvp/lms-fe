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
const settings={mode:'off',modelVersion:'jev-1.14.0',maxSpendMicroUsd:${Number(process.env.QA_USD_MICRO_BUDGET || 10000000)},limits:{maxInFlight:30,maxQueue:500,maxPerRoom:50,deadlineMs:10000,httpTimeoutMs:1500,requestsPerSecond:30,maxDailyAttempts:50000,reservedInputTokens:64000},circuitBreaker:{enabled:true,failureThreshold:3,cooldownMs:180000}};
window.jevCalls=[];let createdPolicy=null;window.jevOriginalSource=JSON.parse(JSON.stringify(policy));
const publishedPolicy={id:5,policy_key:'kiem-duyet-lop-hoc',revision:1,status:'PUBLISHED'};
let savedBindings=[{id:1,scope_type:'GLOBAL',scope_key:'*',mode:'off',policy_version_id:null,revision:1}];
const calendars=[101,102].map((id,index)=>({id,code:'qa-program',learn_number:2,lesson_name:'Same lesson',start_time:'2026-11-'+(17+index)+'T18:00:00Z',end_time:'2026-11-'+(17+index)+'T19:00:00Z'}));
export async function jevRequest(path,method='GET',body){
 window.jevCalls.push({path,method,body});
 if(window.jevResponsive)policy.policy_key='kiem-duyet-lop-hoc-chuong-trinh-noi-dung-dai-kiem-tra-responsive';
 if(window.jevLoadError)throw Error('Không thể xử lý cấu hình JEV; kiểm tra DB và migration Chat');
 if(path==='/l1/settings')return {data:{revision:1,mode:'off',counts:[{list_type:'BLACKLIST',is_active:1,_count:{_all:25}},{list_type:'WHITELIST',is_active:1,_count:{_all:2}}]}};
 if(path.startsWith('/l1/lexicon?')){const q=new URLSearchParams(path.split('?')[1]);const all=Array.from({length:25},(_,i)=>({id:i+1,list_type:q.get('listType'),match_mode:q.get('listType')==='WHITELIST'?'EXACT_PHRASE':'BOUNDED',pattern:q.get('listType')==='WHITELIST'?'em hiểu rồi':'từ khóa '+(i+1),is_active:1,category:'PROFANITY',note:'Ghi chú kiểm tra cách hiển thị nội dung dài trên điện thoại và máy tính bảng.'}));const page=Number(q.get('page'));return {data:{rows:all.slice((page-1)*20,page*20),total:all.length}};}
 if(path==='/l1/status')return {data:{policy:{source:'database',revision:1,mode:'off',loadedAt:'2026-11-19T02:00:00Z'}}};
 if(path.startsWith('/policies?')){const rows=[...(createdPolicy?[createdPolicy]:[]),...(window.jevEmptyPolicies?[]:[policy,publishedPolicy])];return {data:{rows,total:rows.length}};}
 if(path.startsWith('/bindings?'))return {data:{rows:savedBindings.map(row=>({...row,configured:row.mode==='inherit'?{scope_type:'GLOBAL',scope_key:'*',mode:'off',policy:null}:{scope_type:row.scope_type,scope_key:row.scope_key,mode:row.mode,policy:row.mode==='off'?null:publishedPolicy}})),total:savedBindings.length}};
 if(path.startsWith('/scope/programs?'))return {data:[{code:'qa-program'},{code:'qa-next'}]};
 if(path.startsWith('/scope/calendars?')){const q=new URLSearchParams(path.split('?')[1]);return {data:{rows:q.get('code')==='qa-program'?calendars:[],page:1,hasMore:false}};}
 if(path.startsWith('/scope/calendars/'))return {data:calendars.find(row=>row.id===Number(path.split('/').at(-1)))};
 if(path==='/bindings'&&method==='PUT'){
  const calendar=calendars.find(row=>String(row.id)===body.scopeKey);
  const row={id:2,scope_type:body.scopeType,scope_key:body.scopeKey,mode:body.mode,policy_version_id:body.policyVersionId,revision:1,calendar};
  savedBindings=[savedBindings[0],row];return {data:row,sync:{confirmed:true,message:'Đã đồng bộ'}};
 }
 if(path==='/runtime'){if(method==='PUT')Object.assign(settings,body.settings);return {data:{revision:1,settings:JSON.parse(JSON.stringify(settings))}};}
 if(path==='/status'){
  if(window.jevStatusCase==='missing-url')throw Error('Chưa cấu hình JEV_CHAT_API_URL hợp lệ trên backend Admin');
  if(window.jevStatusCase==='timeout')throw Error('Không kết nối được dịch vụ Chat JEV');
  const mode=['shadow','enforce'].includes(window.jevStatusCase)?window.jevStatusCase:'off';
  return {data:{policy:{source:window.jevStatusCase==='unloaded'?'unloaded':'database',snapshotHash:window.jevStatusCase==='unloaded'?null:'test-hash',loadedAt:window.jevStatusCase==='unloaded'?null:'2026-11-17T10:00:00Z'},runtimeStatus:{mode,reason:window.jevStatusCase==='invalid'?'INVALID_CONFIG':mode==='off'?'OFF':null}}};
 }
 if(path==='/policies/from-template'&&method==='POST'){
  createdPolicy={id:4,policy_key:body.policyKey,revision:body.revision,edit_revision:1,status:'DRAFT',config_json:JSON.parse(JSON.stringify(policy.config_json))};
  createdPolicy.config_json.policy.version=body.policyKey+':r'+body.revision;
  window.jevSourceAfterCreate=JSON.parse(JSON.stringify(policy));return {data:JSON.parse(JSON.stringify(createdPolicy))};
 }
 if(path==='/policies/5'&&method==='GET')return {data:publishedPolicy};
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
import './app/globals.css';import '@ant-design/v5-patch-for-react-19';import React from 'react';import {createRoot} from 'react-dom/client';import Page from './app/(admin)/jev/page';
window.jevResponsive=${process.env.QA_RESPONSIVE === '1' ? 'true' : 'false'};
window.jevSyncMatrix=${process.env.QA_SYNC_MATRIX === '1' ? 'true' : 'false'};
window.jevLoadError=${process.env.QA_JEV_LOAD_ERROR === '1' ? 'true' : 'false'};
window.jevEmptyPolicies=${process.env.QA_CREATE_POLICY === 'empty' ? 'true' : 'false'};
createRoot(document.getElementById('root')).render(<Page/>);
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const until=async fn=>{for(let i=0;i<160;i++){if(fn())return;await pause(30)}throw Error('Condition timed out: '+fn)};
const visible=el=>el&&el.getBoundingClientRect().width>0;
const button=(root,text)=>[...(root?.querySelectorAll('button')||[])].find(el=>visible(el)&&el.textContent.trim()===text);
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
 if(window.jevResponsive) {
   const fits=(el,label)=>{
     if(!el)throw Error('Missing '+label);
     const rect=el.getBoundingClientRect();
     if(rect.left<-1||rect.right>window.innerWidth+1||el.scrollWidth>el.clientWidth+1)throw Error(label+' overflows: '+JSON.stringify({left:rect.left,right:rect.right,scroll:el.scrollWidth,width:el.clientWidth}));
   };
   const modal=()=>[...document.querySelectorAll('.ant-modal-body')].find(visible);
   const checkModal=async()=>{
     await pause(350);
     fits(modal(),'modal body');
     const content=modal().closest('.ant-modal-content');fits(content,'modal content');
     if(content.getBoundingClientRect().bottom>window.innerHeight+1)throw Error('Modal footer is outside viewport');
     for(const control of content.querySelectorAll('.ant-modal-footer button'))fits(control,'modal footer button');
   };
   const checkDrawer=async()=>{await pause(350);fits(drawer(),'policy drawer');};
   const page=()=>document.querySelector('.admin-responsive-page');
   await until(()=>button(document,'Mở'));await pause(200);
   fits(page(),'policy list');
   if(window.innerWidth<992&&!document.querySelector('.responsive-table-card'))throw Error('Small screens must use shared record cards');
   button(document,'Tạo bản nháp').click();await until(()=>modal()?.textContent.includes('Dựa trên bộ cấu hình'));await checkModal();
   button(document,'Hủy').click();await until(()=>!modal());
   button(document,'Mở').click();await until(()=>drawer()?.textContent.includes('Bạn muốn làm gì?'));await checkDrawer();
   const header=drawer().closest('.ant-drawer-content').querySelector('.ant-drawer-header');
   fits(header,'policy header');
   const title=header.querySelector('.ant-drawer-header-title').getBoundingClientRect(),actions=header.querySelector('.ant-drawer-extra').getBoundingClientRect();
   if(Math.min(title.right,actions.right)>Math.max(title.left,actions.left)+1&&Math.min(title.bottom,actions.bottom)>Math.max(title.top,actions.top)+1)throw Error('Policy title overlaps actions');
   tab(drawer(),'Quy tắc xử lý').click();await until(()=>button(drawer(),'Chi tiết'));await checkDrawer();
   button(drawer(),'Chi tiết').click();await until(()=>[...document.querySelectorAll('.ant-drawer-body')].filter(visible).length===2);
   const actionDrawer=[...document.querySelectorAll('.ant-drawer-body')].find(el=>el.textContent.includes('Xác suất nhóm tối thiểu'));await pause(350);fits(actionDrawer,'action editor');
   [...document.querySelectorAll('.ant-drawer-close')].at(-1).click();await pause(350);
   tab(drawer(),'Thông báo cho người dùng').click();await until(()=>button(drawer(),'Chỉnh sửa'));await checkDrawer();
   if(window.innerWidth<992){
     const templateCards=[...drawer().querySelectorAll('.responsive-table-card')].filter(visible);
     if(templateCards.length!==10)throw Error('Template cards must preserve 10 items per page');
     const firstTemplate=templateCards[0].textContent;
     [...drawer().querySelectorAll('.ant-pagination-item[title="2"]')].find(visible).click();
     await until(()=>[...drawer().querySelectorAll('.responsive-table-card')].filter(visible)[0]?.textContent!==firstTemplate);
     if([...drawer().querySelectorAll('.responsive-table-card')].filter(visible).length!==10)throw Error('Template page 2 must preserve page size');
   }
   button(drawer(),'Chỉnh sửa').click();await until(()=>modal()?.textContent.includes('Nội dung thông báo'));await checkModal();
   button(document,'Xong').click();await until(()=>!modal());
   tab(drawer(),'Thử tình huống').click();await until(()=>drawer()?.querySelector('[data-testid="jev-policy-preview"]'));await checkDrawer();
   fits(drawer().querySelector('[data-testid="jev-policy-preview"]'),'scenario form');
   [...document.querySelectorAll('.ant-drawer-close')].find(visible).click();await until(()=>!drawer());
   tab(document,'Chế độ chung').click();await until(()=>document.querySelector('[data-testid="jev-runtime-form"]'));fits(page(),'runtime page');
   fits(document.querySelector('[data-testid="jev-runtime-form"]'),'runtime form');
   const runtimeForm=document.querySelector('[data-testid="jev-runtime-form"]');
   if(window.innerWidth<992){
     for(const input of runtimeForm.querySelectorAll('input'))if(getComputedStyle(input).fontSize!=='16px')throw Error('Touch runtime input must be 16px: '+input.getAttribute('aria-label'));
     for(const label of runtimeForm.querySelectorAll('.ant-form-item-label label'))if(parseFloat(getComputedStyle(label).fontSize)>=16)throw Error('Runtime labels must be smaller than input values');
   }
   if(${process.env.QA_TOUCH_CAPTURE === 'runtime' ? 'true' : 'false'}){document.getElementById('qa-result').textContent=JSON.stringify({ok:true,viewport:window.innerWidth,checks:['runtime input values are 16px','supporting labels are smaller','runtime form fits viewport']});return;}

   tab(document,'Bộ lọc L1').click();await until(()=>button(document,'Thêm từ khóa'));await pause(200);fits(page(),'L1 page');
   const toolbar=document.querySelector('[data-testid="jev-l1-toolbar"]');
   const searchField=toolbar.querySelector('.ant-input-affix-wrapper').getBoundingClientRect();
   const searchButton=toolbar.querySelector('.ant-input-search-button').getBoundingClientRect();
   if(Math.abs(searchField.top-searchButton.top)>1||Math.abs(searchField.height-searchButton.height)>1)throw Error('L1 search input and search button must align');
   if(window.innerWidth<992){
     const record=document.querySelector('[data-testid="jev-l1-record"]');
     if(!record)throw Error('Compact L1 record missing');
     const edit=button(record,'Sửa');
     if(edit.getBoundingClientRect().top>record.getBoundingClientRect().top+2)throw Error('L1 Edit must be at the top of its card');
     const fields=record.querySelectorAll('dl > div');
     if(fields.length!==2||Math.abs(fields[0].getBoundingClientRect().top-fields[1].getBoundingClientRect().top)>1)throw Error('L1 metadata must use two columns');
     edit.click();await until(()=>modal()?.textContent.includes('Cách khớp'));await checkModal();
     if(!modal().querySelector('input[aria-label="Nội dung bộ lọc"]').value)throw Error('Edit must open the selected filter');
     button(document,'Hủy').click();await until(()=>!modal());await pause(350);
   }
   if(${['l1','l1-cards'].includes(process.env.QA_TOUCH_CAPTURE) ? 'true' : 'false'}){if(${process.env.QA_TOUCH_CAPTURE === 'l1-cards' ? 'true' : 'false'})document.querySelector('[data-testid="jev-l1-record"]').scrollIntoView({block:'start'});document.getElementById('qa-result').textContent=JSON.stringify({ok:true,viewport:window.innerWidth,checks:['L1 search input and icon button align','edit action at top of compact card','metadata in two columns','existing filter still opens for editing']});return;}

   button(document,'Thêm từ khóa').click();await until(()=>modal()?.textContent.includes('Cách khớp'));await checkModal();
   button(document,'Hủy').click();await until(()=>!modal());
   [...document.querySelectorAll('[role=tab]')].find(el=>el.textContent.startsWith('Whitelist (Câu an toàn)')).click();
   await until(()=>button(document,'Thêm câu an toàn'));button(document,'Thêm câu an toàn').click();await until(()=>modal()?.textContent.includes('Khớp toàn câu'));await checkModal();
   button(document,'Hủy').click();await until(()=>!modal());
   const secondPage=document.querySelector('[title="2"]');if(!secondPage)throw Error('Missing record card pagination');secondPage.click();
   await until(()=>window.jevCalls.some(c=>c.path.startsWith('/l1/lexicon?')&&c.path.includes('page=2')));await pause(450);fits(page(),'L1 paginated page');
   tab(document,'Thiết lập từng lớp').click();await until(()=>button(document,'Thiết lập cho chương trình / buổi học'));fits(page(),'bindings page');
   button(document,'Thiết lập cho chương trình / buổi học').click();await until(()=>modal()?.textContent.includes('Mã chương trình'));await checkModal();
   button(document,'Hủy').click();await until(()=>!modal());
   tab(document,'Trạng thái đồng bộ').click();await until(()=>button(document,'Chi tiết kỹ thuật'));fits(page(),'sync status page');
   button(document,'Chi tiết kỹ thuật').click();await until(()=>modal()?.textContent.includes('test-hash'));await checkModal();
   button(document,'Đóng').click();await until(()=>!modal());
   if(window.jevCalls.some(c=>['PUT','POST'].includes(c.method)))throw Error('Responsive inspection must not change configuration');
   await pause(350);
   document.getElementById('qa-result').textContent=JSON.stringify({ok:true,viewport:window.innerWidth,checks:['shared responsive cards below 992px','all five tabs fit viewport','drawer actions do not overlap title','rule and notification actions available in cards','scenario editor fits','L1 filters and pagination work','create/edit/details modals fit with visible footer','no configuration mutations']});return;
 }
 if(window.jevSyncMatrix) {
   await until(()=>tab(document,'Trạng thái đồng bộ'));
   tab(document,'Trạng thái đồng bộ').click();
   const panel=()=>document.querySelector('[data-testid="jev-sync-status"]');
   await until(()=>panel()?.textContent.includes('Đã nhận phản hồi'));
   if(!panel().textContent.includes('Đang tắt kiểm duyệt JEV')||!panel().textContent.includes('Đã nạp một bản cấu hình đã lưu'))throw Error('Initial response must explain configured state without claiming fleet-wide sync');
   for(const [scenario,expected] of [['shadow','Chỉ theo dõi, chưa xử lý vi phạm'],['enforce','Cho phép xử lý vi phạm theo cấu hình'],['unloaded','Chưa xác nhận đã nạp cấu hình'],['invalid','Cấu hình vận hành chưa hợp lệ'],['missing-url','Chưa thiết lập đầy đủ kết nối'],['timeout','Chưa lấy được phản hồi mới']]) {
     window.jevStatusCase=scenario;
     button(panel(),'Kiểm tra lại').click();
     await until(()=>panel().textContent.includes(expected)&&!panel().textContent.includes('Đang kiểm tra kết nối'));
     if(['missing-url','timeout'].includes(scenario)&&panel().textContent.includes('Đã nhận phản hồi'))throw Error('Failed refresh must not show a stale successful connection');
     if(panel().textContent.includes('JEV_CHAT_API_URL')||panel().textContent.includes('Snapshot hash'))throw Error('Technical errors must stay in details');
   }
   window.jevStatusCase='missing-url';button(panel(),'Kiểm tra lại').click();
   await until(()=>panel().textContent.includes('Chưa thiết lập đầy đủ kết nối'));
   button(panel(),'Chi tiết kỹ thuật').click();
   const details=()=>[...document.querySelectorAll('.ant-modal-body')].find(visible);
   await until(()=>details()?.textContent.includes('JEV_CHAT_API_URL'));
   button(document,'Đóng').click();await until(()=>!details());
   window.jevStatusCase='enforce';button(panel(),'Kiểm tra lại').click();
   await until(()=>panel().textContent.includes('Cho phép xử lý vi phạm theo cấu hình'));
   button(panel(),'Thử đồng bộ lại').click();
   await until(()=>panel().textContent.includes('Chưa xác nhận yêu cầu đồng bộ'));
   if(window.jevCalls.some(call=>['PUT','POST'].includes(call.method)&&call.path!=='/reload'))throw Error('Status actions must not mutate configuration');
   button(panel(),'Chi tiết kỹ thuật').click();await until(()=>details()?.textContent.includes('test-hash'));
   button(document,'Đóng').click();await until(()=>!details());
   document.getElementById('qa-result').textContent=JSON.stringify({ok:true,viewport:window.innerWidth,checks:['plain language off/shadow/enforce states','unloaded configuration and invalid settings explained','missing connection setup gives next step','failed refresh does not present stale success','raw errors and hash accessible in technical modal','retry acknowledgement does not claim complete synchronization','status actions do not rewrite configuration']});return;
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
 tab(document,'Chế độ chung').click();await until(()=>document.querySelector('[data-testid=jev-runtime-form]'));
 if(${process.env.QA_NUMBER_FORMAT === '1' ? 'true' : 'false'}) {
   const form=document.querySelector('[data-testid=jev-runtime-form]');
   const budget=form.querySelector('input[aria-label="Ngân sách ước tính"]');
   const initialMicroUsd=${Number(process.env.QA_USD_MICRO_BUDGET || 10000000)};
   const initialUsd=String(initialMicroUsd/1000000).replace('.',',');
   if(budget.value!==initialUsd)throw Error('Stored microUSD must display as USD: '+budget.value+' expected '+initialUsd);
   if(!form.textContent.includes('Ngân sách (USD/ngày)'))throw Error('Budget label must identify the USD daily limit');
   if(form.querySelector('input[aria-label="Chờ tối đa (ms)"]').value!=='1.500')throw Error('Timeout formatting must be preserved');
   if(form.querySelector('input[aria-label="Thời gian nghỉ"]').value!=='180.000')throw Error('Cooldown formatting must be preserved');
   button(form,'Lưu vận hành').click();await until(()=>button(document,'Lưu'));button(document,'Lưu').click();
   await until(()=>window.jevCalls.filter(c=>c.path==='/runtime'&&c.method==='PUT').length===1);
   if(window.jevCalls.find(c=>c.path==='/runtime'&&c.method==='PUT').body.settings.maxSpendMicroUsd!==initialMicroUsd)throw Error('Saving unchanged budget must preserve stored microUSD exactly');
   await until(()=>!budget.disabled&&!button(form,'Lưu vận hành').classList.contains('ant-btn-loading')&&![...document.querySelectorAll('.ant-modal-confirm')].some(visible));
   budget.focus();
   Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(budget,'');budget.dispatchEvent(new Event('input',{bubbles:true}));
   await pause(50);budget.blur();await pause(50);
   if(budget.value!=='')throw Error('Clearing must keep the field empty');
   if(!button(form,'Lưu vận hành').disabled)throw Error('Empty budget must not be saved');
   budget.focus();
   Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(budget,'12,345678');budget.dispatchEvent(new Event('input',{bubbles:true}));
   await pause(50);budget.blur();await until(()=>budget.value==='12,345678');
   button(form,'Lưu vận hành').click();await until(()=>button(document,'Lưu'));button(document,'Lưu').click();
   await until(()=>window.jevCalls.filter(c=>c.path==='/runtime'&&c.method==='PUT').length===2);
   const saved=window.jevCalls.filter(c=>c.path==='/runtime'&&c.method==='PUT').at(-1);
   if(saved.body.settings.maxSpendMicroUsd!==12345678||!Number.isInteger(saved.body.settings.maxSpendMicroUsd))throw Error('Decimal USD must be converted to integer microUSD');
   if(saved.body.settings.limits.httpTimeoutMs!==1500)throw Error('Budget conversion changed unrelated settings');
   await until(()=>!button(form,'Lưu vận hành').disabled&&budget.value==='12,345678');
   document.getElementById('qa-result').textContent=JSON.stringify({ok:true,initialMicroUsd,viewport:window.innerWidth,checks:['stored microUSD displayed as USD','saving untouched budget preserves original value','clearing stays empty and prevents save','six-decimal USD converts to integer microUSD','reloaded budget remains in USD','other runtime settings unchanged']});return;
 }

 if(${process.env.QA_RUNTIME_LAYOUT === '1' ? 'true' : 'false'}) {
   await pause(200);
   const form=document.querySelector('[data-testid=jev-runtime-form]');
   const mode=form.querySelector('[aria-label="Chế độ toàn hệ thống"]').closest('.ant-select').getBoundingClientRect();
   const model=form.querySelector('[aria-label="Model JEV"]').getBoundingClientRect();
   if(Math.abs(mode.top-model.top)>2||mode.width>300||model.width>260)throw Error('Mode and model must be compact and aligned');
   if(form.scrollWidth>form.clientWidth+1)throw Error('Runtime form overflows horizontally');
   if(!button(form,'Lưu vận hành'))throw Error('Save action missing');
   if(window.innerWidth>640){
     if(mode.width>181||model.width>141)throw Error('Primary inputs must use compact widths');
     const numericInputs=[...form.querySelectorAll('input')].filter(input=>['Xử lý đồng thời','Chờ xử lý','Chờ / phòng','Lượt / giây','Lượt / ngày','Hạn xử lý (ms)','Chờ tối đa (ms)'].includes(input.getAttribute('aria-label')));
     if(numericInputs.length!==7||numericInputs.some(input=>input.closest('.ant-input-number').getBoundingClientRect().width>133))throw Error('Evaluation limit inputs must be compact');
   }
   if(form.textContent.includes('64.000 input token')||form.textContent.includes('Bấm Lưu vận hành sau khi thay đổi.'))throw Error('Redundant runtime instructions must be removed');
   document.getElementById('qa-result').textContent=JSON.stringify({ok:true,viewport:window.innerWidth,formHeight:form.getBoundingClientRect().height,checks:['compact primary and limit inputs','short labels with detailed tooltips','responsive runtime layout without overflow','save action visible']});
   return;
 }
 tab(document,'Thiết lập từng lớp').click();await until(()=>button(document,'Thiết lập cho chương trình / buổi học'));button(document,'Thiết lập cho chương trình / buổi học').click();
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
 const bindingRow=[...document.querySelectorAll('tr.ant-table-row, .responsive-table-card')].find(row=>row.textContent.includes('qa-program'));
 if(!bindingRow)throw Error('Binding list must show the program and schedule');
 if(!bindingRow.textContent.includes('Dùng thiết lập chung')||!bindingRow.textContent.includes('Theo mặc định hệ thống')||!bindingRow.textContent.includes('Không áp dụng (đã tắt)'))throw Error('Inherited configuration must show its source and configured result');
 if([...document.querySelectorAll('th')].some(el=>['Mode','Policy ID','Revision'].includes(el.textContent.trim())))throw Error('Technical binding columns must be hidden');
 const changeRect=button(bindingRow,'Thay đổi').getBoundingClientRect();
 const detailRect=button(bindingRow,'Chi tiết').getBoundingClientRect();
 if(Math.abs(changeRect.top-detailRect.top)>2||detailRect.left<changeRect.right)throw Error('Binding actions must share one row');
 button(bindingRow,'Chi tiết').click();
 await until(()=>modal()?.textContent.includes('Nguồn thiết lập'));
 if(!modal().textContent.includes('Mặc định hệ thống')||!modal().textContent.includes('18/11/2026')||!modal().textContent.includes('Không áp dụng (đã tắt)'))throw Error('Details must visibly explain the selected schedule, inherited source and disabled policy');
 button(document,'Đóng').click();await until(()=>!modal());
 button(bindingRow,'Thay đổi').click();
 await until(()=>window.jevCalls.some(call=>call.path==='/scope/calendars/102'));
 await until(()=>modal()?.textContent.includes('18/11/2026'));
 button(document,'Hủy').click();await pause(300);
 // Switching from inherited settings to a published configuration uses a named selector.
 button(bindingRow,'Thay đổi').click();
 await until(()=>modal()?.querySelector('[aria-label="Cách kiểm duyệt"]'));
 const modeInput=modal().querySelector('[aria-label="Cách kiểm duyệt"]');
 modeInput.closest('.ant-select').querySelector('.ant-select-selector').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));
 await until(()=>[...document.querySelectorAll('.ant-select-item-option')].filter(visible).length===4);
 const modeOptions=[...document.querySelectorAll('.ant-select-item-option')].filter(visible);
 for(const explanation of ['không đánh giá','ghi nhận kết quả','như nhắc nhở','Buổi học dùng thiết lập']) {
   if(!modeOptions.some(option=>option.textContent.includes(explanation)))throw Error('Each moderation option must explain its effect before selection: '+explanation);
 }
 modeOptions.find(option=>option.textContent.includes('Tắt kiểm duyệt JEV')).click();await pause(50);
 if(!modal().querySelector('[data-testid="jev-mode-help"]').textContent.includes('không tự cho phép học sinh đó chat lại'))throw Error('Off mode must explain existing restrictions');
 await choose('Cách kiểm duyệt','Áp dụng quy tắc xử lý vi phạm');
 if(!modal().querySelector('[data-testid="jev-mode-help"]').textContent.includes('Biện pháp cụ thể phụ thuộc quy tắc'))throw Error('Enforce example must explain conditional configured actions');
 await choose('Cách kiểm duyệt','Dùng thiết lập chung');
 if(!modal().querySelector('[data-testid="jev-mode-help"]').textContent.includes('Khi thiết lập chung thay đổi'))throw Error('Inheritance must explain future changes');
 await choose('Cách kiểm duyệt','Chỉ theo dõi, chưa xử lý vi phạm');
 if(!modal().querySelector('[data-testid="jev-mode-help"]').textContent.includes('JEV chưa áp dụng biện pháp xử lý'))throw Error('Observation example must explain no JEV enforcement');
 await until(()=>modal()?.querySelector('[aria-label="Bộ cấu hình kiểm duyệt"]'));
 await choose('Bộ cấu hình kiểm duyệt','kiem-duyet-lop-hoc · Phiên bản 1');
 button(document,'Lưu và đồng bộ').click();
 await until(()=>window.jevCalls.filter(call=>call.path==='/bindings'&&call.method==='PUT').length===2);
 const savedByName=window.jevCalls.filter(call=>call.path==='/bindings'&&call.method==='PUT').at(-1).body;
 if(savedByName.mode!=='shadow'||savedByName.policyVersionId!==5||savedByName.scopeKey!=='102')throw Error('Named policy selection must preserve numeric API identity and the chosen schedule');
 await until(()=>!modal());
 const configuredRow=[...document.querySelectorAll('tr.ant-table-row, .responsive-table-card')].find(row=>row.textContent.includes('qa-program'));
 if(!configuredRow?.textContent.includes('kiem-duyet-lop-hoc')||!configuredRow.textContent.includes('Phiên bản 1'))throw Error('Binding list must show the applied policy name and version');
 button(configuredRow,'Chi tiết').click();
 await until(()=>modal()?.textContent.includes('Lần cập nhật thiết lập'));
 if(!modal().textContent.includes('kiem-duyet-lop-hoc · Phiên bản 1')||!modal().textContent.includes('Thiết lập riêng của buổi học'))throw Error('Details must show the applied policy and source');
 button(document,'Đóng').click();await until(()=>!modal());
 const bindingHeader=document.querySelector('[data-testid="jev-bindings-header"]');
 if(bindingHeader.scrollWidth>bindingHeader.clientWidth+1)throw Error('Binding header must fit the viewport');
 if(bindingHeader.querySelector('h4').getBoundingClientRect().width<100)throw Error('Binding title must remain visible');
 if(${process.env.QA_BINDING_LAYOUT === '1' ? 'true' : 'false'}) {
   document.getElementById('qa-result').textContent=JSON.stringify({ok:true,viewport:window.innerWidth,checks:['Vietnamese scope labels','inherited source and configured result','published policy selected by name','numeric binding contract preserved','applied policy name and version visible','responsive title and actions','actions share one row','details modal shows inherited and explicit configuration','each moderation choice explains its effect','selected choice shows a concrete example']});return;
 }
 tab(document,'Trạng thái đồng bộ').click();await until(()=>document.body.textContent.includes('Dịch vụ kiểm duyệt đã phản hồi'));
 button(document,'Chi tiết kỹ thuật').click();await until(()=>document.body.textContent.includes('test-hash'));
 button(document,'Đóng').click();await until(()=>!modal());
 button(document,'Thử đồng bộ lại').click();await until(()=>document.body.textContent.includes('Chưa xác nhận yêu cầu đồng bộ'));
 document.getElementById('qa-result').textContent=JSON.stringify({ok:true,viewport:window.innerWidth,checks:['readable policy overview','structured group edit preserves identities and syncs framework','filtered rule edit preserves source index','unrelated templates unchanged','template form preserves guidance','preview converts percentages and numeric counters to Live contract','preview clears stale result and resets inputs','publish requires validation','matrix edit and CAS save','invalid JSON blocks save','plain language runtime guidance','program and schedule picker resolves actual calendar ID','changing program clears stale calendar','existing schedule label restored','reload retry and pending sync']});
})().catch(e=>document.getElementById('qa-result').textContent=JSON.stringify({ok:false,error:e.message,body:document.body.innerText.slice(-3500),closes:[...document.querySelectorAll('.ant-drawer-close')].map(el=>({visible:visible(el),parent:el.closest('.ant-drawer')?.className}))}));
`;
(async()=>{
const result=await esbuild.build({stdin:{contents:fixture,resolveDir:root,loader:'tsx'},bundle:true,write:false,outdir:taskDir,platform:'browser',format:'iife',jsx:'automatic',tsconfig:root+'/tsconfig.json',define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'qa',setup(build){
build.onResolve({filter:/^@\//},args=>mocks[args.path]?{path:args.path,namespace:'qa'}:{path:root+'/'+args.path.slice(2)+(fs.existsSync(root+'/'+args.path.slice(2)+'.tsx')?'.tsx':'.ts')});
build.onLoad({filter:/.*/,namespace:'qa'},args=>({contents:mocks[args.path],loader:'js'}));
}}]});
fs.writeFileSync(path.join(taskDir,'qa.html'),'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+result.outputFiles.filter(file=>file.path.endsWith('.css')).map(file=>file.text).join('\n')+'</style><style>body{background:#f5f6f8;color:#1f1f1f}#root{padding:16px;min-width:0;background:#fff;min-height:100vh}#qa-result{display:none}</style><div id="root"></div><pre id="qa-result">RUNNING</pre><script>'+result.outputFiles.find(file=>file.path.endsWith('.js')).text.replaceAll('</script','<\\/script')+'</script>');
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
