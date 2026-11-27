import type {ApprovalModule,ModulePolicyMap} from './approvalPolicyService';
import { fetchInstance } from '@/ultils/fetchInstance';
export {CalendarApprovalCancelledError,isCalendarApprovalCancelled} from '@/helper/calendarApprovalCancellation';
export const approvalApi = `${process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5000'}/api/calendar-change-requests`;
export const operationLabels:Record<string,string>={create:'Tạo lịch',update:'Sửa lịch',delete:'Xóa lịch',cancel:'Nghỉ học',reschedule:'Dời lịch / học bù',swap:'Hoán đổi lịch',restore:'Khôi phục lịch',mapping:'Liên kết dữ liệu Học Mãi',import:'Nhập file lịch'};
export function calendarRequestTitle(operation?:string,title?:string|null){if(title?.trim())return title.trim();const label=operation&&operationLabels[operation];return label?`Yêu cầu ${label.toLocaleLowerCase('vi-VN')}`:'Yêu cầu lịch học';}
export const statusLabels:Record<string,string>={DRAFT:'Bản nháp',PENDING:'Chờ duyệt',APPROVED:'Đã duyệt',REJECTED:'Đã từ chối',CANCELLED:'Đã hủy',CONFLICTED:'Cần đối chiếu lại',DIRECT_APPLIED:'Đã áp dụng trực tiếp'};
export const statusColors:Record<string,string>={PENDING:'gold',APPROVED:'green',REJECTED:'red',CANCELLED:'default',CONFLICTED:'orange',DIRECT_APPLIED:'blue'};
export const statusBadgeLabels:Record<string,string>={...statusLabels,DIRECT_APPLIED:'Đã áp dụng'};
export type PolicyValue = 'REQUIRE' | 'SKIP' | 'INHERIT';
export type PolicyMap = Record<string,PolicyValue>;
export interface ApprovalAccount {policy_modules?:ApprovalModule[];module_overrides?:ModulePolicyMap;module_inherited_policy?:ModulePolicyMap;module_effective_policy?:ModulePolicyMap;approval_roles?:Array<{id:string;name:string}>;program_scope?:{mode:"ALL"|"RESTRICTED"|"DENY";programs:string[]};program_names?:Array<{code:string;name:string}>;overrides?:PolicyMap;inherited_policy?:PolicyMap;effective_policy?:PolicyMap;role_policy_hash?:string;roles?:Array<{id:string;name:string;approval_policy:ModulePolicyMap}>;user_id:number;can_approve:boolean;required_operations:string[];version:number;username?:string;name?:string}
export interface CalendarRequest {id:string;title?:string|null;status:string;base_changed?:boolean;editable_action?:string;operation:string;creator_name:string;created_by:number;reason:string;decision_reason?:string;decided_by?:number;decider_name?:string|null;decided_at?:string;cancelled_at?:string|null;revision:number;lock_version:number;program_codes:string[];submitted_at?:string;created_at:string;before_data:any[];proposed_data:any[];capabilities:{withdraw?:boolean;approve:boolean;reject:boolean;edit:boolean;submit:boolean;cancel:boolean};changes:Array<{before:any;after:any;fields:string[]}>}
export const getApprovalCapabilities=()=>fetchInstance(`${approvalApi}/capabilities`);
export const getApprovalAccount=(id:number)=>fetchInstance(`${approvalApi}/accounts/${id}`);
export const getApprovalAccounts=(q='')=>fetchInstance(`${approvalApi}/accounts?q=${encodeURIComponent(q)}`);
export const saveApprovalAccount=(id:number,input:ApprovalAccount)=>fetchInstance(`${approvalApi}/accounts/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
export const getCalendarRequests=(query:Record<string,any>)=>fetchInstance(`${approvalApi}?${new URLSearchParams(Object.entries(query).filter(([,v])=>v!==undefined&&v!==null).map(([k,v])=>[k,String(v)]))}`);
export const getCalendarRequest=(id:string)=>fetchInstance(`${approvalApi}/${id}`);
export const getCalendarRequestHistory=(id:string)=>fetchInstance(`${approvalApi}/${id}/history`);
export const transitionCalendarRequest=(record:CalendarRequest,action:string,reason?:string,title?:string)=>fetchInstance(`${approvalApi}/${record.id}/${action}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:record.revision,lock_version:record.lock_version,reason,title})},'json',180_000);
export const editCalendarRequest=(record:CalendarRequest,input:any)=>fetchInstance(`${approvalApi}/${record.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({lock_version:record.lock_version,...input})});
export const createCalendarRequest=(command:any,reason:string,submit:boolean,title?:string)=>fetchInstance(approvalApi,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':crypto.randomUUID()},body:JSON.stringify({command,reason,submit,title})},'json',180_000);
export const getApprovalNotifications=(unread=false)=>fetchInstance(`${approvalApi}/notifications?unread=${unread}`);
export const readApprovalRequestNotifications=(id:string)=>fetchInstance(`${approvalApi}/${id}/read`,{method:'PATCH'});
export const readApprovalNotification=(id:string)=>fetchInstance(`${approvalApi}/notifications/${id}/read`,{method:'PATCH'});
export const readAllApprovalNotifications=(through_id:string)=>fetchInstance(`${approvalApi}/notifications/read-all`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({through_id})});
export const isApprovalResponse=(response:any)=>response?.data?.approval_required===true;
export const calendarResultMessage=(response:any,fallback:string)=>isApprovalResponse(response)?'Đã gửi yêu cầu duyệt. Lịch chính thức chưa thay đổi.':fallback;
export function refreshApprovalViews(){window.dispatchEvent(new Event('lms:calendar-workflow-change'));}
