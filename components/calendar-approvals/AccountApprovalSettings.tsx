'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Alert, Button, Space, Spin, Typography, message } from 'antd';
import { refreshApprovalViews, type ApprovalAccount } from '@/services/calendarApprovalService';
import {useAuthStore} from '@/stores/authStore';
import ApprovalPolicyEditor from '@/components/approval-policy/ApprovalPolicyEditor';
import {getUserApprovalPolicy,saveUserApprovalPolicy} from '@/services/approvalPolicyService';
export interface AccountApprovalSettingsHandle {getPendingPolicy:()=>unknown}
const AccountApprovalSettings=forwardRef<AccountApprovalSettingsHandle,{userId:number;onSaved?:()=>void;embedded?:boolean;disabled?:boolean}>(function AccountApprovalSettings({userId,onSaved,embedded=false,disabled=false},ref) {
  const hasPermission=useAuthStore(s=>s.hasPermission);
  const [policy,setPolicy]=useState<ApprovalAccount|null>(null),[error,setError]=useState(''),[saving,setSaving]=useState(false);
  const [toast,holder]=message.useMessage();
  const originalOverrides=useRef('');
  useEffect(()=>{let active=true;setPolicy(null);setError('');getUserApprovalPolicy(userId).then(r=>{if(active){setPolicy(r.data);originalOverrides.current=JSON.stringify(r.data.module_overrides||{});}}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[userId]);
  const payload=()=>{
    if(!policy||error)throw new Error(error||'Đang tải cấu hình phê duyệt. Vui lòng thử lại sau.');
    return {version:policy.version,role_policy_hash:policy.role_policy_hash,module_overrides:Object.fromEntries((policy.policy_modules||[]).filter(module=>hasPermission(module.managePermission)).map(module=>[module.key,Object.fromEntries(Object.entries(policy.module_overrides?.[module.key]||{}).filter(([action,value])=>value!=='INHERIT'&&value!==(policy.module_inherited_policy?.[module.key]?.[action]||module.defaultPolicy)))]))};
  };
  useImperativeHandle(ref,()=>({getPendingPolicy:()=>{
    const input=payload();
    return JSON.stringify(policy?.module_overrides||{})===originalOverrides.current ? undefined : input;
  }}));
  async function save(){if(!policy)return;setSaving(true);try{const r=await saveUserApprovalPolicy(userId,payload());setPolicy(r.data);originalOverrides.current=JSON.stringify(r.data.module_overrides||{});toast.success('Đã lưu cấu hình phê duyệt');refreshApprovalViews();onSaved?.();}catch(e:any){toast.error(e.message);}finally{setSaving(false);}}
  return <section style={{borderTop:'1px solid #e5e7eb',paddingTop:20,marginTop:20}}>{holder}
    <Typography.Title level={5} style={{margin:'0 0 12px'}}>Phê duyệt</Typography.Title>
    {error?<Alert type="error" showIcon message={error} action={<Button onClick={()=>{setError('');getUserApprovalPolicy(userId).then(r=>{setPolicy(r.data);originalOverrides.current=JSON.stringify(r.data.module_overrides||{});}).catch(e=>setError(e.message));}}>Thử lại</Button>}/>:!policy?<Spin/>:<Space direction="vertical" size={16} style={{width:'100%'}}>
      <div style={{padding:12,background:'#f8fafc',borderRadius:6}}>
        <Typography.Text strong>{policy.can_approve?'Có quyền phê duyệt lịch học':'Chưa có quyền phê duyệt lịch học'}</Typography.Text>
        {policy.can_approve&&<div style={{marginTop:6}}>Được cấp qua vai trò: {policy.approval_roles?.map(role=>role.name).join(', ')||'—'}</div>}
        <div style={{marginTop:6}}>Phạm vi chương trình: {policy.program_scope?.mode==='ALL'?'Tất cả chương trình':policy.program_scope?.mode==='RESTRICTED'?policy.program_scope.programs.map(code=>policy.program_names?.find(p=>p.code===code)?.name||code).join(', '):'Chưa được cấp phạm vi chương trình'}</div>
        <Typography.Paragraph type="secondary" style={{margin:'8px 0 0'}}>Để cấp hoặc thu hồi quyền phê duyệt, hãy thay đổi vai trò của tài khoản rồi lưu. Tài khoản chỉ được phê duyệt trong phạm vi chương trình được phân công và không được duyệt yêu cầu do chính mình tạo.</Typography.Paragraph>
      </div>
      <div><Typography.Text strong>Quy định phê duyệt và thiết lập riêng</Typography.Text>
        <div style={{marginTop:6,color:'#667085'}}>Vai trò đang áp dụng: {policy.roles?.map(role=>role.name).join(', ')||'Chưa có vai trò; mặc định các thao tác phải được phê duyệt'}.</div>
        <ApprovalPolicyEditor mode="user" modules={policy.policy_modules||[]} value={policy.module_overrides||{}} inherited={policy.module_inherited_policy} disabled={saving||disabled} canEdit={module=>hasPermission(module.managePermission)} onChange={module_overrides=>setPolicy({...policy,module_overrides})}/>
      </div>
      <Typography.Text type="secondary">Khi tài khoản có nhiều vai trò và đang kế thừa cấu hình, chỉ cần một vai trò yêu cầu phê duyệt thì thao tác đó phải được gửi duyệt trước khi áp dụng. Thiết lập riêng của tài khoản được ưu tiên hơn cấu hình từ vai trò. Thiết lập phê duyệt không cấp thêm quyền thao tác. {embedded?'Thông tin tài khoản và cấu hình phê duyệt được lưu cùng nhau khi bấm Lưu ở cuối hộp thoại.':'Nếu thay đổi vai trò hoặc phạm vi chương trình, hãy lưu các thay đổi đó trước khi thiết lập phê duyệt riêng.'}</Typography.Text>
      <Space wrap>{!embedded&&<Button loading={saving} onClick={()=>void save()}>Lưu cấu hình duyệt</Button>}<Button disabled={saving||disabled} onClick={()=>setPolicy({...policy,module_overrides:{...policy.module_overrides,...Object.fromEntries((policy.policy_modules||[]).filter(module=>hasPermission(module.managePermission)).map(module=>[module.key,{}]))}})}>Kế thừa tất cả từ vai trò</Button></Space>
    </Space>}
  </section>;
});
export default AccountApprovalSettings;
