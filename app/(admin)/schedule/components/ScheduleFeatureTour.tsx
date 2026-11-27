'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Button,Modal,Tour,Typography} from 'antd';
import type {TourProps} from 'antd';
import type {TourStepProps} from 'antd/es/tour/interface';
import {CalendarOutlined,CheckCircleOutlined,CloseOutlined,QuestionCircleOutlined,PlayCircleOutlined,SearchOutlined} from '@ant-design/icons';
import styles from './ScheduleFeatureTour.module.css';

type Access={create:boolean;edit:boolean;delete:boolean;import:boolean;export:boolean;submit:boolean;review:boolean;sync:boolean};
type Props={helpContainer?:HTMLElement|null;accountId:number;viewMode:'table'|'calendar';isMobile:boolean;hasResults:boolean;access:Access};
type GuideStep={title:string;description:string;target?:string};
const selector=(name:string)=>`[data-schedule-tour="${name}"]`;
function visibleTarget(name:string):HTMLElement|null {
 const query=name==='calendar-nav'?'[data-schedule-tour="content"] .fc-header-toolbar':selector(name);
 const preferred=name==='content'?document.querySelectorAll<HTMLElement>(`${selector('content')} .schedule-view-pane-active .ant-table-thead, ${selector('content')} .schedule-mobile-lesson-card, ${selector('content')} .schedule-view-pane-active .fc-header-toolbar`):[];
 const nodes=[...preferred,...document.querySelectorAll<HTMLElement>(query)];
 return [...nodes].find(node=>{
  if(!node.isConnected||!node.getClientRects().length)return false;
  for(let parent:HTMLElement|null=node;parent;parent=parent.parentElement){
   const css=getComputedStyle(parent);if(css.display==='none'||css.visibility==='hidden'||css.opacity==='0')return false;
  }
  return true;
 })||null;
}

export default function ScheduleFeatureTour({helpContainer,accountId,viewMode,isMobile,hasResults,access}:Props){
 const [open,setOpen]=useState(false),[current,setCurrent]=useState(0),[steps,setSteps]=useState<GuideStep[]>([]);
 const [invitedAccount,setInvitedAccount]=useState<number|null>(null);
 const pendingWelcomeStart=useRef<number|null>(null);
 const helpButton=useRef<HTMLButtonElement>(null),opener=useRef<HTMLElement|null>(null);
 const storageKey=`lms:schedule-tour:v1:${accountId}`;
 const acknowledge=useCallback(()=>{setInvitedAccount(null);try{localStorage.setItem(storageKey,'seen');}catch{/* The guide also works when browser storage is unavailable. */}},[storageKey]);
 const close=useCallback(()=>{setOpen(false);requestAnimationFrame(()=>{const element=opener.current?.isConnected&&opener.current.getClientRects().length>0&&opener.current!==document.body?opener.current:helpButton.current;element?.focus({preventScroll:true});});},[]);
 const accessKey=JSON.stringify(access);
 useEffect(()=>{
  pendingWelcomeStart.current=null;setOpen(false);setCurrent(0);setInvitedAccount(null);
  if(!accountId)return;
  const previewWelcome=new URLSearchParams(window.location.search).get('tour')==='welcome';
  if(previewWelcome){setInvitedAccount(accountId);return;}
  try{if(localStorage.getItem(storageKey)!=='seen')setInvitedAccount(accountId);}catch{setInvitedAccount(accountId);}
 },[accountId,storageKey]);
 // Avoid pointing at stale controls after the layout or permissions change.
 useEffect(()=>{setOpen(false);},[viewMode,isMobile,accessKey]);
 useEffect(()=>{
  if(!open)return;
  let frame=0,attempts=0;
  const focusPanel=()=>{const button=document.querySelector<HTMLButtonElement>('.schedule-feature-tour .ant-tour-next-btn');if(button){const panel=button.closest('.ant-tour-inner');panel?.setAttribute('role','dialog');panel?.setAttribute('aria-modal','true');panel?.setAttribute('aria-label','Hướng dẫn quản lý lịch học');const closeButton=panel?.querySelector('.ant-tour-close');closeButton?.setAttribute('aria-label','Đóng hướng dẫn');button.focus({preventScroll:true});}else if(attempts++<20)frame=requestAnimationFrame(focusPanel);};
  frame=requestAnimationFrame(focusPanel);
  const keyboard=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();return;}
   if(event.key!=='Tab')return;
   const buttons=[...document.querySelectorAll<HTMLButtonElement>('.schedule-feature-tour button')].filter(button=>!button.disabled&&button.getClientRects().length);
   const first=buttons[0],last=buttons[buttons.length-1];if(!first)return;
   if(!buttons.includes(document.activeElement as HTMLButtonElement)||(event.shiftKey&&document.activeElement===first)||(!event.shiftKey&&document.activeElement===last)){
    event.preventDefault();(event.shiftKey?last:first).focus();
   }
  };
  document.addEventListener('keydown',keyboard,true);
  return()=>{cancelAnimationFrame(frame);document.removeEventListener('keydown',keyboard,true);};
 },[open,current,close]);
 function start(){
  opener.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
  acknowledge();
  const list:GuideStep[]=[{title:'Làm quen với Quản lý lịch học',description:'Theo dõi buổi học, tìm lịch và thực hiện các thao tác trong phạm vi được phân công. Bấm Tiếp theo để khám phá; có thể dừng bằng nút đóng hoặc phím Esc.'}];
  const add=(target:string,title:string,description:string)=>{if(visibleTarget(target))list.push({target,title,description});};
  add('filters','Bắt đầu từ bộ lọc',isMobile?'Mở Lọc lịch học để chọn nguồn lịch, chương trình, giáo viên và khoảng ngày, sau đó bấm Lọc để xem kết quả.':'Chọn nguồn lịch, chương trình, giáo viên hoặc khoảng ngày rồi bấm Lọc. Nếu chưa có kết quả, hãy kiểm tra hoặc nới rộng điều kiện lọc.');
  add('search','Tìm nhanh một buổi học','Nhập chương trình, tên bài, giáo viên hoặc phòng học. Kết hợp ô tìm kiếm với bộ lọc để tìm đúng buổi cần xử lý.');
  add('view','Chọn cách xem phù hợp','Dạng bảng thuận tiện để so sánh và chọn nhiều lịch. Dạng lịch giúp xem các buổi theo ngày, tuần hoặc tháng. Bạn có thể chuyển lại bất cứ lúc nào; về Dạng bảng để thay đổi bộ lọc và mở các thao tác.');
  if(viewMode==='calendar')add('calendar-nav','Di chuyển trên lịch','Dùng mũi tên để xem khoảng thời gian trước hoặc sau. Chọn ngày, tuần hoặc tháng khi giao diện có lựa chọn tương ứng.');
  add('content',hasResults?'Đọc thông tin buổi học':'Khu vực hiển thị lịch',hasResults?(viewMode==='calendar'?'Chọn một buổi trên lịch để xem chi tiết. Màu sắc giúp phân biệt buổi sắp diễn ra, đang diễn ra, đã kết thúc hoặc nghỉ học.':'Mỗi dòng là một buổi học. Bấm dòng để mở thêm chi tiết. Trạng thái buổi học và các nhãn đồng bộ giúp biết lịch đã sẵn sàng tới bước nào.'):'Lịch sẽ xuất hiện tại đây sau khi bạn áp dụng bộ lọc. Danh sách trống có thể do chưa lọc, chưa có lịch hoặc điều kiện lọc chưa khớp.');
  if(access.create){
   add('create','Thêm một hoặc nhiều buổi học','Chọn chương trình và bài học từ đề cương, nhập ngày giờ, giáo viên và trợ giảng. Kiểm tra bản xem trước trước khi xác nhận. Tên bài gốc được quản lý tại đề cương.');
   add('auto','Tạo lịch theo kế hoạch','Lọc một chương trình trước để bật nút này. Tạo lịch tự động giúp xếp nhiều buổi theo khoảng ngày và khung giờ; hãy kiểm tra các buổi dự kiến trước khi lưu.');
  }
  if(hasResults&&(access.edit||access.delete))add('selection','Chọn lịch để xử lý cùng lúc','Đánh dấu các buổi cần thao tác. Khi sửa hàng loạt, chỉ chọn lịch trong cùng một chương trình. Những lịch không đáp ứng điều kiện sẽ được hệ thống kiểm tra trước khi xử lý.');
  if(access.edit)add('bulk','Sửa nhiều buổi học','Chọn các buổi cùng chương trình rồi mở Sửa hàng loạt để điều chỉnh thông tin. Kiểm tra phần xem trước; lịch đã diễn ra có thể bị giới hạn chỉnh sửa.');
  if(isMobile){
   const features=[access.create?'thêm lịch và tạo tự động':null,access.edit?'sửa hàng loạt':null,access.import?'nhập file':null,access.export?'xuất file':null,access.sync?'đồng bộ':null].filter(Boolean);
   if(features.length)add('actions','Menu thao tác trên điện thoại',`Menu này tập hợp các chức năng bạn được cấp quyền: ${features.join(', ')}. Một số thao tác cần chọn chương trình hoặc chọn buổi học trước.`);
  }else if(access.import||access.export||access.delete)add('other','Các công cụ khác','Mở Thao tác khác để xem những công cụ tài khoản được phép dùng, như nhập/xuất file hoặc xem lịch đã xóa. Với thao tác theo danh sách, hãy kiểm tra các buổi đã chọn.');
  if(access.sync&&!isMobile)add('sync','Chuẩn bị lớp học và đồng bộ','Chọn lịch cần xử lý rồi mở Đồng bộ để xem các bước được cấp quyền, như phân lớp, tài khoản giảng dạy hoặc học viên. Kiểm tra kết quả và các lỗi được trả về sau mỗi thao tác.');
  if(access.submit||access.review)list.push({title:'Gửi yêu cầu và theo dõi phê duyệt',description:access.submit?'Nếu thao tác của bạn thuộc diện cần duyệt, hệ thống sẽ mở form nhập tiêu đề và lý do. Lịch chính thức chỉ thay đổi sau khi yêu cầu được duyệt. Theo dõi tại thông báo hoặc trang Phê duyệt lịch học; có thể thu hồi yêu cầu đang chờ để chỉnh sửa nếu chưa được xử lý.':'Thông báo sẽ đưa bạn tới yêu cầu cần xử lý. Kiểm tra nội dung đề xuất trước khi duyệt hoặc từ chối trong phạm vi được phân công; không thể duyệt yêu cầu do chính mình tạo.'});
  list.push({title:'Bạn đã sẵn sàng',description:'Bắt đầu bằng việc chọn chương trình và khoảng ngày cần xem. Khi cần xem lại các bước, bấm Hướng dẫn cạnh nút chuyển Dạng bảng / Dạng lịch.'});
  setSteps(list);setCurrent(0);setOpen(true);
 }
 const tourSteps:TourProps['steps']=steps.map((step,index)=>({
  title:step.title,description:step.description,target:(step.target?()=>visibleTarget(step.target!):null) as TourStepProps['target'],
  placement:'bottom',style:{width:isMobile?'min(340px, calc(100vw - 24px))':380,maxWidth:'calc(100vw - 24px)'},
  nextButtonProps:{children:index===steps.length-1?'Hoàn tất':'Tiếp theo'},prevButtonProps:{children:'Quay lại'},
 }));
 const help=<Button ref={helpButton} className={styles.help} type="text" size={isMobile?"small":"middle"} title="Xem hướng dẫn từng bước" icon={<QuestionCircleOutlined/>} onClick={start}>Hướng dẫn</Button>;
 return <>
  <Modal rootClassName="schedule-tour-welcome" className={styles.welcome} centered width={500} open={!!accountId&&invitedAccount===accountId} maskClosable={false} focusTriggerAfterClose={false}
   title={<div className={styles.heading}><span className={styles.headingIcon}><QuestionCircleOutlined/></span><div><div className={styles.eyebrow}>HƯỚNG DẪN NHANH</div><div className={styles.headingTitle}>Quản lý lịch học</div></div></div>}
   onCancel={()=>{pendingWelcomeStart.current=null;acknowledge();}}
   afterClose={()=>{if(pendingWelcomeStart.current===accountId){pendingWelcomeStart.current=null;start();}else helpButton.current?.focus({preventScroll:true});}}
   closeIcon={<CloseOutlined aria-label="Đóng giới thiệu"/>}
   footer={<div className={styles.welcomeActions}><Button onClick={()=>{pendingWelcomeStart.current=null;acknowledge();}}>Để sau</Button><Button type="primary" icon={<PlayCircleOutlined/>} onClick={()=>{pendingWelcomeStart.current=accountId;acknowledge();}}>Bắt đầu hướng dẫn</Button></div>}
  >
   <Typography.Paragraph className={styles.intro}>Dành khoảng 2 phút để làm quen với trang lịch học. Hướng dẫn sẽ chỉ trực tiếp từng khu vực trên giao diện.</Typography.Paragraph>
   <div className={styles.highlights}>
    <div className={styles.highlight}><SearchOutlined/><div><strong>Tìm đúng lịch cần xem</strong><span>Lọc theo chương trình, giáo viên và thời gian.</span></div></div>
    <div className={styles.highlight}><CalendarOutlined/><div><strong>Nắm thông tin buổi học</strong><span>Chuyển cách xem và hiểu các trạng thái hiển thị.</span></div></div>
    <div className={styles.highlight}><CheckCircleOutlined/><div><strong>Làm quen với các thao tác</strong><span>Khám phá những chức năng tài khoản được phép dùng.</span></div></div>
   </div>
   <Typography.Paragraph className={styles.reminder}>Có thể dừng bất cứ lúc nào và mở lại bằng nút Hướng dẫn cạnh Dạng bảng / Dạng lịch.</Typography.Paragraph>
  </Modal>
  {helpContainer===undefined?<div className={styles.bar}>{help}</div>:helpContainer?createPortal(help,helpContainer):null}
  <Tour rootClassName={`${styles.tour} schedule-feature-tour`} open={open} current={current} steps={tourSteps} onChange={setCurrent} onClose={close} onFinish={close} disabledInteraction scrollIntoViewOptions={{block:'nearest',inline:'nearest',behavior:'auto'}} indicatorsRender={(index,total)=><span aria-live="polite">{index+1}/{total}</span>} closeIcon={<CloseOutlined aria-label="Đóng hướng dẫn"/>}/>
 </>;
}
