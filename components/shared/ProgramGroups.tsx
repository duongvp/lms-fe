'use client';
import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Alert, Button, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Typography, message } from 'antd';
import type { FormInstance } from 'antd';
import { getProgramGroups, saveLearningGroup, saveProgramSettings, type LearningGroup } from '@/services/learningGroupService';
import { useAuthStore } from '@/stores/authStore';

export const useProgramGroups = (code?:string, enabled=true) => {
  const session = useAuthStore(s=>`${s.user.userId}:${s.authSessionVersion}`);
  return useSWR(enabled && code ? ['program-groups',session,code] : null,()=>getProgramGroups(code!),{revalidateOnFocus:false,shouldRetryOnError:false});
};
export function ScheduleGroupPicker({code,form,disabled=false,enabled=true}:{code?:string;form:FormInstance;disabled?:boolean;enabled?:boolean}) {
  const {data,error,isLoading}=useProgramGroups(code,enabled);
  const selected=Form.useWatch('group_id',form);
  const previous=React.useRef(code);
  useEffect(()=>{if(previous.current!==code){previous.current=code;if(!disabled)form.setFieldValue('group_id',undefined);}},[code,form,disabled]);
  if(error) return <Alert type="error" showIcon message="Không tải được cấu hình nhóm học" description={error.message}/>;
  if(data?.data.settings.teaching_model!=='small_group' && !selected) return null;
  return <Form.Item label="Nhóm học" name="group_id" rules={[{required:true,message:'Chọn nhóm học cho lịch này'}]} extra="Mỗi nhóm có lịch và danh sách học viên riêng.">
    <Select loading={isLoading} disabled={disabled || isLoading} onChange={()=>{form.setFieldValue('lesson_id',undefined);form.setFieldValue('lesson_count',undefined);}} placeholder="Chọn nhóm học" showSearch optionFilterProp="label"
      options={(data?.data.groups||[]).filter(g=>g.status==='active'||g.id===selected).map(g=>({value:g.id,label:`${g.group_code} · ${g.name} · tối đa ${g.capacity ?? data?.data.settings.default_capacity ?? 10} học viên`}))}/>
  </Form.Item>;
}
export default function ProgramGroups({code,canCreate,canEdit,value,onFilter}:{code?:string;canCreate:boolean;canEdit:boolean;value?:number;onFilter:(id?:number)=>void}) {
  const {data,error,mutate}=useProgramGroups(code);
  const [open,setOpen]=useState(false),[editing,setEditing]=useState<LearningGroup|null|undefined>(undefined),[saving,setSaving]=useState(false);
  const [settingsForm]=Form.useForm(),[groupForm]=Form.useForm();
  const model=Form.useWatch('teaching_model',settingsForm);
  useEffect(()=>{if(open&&data)settingsForm.setFieldsValue(data.data.settings);},[open,data,settingsForm]);
  useEffect(()=>{setOpen(false);setEditing(undefined);},[code]);
  if(!code)return null;
  const settings=data?.data.settings,groups=data?.data.groups||[];
  const small=settings?.teaching_model==='small_group';
  const fail=(e:unknown)=>message.error(e instanceof Error?e.message:'Không lưu được thay đổi');
  return <div style={{padding:'10px 0',display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
    {error?<Typography.Text type="danger">Không tải được mô hình học</Typography.Text>:<Tag color={small?'purple':'blue'}>{small?'Nhóm nhỏ':'1–n'}</Tag>}
    {small&&<Select aria-label="Lọc nhóm học" placeholder="Tất cả nhóm" allowClear style={{minWidth:220}} value={value} onChange={onFilter}
      options={groups.map(g=>({value:g.id,label:`${g.group_code} · ${g.name}`}))}/>}
    {(canCreate||canEdit)&&<Button disabled={!data} onClick={()=>setOpen(true)}>Mô hình & nhóm học</Button>}
    <Modal open={open} title={`Mô hình & nhóm học · ${code}`} footer={null} onCancel={()=>setOpen(false)} width={780} destroyOnClose>
      <Form form={settingsForm} layout="vertical" onFinish={async values=>{try{setSaving(true);await saveProgramSettings(code,values);await mutate();message.success('Đã lưu mô hình học');}catch(e){fail(e);}finally{setSaving(false);}}}>
        <Form.Item name="teaching_model" label="Mô hình tổ chức" rules={[{required:true}]}><Select disabled={!canEdit} onChange={v=>{if(v==='small_group'&&!settingsForm.getFieldValue('default_capacity'))settingsForm.setFieldValue('default_capacity',10);}} options={[{value:'large_class',label:'1–n · không giới hạn học viên'},{value:'small_group',label:'Nhóm nhỏ · lịch riêng theo nhóm'}]}/></Form.Item>
        {model==='small_group'&&<Form.Item name="default_capacity" label="Số học viên mặc định mỗi nhóm" initialValue={10} rules={[{required:true}]}><InputNumber disabled={!canEdit} min={1} precision={0}/></Form.Item>}
        {canEdit&&<Button htmlType="submit" loading={saving}>Lưu cấu hình</Button>}
      </Form>
      {small&&<>
        <Space style={{margin:'20px 0 12px',display:'flex',justifyContent:'space-between'}}><Typography.Text strong>Nhóm học</Typography.Text>{canCreate&&<Button type="primary" onClick={()=>{groupForm.resetFields();groupForm.setFieldsValue({capacity:settings?.default_capacity??10,status:'active'});setEditing(null);}}>Thêm nhóm</Button>}</Space>
        <Table size="small" rowKey="id" dataSource={groups} pagination={{pageSize:10}} scroll={{x:500}} columns={[
          {title:'Mã nhóm',dataIndex:'group_code'},{title:'Tên nhóm',dataIndex:'name'},{title:'Sức chứa',dataIndex:'capacity',render:v=>v??settings?.default_capacity??10},
          {title:'Trạng thái',dataIndex:'status',render:v=>({active:'Hoạt động',inactive:'Tạm dừng',closed:'Kết thúc'}[v as string]||v)},
          {title:'',key:'actions',render:(_,g)=>canEdit?<Button onClick={()=>{groupForm.setFieldsValue(g);setEditing(g);}}>Sửa</Button>:null},
        ]}/>
      </>}
    </Modal>
    <Modal open={editing!==undefined} title={editing?'Sửa nhóm học':'Thêm nhóm học'} onCancel={()=>setEditing(undefined)} onOk={()=>groupForm.submit()} confirmLoading={saving} destroyOnClose>
      <Form form={groupForm} layout="vertical" onFinish={async values=>{try{setSaving(true);await saveLearningGroup(code,values,editing?.id);await mutate();setEditing(undefined);message.success('Đã lưu nhóm học');}catch(e){fail(e);}finally{setSaving(false);}}}>
        <Form.Item name="group_code" label="Mã nhóm" extra={editing?'Mã nhóm được giữ cố định.':'Để trống để tự sinh N001, N002…'} rules={[{pattern:/^[A-Za-z0-9_-]{1,30}$/,message:'Tối đa 30 ký tự: chữ không dấu, số, - và _'}]}><Input disabled={Boolean(editing)} maxLength={30}/></Form.Item>
        <Form.Item name="name" label="Tên nhóm" rules={[{required:true,whitespace:true,max:150}]}><Input maxLength={150}/></Form.Item>
        <Form.Item name="capacity" label="Số học viên tối đa" rules={[{required:true}]}><InputNumber min={1} precision={0}/></Form.Item>
        <Form.Item name="status" label="Trạng thái" rules={[{required:true}]}><Select options={[{value:'active',label:'Hoạt động'},{value:'inactive',label:'Tạm dừng'},{value:'closed',label:'Kết thúc'}]}/></Form.Item>
      </Form>
    </Modal>
  </div>;
}
