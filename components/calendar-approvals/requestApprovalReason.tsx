'use client';
import {Form,Input,Modal} from 'antd';
import {useAuthStore} from '@/stores/authStore';
import {CalendarApprovalCancelledError} from '@/helper/calendarApprovalCancellation';
import {calendarRequestTitle} from '@/services/calendarApprovalService';

type Submission={title:string;reason:string};
export function requestApprovalReason(initialReason='',options:{signal?:AbortSignal;operation?:string;title?:string|null}={}):Promise<Submission>{
 return new Promise((resolve,reject)=>{
  if(options.signal?.aborted){reject(new CalendarApprovalCancelledError());return;}
  const initialTitle=calendarRequestTitle(options.operation,options.title);
  let value=initialReason,title=initialTitle,settled=false,unsubscribe=()=>{};
  const identity=useAuthStore.getState();
  const cleanup=()=>{unsubscribe();options.signal?.removeEventListener('abort',cancel);};
  const finish=(submission?:Submission)=>{if(settled)return;settled=true;cleanup();submission===undefined?reject(new CalendarApprovalCancelledError()):resolve(submission);};
  const cancel=()=>{finish();dialog.destroy();};
  const valid=()=>!!title.trim()&&title.trim().length<=255&&!!value.trim()&&value.trim().length<=1000;
  const update=()=>dialog.update({okButtonProps:{disabled:!valid()}});
  const dialog=Modal.confirm({
   title:'Gửi yêu cầu duyệt',icon:null,width:520,
   content:<Form layout="vertical" style={{marginTop:16}}>
    <Form.Item label="Tiêu đề yêu cầu" required extra="Tiêu đề hiển thị trong thông báo và danh sách yêu cầu."><Input autoFocus maxLength={255} showCount defaultValue={initialTitle} placeholder="Nhập tiêu đề yêu cầu…" onChange={event=>{title=event.target.value;update();}}/></Form.Item>
    <Form.Item label="Lý do gửi duyệt" required extra="Nêu rõ nội dung và lý do để người duyệt kiểm tra."><Input.TextArea rows={4} maxLength={1000} showCount defaultValue={initialReason} placeholder="Nhập lý do gửi duyệt…" onChange={event=>{value=event.target.value;update();}}/></Form.Item>
   </Form>,
   okText:'Gửi yêu cầu duyệt',cancelText:'Đóng',maskClosable:false,
   okButtonProps:{disabled:!valid()},
   onOk:()=>{if(!valid())return Promise.reject();finish({title:title.trim(),reason:value.trim()});},
   onCancel:()=>finish(),afterClose:()=>finish(),
  });
  unsubscribe=useAuthStore.subscribe(state=>{if(state.user.userId!==identity.user.userId||state.authSessionVersion!==identity.authSessionVersion)cancel();});
  options.signal?.addEventListener('abort',cancel,{once:true});
 });
}
