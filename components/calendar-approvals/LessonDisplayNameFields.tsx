'use client';
import {useEffect,useState} from 'react';
import {Col,Form,Input,Row,Typography} from 'antd';
import {calendarLessonDisplayName} from '@/helper/calendarLessonDisplayName';
import {getProgramLessonsForScheduling} from '@/services/livestreamService';

// Only the outline owns the lesson name. These fields customize its calendar display.
export default function LessonDisplayNameFields({program,sessionId,currentName,onChange}:{program?:string;sessionId?:string|number;currentName?:string;onChange:(name:string|undefined)=>void}){
 const [source,setSource]=useState(''),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const [changed,setChanged]=useState(false),[prefix,setPrefix]=useState(''),[suffix,setSuffix]=useState('');
 useEffect(()=>{
  let active=true;setSource('');setError('');setChanged(false);setPrefix('');setSuffix('');onChange(undefined);
  if(!program||!sessionId){setLoading(false);if(currentName)setError('Chưa xác định được bài học trong đề cương. Giữ nguyên tên hiển thị hiện tại.');return;}
  setLoading(true);
  getProgramLessonsForScheduling(program).then(response=>{
   if(!active)return;
   const lesson=(response.data||[]).find((row:any)=>String(row.id)===String(sessionId));
   const name=String(lesson?.lesson_name||'').trim();
   if(!name){setError('Không tìm thấy tên bài trong đề cương. Giữ nguyên tên hiển thị hiện tại.');return;}
   setSource(name);
   const position=String(currentName||'').indexOf(name);
   if(position>=0){setPrefix(String(currentName).slice(0,position));setSuffix(String(currentName).slice(position+name.length));}
  }).catch(()=>{if(active)setError('Chưa tải được tên bài từ đề cương. Giữ nguyên tên hiển thị hiện tại.');}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[program,sessionId,currentName,onChange]);
 const display=changed?calendarLessonDisplayName(source,prefix,suffix):currentName||source;
 return <>
  <Form.Item label="Tên bài trong đề cương" tooltip="Tên bài gốc được chỉnh sửa tại Quản lý đề cương." style={{marginBottom:12}}><Input readOnly value={source||currentName||''} placeholder={loading?'Đang tải tên bài…':undefined}/></Form.Item>
  <Row gutter={12} style={{marginInline:0,minWidth:0}}>
   <Col span={12} style={{minWidth:0}}><Form.Item label="Tiền tố" tooltip="Dùng {n} để chèn số thứ tự buổi. Khi sửa riêng một buổi, {n} = 1." style={{marginBottom:10}}><Input aria-label="Tiền tố tên hiển thị" disabled={loading||!source} value={prefix} maxLength={100} onChange={event=>{setChanged(true);setPrefix(event.target.value);onChange(calendarLessonDisplayName(source,event.target.value,suffix));}} placeholder="Không có"/></Form.Item></Col>
   <Col span={12} style={{minWidth:0}}><Form.Item label="Hậu tố" style={{marginBottom:10}}><Input aria-label="Hậu tố tên hiển thị" disabled={loading||!source} value={suffix} maxLength={100} onChange={event=>{setChanged(true);setSuffix(event.target.value);onChange(calendarLessonDisplayName(source,prefix,event.target.value));}} placeholder="Không có"/></Form.Item></Col>
  </Row>
  {error&&<Typography.Text type="warning" role="alert" style={{display:'block',fontSize:12,marginBottom:8}}>{error}</Typography.Text>}
  <div style={{marginBottom:16,fontSize:13,overflowWrap:'anywhere'}}><Typography.Text type="secondary">Trên lịch: </Typography.Text><Typography.Text>{display||'—'}</Typography.Text></div>
 </>;
}
