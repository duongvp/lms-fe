'use client';

import {useState} from 'react';
import useSWR from 'swr';
import {Alert,Button,Collapse,Empty,Spin,Tag,Timeline} from 'antd';
import {CalendarOutlined,CheckCircleOutlined,ClockCircleOutlined,CloseCircleOutlined,UserOutlined,FileTextOutlined,BookOutlined,LinkOutlined,HomeOutlined,InfoCircleOutlined,HistoryOutlined,CommentOutlined} from '@ant-design/icons';
import {getCalendarRequestHistory,operationLabels,statusLabels,type CalendarRequest} from '@/services/calendarApprovalService';
import styles from './RequestDetailContent.module.css';

const fieldLabels:Record<string,string>={subject:'Môn học',code:'Chương trình',learn_number:'Bài / buổi số',lesson_name:'Tên buổi học',start_time:'Bắt đầu',end_time:'Kết thúc',teacher:'Giáo viên',assistant_teacher:'Trợ giảng',channel_name:'Phòng học',lesson_status:'Trạng thái buổi học',lesson_document:'Tài liệu',lesson_baitap:'Bài tập',package_lesson_mappings:'Liên kết dữ liệu Học Mãi',cancel_reason:'Lý do nghỉ'};
const labelIcons:Record<string,React.ReactNode>={
 'Người gửi':<UserOutlined/>, 'Người duyệt':<UserOutlined/>, 'Người từ chối':<UserOutlined/>,
 'Thời điểm gửi':<ClockCircleOutlined/>, 'Duyệt lúc':<ClockCircleOutlined/>, 'Từ chối lúc':<ClockCircleOutlined/>,
 'Lý do đề xuất':<CommentOutlined/>, 'Ghi chú xử lý':<CommentOutlined/>, 'Lý do từ chối':<CommentOutlined/>, 'Lý do nghỉ':<CommentOutlined/>,
 'Môn học':<BookOutlined/>, 'Chương trình':<BookOutlined/>, 'Bài / buổi số':<BookOutlined/>, 'Tên buổi học':<BookOutlined/>,
 'Ngày học':<CalendarOutlined/>, 'Bắt đầu':<ClockCircleOutlined/>, 'Kết thúc':<ClockCircleOutlined/>,
 'Giáo viên':<UserOutlined/>, 'Trợ giảng':<UserOutlined/>, 'Phòng học':<HomeOutlined/>,
 'Trạng thái buổi học':<InfoCircleOutlined/>, 'Tài liệu':<FileTextOutlined/>, 'Bài tập':<FileTextOutlined/>,
 'Liên kết dữ liệu Học Mãi':<LinkOutlined/>, 'Liên kết':<LinkOutlined/>,
};
const auditLabels:Record<string,string>={'request.withdrawn':'Thu hồi để chỉnh sửa','request.created':'Tạo yêu cầu','request.submitted':'Gửi yêu cầu duyệt','request.resubmitted':'Gửi lại yêu cầu duyệt','request.approved':'Phê duyệt yêu cầu','request.rejected':'Từ chối yêu cầu','request.edited':'Chỉnh sửa đề xuất','request.cancelled':'Hủy yêu cầu','request.conflicted':'Phát hiện dữ liệu thay đổi','calendar.applied':'Áp dụng lịch chính thức'};
export {default as RequestStatus} from './CalendarRequestStatus';
function readableReason(reason:string){return reason.replace(/^Đề xuất (\w+) lịch học$/,(_,action)=>operationLabels[action]?`Đề xuất ${operationLabels[action].toLocaleLowerCase('vi-VN')}`:reason);}
export function eventTime(input?:string){if(!input)return '—';const date=new Date(input);return Number.isNaN(date.getTime())?'—':new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(date);}
// Calendar values already represent Vietnam wall-clock time; do not shift them as UTC events.
function scheduleTime(input:any){const m=String(input||'').match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}:\d{2})/);return m?{date:`${m[3]}/${m[2]}/${m[1]}`,time:m[4]}:null;}
function Field({label,icon,children}:{label:string;icon?:React.ReactNode;children:React.ReactNode}){return <div className={styles.field}><span className={styles.label}>{icon||labelIcons[label]||<InfoCircleOutlined/>}{label}</span><div className={styles.value}>{children}</div></div>;}
function DisplayValue({name,value}:{name:string;value:any}){
 if(value===undefined||value===null||value==='')return <>—</>;
 if(name==='lesson_status')return <>{Number(value)===1?'Nghỉ học':Number(value)===0?'Học bình thường':'Trạng thái khác'}</>;
 if(name==='start_time'||name==='end_time'){const time=scheduleTime(value);return <>{time?`${time.time} · ${time.date}`:String(value)}</>;}
 if(name==='package_lesson_mappings')return <Mappings value={value}/>;
 if(Array.isArray(value))return <div className={styles.stack}>{value.length?value.map((v,i)=><div key={i}><DisplayValue name={name} value={v}/></div>):'Không có dữ liệu'}</div>;
 if(typeof value==='object'){
  const links=Object.entries(value).filter(([k])=>['url','link','name','title'].includes(k));
  return <Collapse ghost size="small" items={[{key:'details',label:'Xem thông tin bổ sung',children:<div className={styles.stack}>{(links.length?links:Object.entries(value)).map(([k,v])=><Field key={k} label={fieldLabels[k]||({url:'Liên kết',link:'Liên kết',name:'Tên',title:'Tiêu đề'} as Record<string,string>)[k]||k}><DisplayValue name={k} value={v}/></Field>)}</div>}]} />;
 }
 const text=String(value);
 if(/^[\[{]/.test(text.trim())){try{return <DisplayValue name={name} value={JSON.parse(text)}/>;}catch{/* Plain text entered by the user. */}}
 if(/^https?:\/\/\S+$/i.test(text))return <a href={text} target="_blank" rel="noopener noreferrer">Mở liên kết</a>;
 return <>{text}</>;
}
function Mappings({value}:{value:any}){
 const rows=Array.isArray(value)?value:[];
 if(!rows.length)return <>Không có liên kết</>;
 return <Collapse ghost size="small" items={[{key:'mappings',label:`${rows.length} liên kết Học Mãi`,children:<div className={styles.stack}>{rows.map((m,i)=><div key={i} className={styles.mapping}><span>Gói học: {m.package_name||m.package_id||'—'}</span><span>Khóa học: {m.course_name||m.course_id||'—'}</span><span>Bài học: {Array.isArray(m.lesson_ids)?m.lesson_ids.join(', ')||'—':m.lesson_id||'—'}</span></div>)}</div>}]} />;
}
function ScheduleCard({item,index}:{item:CalendarRequest['changes'][number];index:number}){
 const data=item.after||item.before||{},single=!item.before||!item.after;
 const start=scheduleTime(data.start_time),end=scheduleTime(data.end_time);
 const fields=item.fields.filter(name=>fieldLabels[name]);
 const extras=['channel_name','lesson_status','cancel_reason','lesson_document','lesson_baitap','package_lesson_mappings'].filter(name=>data[name]!==undefined&&data[name]!==null&&data[name]!==''&&(!Array.isArray(data[name])||data[name].length>0));
 return <article className={styles.schedule} aria-label={`Lịch đề xuất ${index+1}`}>
  <div className={styles.scheduleHeading}><div><h3>{data.lesson_name||`Buổi học ${index+1}`}</h3><div className={styles.meta}>{[data.subject,data.code,data.learn_number!==undefined?`Bài ${data.learn_number}`:null].filter(Boolean).join(' · ')}</div></div>{single&&<Tag>{item.after?'Thêm lịch':'Xóa lịch'}</Tag>}</div>
  {single?<>
   <div className={styles.scheduleGrid}>
    {(data.start_time!==undefined||data.end_time!==undefined)&&<div className={styles.scheduleGroup}><div><Field label="Ngày học" icon={<CalendarOutlined/>}>{start?.date||end?.date||'—'}</Field><div className={styles.time}>{start?.time||'—'} – {end?.time||'—'}{start&&end&&start.date!==end.date&&<span className={styles.meta}> · Kết thúc {end.date}</span>}</div></div></div>}
    {(data.teacher!==undefined||data.assistant_teacher!==undefined)&&<div className={styles.scheduleGroup}><div className={styles.staff}><Field label="Giáo viên" icon={<UserOutlined/>}>{data.teacher||'—'}</Field><Field label="Trợ giảng" icon={<UserOutlined/>}>{data.assistant_teacher||'—'}</Field></div></div>}
   </div>
   {extras.length>0&&<div className={styles.extraFields}>{extras.map(name=><Field key={name} label={fieldLabels[name]}><DisplayValue name={name} value={data[name]}/></Field>)}</div>}
  </>:<div className={styles.comparison}>
   <div className={styles.comparisonHeading}><span>Thông tin thay đổi</span><span>Trước thay đổi</span><span>Đề xuất mới</span></div>
   {fields.map(name=><div className={styles.comparisonRow} key={name}><div className={styles.fieldName}>{labelIcons[fieldLabels[name]]||<InfoCircleOutlined/>}{fieldLabels[name]}</div><div className={styles.before}><span className={styles.mobileLabel}>Trước thay đổi</span><DisplayValue name={name} value={item.before?.[name]}/></div><div className={styles.after}><span className={styles.mobileLabel}>Đề xuất mới</span><DisplayValue name={name} value={item.after?.[name]}/></div></div>)}
   {!fields.length&&<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có trường thay đổi"/>}
  </div>}
 </article>;
}
function RequestHistory({request,userId,session}:{request:CalendarRequest;userId:number;session:number}){
 const [open,setOpen]=useState(false);
 const {data,error,isLoading,mutate}=useSWR(open?['calendar-approval-history',userId,session,request.id,request.lock_version]:null,()=>getCalendarRequestHistory(request.id));
 const events=[...(data?.data||[])].sort((a,b)=>new Date(a.created_at).getTime()-new Date(b.created_at).getTime()||Number(a.id)-Number(b.id));
 return <Collapse className={styles.history} onChange={keys=>setOpen(keys.length>0)} items={[{key:'history',label:<span className={styles.historyHeading}><HistoryOutlined/>Lịch sử xử lý <span className={styles.meta}>{data?`${events.length} sự kiện`:statusLabels[request.status]}</span></span>,children:error?<Alert type="error" message="Chưa tải được lịch sử xử lý" action={<Button onClick={()=>void mutate()}>Thử lại</Button>}/>:isLoading?<Spin/>:events.length?<Timeline className={styles.timeline} items={events.map(h=>({color:h.action==='request.rejected'?'red':['request.approved','calendar.applied'].includes(h.action)?'green':'blue',children:<div className={styles.event}><div><strong>{auditLabels[h.action]||'Cập nhật yêu cầu'}</strong><span className={styles.eventActor}> · {h.actor_name||'—'}</span></div><time className={styles.meta}>{eventTime(h.created_at)}</time>{h.reason&&<div className={styles.eventReason}>{readableReason(h.reason)}</div>}</div>}))}/>:<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có lịch sử xử lý"/>}]} />;
}
export default function RequestDetailContent({request:r,mayHistory,userId,session}:{request:CalendarRequest;mayHistory:boolean;userId:number;session:number}){
 const decided=['APPROVED','REJECTED'].includes(r.status),approved=r.status==='APPROVED';
 const changes=r.changes.length?r.changes:r.before_data.map(before=>({before,after:null,fields:[]}));
 const hint:Record<string,string>={DRAFT:'Bản nháp chưa làm thay đổi lịch chính thức.',PENDING:'Lịch chính thức chỉ thay đổi sau khi yêu cầu được phê duyệt.',APPROVED:'Nội dung đã được phê duyệt và áp dụng vào lịch chính thức.',REJECTED:'Đề xuất bị từ chối và chưa được áp dụng vào lịch chính thức.',CANCELLED:'Yêu cầu đã hủy và chưa được áp dụng vào lịch chính thức.',CONFLICTED:'Yêu cầu chưa được áp dụng. Cần đối chiếu lại dữ liệu.',DIRECT_APPLIED:'Thay đổi đã được áp dụng trực tiếp vào lịch chính thức.'};
 return <div className={styles.content}>
  <div className={styles.heading}><h2>{r.title||operationLabels[r.operation]||'Thay đổi lịch'}</h2><div className={styles.meta}>{r.program_codes.join(', ')} · Phiên bản {r.revision}</div></div>
  <section className={styles.requestInfo} aria-label="Thông tin yêu cầu"><h3 className={styles.iconHeading}><FileTextOutlined/>Thông tin yêu cầu</h3><div className={styles.infoGrid}><Field label="Người gửi" icon={<UserOutlined/>}>{r.creator_name}</Field><Field label="Thời điểm gửi" icon={<ClockCircleOutlined/>}>{eventTime(r.submitted_at||r.created_at)}</Field></div><Field label="Lý do đề xuất">{r.reason?readableReason(r.reason):'Không có lý do đề xuất'}</Field></section>
  {decided&&<section className={`${styles.decision} ${approved?styles.approved:styles.rejected}`} aria-label="Kết quả xử lý"><div className={styles.decisionTitle}>{approved?<CheckCircleOutlined/>:<CloseCircleOutlined/>}<h3>{approved?'Yêu cầu đã được phê duyệt':'Yêu cầu đã bị từ chối'}</h3></div><div className={styles.infoGrid}><Field label={approved?'Người duyệt':'Người từ chối'}>{r.decider_name||'—'}</Field><Field label={approved?'Duyệt lúc':'Từ chối lúc'}>{eventTime(r.decided_at)}</Field></div>{r.decision_reason&&<Field label={approved?'Ghi chú xử lý':'Lý do từ chối'}>{r.decision_reason}</Field>}</section>}
  {!decided&&r.decision_reason&&<Alert type="info" showIcon message={r.decision_reason}/>}
  {r.base_changed&&<Alert type="warning" showIcon message="Lịch hoặc đề cương đã thay đổi từ khi gửi yêu cầu. Hệ thống sẽ chặn áp dụng phiên bản cũ."/>}
  {r.status==='CONFLICTED'&&<Alert type="warning" showIcon message="Dữ liệu nền đã thay đổi. Yêu cầu chưa được áp dụng; cần đối chiếu và gửi lại."/>}
  <section className={styles.proposal}><div className={styles.sectionHeading}><h3 className={styles.iconHeading}><CalendarOutlined/>Nội dung lịch đề xuất</h3><span className={styles.meta}>{changes.length} buổi học</span></div><p className={styles.hint}>{hint[r.status]||'Thông tin đề xuất trong yêu cầu thay đổi lịch.'}</p><div className={styles.cards}>{changes.map((item,index)=><ScheduleCard key={index} item={item} index={index}/>)}</div></section>
  {mayHistory&&<RequestHistory key={r.id} request={r} userId={userId} session={session}/>}
 </div>;
}
