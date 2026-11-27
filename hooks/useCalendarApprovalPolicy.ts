'use client';
import useSWR from 'swr';
import {useAuthStore} from '@/stores/authStore';
import {getApprovalCapabilities} from '@/services/calendarApprovalService';
export function useCalendarApprovalPolicy(){
 const id=useAuthStore(s=>s.user.userId),session=useAuthStore(s=>s.authSessionVersion);
 const result=useSWR(id>0?['calendar-approval-capabilities',id,session]:null,getApprovalCapabilities,{refreshInterval:30_000,keepPreviousData:false});
 return {required_operations:[] as string[],can_submit:false,...result.data?.data};
}
