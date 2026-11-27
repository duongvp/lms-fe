'use client';
import {useEffect,useState} from 'react';
import {Alert,Avatar,Badge,Button,Empty,List,Popover,Space,Spin,Switch,Typography,message} from 'antd';
import {BellOutlined} from '@ant-design/icons';
import Link from 'next/link';
import useSWR,{useSWRConfig} from 'swr';
import {useAuthStore} from '@/stores/authStore';
import {useCalendarWorkflowSocket} from '@/hooks/useCalendarWorkflowSocket';
import {getApprovalNotifications,operationLabels,calendarRequestTitle,readAllApprovalNotifications,readApprovalNotification} from '@/services/calendarApprovalService';
import CalendarRequestStatus from './CalendarRequestStatus';
import CalendarRequestDrawer from './CalendarRequestDrawer';
const eventLabels:Record<string,string>={'calendar.changed':'Lịch học đã thay đổi','request.withdrawn':'Yêu cầu đã được thu hồi để chỉnh sửa','request.submitted':'Yêu cầu chờ duyệt','request.resubmitted':'Yêu cầu gửi lại','request.approved':'Yêu cầu đã được duyệt','request.rejected':'Yêu cầu bị từ chối','request.cancelled':'Yêu cầu đã hủy','request.conflicted':'Yêu cầu cần đối chiếu'};
export default function CalendarNotificationBell(){
 const [open,setOpen]=useState(false),[unread,setUnread]=useState(false),[busy,setBusy]=useState(false),[request,setRequest]=useState<string|null>(null),[toast,holder]=message.useMessage();
 const user=useAuthStore(s=>s.user),session=useAuthStore(s=>s.authSessionVersion),has=useAuthStore(s=>s.hasPermission);
 const workflow=has('calendar.view');const {mutate}=useSWRConfig();
 useCalendarWorkflowSocket(workflow);
 const {data,error,isLoading,mutate:reload}=useSWR(workflow&&user.userId>0?['calendar-approval-notifications',user.userId,session,unread]:null,()=>getApprovalNotifications(unread),{refreshInterval:30_000,keepPreviousData:false});
 useEffect(()=>{setOpen(false);setUnread(false);setRequest(null);},[user.userId,session,workflow]);
 const refresh=()=>mutate(k=>Array.isArray(k)&&['calendar-approvals','calendar-approval-notifications'].includes(k[0])&&k[1]===user.userId&&k[2]===session);
 async function readAll(){if(!data?.data?.through_id||data.data.through_id==='0')return;setBusy(true);try{await readAllApprovalNotifications(data.data.through_id);await refresh();}catch(e:any){toast.error(e.message);void reload();}finally{setBusy(false);}}
 async function openRequest(row:any){setOpen(false);setRequest(String(row.request_id));if(!row.read_at)try{await readApprovalNotification(String(row.id));await refresh();}catch(e:any){toast.error('Chưa đánh dấu đã đọc: '+e.message);void reload();}}
 if(!workflow)return null;
 const rows=data?.data?.rows||[],total=(data?.data?.unread||0);
 const panel=<section style={{width:'min(420px,calc(100vw - 32px))'}} aria-label="Thông báo lịch học"><Space style={{display:'flex',justifyContent:'space-between',padding:'16px 18px 8px'}} align="center"><Typography.Text strong>Thông báo {total > 0 ? `(${total})` : ''}</Typography.Text>{data?.data?.unread>0&&<Button size="small" type="link" loading={busy} onClick={()=>void readAll()}>Đánh dấu tất cả đã đọc</Button>}</Space><Space style={{padding:'0 18px 12px',display:'flex',justifyContent:'space-between'}}><Typography.Text type="secondary">Lịch học trên LMS</Typography.Text><Space size={6}>Chưa đọc<Switch size="small" checked={unread} onChange={setUnread}/></Space></Space>
 <div style={{maxHeight:480,overflowY:'auto'}}>{error?<Alert type="error" message="Chưa tải được thông báo" action={<Button onClick={()=>void reload()}>Thử lại</Button>}/>:isLoading?<div style={{padding:30,textAlign:'center'}}><Spin/></div>:<List dataSource={rows} locale={{emptyText:<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={unread?'Không có thông báo chưa đọc':'Chưa có thông báo'}/>}} renderItem={(row:any)=><List.Item style={{padding:0,background:row.read_at?'#fff':'#f0f6ff'}}><button type="button" style={rowButton} onClick={()=>void openRequest(row)}><Avatar src="/hocmai-logo.png" size={32}/><div style={{flex:1,minWidth:0,textAlign:'left'}}><div style={{display:'flex',alignItems:'baseline',flexWrap:'wrap',gap:'4px 8px'}}><span style={{fontWeight:row.read_at?500:600,color:'#202939',overflowWrap:'anywhere'}}>{notificationTitle(row)}</span>{row.request_id&&row.status&&<CalendarRequestStatus status={row.status} compact/>}</div>{(operationLabels[row.operation]||row.creator_name)&&<div style={{marginTop:4,color:'#364152'}}>{[operationLabels[row.operation],row.creator_name].filter(Boolean).join(' · ')}</div>}<time style={{display:'block',fontSize:12,color:'#697586',marginTop:6}} title={row.created_at}>{relative(row.created_at)}</time></div>{!row.read_at&&<span style={{width:6,height:6,borderRadius:'50%',background:'#1677ff',marginTop:7,flexShrink:0}}/>}</button></List.Item>}/>}</div><div style={{padding:12,borderTop:'1px solid #edf0f3',textAlign:'center'}}><Link href={has('calendar.approval.view')?'/schedule/approvals?tab=review':'/schedule/approvals?tab=mine'} onClick={()=>setOpen(false)}>Xem tất cả thông báo</Link></div></section>;
 return <>{holder}<Popover trigger="click" placement="bottomRight" open={open} onOpenChange={setOpen} content={panel} styles={{body:{padding:0,overflow:'hidden'}}}><Button type="text" aria-label="Thông báo lịch học"><Badge count={total} size="small"><BellOutlined/></Badge></Button></Popover><CalendarRequestDrawer id={request} onClose={()=>setRequest(null)}/></>;
}
const rowButton:React.CSSProperties={display:'flex',alignItems:'flex-start',gap:12,padding:'16px 18px',width:'100%',border:0,background:'transparent',cursor:'pointer',font:'inherit',lineHeight:1.5};
function relative(value:string){const seconds=Math.max(0,(Date.now()-new Date(value).getTime())/1000);return seconds<60?'Vừa xong':seconds<3600?`${Math.floor(seconds/60)} phút trước`:seconds<86400?`${Math.floor(seconds/3600)} giờ trước`:new Date(value).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'});}

function notificationTitle(row:any){return row.request_id&&row.event_type?.startsWith('request.')?calendarRequestTitle(row.operation,row.title):eventLabels[row.event_type]||'Cập nhật lịch';}
