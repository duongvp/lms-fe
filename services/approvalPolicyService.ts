import {fetchInstance} from '@/ultils/fetchInstance';
export type PolicyValue='REQUIRE'|'SKIP'|'INHERIT';
export type ActionPolicyMap=Record<string,PolicyValue>;
export type ModulePolicyMap=Record<string,ActionPolicyMap>;
export interface ApprovalModule {key:string;label:string;managePermission:string;defaultPolicy:'REQUIRE'|'SKIP';actions:Array<{key:string;label:string}>}
const base=`${process.env.NEXT_PUBLIC_BACKEND_API_URL||'http://localhost:5000'}/api/approval-policies`;
export const getApprovalPolicyModules=()=>fetchInstance(`${base}/modules`);
export const getUserApprovalPolicy=(id:number)=>fetchInstance(`${base}/accounts/${id}`);
export const saveUserApprovalPolicy=(id:number,input:unknown)=>fetchInstance(`${base}/accounts/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
