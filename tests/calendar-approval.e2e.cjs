// Browser verification using real React/Ant Design; mock APIs, no LMS writes.
const {spawn}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const esbuild=require(path.resolve(root,'../lms-manage-api/node_modules/esbuild'));
const taskDir=fs.mkdtempSync(path.join(os.tmpdir(),'lms-calendar-approval-'));
const mocks={
 '@/services/livestreamService':`export const getProgramLessonsForScheduling=async()=>({data:[{id:'484',lesson_name:'Ôn tập giữa kì I (P2)'}]});`,
 '@/components/shared/TeachingStaffSelect':`import React from 'react';export default function Staff(props){return React.createElement('input',{value:Array.isArray(props.value)?props.value.join(','):props.value||'',onChange:e=>props.onChange?.(props.mode==='multiple'?e.target.value.split(','):e.target.value)});}`,
 '@/services/userService':`export const createUser=async()=>({});export const updateUser=async(id,p)=>{window.qaCalls.push({action:'user-update',id,...p});return {data:{id}};};`,
 'next/navigation':`const params=new URLSearchParams(); export const useSearchParams=()=>params;export const useRouter=()=>({replace:()=>{}});`,
 'socket.io-client':`export const io=()=>{const h=new Map();const s={fire:k=>h.get(k)?.(),on:(k,f)=>{h.set(k,f);return s;},connect:()=>h.get('connect')?.(),removeAllListeners:()=>{},disconnect:()=>{}};window.qaSocket=s;return s;};`,
 '@/stores/authStore':`const state={user:{userId:1,permissions:['*']},accessToken:'qa',authSessionVersion:1,hasPermission:()=>true,can:()=>true};export const useAuthStore=fn=>fn?fn(state):state;useAuthStore.getState=()=>state;useAuthStore.subscribe=()=>()=>{};`,
 '@/stores/roleStore':`import {create} from 'zustand';const store=create(set=>({modal:{open:false,title:'Cập nhật vai trò',type:'UPDATE',role:{id:2,name:'BTV',code:'btv',permissions:[],approvalPolicy:{calendar:{create:'REQUIRE',update:'REQUIRE'}}}},resetModal:()=>set(s=>({modal:{...s.modal,open:false}})),setShouldReload:()=>{}}));window.qaRoleStore=store;export default store;`,
 '@/services/roleService':`export const getRoles=async()=>[{id:2,name:'BTV',code:'btv'}];export const getModules=async()=>[{code:'calendar',name:'Lịch học'}];export const getModuleFields=async()=>({code:'calendar',name:'Lịch học',fields:[{fieldCode:'lesson_name',fieldLabel:'Tên bài'}]});export const getRoleFieldPolicy=async()=>({});export const updateRoleFieldPolicy=async(id,policy)=>{window.qaCalls.push({action:'field-policy',policy});return {};};export const getPermissionsStructure=async()=>({calendar:{Calendar:{actions:['Xem yêu cầu duyệt lịch','Duyệt','Thêm mới','Xem lịch sử duyệt lịch','Cập nhật','Từ chối duyệt lịch','Gửi duyệt lịch','Cấu hình duyệt lịch'],keys:['calendar.approval.view','calendar.approve','calendar.create','calendar.history.view','calendar.update','calendar.reject','calendar.submit_approval','calendar.workflow.manage']}}});export const createRole=async p=>{window.qaCalls.push({action:'role-policy',...p});};export const updateRole=async(id,p)=>{window.qaCalls.push({action:'role-policy',...p});};export const getProgramResources=async()=>[];`,
 '@/services/approvalPolicyService':`import {getApprovalAccount,saveApprovalAccount} from '@/services/calendarApprovalService';export const getApprovalPolicyModules=async()=>({data:window.qaModules});export const getUserApprovalPolicy=getApprovalAccount;export const saveUserApprovalPolicy=saveApprovalAccount;`,
 '@/services/calendarApprovalService':`
 window.qaModules=[{key:'calendar',label:'Quản lý lịch học',managePermission:'calendar.workflow.manage',defaultPolicy:'REQUIRE',actions:[{key:'create',label:'Tạo lịch'},{key:'update',label:'Sửa lịch'},{key:'delete',label:'Xóa lịch'},{key:'cancel',label:'Nghỉ học'},{key:'reschedule',label:'Dời lịch / học bù'},{key:'swap',label:'Hoán đổi lịch'},{key:'restore',label:'Khôi phục lịch'},{key:'mapping',label:'Liên kết dữ liệu Học Mãi'},{key:'import',label:'Nhập file lịch'}]}];
 window.qaCalls=[];window.qaUnread=true;window.qaPolicy={user_id:2,username:'editor',name:'Người nhập lịch',can_approve:false,required_operations:['create'],version:1,approval_roles:[],program_scope:{mode:'ALL',programs:[]},policy_modules:window.qaModules,module_overrides:{calendar:{}},module_inherited_policy:{calendar:{create:'REQUIRE',update:'REQUIRE',delete:'REQUIRE'}},overrides:{},inherited_policy:{create:'REQUIRE',update:'REQUIRE',delete:'REQUIRE'},roles:[{id:'2',name:'BTV',approval_policy:{create:'REQUIRE',update:'REQUIRE',delete:'REQUIRE'}}]};
 const r={id:'10',status:'PENDING',operation:'update',creator_name:'Người nhập lịch',created_by:2,reason:'Đổi giờ theo lịch mới',revision:1,lock_version:2,program_codes:['qa-math'],submitted_at:'2026-11-26T02:00:00Z',created_at:'2026-11-26T01:00:00Z',before_data:[{id:7,subject:'Toán',lesson_name:'Phân số',teacher:'Giáo viên A'}],proposed_data:[{id:7,subject:'Toán',lesson_name:'Phân số',teacher:'Giáo viên B'}],capabilities:{approve:true,reject:true,edit:false,submit:false,cancel:false}};
 r.changes=[{before:r.before_data[0],after:r.proposed_data[0],fields:['teacher']}];
 window.qaRemoteDecision=status=>{r.status=status;r.revision++;r.lock_version++;r.capabilities={approve:true,reject:true};r.decided_by=status==='PENDING'?null:3;r.decider_name=status==='PENDING'?null:'Người duyệt khác';r.decided_at=status==='PENDING'?null:'2026-11-26T08:35:00Z';r.cancelled_at=status==='CANCELLED'?'2026-11-26T08:40:00Z':null;r.decision_reason=status==='REJECTED'?'Cần đối chiếu lại lịch':null;};
 export class CalendarApprovalCancelledError extends Error{constructor(){super('Đã hủy gửi yêu cầu duyệt.');this.name='CalendarApprovalCancelledError';}}export const isCalendarApprovalCancelled=e=>e?.name==='CalendarApprovalCancelledError';
 export const approvalApi='https://qa.test/api/calendar-change-requests';
 export const operationLabels={create:'Tạo lịch',update:'Sửa lịch',delete:'Xóa lịch',cancel:'Nghỉ học'};export const statusLabels={DRAFT:'Bản nháp',PENDING:'Chờ duyệt',APPROVED:'Đã duyệt',REJECTED:'Đã từ chối',CANCELLED:'Đã hủy',CONFLICTED:'Cần đối chiếu lại',DIRECT_APPLIED:'Đã áp dụng trực tiếp'};
 export function calendarRequestTitle(operation,title){if(title)return title;const label=operationLabels[operation];return label?'Yêu cầu '+label.toLocaleLowerCase('vi-VN'):'Yêu cầu lịch học';}
 export const statusColors={PENDING:'gold',APPROVED:'green',REJECTED:'red',CANCELLED:'default',CONFLICTED:'orange',DIRECT_APPLIED:'blue'};export const statusBadgeLabels={...statusLabels,DIRECT_APPLIED:'Đã áp dụng'};
 export const getApprovalCapabilities=async()=>({data:{can_review:true,can_manage:true,can_submit:true}});
 window.qaRequestQueries=[];export const getCalendarRequests=async query=>{window.qaRequestQueries.push(query);const rows=!query.status||query.status===r.status?[structuredClone(r)]:[];return {data:{rows,total:rows.length}};};
 window.qaDetailError=false;export const getCalendarRequest=async()=>{if(window.qaDetailError)throw Error('Yêu cầu đang được thu hồi để chỉnh sửa. Phiên bản cũ không còn chờ duyệt.');return {data:structuredClone(r)};};
 window.qaHistory=[];window.qaSetRequest=data=>{Object.assign(r,data);r.lock_version++;};export const getCalendarRequestHistory=async()=>({data:structuredClone(window.qaHistory)});
 export const transitionCalendarRequest=async(record,action,reason,title)=>{window.qaCalls.push({action,reason,title});if(action==='withdraw'){r.status='DRAFT';r.revision++;r.lock_version++;r.capabilities={edit:true,submit:true};r.submitted_at=null;return {data:structuredClone(r)};}if(action==='submit'){r.title=title;r.status='PENDING';r.lock_version++;r.capabilities={withdraw:true,cancel:true};return {data:structuredClone(r)};}r.status=action==='approve'?'APPROVED':'REJECTED';r.capabilities={};r.decided_by=1;r.decider_name='Người duyệt hiện tại';r.decided_at='2026-11-26T08:30:00Z';return {data:structuredClone(r)};};
 window.qaPrepareWithdrawal=()=>{r.created_by=1;r.editable_action='create';r.status='PENDING';r.proposed_data=r.changes.map(c=>({...c.after,session_id:'484'}));r.capabilities={withdraw:true,cancel:true};r.lock_version++;r.decided_by=null;r.decider_name=null;r.decided_at=null;};export const editCalendarRequest=async(record,input)=>{window.qaCalls.push({action:'edit',...input});r.reason=input.reason;r.lock_version++;if(input.edit_patch){r.proposed_data[0]={...r.proposed_data[0],...input.edit_patch};r.changes=[{before:null,after:r.proposed_data[0],fields:[]}];}return {data:structuredClone(r)};};export const createCalendarRequest=async()=>({data:r});
 window.qaOtherNotification=false;export const getApprovalNotifications=async(unread)=>({data:{rows:unread&&!window.qaUnread?[]:window.qaOtherNotification?[{id:'other',event_type:'system.info',created_at:new Date().toISOString(),read_at:null}]:[{id:'1',request_id:'10',event_type:'request.submitted',status:r.status,operation:'update',creator_name:'Người nhập lịch',read_at:window.qaUnread?null:'2026-11-26',created_at:new Date(Date.now()-120000).toISOString()}],unread:window.qaUnread?1:0,through_id:'1'}});
 export const readApprovalRequestNotifications=async()=>{window.qaUnread=false;};
 export const readApprovalNotification=async()=>{window.qaUnread=false;window.qaCalls.push({action:'read'});};
 export const readAllApprovalNotifications=async()=>{window.qaUnread=false;window.qaCalls.push({action:'read-all'});};
 export const getApprovalAccounts=async()=>({data:[window.qaPolicy]});export const getApprovalAccount=async()=>({data:window.qaPolicy});
 export const saveApprovalAccount=async(id,p)=>{window.qaCalls.push({action:'configure',...p});window.qaPolicy={...window.qaPolicy,...p,version:p.version+1};return {data:window.qaPolicy};};
 export const refreshApprovalViews=()=>window.dispatchEvent(new Event('lms:calendar-workflow-change'));
 export const isApprovalResponse=r=>!!r?.data?.approval_required;export const calendarResultMessage=(r,f)=>f;
 `,
};
const fixture=`
import '@ant-design/v5-patch-for-react-19';import React from 'react';import {createRoot} from 'react-dom/client';
import Page from './app/(admin)/schedule/approvals/page';
import Bell from './components/calendar-approvals/CalendarNotificationBell';
import RoleModal from './app/(admin)/member-roles/components/RoleModal';
import UserModal from './app/(admin)/users/components/UserModal';
import useUserStore from './stores/userStore';window.qaUserStore=useUserStore;
window.qaErrors=[];window.addEventListener('error',e=>window.qaErrors.push(e.error?.stack||e.message));window.addEventListener('unhandledrejection',e=>window.qaErrors.push(String(e.reason)));const original=console.error;console.error=(...a)=>{if(String(a[0]).includes('[rc-collapse]')&&String(a[0]).includes('will be removed in next major version'))return;if(String(a[0]).includes('[antd: Tabs]')&&String(a[0]).includes('deprecated'))return;window.qaErrors.push(a.map(String).join(' '));original(...a);};
createRoot(document.getElementById('root')).render(<><Bell/><Page/><RoleModal/><UserModal/></>);
const pause=ms=>new Promise(r=>setTimeout(r,ms));const until=async fn=>{for(let i=0;i<150;i++){if(fn())return;await pause(40);}throw Error('Timed out: '+fn);};
const button=text=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes(text));
const choose=async(aria,title)=>{
 await until(()=>document.querySelector('[aria-label="'+aria+'"]'));
 const row=document.querySelector('[aria-label="'+aria+'"]');
 const value={'Không cần duyệt':'SKIP','Bắt buộc duyệt':'REQUIRE','Kế thừa từ vai trò':'INHERIT'}[title];
 const input=[...row.querySelectorAll('input[type="radio"]')].find(input=>input.getAttribute('aria-label').includes('— '+title+' ('));
 if(!input)throw Error('Missing policy radio '+aria+' '+title);await until(()=>!input.disabled);
 input.click();await pause(80);
 if(!input.checked)throw Error('Radio did not select '+value);
 if(row.querySelectorAll('input[type="radio"]:checked').length!==1)throw Error('Policy row must have exactly one selected radio');
};
(async()=>{
 await until(()=>document.querySelector('tr[data-row-key="10"]'));
 if(document.querySelector('main .ant-select-selection-placeholder')?.textContent==='Tất cả trạng thái')throw Error('Old status selector must be removed');
 const statusHeader=[...document.querySelectorAll('main thead th')].find(th=>th.textContent.includes('Trạng thái'));
 statusHeader.querySelector('.ant-table-filter-trigger').click();
 await until(()=>document.querySelector('.ant-table-filter-dropdown'));
 [...document.querySelectorAll('.ant-table-filter-dropdown .ant-dropdown-menu-item')].find(item=>item.textContent==='Chờ duyệt').click();
 [...document.querySelectorAll('.ant-table-filter-dropdown button')].find(item=>item.textContent==='Áp dụng').click();
 await until(()=>window.qaRequestQueries.at(-1)?.status==='PENDING');
 if(window.qaRequestQueries.at(-1).page!==1)throw Error('Status filter must reset server pagination');
 await until(()=>!document.querySelector('.ant-dropdown:not(.ant-dropdown-hidden) .ant-table-filter-dropdown'));
 statusHeader.querySelector('.ant-table-filter-trigger').click();
 await until(()=>document.querySelector('.ant-table-filter-dropdown'));
 [...document.querySelectorAll('.ant-table-filter-dropdown button')].find(item=>item.textContent==='Xóa lọc').click();
 const applyFilter=[...document.querySelectorAll('.ant-table-filter-dropdown button')].find(item=>item.textContent==='Áp dụng');if(applyFilter)applyFilter.click();
 await until(()=>!statusHeader.querySelector('.ant-table-filter-trigger.active'));
 button('Làm mới').click();
 await until(()=>!window.qaRequestQueries.at(-1)?.status);

 document.querySelector('button[aria-label="Thông báo lịch học"]').click();
 await until(()=>button('Đánh dấu tất cả đã đọc'));
 const statusPanel=document.querySelector('section[aria-label="Thông báo lịch học"]');
 for(const [status,label,color] of [['PENDING','Chờ duyệt','gold'],['APPROVED','Đã duyệt','green'],['REJECTED','Đã từ chối','red'],['CANCELLED','Đã hủy','default'],['DIRECT_APPLIED','Đã áp dụng','blue']]){
  window.qaRemoteDecision(status);window.qaSocket.fire('calendar-workflow:changed');
  await until(()=>statusPanel.querySelector('.ant-tag')?.textContent===label);
  if(!statusPanel.textContent.includes('Yêu cầu sửa lịch'))throw Error('Stable request title changed with business status');
  if(!statusPanel.querySelector('.ant-tag').classList.contains('ant-tag-'+color))throw Error('Wrong status badge color: '+status);
  if(!statusPanel.textContent.includes('Thông báo (1)'))throw Error('Business status changed unread count');
 }
 window.qaOtherNotification=true;window.qaSocket.fire('calendar-workflow:changed');
 await until(()=>statusPanel.textContent.includes('Cập nhật lịch'));
 if(statusPanel.querySelector('.ant-tag'))throw Error('Unrelated notification received an approval badge');
 window.qaOtherNotification=false;window.qaRemoteDecision('PENDING');window.qaSocket.fire('calendar-workflow:changed');
 await until(()=>statusPanel.querySelector('.ant-tag')?.textContent==='Chờ duyệt');
 const notificationRow=statusPanel.querySelector('.ant-list-item button');
 if(notificationRow.scrollWidth>notificationRow.clientWidth+1)throw Error('Status badge overflows notification row');

 button('Đánh dấu tất cả đã đọc').click();
 await until(()=>window.qaCalls.some(c=>c.action==='read-all'));
 await until(()=>document.querySelector('section[aria-label="Thông báo lịch học"] .ant-typography')?.textContent.trim()==='Thông báo');
 const panel=document.querySelector('section[aria-label="Thông báo lịch học"]');
 if(!panel.textContent.includes('Yêu cầu sửa lịch'))throw Error('Read-all removed notification');
 if(panel.getBoundingClientRect().width>window.innerWidth)throw Error('Popup overflows viewport');
 panel.querySelector('button[role="switch"]').click();
 await until(()=>panel.textContent.includes('Không có thông báo chưa đọc'));
 panel.querySelector('button[role="switch"]').click();
 await until(()=>[...panel.querySelectorAll('button')].some(b=>b.textContent.includes('Yêu cầu sửa lịch')));
 [...panel.querySelectorAll('button')].find(b=>b.textContent.includes('Yêu cầu sửa lịch')).click();
 await until(()=>document.querySelector('.ant-drawer-open')?.textContent.includes('Giáo viên B'));
 if(!document.querySelector('.ant-drawer-open .ant-drawer-header')?.textContent.includes('Yêu cầu sửa lịch'))throw Error('Drawer title must match update notification');
 if(!document.querySelector('.ant-drawer-open')?.textContent.includes('Giáo viên A'))throw Error('Missing before/after');
 const drawer=document.querySelector('.ant-drawer-open .ant-drawer-content-wrapper');if(drawer.getBoundingClientRect().width>window.innerWidth+1)throw Error('Drawer overflows viewport');
 if(button('Đánh dấu đã đọc'))throw Error('Per-row read action must not exist');
 button('Từ chối').click();await until(()=>document.querySelector('.ant-modal textarea'));
 const rejectModal=document.querySelector('.ant-modal textarea').closest('.ant-modal');
 if(!rejectModal.querySelector('.ant-modal-footer .ant-btn-primary').disabled)throw Error('Reject must require a reason');
 rejectModal.querySelector('.ant-modal-close').click();await until(()=>!document.querySelector('.ant-modal textarea')?.closest('.ant-modal-wrap')||document.querySelector('.ant-modal textarea')?.closest('.ant-modal-wrap')?.style.display==='none');
 button('Duyệt và áp dụng').click();
 await until(()=>document.querySelector('.ant-modal-confirm .ant-btn-primary'));
 document.querySelector('.ant-modal-confirm .ant-btn-primary').click();
 await until(()=>window.qaCalls.some(c=>c.action==='approve'));
 await until(()=>document.querySelector('.ant-drawer-open')?.textContent.includes('Đã duyệt'));
 if(!document.querySelector('.ant-drawer-open').textContent.includes('Người duyệt hiện tại'))throw Error('Missing approval reviewer');
 if(document.querySelector('.ant-drawer-open .ant-drawer-footer').textContent.includes('Từ chối'))throw Error('Approved request still offers rejection');
 window.qaRemoteDecision('PENDING');window.qaSocket.fire('calendar-workflow:changed');
 await until(()=>[...document.querySelectorAll('.ant-drawer-open button')].some(b=>b.textContent.includes('Duyệt và áp dụng')&&!b.disabled));
 button('Duyệt và áp dụng').click();await until(()=>document.querySelector('.ant-modal-confirm'));
 window.qaRemoteDecision('REJECTED');window.qaSocket.fire('calendar-workflow:changed');
 await until(()=>document.querySelector('.ant-drawer-open')?.textContent.includes('Người từ chối'));
 if(!document.querySelector('.ant-drawer-open').textContent.includes('Người duyệt khác'))throw Error('Missing rejecting reviewer');
 if(!document.querySelector('.ant-drawer-open').textContent.includes('15:35:00'))throw Error('Decision timestamp must use Vietnam time');
 await until(()=>!document.querySelector('.ant-modal-confirm'));
 if(/Duyệt và áp dụng|Từ chối/.test(document.querySelector('.ant-drawer-open .ant-drawer-footer').textContent))throw Error('Terminal request exposes stale decision actions');
 window.qaRemoteDecision('PENDING');window.qaSocket.fire('calendar-workflow:changed');
 await until(()=>[...document.querySelectorAll('.ant-drawer-open button')].some(b=>b.textContent.includes('Duyệt và áp dụng')&&!b.disabled));
 button('Duyệt và áp dụng').click();await until(()=>document.querySelector('.ant-modal-confirm'));
 window.qaDetailError=true;window.qaSocket.fire('calendar-workflow:changed');
 await until(()=>document.querySelector('.ant-drawer-open')?.textContent.includes('Phiên bản cũ không còn chờ duyệt'));
 await until(()=>!document.querySelector('.ant-modal-confirm'));
 if(/Duyệt và áp dụng|Từ chối/.test(document.querySelector('.ant-drawer-open .ant-drawer-footer').textContent))throw Error('Withdrawn request keeps reviewer actions');
 window.qaDetailError=false;window.qaRemoteDecision('REJECTED');window.qaSocket.fire('calendar-workflow:changed');
 await until(()=>document.querySelector('.ant-drawer-open')?.textContent.includes('Người từ chối'));
 window.qaHistory=[{id:3,action:'request.rejected',actor_name:'Người duyệt khác',created_at:'2026-11-26T08:35:00Z',reason:'Cần đối chiếu lại lịch'},{id:1,action:'request.created',actor_name:'Người nhập lịch',created_at:'2026-11-26T01:00:00Z',reason:'Đề xuất create lịch học'},{id:2,action:'request.submitted',actor_name:'Người nhập lịch',created_at:'2026-11-26T02:00:00Z'}];
 window.qaSetRequest({operation:'create',program_codes:['nguvan-8'],reason:'Đề xuất create lịch học',before_data:[],changes:[{before:null,after:{subject:'Ngữ văn 8',code:'nguvan-8',learn_number:31,lesson_name:'Ôn tập giữa kì I (P2)',start_time:'2026-11-26T15:35:00Z',end_time:'2026-11-26T20:35:00Z',teacher:'Cô An',assistant_teacher:'',lesson_status:0,package_lesson_mappings:[]},fields:[]}]});window.qaSocket.fire('calendar-workflow:changed');
 await until(()=>document.querySelector('.ant-drawer-open article')?.textContent.includes('Ôn tập giữa kì I (P2)'));
 const detail=document.querySelector('.ant-drawer-open');
 if(!detail.querySelector('.ant-drawer-header')?.textContent.includes('Yêu cầu tạo lịch'))throw Error('Drawer title must match create notification');
 if(!detail.textContent.includes('15:35 – 20:35')||!detail.textContent.includes('Học bình thường'))throw Error('Missing readable calendar time/status');
 if(detail.querySelector('article').textContent.includes('Liên kết dữ liệu Học Mãi')||detail.textContent.includes('Đề xuất create'))throw Error('Raw database content in request detail');
 detail.querySelector('.ant-collapse-header').click();
 await until(()=>detail.querySelectorAll('.ant-timeline-item').length===3);
 const events=[...detail.querySelectorAll('.ant-timeline-item')];
 if(!events[0].textContent.includes('Tạo yêu cầu')||!events[2].textContent.includes('Từ chối yêu cầu'))throw Error('History must be translated and chronological');
 if(/request[.](created|submitted|rejected)/.test(detail.textContent))throw Error('Raw audit action displayed');
 if(detail.scrollWidth>detail.clientWidth+1)throw Error('Request content overflows');
 for(const [state,label] of [['DRAFT','Bản nháp'],['CANCELLED','Đã hủy'],['CONFLICTED','Cần đối chiếu lại'],['DIRECT_APPLIED','Đã áp dụng trực tiếp'],['PENDING','Chờ duyệt'],['APPROVED','Đã duyệt'],['REJECTED','Đã từ chối']]){
  window.qaRemoteDecision(state);window.qaSocket.fire('calendar-workflow:changed');
  await until(()=>document.querySelector('.ant-drawer-open .ant-drawer-header .ant-tag')?.textContent===label);
  if(state!=='PENDING'&&/Duyệt và áp dụng|Từ chối/.test(document.querySelector('.ant-drawer-open .ant-drawer-footer').textContent))throw Error('Unexpected decision action in '+state);
 }

 document.querySelector('.ant-drawer-open .ant-drawer-close').click();
 await until(()=>!document.querySelector('.ant-drawer-open'));
 for(const [state,time] of [['PENDING',null],['APPROVED','15:35:00'],['REJECTED','15:35:00'],['CANCELLED','15:40:00']]){
  window.qaRemoteDecision(state);window.qaSocket.fire('calendar-workflow:changed');
  await until(()=>document.querySelector('main tr[data-row-key="10"]')?.textContent.includes(time||'Chờ duyệt'));
  const headings=[...document.querySelectorAll('main thead th')];
  const column=headings.findIndex(th=>th.textContent==='Thời điểm xử lý');
  if(column<0)throw Error('Missing processing time column');
  const cell=document.querySelector('main tr[data-row-key="10"]').querySelectorAll('td')[column];
  if(time?!cell.textContent.includes(time):cell.textContent!=='—')throw Error('Wrong processing time for '+state);
 }
 window.qaRemoteDecision('REJECTED');window.qaSocket.fire('calendar-workflow:changed');
 await until(()=>document.querySelector('main tr[data-row-key="10"]')?.textContent.includes('15:35:00'));
 if([...document.querySelectorAll('main [role="tab"]')].some(t=>t.textContent==='Cấu hình tài khoản'))throw Error('Account settings tab must be absent from approval page');
 if([...document.querySelectorAll('main thead th')].some(th=>th.textContent==='Người gửi'))throw Error('My requests must not repeat sender column');
 if(![...document.querySelectorAll('main thead th')].some(th=>th.textContent==='Người duyệt')||!document.querySelector('main tr[data-row-key="10"]')?.textContent.includes('Người duyệt khác'))throw Error('My requests must show the decision reviewer');
 [...document.querySelectorAll('main [role="tab"]')].find(t=>t.textContent==='Yêu cầu phê duyệt').click();
 await until(()=>[...document.querySelectorAll('main thead th')].some(th=>th.textContent==='Người gửi'));
 if(![...document.querySelectorAll('main thead th')].some(th=>th.textContent==='Người duyệt')||!document.querySelector('main tr[data-row-key="10"]')?.textContent.includes('Người duyệt khác'))throw Error('Review requests must keep both sender and decision reviewer');
 if(![...document.querySelectorAll('main thead th')].some(th=>th.textContent==='Thời điểm xử lý'))throw Error('Review requests must show processing time');
 [...document.querySelectorAll('main [role="tab"]')].find(t=>t.textContent==='Yêu cầu của tôi').click();
 await until(()=>![...document.querySelectorAll('main thead th')].some(th=>th.textContent==='Người gửi'));
 window.qaPrepareWithdrawal();window.qaSocket.fire('calendar-workflow:changed');
 document.querySelector('main tr[data-row-key="10"]').click();
 await until(()=>button('Thu hồi để chỉnh sửa')&&!button('Thu hồi để chỉnh sửa').disabled);
 button('Thu hồi để chỉnh sửa').click();await until(()=>document.querySelector('.ant-modal-confirm'));
 if(window.qaCalls.some(c=>c.action==='withdraw'))throw Error('Withdrawal must wait for confirmation');
 document.querySelector('.ant-modal-confirm .ant-btn-primary').click();
 await until(()=>document.querySelector('.ant-modal input[readonly]')?.value==='Ôn tập giữa kì I (P2)');
 if(document.querySelector('.ant-modal input[id="lesson_name"]'))throw Error('Outline name must not be editable');
 await until(()=>!document.querySelector('.ant-modal input[aria-label="Tiền tố tên hiển thị"]').disabled);
 if(!document.querySelector('.ant-modal input[aria-label="Hậu tố tên hiển thị"]'))throw Error('Affix fields must always be visible');
 const prefixInput=document.querySelector('.ant-modal input[aria-label="Tiền tố tên hiển thị"]');
 const editBody=prefixInput.closest('.ant-modal-body');
 if(editBody.scrollWidth>editBody.clientWidth+1)throw Error('Proposal modal has horizontal overflow');
 if(editBody.closest('.ant-modal').getBoundingClientRect().width>window.innerWidth)throw Error('Proposal modal overflows viewport');
 Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(prefixInput,'[Lịch {n}] - ');prefixInput.dispatchEvent(new Event('input',{bubbles:true}));
 const suffixInput=document.querySelector('.ant-modal input[aria-label="Hậu tố tên hiển thị"]');
 Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(suffixInput,' (học bù)');suffixInput.dispatchEvent(new Event('input',{bubbles:true}));
 await until(()=>prefixInput.closest('.ant-modal').textContent.includes('[Lịch 1] - Ôn tập giữa kì I (P2) (học bù)'));
 button('Lưu bản nháp').click();
 try{await until(()=>window.qaCalls.some(c=>c.action==='edit'&&c.edit_patch?.lesson_name==='[Lịch 1] - Ôn tập giữa kì I (P2) (học bù)'));}catch(e){throw Error('Name save calls='+JSON.stringify(window.qaCalls)+' modal='+prefixInput.closest('.ant-modal')?.textContent);}
 await until(()=>document.querySelector('.ant-modal input[readonly]')?.closest('.ant-modal-wrap')?.style.display==='none');
 if(!document.querySelector('.ant-drawer-open .ant-drawer-header').textContent.includes('Bản nháp'))throw Error('Withdraw must return to draft');
 await until(()=>button('Chỉnh sửa đề xuất')&&!button('Chỉnh sửa đề xuất').disabled);button('Chỉnh sửa đề xuất').click();
 await until(()=>[...document.querySelectorAll('.ant-modal input[readonly]')].some(input=>input.closest('.ant-modal-wrap').style.display!=='none'&&input.value==='Ôn tập giữa kì I (P2)'));
 const editCount=window.qaCalls.filter(c=>c.action==='edit').length;
 button('Lưu bản nháp').click();await until(()=>window.qaCalls.filter(c=>c.action==='edit').length>editCount);
 if(Object.hasOwn(window.qaCalls.filter(c=>c.action==='edit').at(-1).edit_patch,'lesson_name'))throw Error('Unchanged display name must not be overwritten');
 await until(()=>[...document.querySelectorAll('.ant-modal input[readonly]')].every(input=>input.closest('.ant-modal-wrap').style.display==='none'));

 button('Gửi duyệt').click();await until(()=>document.querySelector('.ant-modal-confirm textarea'));
 [...document.querySelectorAll('.ant-modal-confirm button')].find(b=>b.textContent==='Đóng').click();await until(()=>!document.querySelector('.ant-modal-confirm'));
 if(window.qaCalls.some(c=>c.action==='submit'))throw Error('Cancel reason popup must not submit');
 await until(()=>!button('Gửi duyệt').disabled);button('Gửi duyệt').click();await until(()=>document.querySelector('.ant-modal-confirm textarea'));
 if(window.qaCalls.some(c=>c.action==='submit'))throw Error('Submit must wait for approval reason confirmation');
 const titleField=document.querySelector('.ant-modal-confirm input');
 if(titleField.value!=='Yêu cầu tạo lịch')throw Error('Missing operation title default');
 Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(titleField,'   ');titleField.dispatchEvent(new Event('input',{bubbles:true}));
 await until(()=>document.querySelector('.ant-modal-confirm .ant-btn-primary').disabled);
 Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(titleField,'Bổ sung buổi ôn tập');titleField.dispatchEvent(new Event('input',{bubbles:true}));
 const reasonField=document.querySelector('.ant-modal-confirm textarea');
 Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(reasonField,'   ');reasonField.dispatchEvent(new Event('input',{bubbles:true}));
 await until(()=>document.querySelector('.ant-modal-confirm .ant-btn-primary').disabled);
 Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(reasonField,'Điều chỉnh thời gian theo kế hoạch mới');reasonField.dispatchEvent(new Event('input',{bubbles:true}));
 await until(()=>!document.querySelector('.ant-modal-confirm .ant-btn-primary').disabled);
 document.querySelector('.ant-modal-confirm .ant-btn-primary').click();await until(()=>window.qaCalls.some(c=>c.action==='submit'));
 if(window.qaCalls.find(c=>c.action==='submit').reason!=='Điều chỉnh thời gian theo kế hoạch mới')throw Error('Entered submission reason was not sent');
 await until(()=>document.querySelector('.ant-drawer-open .ant-drawer-header').textContent.includes('Chờ duyệt'));
 if(window.qaCalls.find(c=>c.action==='submit').title!=='Bổ sung buổi ôn tập')throw Error('Custom title not submitted');
 if(!document.querySelector('.ant-drawer-open .ant-drawer-header').textContent.includes('Bổ sung buổi ôn tập'))throw Error('Custom title not displayed');
 if(!document.querySelector('.ant-drawer-open').textContent.includes('[Lịch 1] - Ôn tập giữa kì I (P2) (học bù)'))throw Error('Resubmitted request loses revised content');
 document.querySelector('.ant-drawer-open .ant-drawer-close').click();await until(()=>!document.querySelector('.ant-drawer-open'));
 window.qaRoleStore.setState(s=>({modal:{...s.modal,open:true}}));
 await until(()=>[...document.querySelectorAll('.ant-modal [role="tab"]')].some(t=>t.textContent==='Phê duyệt'));
 const expand=document.querySelector('.ant-modal [aria-label="caret-right"]');if(expand)expand.click();
 await until(()=>[...document.querySelectorAll('.ant-modal .ant-checkbox-group')].some(group=>group.textContent.includes('Xem yêu cầu duyệt lịch')));
 const permissionGroup=[...document.querySelectorAll('.ant-modal .ant-checkbox-group')].find(group=>group.textContent.includes('Xem yêu cầu duyệt lịch'));
 const permissionSections=[...permissionGroup.children];
 const approvalSection=permissionSections.find(section=>section.textContent.includes('Gửi duyệt lịch'));
 const approvalLabels=[...approvalSection.querySelectorAll('.ant-checkbox-wrapper')].map(node=>node.textContent);
 if(approvalLabels.join('|')!=='Xem yêu cầu duyệt lịch|Gửi duyệt lịch|Duyệt|Từ chối duyệt lịch|Xem lịch sử duyệt lịch|Cấu hình duyệt lịch')throw Error('Approval permissions must be grouped in workflow order');
 if(!permissionSections.some(section=>section.textContent.includes('Thêm mới')&&!section.textContent.includes('Gửi duyệt lịch')))throw Error('Functional permissions must remain separate');
 for(const label of ['Thêm mới','Xem lịch sử duyệt lịch']){[...permissionGroup.querySelectorAll('.ant-checkbox-wrapper')].find(node=>node.textContent===label).querySelector('input').click();await pause(80);}
 [...document.querySelectorAll('.ant-modal [role="tab"]')].find(t=>t.textContent.includes('Quyền dữ liệu')).click();
 await until(()=>document.querySelector('input[aria-label="Chọn tất cả quyền xem"]'));
 const allView=document.querySelector('input[aria-label="Chọn tất cả quyền xem"]'),allEdit=document.querySelector('input[aria-label="Chọn tất cả quyền sửa"]');
 if(allView.closest('thead')||allEdit.closest('thead'))throw Error('Field bulk controls must not be in the header');
 if(!document.querySelector('.ant-modal.admin-responsive-modal').textContent.includes('Chọn tất cả'))throw Error('Missing field select-all body row');
 allView.click();await pause(80);allEdit.click();await pause(80);
 if(!allView.checked||!allEdit.checked)throw Error('Field bulk edit must also select view');
 allView.click();await pause(80);if(allEdit.checked)throw Error('Clearing all view must also clear edit');
 [...document.querySelectorAll('.ant-modal [role="tab"]')].find(t=>t.textContent==='Phê duyệt').click();
 if(document.querySelectorAll('.ant-modal [role="tab"]').length!==3)throw Error('Approval must use one shared tab');
 if(document.querySelector('[aria-label="Chính sách mặc định theo vai trò"]')?.textContent.includes('Quản lý câu hỏi'))throw Error('Unsupported module must be hidden');
 await choose('Quản lý lịch học / Sửa lịch — chính sách vai trò','Không cần duyệt');
 const allRequire=document.querySelector('input[aria-label="Quản lý lịch học — Tất cả Bắt buộc duyệt (vai trò)"]');
 if(allRequire.closest('thead')||!allRequire.closest('tr')?.textContent.includes('Chọn tất cả'))throw Error('Role bulk controls must occupy a separate body row');
 if(allRequire.closest('table').querySelector('thead input'))throw Error('Policy header must contain column titles only');
 if(allRequire.checked)throw Error('Mixed action policies must clear bulk radio state');
 allRequire.click();await pause(80);if(!allRequire.checked)throw Error('Role bulk radio not selected');
 const roleEditor=document.querySelector('[aria-label="Chính sách mặc định theo vai trò"]');
 if([...roleEditor.querySelectorAll('tr[role="radiogroup"]')].some(row=>![...row.querySelectorAll('input')].find(input=>input.getAttribute('aria-label').includes('— Bắt buộc duyệt ('))?.checked))throw Error('Role bulk radio did not update every action');
 await choose('Quản lý lịch học / Sửa lịch — chính sách vai trò','Không cần duyệt');
 document.querySelector('.ant-modal.admin-responsive-modal .ant-modal-footer .ant-btn-primary').click();
 try {await until(()=>window.qaCalls.some(c=>c.action==='role-policy'&&c.approvalPolicy?.calendar?.update==='SKIP'));}catch(e){throw Error('Role save calls='+JSON.stringify(window.qaCalls)+' validation='+[...document.querySelectorAll('.ant-form-item-explain-error')].map(x=>x.textContent).join('|'));}
 const savedPermissions=window.qaCalls.find(c=>c.action==='role-policy').permissions.map(permission=>permission.code).sort();
 if(savedPermissions.join('|')!=='calendar.create|calendar.history.view')throw Error('Permission grouping must preserve API keys and selections: '+savedPermissions.join('|'));
 window.qaUserStore.getState().setModal({open:true,type:'UPDATE',user:{id:2,username:'editor',name:'Người nhập lịch',email:'editor@example.com',roles:[{id:2}],programScope:{mode:'ALL',programs:[]}}});
 await until(()=>[...document.querySelectorAll('.ant-modal')].some(m=>m.textContent.includes('Cập nhật người dùng')));
 const userDialog=()=>[...document.querySelectorAll('.ant-modal')].find(m=>m.textContent.includes('Cập nhật người dùng'));
 await until(()=>userDialog().querySelector('[aria-label="Chính sách riêng theo tài khoản"] input'));
 if(userDialog().textContent.includes('Lưu cấu hình duyệt'))throw Error('Account dialog must have only one Save action');
 const userPolicyRow=userDialog().querySelector('tr[aria-label="Quản lý lịch học / Tạo lịch — chính sách tài khoản"]');
 userPolicyRow.querySelector('input[aria-label*="— Không cần duyệt ("]').click();await pause(80);
 userDialog().querySelector('.ant-modal-footer .ant-btn-primary').click();
 await until(()=>window.qaCalls.some(c=>c.action==='user-update'));
 const accountSave=window.qaCalls.find(c=>c.action==='user-update');
 if(accountSave.approvalPolicy?.module_overrides.calendar.create!=='SKIP'||accountSave.name!=='Người nhập lịch'||accountSave.roleIds[0]!==2)throw Error('Footer Save must include account and pending policy');
 await until(()=>!window.qaUserStore.getState().modal.open);
 if(window.qaErrors.length)throw Error('Browser errors: '+window.qaErrors.join(' | '));
 document.getElementById('qa-result').textContent=JSON.stringify({ok:true,viewport:window.innerWidth,checks:['submission reason popup rejects blank input, cancels without sending and passes edited reason on resubmit','owner confirms withdrawal, edits draft and resubmits; remote withdrawal closes reviewer confirmation and actions','status header filter submits backend query, resets pagination, clears filter and replaces toolbar select','notification badges follow current request status for original submitted events, preserve unread and wrap on mobile; unrelated notifications have no badge','readable create schedule, Vietnam wall-clock preserved, empty mapping hidden, localized chronological timeline, responsive detail cards','open drawer refreshes by socket and closes stale confirmation; terminal actions hidden; reviewer and Vietnam decision time visible','one footer Save includes account and pending approval policy','shared popup and request drawer','bulk read persists without deleting rows','unread filter empty after receipt','old/new comparison','reject reason mandatory','approve confirmation and state refresh','approval page omits account settings and shows sender only in review tab','module-grouped policy in a single Approval tab','exclusive row radios and module-wide all controls','select-all body rows and title-only headers','field bulk view/edit behavior preserved','approval permissions grouped in workflow order','unsupported modules hidden','User operation override and Role policy saved through existing forms','responsive layout','no console errors']});
})().catch(e=>document.getElementById('qa-result').textContent=JSON.stringify({ok:false,error:e.stack||e.message}));
`;
(async()=>{
 const result=await esbuild.build({stdin:{contents:fixture,resolveDir:root,loader:'tsx'},bundle:true,write:false,outfile:path.join(taskDir,'qa.js'),platform:'browser',format:'iife',jsx:'automatic',tsconfig:root+'/tsconfig.json',define:{'process.env.NODE_ENV':'"development"','process.env':'{}'},plugins:[{name:'mocks',setup(build){
  build.onResolve({filter:/^@\/|^socket\.io-client$|^next\/navigation$/},args=>mocks[args.path]?{path:args.path,namespace:'qa'}:{path:root+'/'+args.path.slice(2)+(fs.existsSync(root+'/'+args.path.slice(2))?(fs.statSync(root+'/'+args.path.slice(2)).isDirectory()?'/index.tsx':''):fs.existsSync(root+'/'+args.path.slice(2)+'.tsx')?'.tsx':'.ts')});
  build.onLoad({filter:/.*/,namespace:'qa'},args=>({contents:mocks[args.path],loader:'js',resolveDir:root}));
 }}]});
 fs.writeFileSync(path.join(taskDir,'qa.html'),'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px}#root{padding:16px}'+(result.outputFiles.find(f=>f.path.endsWith('.css'))?.text||'')+'</style><div id="root"></div><pre id="qa-result">RUNNING</pre><script>'+result.outputFiles.find(f=>f.path.endsWith('.js')).text.replaceAll('"/hocmai-logo.png"',JSON.stringify('file://'+path.join(root,'public/hocmai-logo.png'))).replaceAll('</script','<\\/script')+'</script>');
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
 if(value && value!=='RUNNING') {const report=JSON.parse(value);process.stdout.write(JSON.stringify(report,null,2)+'\n');if(!report.ok){process.exitCode=1;const match=/qa.html:(\d+)/.exec(report.error||'');if(match)process.stderr.write('Failed fixture line: '+fs.readFileSync(path.join(taskDir,'qa.html'),'utf8').split('\n')[Number(match[1])-1]+'\n');}if(process.env.QA_SCREENSHOT){await call('Runtime.evaluate',{expression:"document.querySelectorAll('.ant-message').forEach(el=>el.style.display='none')"},sessionId);await call('Runtime.evaluate',{expression:process.env.QA_SCREENSHOT_VIEW==='request'?"(async()=>{document.querySelector('button[aria-label=\"Thông báo lịch học\"]').click();await new Promise(r=>setTimeout(r,300));document.querySelector('[role=\"dialog\"]');[...document.querySelectorAll('.ant-popover button, .ant-popover a, .ant-popover [role=button]')].find(b=>b.textContent.includes('Sửa lịch')||b.textContent.includes('Tạo lịch'))?.click();document.querySelector('tr[data-row-key=\"10\"]')?.click();})()":"(async()=>{window.qaRoleStore.setState(s=>({modal:{...s.modal,open:true}}));await new Promise(r=>setTimeout(r,300));[...document.querySelectorAll('.ant-modal [role=tab]')].find(t=>t.textContent==='Phê duyệt').click();})()",awaitPromise:true},sessionId);await call('Runtime.evaluate',{expression:'new Promise(resolve=>setTimeout(resolve,400))',awaitPromise:true},sessionId);const shot=await call('Page.captureScreenshot',{format:'png'},sessionId);fs.writeFileSync(process.env.QA_SCREENSHOT,Buffer.from(shot.data,'base64'));}return;}
}
throw Error('Test result not produced');
})().catch(e=>{process.stderr.write(String(e)+'\n');process.exitCode=1}).finally(async()=>{clearTimeout(timer);await call('Browser.close').catch(()=>{});child.kill();fs.rmSync(taskDir,{recursive:true,force:true})});


})().catch(error=>{fs.rmSync(taskDir,{recursive:true,force:true});process.stderr.write(String(error)+'\n');process.exitCode=1;});
