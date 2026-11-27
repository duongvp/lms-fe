'use client';
import {useId} from 'react';
import {Collapse,Radio,Table,Tag,Typography} from 'antd';
import type {ApprovalModule,ModulePolicyMap,PolicyValue} from '@/services/approvalPolicyService';
const policyLabel=(value:string)=>value==='SKIP'?'Không cần duyệt':value==='INHERIT'?'Kế thừa từ vai trò':'Bắt buộc duyệt';
export default function ApprovalPolicyEditor({mode,modules,value,onChange,inherited={},disabled=false,canEdit=()=>true}:{
 mode:'role'|'user';modules:ApprovalModule[];value:ModulePolicyMap;onChange:(value:ModulePolicyMap)=>void;
 inherited?:ModulePolicyMap;disabled?:boolean;canEdit?:(module:ApprovalModule)=>boolean;
}) {
 const instance=useId();
 const options:PolicyValue[]=['REQUIRE','SKIP'];
 const modeLabel=mode==='user'?'tài khoản':'vai trò';
 return <div aria-label={mode==='role'?'Chính sách mặc định theo vai trò':'Chính sách riêng theo tài khoản'}>
  <Collapse defaultActiveKey={modules.map(module=>module.key)} items={modules.map(module=>{
   const inheritedValue=(action:string)=>inherited[module.key]?.[action]||module.defaultPolicy;
   const selected=(action:string)=>{
    const configured=value[module.key]?.[action];
    return !configured||configured==='INHERIT' ? (mode==='user'?inheritedValue(action):module.defaultPolicy) : configured;
   };
   const apply=(actions:string[],policy:PolicyValue)=>{
    const next={...value[module.key]};
    for(const action of actions) {
     if(mode==='user'&&policy===inheritedValue(action))delete next[action];
     else next[action]=policy;
    }
    onChange({...value,[module.key]:next});
   };
   const change=(action:string,policy:PolicyValue)=>apply([action],policy);
   const selectAll=(policy:PolicyValue)=>apply(module.actions.map(action=>action.key),policy);
   const locked=disabled||!canEdit(module);
   return {key:module.key,label:<Typography.Text strong>{module.label}</Typography.Text>,children:<>
    {!canEdit(module)&&<Typography.Paragraph type="secondary">Bạn chỉ có thể xem quy định phê duyệt. Cần được cấp quyền cấu hình chức năng này để thay đổi.</Typography.Paragraph>}
    <Table rowKey="key" size="small" pagination={false} dataSource={[{key:'__select_all__',label:'Chọn tất cả',isSelectAll:true},...module.actions.map(action=>({...action,isSelectAll:false}))]} scroll={{x:mode==='user'?550:460}}
     onRow={action=>action.isSelectAll?{style:{background:'#f3f7ff'},'aria-label':`${module.label} / Chọn tất cả`}:{role:'radiogroup','aria-label':`${module.label} / ${action.label} — chính sách ${modeLabel}`}}
     columns={[
      {title:'Thao tác',dataIndex:'label',width:mode==='user'?240:220,render:(name:string,action:{key:string;label:string;isSelectAll?:boolean})=>{
       if(action.isSelectAll)return <Typography.Text style={{color:'#1677ff',fontWeight:600}}>Chọn tất cả</Typography.Text>;
       const roleValue=inheritedValue(action.key);
       const current=selected(action.key);
       return <><Typography.Text>{name}</Typography.Text>{mode==='user'&&<div style={{marginTop:4,fontSize:12,color:'#667085'}}><div>Theo vai trò: {policyLabel(roleValue)}{current!==roleValue&&<Tag color="blue" style={{marginLeft:6,fontSize:11}}>Thiết lập riêng</Tag>}</div></div>}</>;
      }},
      ...options.map(option=>({key:option,width:mode==='user'?155:120,align:'center' as const,title:<span style={{whiteSpace:'nowrap'}}>{policyLabel(option)}</span>,render:(_:unknown,action:{key:string;label:string;isSelectAll?:boolean})=>action.isSelectAll?<Radio name={`${instance}-${module.key}-all`} aria-label={`${module.label} — Tất cả ${policyLabel(option)} (${modeLabel})`} checked={module.actions.length>0&&module.actions.every(action=>selected(action.key)===option)} disabled={locked||!module.actions.length} onChange={()=>selectAll(option)}/>:<Radio name={`${instance}-${module.key}-${action.key}`} aria-label={`${module.label} / ${action.label} — ${policyLabel(option)} (${modeLabel})`} checked={selected(action.key)===option} disabled={locked} onChange={()=>change(action.key,option)}/>})),
     ]}/>
   </>};
  })}/>
 </div>;
}
