'use client';
import {useEffect,useId,useMemo,useState,type ReactNode} from 'react';
import {Alert,Button,DatePicker,Form,InputNumber,Space,Tooltip,Typography} from 'antd';
import {CloseOutlined,DownOutlined,FilterOutlined,UpOutlined} from '@ant-design/icons';
import dayjs from 'dayjs';
import Select from '@/components/ui/MobileSelect';
import TeachingStaffSelect from '@/components/shared/TeachingStaffSelect';
import {useScheduleClassificationOptionsQuery} from '@/hooks/useLmsQueries';
import {calendarSourceFromCode} from '@/helper/lesson';
import {cleanFilterValues,type ScheduleFilterValues} from '@/helper/scheduleFilters';
import type {ScheduleClassification} from '@/services/livestreamService';
import styles from './ScheduleFilterPanel.module.css';

type Props={value:ScheduleFilterValues;loading:boolean;onSearch:(values:ScheduleFilterValues)=>void;onReset:()=>void;programOptions:Array<{value:string;label:string}>;loadingPrograms:boolean;allowFilterWithoutProgram:boolean;sheet?:boolean;dateRangeInput?:ReactNode};
const weekdays=[1,2,3,4,5,6,7].map(value=>({value,label:value===7?'Chủ nhật':`Thứ ${value+1}`}));
const statuses=[{value:'upcoming',label:'Chưa bắt đầu'},{value:'ongoing',label:'Đang diễn ra'},{value:'completed',label:'Đã kết thúc'},{value:'cancelled',label:'Nghỉ học'}];
const sources=[{value:'livestream',label:'Livestream'},{value:'feed',label:'Feed'}];
const systems=[{value:'topclass',label:'Topclass'},{value:'topuni',label:'Topuni'}];
const multiple={mode:'multiple' as const,maxTagCount:'responsive' as const,allowClear:true};

export default function ScheduleFilterPanel({value,loading,onSearch,onReset,programOptions,loadingPrograms,allowFilterWithoutProgram,sheet=false,dateRangeInput}:Props){
 const [form]=Form.useForm(),[expanded,setExpanded]=useState(true);const region=useId();
 const classificationQuery=useScheduleClassificationOptionsQuery();
 const records:ScheduleClassification[]=Array.isArray(classificationQuery.data?.data)?classificationQuery.data.data:[];
 const source=Form.useWatch('calendar_source',form)||value.calendar_source||'livestream';
 const program=Form.useWatch('code',form),subject=Form.useWatch('subject_name',form),grade=Form.useWatch('grade',form);
 const sourcePrograms=programOptions.filter(option=>calendarSourceFromCode(option.value)===source);
 const programRecords=records.filter(row=>calendarSourceFromCode(row.code)===source&&(!program||row.code===program));
 const subjectOptions=[...new Set(programRecords.filter(row=>!grade||row.grade===grade).map(row=>row.subject_name))].sort((a,b)=>a.localeCompare(b,'vi')).map(name=>({value:name,label:name}));
 const gradeOptions=[...new Set(programRecords.filter(row=>!subject||row.subject_name===subject).map(row=>row.grade).filter((n):n is number=>n!==null&&n>=1&&n<=12))].sort((a,b)=>a-b).map(n=>({value:n,label:`Khối ${n}`}));
 useEffect(()=>{form.resetFields();form.setFieldsValue({...value,calendar_source:value.calendar_source??'livestream'});},[form,value]);
 function reconcile(changed:Partial<ScheduleFilterValues>,values:ScheduleFilterValues){
  if(changed.calendar_source!==undefined&&values.code&&calendarSourceFromCode(values.code)!==values.calendar_source){values.code=undefined;form.setFieldValue('code',undefined);}
  // Only reconcile after user changes; never silently discard URL-applied filters while options load.
  if(Object.hasOwn(changed,'code')||Object.hasOwn(changed,'calendar_source')){
   const available=records.filter(row=>calendarSourceFromCode(row.code)===(values.calendar_source||'livestream')&&(!values.code||row.code===values.code));
   if(values.subject_name&&!available.some(row=>row.subject_name===values.subject_name)){form.setFieldValue('subject_name',undefined);values.subject_name=undefined;}
   if(values.grade!==undefined&&!available.some(row=>row.grade===values.grade&&(!values.subject_name||row.subject_name===values.subject_name)))form.setFieldValue('grade',undefined);
  }
 }
 const summary=useMemo(()=>{
  const primary:string[]=[],items:string[]=[];
  if(value.code)primary.push(programOptions.find(option=>option.value===value.code)?.label||value.code);
  if(value.subject_name)primary.push(value.subject_name);
  if(value.date_range)primary.push(value.date_range.map(date=>date.format('DD/MM/YYYY')).join(' – '));
  if(value.grade)items.push(`Khối ${value.grade}`);
  if(value.teacher?.length)items.push(`Giáo viên: ${value.teacher.join(', ')}`);
  if(value.assistant_teachers?.length)items.push(`Trợ giảng: ${value.assistant_teachers.join(', ')}`);
  if(value.weekdays?.length)items.push(value.weekdays.map(day=>weekdays.find(option=>option.value===day)?.label).join(', '));
  if(value.from_learn_number||value.to_learn_number)items.push(`Bài ${value.from_learn_number||'…'} – ${value.to_learn_number||'…'}`);
  if(value.time_status?.length)items.push(value.time_status.map(status=>statuses.find(option=>option.value===status)?.label).join(', '));
  if(value.calendar_source==='feed')items.push('Nguồn: Feed');if(value.system_type?.length)items.push(value.system_type.map(type=>systems.find(option=>option.value===type)?.label).join(', '));
  return {primary,extra:items,all:[...primary,...items].join(' · ')};
 },[value,programOptions]);
 const fields:Record<string,{label:ReactNode;control:ReactNode;rules?:any[];normalize?:(value:any)=>any}>= {
  code:{label:'Chương trình',rules:allowFilterWithoutProgram?[]:[{required:true,message:'Chọn Chương trình'}],control:<Select showSearch allowClear={allowFilterWithoutProgram?(sheet?{clearIcon:<span className="schedule-filter-program-clear-icon" aria-label="Xóa chương trình đã chọn" onTouchEnd={event=>{event.preventDefault();event.stopPropagation();form.setFieldValue('code',undefined);reconcile({code:undefined},form.getFieldsValue());}}><CloseOutlined/></span>}:true):false} loading={loadingPrograms} options={sourcePrograms} optionFilterProp="label" placeholder={allowFilterWithoutProgram?'Tất cả Chương trình':'Chọn Chương trình'}/>},
  exam:{label:<Tooltip title="Kỳ thi hiện chỉ hiển thị, chưa tham gia lọc kết quả."><span>Kỳ thi</span></Tooltip>,control:<Select disabled placeholder="Chưa hỗ trợ lọc" aria-label="Kỳ thi"/>},
  subject_name:{label:'Môn học',control:<Select allowClear showSearch optionFilterProp="label" loading={classificationQuery.isLoading} options={subjectOptions} placeholder="Tất cả môn học"/>},
  grade:{label:'Khối',control:<Select allowClear options={gradeOptions} loading={classificationQuery.isLoading} placeholder="Tất cả khối"/>},
  teacher:{label:'Giáo viên',control:<TeachingStaffSelect teacherType={1} {...multiple} allowQuickCreate={false} showSearch placeholder="Tất cả giáo viên"/>},
  assistant_teachers:{label:'Trợ giảng',control:<TeachingStaffSelect teacherType={0} {...multiple} allowQuickCreate={false} showSearch placeholder="Tất cả trợ giảng"/>},
  date_range:{label:'Khoảng ngày',normalize:range=>{const [from,to]=Array.isArray(range)?range:[];return dayjs.isDayjs(from)&&from.isValid()&&dayjs.isDayjs(to)&&to.isValid()?[from,to]:undefined;},control:dateRangeInput||<DatePicker.RangePicker format="DD/MM/YYYY" placeholder={["Từ ngày","Đến ngày"]}/>},
  weekdays:{label:'Thứ',control:<Select {...multiple} options={weekdays} placeholder="Tất cả các thứ"/>},
  lesson_range:{label:'Khoảng bài',control:<Space.Compact block><Form.Item name="from_learn_number" noStyle><InputNumber min={1} precision={0} placeholder="Từ bài" style={{width:'50%'}}/></Form.Item><Form.Item name="to_learn_number" noStyle><InputNumber min={1} precision={0} placeholder="Đến bài" style={{width:'50%'}}/></Form.Item></Space.Compact>},
  time_status:{label:'Trạng thái',control:<Select {...multiple} options={statuses} placeholder="Tất cả trạng thái"/>},
  calendar_source:{label:'Nguồn lịch',control:<Select options={sources}/>},
  system_type:{label:'Hệ thống',control:<Select {...multiple} options={systems} placeholder="Tất cả hệ thống"/>},
 };
 // Kỳ thi is intentionally display-only and is never included in submitted values.
 const render=(keys:string[])=>keys.map(key=>{const field=fields[key];return <Form.Item key={key} name={['exam','lesson_range'].includes(key)?undefined:key} label={field.label} rules={field.rules} normalize={field.normalize} className={styles[`field_${key}`]}>{field.control}</Form.Item>;});
 return <section data-schedule-tour="filters" className={`${styles.panel} ${sheet?styles.sheet:''}`}>
  {!sheet&&<div className={`${styles.header} ${!expanded?styles.headerCollapsed:''}`}>
   <span className={styles.title}><FilterOutlined/> Bộ lọc lịch học</span>
   {!expanded&&<div className={styles.compactSummary} aria-label="Bộ lọc đang áp dụng">
    <Tooltip title={summary.all||undefined} trigger={['hover','focus','click']}>
     <span className={styles.compactText} tabIndex={summary.all?0:undefined}>{summary.primary.length?summary.primary.join(' · '):summary.extra.length?'Đang áp dụng bộ lọc':'Chưa áp dụng bộ lọc'}</span>
    </Tooltip>
    {summary.extra.length>0&&<Tooltip title={<div>{summary.extra.map((item,index)=><div key={index}>{item}</div>)}</div>} trigger={['hover','focus','click']}><Button className={styles.moreFilters} type="link" size="small" aria-label={`Xem ${summary.extra.length} bộ lọc khác`}>+{summary.extra.length} bộ lọc</Button></Tooltip>}
   </div>}
   <Button className={styles.toggle} type="text" size="small" aria-expanded={expanded} aria-controls={region} onClick={()=>setExpanded(open=>!open)} icon={expanded?<UpOutlined/>:<DownOutlined/>}>{expanded?'Thu gọn':'Mở rộng'}</Button>
  </div>}
  <div id={region} className={`${styles.reveal} ${sheet||expanded?styles.revealOpen:''}`} aria-hidden={!sheet&&!expanded} inert={!sheet&&!expanded}>
   <div className={styles.revealInner}>
   {classificationQuery.error&&<Alert type="warning" showIcon message="Chưa tải được danh sách môn học và khối" action={<Button size="small" onClick={()=>void classificationQuery.mutate()}>Thử lại</Button>} style={{marginBottom:12}}/>}
   <Form form={form} layout="vertical" onValuesChange={reconcile} onFinish={values=>onSearch(cleanFilterValues(values))} className={styles.form} initialValues={{calendar_source:'livestream'}}>
    <div className={styles.classification}>{render(['code','exam','subject_name','grade','teacher','assistant_teachers'])}</div>
    <div className={styles.conditions}>{render(['date_range','weekdays','lesson_range','time_status','calendar_source','system_type'])}
     <div className={styles.actions}><Button onClick={()=>{form.resetFields();onReset();}}>Xóa lọc</Button><Button type="primary" htmlType="submit" icon={<FilterOutlined/>} loading={loading}>Lọc</Button></div>
    </div>
   </Form>
   </div>
  </div>
 </section>;
}
