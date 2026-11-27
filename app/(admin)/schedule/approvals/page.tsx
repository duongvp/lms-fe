'use client';
import {useEffect,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import useSWR from 'swr';
import {Alert,Button,Empty,Space,Table,Tabs,Tag,Typography} from 'antd';
import {useAuthStore} from '@/stores/authStore';
import {getApprovalCapabilities,getCalendarRequests,operationLabels,statusLabels,type CalendarRequest} from '@/services/calendarApprovalService';
import CalendarRequestDrawer from '@/components/calendar-approvals/CalendarRequestDrawer';
import {eventTime} from '@/components/calendar-approvals/RequestDetailContent';

export default function Page(){
 const user=useAuthStore(s=>s.user),session=useAuthStore(s=>s.authSessionVersion);
 const search=useSearchParams();
 // Legacy links to the removed settings tab open the user's requests.
 const [tab,setTab]=useState(search.get('tab')==='review'?'review':'mine');
 const [status,setStatus]=useState<string|undefined>(),[page,setPage]=useState(1);
 const [detail,setDetail]=useState<string|null>(search.get('request'));
 const {data:cap}=useSWR(user.userId>0?['calendar-approval-capabilities',user.userId,session]:null,getApprovalCapabilities,{refreshInterval:30_000,keepPreviousData:false});
 const {data,error,isLoading,mutate}=useSWR(user.userId>0?['calendar-approvals',user.userId,session,tab,status,page]:null,()=>getCalendarRequests({mine:tab==='mine',status,page,limit:20}),{keepPreviousData:false,refreshInterval:30_000});
 useEffect(()=>{if(cap?.data&&tab==='review'&&!cap.data.can_review)setTab('mine');},[cap,tab]);
 useEffect(()=>{setPage(1);},[tab,status]);
 useEffect(()=>{setDetail(null);},[user.userId,session]);
 useEffect(()=>{setDetail(search.get('request'));},[search]);
 const tabs=[{key:'mine',label:'Yêu cầu của tôi'},...(cap?.data?.can_review?[{key:'review',label:'Yêu cầu phê duyệt'}]:[])];
 return <main style={{padding:20}}>
  <Space direction="vertical" size={18} style={{width:'100%'}}>
   <Space style={{width:'100%',justifyContent:'space-between'}} wrap>
    <div><Typography.Title level={3} style={{margin:'0 0 4px'}}>Phê duyệt lịch học</Typography.Title><Typography.Text type="secondary">Kiểm tra đề xuất trước khi áp dụng vào lịch chính thức.</Typography.Text></div>
   </Space>
   <Tabs activeKey={tab} onChange={setTab} items={tabs} tabBarExtraContent={<Button onClick={()=>void mutate()}>Làm mới</Button>}/>
   {error?<Alert type="error" message={error.message}/>:<Table<CalendarRequest>
    size="small" rowKey="id" loading={isLoading} dataSource={data?.data?.rows||[]}
    locale={{emptyText:<Empty description="Chưa có yêu cầu"/>,filterConfirm:'Áp dụng',filterReset:'Xóa lọc',filterTitle:'Lọc trạng thái'}}
    onChange={(_,filters,__,extra)=>{if(extra.action==='filter'){setStatus(filters.status?.[0] as string|undefined);setPage(1);}}}
    pagination={{size:'small',style:{margin:'12px 0'},current:page,total:data?.data?.total||0,pageSize:20,onChange:setPage,showSizeChanger:false}}
    scroll={{x:tab==='review'?1050:900}}
    onRow={r=>({onClick:()=>setDetail(r.id),tabIndex:0,onKeyDown:e=>{if(e.key==='Enter')setDetail(r.id);},style:{cursor:'pointer'}})}
    columns={[
     {title:'Nội dung',render:(_,r)=><Space direction="vertical" size={0} style={{lineHeight:1.45}}><Typography.Text strong>{r.title||operationLabels[r.operation]}</Typography.Text><Typography.Text>{r.proposed_data?.[0]?.lesson_name||r.before_data?.[0]?.lesson_name||r.program_codes.join(', ')}</Typography.Text><Typography.Text type="secondary">{r.program_codes.join(', ')}</Typography.Text></Space>},
     ...(tab==='review'?[{title:'Người gửi',dataIndex:'creator_name'}]:[]),
     {title:'Người duyệt',render:(_,r)=>['APPROVED','REJECTED'].includes(r.status)?r.decider_name||'—':'—'},
     {title:'Gửi lúc',render:(_,r)=>eventTime(r.submitted_at||r.created_at)},
     {title:'Thời điểm xử lý',render:(_,r)=>{const time=r.status==='CANCELLED'?r.cancelled_at:['APPROVED','REJECTED'].includes(r.status)?r.decided_at:null;return time?eventTime(time):'—';}},
     {title:'Trạng thái',key:'status',dataIndex:'status',filters:Object.entries(statusLabels).map(([value,text])=>({value,text})),filterMultiple:false,filteredValue:status?[status]:null,render:(_,r)=><Tag color={r.status==='PENDING'?'gold':r.status==='APPROVED'?'green':r.status==='REJECTED'?'red':undefined}>{statusLabels[r.status]}</Tag>},
    ]}
   />}
  </Space>
  <CalendarRequestDrawer id={detail} onClose={()=>setDetail(null)}/>
 </main>;
}
