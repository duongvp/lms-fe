'use client';
import {Tag} from 'antd';
import {statusBadgeLabels,statusColors,statusLabels} from '@/services/calendarApprovalService';

export default function CalendarRequestStatus({status,compact=false}:{status:string;compact?:boolean}) {
 const label=(compact?statusBadgeLabels:statusLabels)[status];
 // An absent/unknown status is not evidence that a notification is awaiting approval.
 if(!label)return null;
 return <Tag color={statusColors[status]} style={{marginInlineEnd:0,fontSize:12,lineHeight:'18px',fontWeight:500,flexShrink:0}}>{label}</Tag>;
}
