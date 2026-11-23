 'use client';
import React, {useEffect,useRef,useState} from 'react';
import useSWR,{useSWRConfig} from 'swr';
import dayjs from 'dayjs';
import {ArrowLeftOutlined} from '@ant-design/icons';
import {Alert,Button,Card,Col,Collapse,DatePicker,Grid,Form,Row,Select,Space,Spin,Statistic,Table,Tabs,Tag,Tooltip,Typography,message} from 'antd';
import ScheduleTrend from './ScheduleTrend';
import {GRADE_OPTIONS} from '@/constants/subjects';
import {useAuthStore} from '@/stores/authStore';
import PersonnelCharts from './PersonnelCharts';
import {reportGet,reportExport} from '@/services/teachingReportService';
import {matchesReportFilters,reportFilterChoices,reportFilterKeys,type ReportFilters} from './report-filters';
const {Title,Text}=Typography;
const labels:Record<string,string>={upcoming:'Chưa diễn ra',ongoing:'Đang diễn ra',ended:'Đã kết thúc theo lịch',cancelled:'Nghỉ học'};
const options=(values:string[])=>values.map(value=>({value,label:value==='cancelled'?<Text type='danger'>{labels[value]}</Text>:labels[value]??value}));
const dateText=(v:any)=>v?String(v).replace('T',' ').slice(0,16):'—';
const hoursText=(v:unknown)=>v==null||String(v).trim()===''||!Number.isFinite(Number(v))?'—':Number(v).toFixed(2);
const field=(name:string,label:string,child:React.ReactNode,required=false)=><Form.Item name={name} label={label} rules={required?[{required:true,message:'Chọn '+label.toLowerCase()}]:[]}>{child}</Form.Item>;
const getError=(e:unknown)=>e instanceof Error?e.message:'Không tải được báo cáo';
export default function TeachingReportsPage(){
    const screens=Grid.useBreakpoint(),[filterOpen,setFilterOpen]=useState<string[]>();
    const user=useAuthStore(s=>s.user),session=useAuthStore(s=>s.authSessionVersion),can=useAuthStore(s=>s.hasPermission);
    const permitted=can('teaching_report.view'),namespace=`${user.userId}:${session}`;
    const [query,setQuery]=useState<any>({from:dayjs().startOf('month').format('YYYY-MM-DD'),to:dayjs().add(1,'month').startOf('month').format('YYYY-MM-DD'),collection:'sessions',page:1,limit:25,hours_mode:'union'});
    const [filters]=Form.useForm();
    const [detailContext,setDetailContext]=useState<{query:any;filters:any}|null>(null);
    const {mutate:mutateReportCache}=useSWRConfig();
    const [pendingAction,setPendingAction]=useState<'submit'|'reset'|'refresh'|null>(null),[actionError,setActionError]=useState<unknown>();
    const actionInFlight=useRef(false);
    const filterRange=Form.useWatch('range',filters),filterCode=Form.useWatch('code',filters),filterTeacher=Form.useWatch('teacher_id',filters),filterAssistant=Form.useWatch('assistant_id',filters),filterSubject=Form.useWatch('subject',filters),filterGrade=Form.useWatch('grade',filters),filterRole=Form.useWatch('role',filters),filterSystem=Form.useWatch('system_type',filters);
    const {data,error,isLoading,isValidating}=useSWR(permitted?['teaching-report',namespace,query]:null,()=>reportGet('',query),{revalidateOnFocus:false,revalidateIfStale:false});
    const reportBusy=isLoading||isValidating||pendingAction!==null;
    const loadReport=async(nextQuery:any,action:'submit'|'reset'|'refresh')=>{
        if(actionInFlight.current)return;
        actionInFlight.current=true;setPendingAction(action);setActionError(undefined);
        try{
            // Fetch even when filters are unchanged or the destination report is cached.
            // Keep the current report visible until the new response is ready.
            await mutateReportCache(['teaching-report',namespace,nextQuery],()=>reportGet('',nextQuery),{populateCache:true,revalidate:false});
            setQuery(nextQuery);
            if(!nextQuery.person_id)setDetailContext(null);
        }catch(error){setActionError(error);}
        finally{actionInFlight.current=false;setPendingAction(null);}
    };
    const optionDates = { from: filterRange?.[0]?.format('YYYY-MM-DD') ?? query.from, to: filterRange?.[1]?.add(1, 'day').format('YYYY-MM-DD') ?? query.to };
    const { data: reportOpts, error: reportOptionError, isLoading: reportOptionsLoading } = useSWR(permitted ? ['teaching-report-options', namespace, optionDates] : null, () => reportGet('options', optionDates), { revalidateOnFocus: false, keepPreviousData: false });
    useEffect(() => {
        if (!reportOpts) return;
        // Reconcile only when the date-scoped assignments change, retaining valid selections.
        const current = filters.getFieldsValue(), changes: Record<string, unknown> = {}, retained: ReportFilters = {};
        for (const key of reportFilterKeys) {
            if (current[key] == null) continue;
            const candidate = { ...retained, [key]: current[key] };
            if ((reportOpts.assignments ?? []).some((link: any) => matchesReportFilters(link, candidate))) retained[key] = current[key];
            else changes[key] = undefined;
        }
        if (Object.keys(changes).length) filters.setFieldsValue(changes);
    }, [reportOpts, filters]);
    const assignmentLinks = reportOpts?.assignments ?? [];
    const linkedChoices = reportFilterChoices(assignmentLinks, { code: filterCode, teacher_id: filterTeacher, assistant_id: filterAssistant, subject: filterSubject, grade: filterGrade, role: filterRole, system_type: filterSystem });
    const staffOption = (t: any) => ({ value: t.id, label: `${t.display_name || t.username} · ${t.username}${t.status === 0 ? ' (ngừng hoạt động)' : ''}` });
    const linkedPrograms = (reportOpts?.programs ?? []).filter((code: string) => linkedChoices.programs.has(code)).map((value: string) => ({ value, label: value }));
    const linkedTeachers = (reportOpts?.teachers ?? []).filter((t: any) => linkedChoices.teachers.has(t.id)).map(staffOption);
    const linkedAssistants = (reportOpts?.assistants ?? []).filter((t: any) => linkedChoices.assistants.has(t.id)).map(staffOption);
    const linkedSubjects = (reportOpts?.subjects ?? []).filter((value: string) => linkedChoices.subjects.has(value)).map((value: string) => ({ value, label: value }));
    const linkedGrades = GRADE_OPTIONS.filter(option => linkedChoices.grades.has(option.value));
    const filterSelectProps = { loading: reportOptionsLoading, disabled: reportOptionsLoading || !!reportOptionError, notFoundContent: reportOptionsLoading ? 'Đang tải phân công…' : 'Không có phân công phù hợp trong khoảng ngày đã chọn' };

    const openPerson=(id:number,role:'teacher'|'assistant')=>{
        if(reportBusy)return;
        setDetailContext(current=>({query:query.person_id&&current?current.query:{...query},filters:query.person_id&&current?current.filters:filters.getFieldsValue(true)}));
        const field=role==='teacher'?'teacher_id':'assistant_id';
        filters.setFieldsValue({role,[field]:id});
        setQuery({...query,[field]:id,person_id:id,role,collection:'sessions',page:1,sort:undefined});
    };
    const backToOverview=()=>{
        if(reportBusy)return;
        const previous=detailContext?.query??{...query,person_id:undefined,role:undefined,collection:'teachers',page:1,sort:undefined};
        filters.resetFields();
        filters.setFieldsValue(detailContext?.filters??{role:previous.role});
        setQuery(previous);setDetailContext(null);setActionError(undefined);
    };
    const backButton=<Button icon={<ArrowLeftOutlined/>} disabled={reportBusy} onClick={backToOverview}>Quay lại tổng quan</Button>;
    const stats=data?.summary;
    const sessionColumns:any[]=[{title:'Ngày / bài',render:(_:any,r:any)=><><a href={`/schedule?program=${encodeURIComponent(r.code)}&calendar_id=${r.id}`} target='_blank' rel='noreferrer'>{dateText(r.start_time)}</a><div>{r.lesson_name}</div><Text type='secondary'>{r.code}</Text></>},
      {title:'Môn / khối',render:(_:any,r:any)=>`${r.subject??'—'}${r.grade?' · Lớp '+r.grade:''}`},
      {title:'Giáo viên',dataIndex:'teacher'},{title:'Trợ giảng',dataIndex:'assistant_teacher'},
      {title:'Giờ theo lịch',render:(_:any,r:any)=>hoursText(r.scheduled_seconds/3600)},
      {title:'Trùng giờ',render:(_:any,r:any)=>r.overlaps?.length?r.overlaps.map((o:any)=><div key={`${o.person_id}:${o.role}`}><Tooltip trigger={['hover','click']} title={<div>{o.calendars?.map((c:any)=><div key={c.id}><a href={`/schedule?program=${encodeURIComponent(c.code)}&calendar_id=${c.id}`} target='_blank' rel='noopener noreferrer' style={{color:'inherit',textDecoration:'underline'}}>Lịch #{c.id} · {c.code}: {dateText(c.start_time)} – {dateText(c.end_time)} ↗</a></div>)}{o.count>5&&<div>Và {o.count-5} lịch khác</div>}</div>}><Tag color='orange'>{o.name} ({o.role==='teacher'?'GV':'TG'}): trùng {o.count} lịch</Tag></Tooltip></div>):'—'},
      {title:'Trạng thái',render:(_:any,r:any)=><><Tag color={r.progress==='cancelled'?'red':undefined}>{labels[r.progress]}</Tag>{r.issues?.map((v:string)=><div key={v}><Text type='warning'>{v}</Text></div>)}</>}];
    const teacherColumns:any[]=[{title:'Nhân sự',render:(_:any,r:any)=><Button type='link' onClick={()=>openPerson(r.teacher_profile_id,r.role)}>{r.name}</Button>},
      {title:'Mã',dataIndex:'username'},{title:'Vai trò',dataIndex:'role',render:(v:string)=>v==='teacher'?'Giáo viên':'Trợ giảng'},
      {title:'Phân công',dataIndex:'assigned'},{title:'Lịch trùng giờ',dataIndex:'overlapping_calendars',render:(v:number)=>v?<Tag color='orange'>{v}</Tag>:'—'},{title:'Đã kết thúc theo lịch',dataIndex:'ended'},{title:'Nghỉ học',dataIndex:'cancelled',render:(value:number)=><Text type={value>0?'danger':undefined}>{value}</Text>},
      {title:'Giờ theo lịch',dataIndex:'scheduled_hours',render:hoursText},{title:'Giờ lịch đã kết thúc',dataIndex:'ended_hours',render:hoursText}];
    if(!permitted)return <Alert type='warning' message='Bạn không có quyền xem báo cáo'/>;
    return <main className='admin-responsive-page' style={{width:'100%',minWidth:0}}>
    <style jsx global>{`
        .teaching-report-table .ant-table-body,
        .teaching-report-table .ant-table-content {
            max-height: none !important;
            overflow-y: hidden !important;
        }
    `}</style>
    <Space wrap style={{display:'flex',justifyContent:'space-between',marginBottom:16}}><Title level={3}>Báo cáo giảng dạy</Title><Space><Button loading={pendingAction==='refresh'} disabled={reportBusy&&pendingAction!=='refresh'} onClick={()=>void loadReport(query,'refresh')}>Làm mới</Button>{can('teaching_report.export')&&<Button disabled={reportBusy} onClick={async()=>{try{await reportExport(query);}catch(e){message.error(getError(e));}}}>Xuất Excel</Button>}</Space></Space>
    {(actionError||error||reportOptionError)&&<Alert type='error' message={getError(actionError||error||reportOptionError)} style={{marginBottom:16}}/>}
   <Collapse style={{marginBottom:16}} activeKey={filterOpen??(screens.md?['filters']:[])} onChange={keys=>setFilterOpen(Array.isArray(keys)?keys:[keys])} items={[{key:'filters',label:'Bộ lọc báo cáo',forceRender:true,children:<Card size='small'><Form form={filters} disabled={pendingAction!==null} layout='vertical' onFinish={v => { const values = { ...v, group_id: undefined, person_id: undefined, from: v.range?.[0]?.format('YYYY-MM-DD') ?? query.from, to: v.range?.[1]?.add(1, 'day').format('YYYY-MM-DD') ?? query.to }; delete values.range; void loadReport({ ...query, ...values, page: 1 },'submit'); }} initialValues={{ range: [dayjs(query.from), dayjs(query.to).subtract(1, 'day')], hours_mode:'union' }}>
    <Row gutter={12}><Col xs={24} md={8}>{field('range', 'Khoảng ngày', <DatePicker.RangePicker format='DD/MM/YYYY' style={{ width: '100%' }} presets={[
                    { label: 'Hôm nay', value: [dayjs(), dayjs()] }, { label: 'Tuần này', value: [dayjs().startOf('week'), dayjs().endOf('week')] }, { label: 'Tháng này', value: [dayjs().startOf('month'), dayjs().endOf('month')] }, { label: 'Quý này', value: [dayjs().month(Math.floor(dayjs().month() / 3) * 3).startOf('month'), dayjs().month(Math.floor(dayjs().month() / 3) * 3 + 2).endOf('month')] }, { label: 'Năm nay', value: [dayjs().startOf('year'), dayjs().endOf('year')] }
                ]}/>)}</Col>
    <Col xs={12} md={4}>{field('system_type','Hệ thống',<Select {...filterSelectProps} allowClear options={[{value:'topclass',label:'Top Class'},{value:'topuni',label:'Top Uni'}].filter(option=>linkedChoices.systems.has(option.value))} placeholder='Chọn hệ thống'/>)}</Col>
    <Col xs={24} md={6}>{field('code', 'Chương trình', <Select {...filterSelectProps} allowClear showSearch options={linkedPrograms}/>, false)}</Col><Col xs={24} md={6}>{field('teacher_id', 'Giáo viên', <Select {...filterSelectProps} allowClear showSearch optionFilterProp='label' options={linkedTeachers}/>, false)}</Col>
    <Col xs={24} md={6}>{field('assistant_id', 'Trợ giảng', <Select {...filterSelectProps} allowClear showSearch optionFilterProp='label' options={linkedAssistants}/>, false)}</Col><Col xs={12} md={6}>{field('subject', 'Môn học', <Select {...filterSelectProps} allowClear showSearch optionFilterProp='label' options={linkedSubjects} placeholder='Chọn môn học'/>, false)}</Col><Col xs={12} md={6}>{field('grade', 'Khối', <Select {...filterSelectProps} allowClear showSearch optionFilterProp='label' options={linkedGrades} placeholder='Chọn khối'/>, false)}</Col>
    <Col xs={12} md={6}>{field('progress', 'Tiến độ lịch', <Select allowClear options={options(['upcoming', 'ongoing', 'ended', 'cancelled'])}/>, false)}</Col><Col xs={12} md={4}>{field('role', 'Vai trò giảng dạy', <Select {...filterSelectProps} allowClear options={[{ value: 'teacher', label: 'Giáo viên' }, { value: 'assistant', label: 'Trợ giảng' }].filter(option=>linkedChoices.roles.has(option.value))}/>, false)}</Col><Col xs={24} md={6}>{field('hours_mode','Cách tính giờ nhân sự',<Select options={[{value:'union',label:'Gộp giờ trùng (theo người và vai trò)'},{value:'per_assignment',label:'Cộng theo từng lịch phân công'}]}/>)}</Col></Row>
    <Text type='secondary' style={{ display: 'block', marginBottom: 12 }}>Hệ thống, chương trình, giáo viên, trợ giảng, môn học, khối và vai trò giảng dạy được lọc chéo theo phân công trong khoảng ngày đã chọn. Xóa lựa chọn để mở rộng danh sách.</Text>
    <Space><Button type='primary' htmlType='submit' loading={pendingAction==='submit'} disabled={reportOptionsLoading || !!reportOptionError || (pendingAction!==null&&pendingAction!=='submit')}>Xem báo cáo</Button><Button loading={pendingAction==='reset'} disabled={pendingAction!==null&&pendingAction!=='reset'} onClick={() => { filters.resetFields(); void loadReport({ from: dayjs().startOf('month').format('YYYY-MM-DD'), to: dayjs().add(1, 'month').startOf('month').format('YYYY-MM-DD'), collection: 'sessions', page: 1, limit: 25, hours_mode:'union' },'reset'); }}>Đặt lại</Button></Space>
   </Form></Card>}]} />

    <Spin spinning={reportBusy} tip='Đang tải báo cáo…'><section aria-label='Kết quả báo cáo' aria-busy={reportBusy}>
    <Alert type='info' showIcon style={{marginBottom:16}} message={`Thời lượng được tổng hợp từ giờ bắt đầu và kết thúc trên lịch, không phải thời gian có mặt thực tế. Lịch nghỉ học không cộng giờ. ${data?.metadata?.hours_mode==='per_assignment'?'Giờ nhân sự cộng đủ theo từng lịch phân công, kể cả lịch trùng giờ.':'Giờ nhân sự gộp các khoảng trùng theo từng người và vai trò.'} Chỉ cộng giờ nhân sự đã khớp hồ sơ. Cảnh báo trùng giờ xét các lịch trong kết quả lọc; di chuột hoặc bấm vào nhãn để xem lịch trùng.`}/>
    <Row gutter={[12,12]} style={{marginBottom:16}}>{[['Lịch phân công',stats?.assigned],['Đã kết thúc theo lịch',stats?.ended],['Chưa diễn ra',stats?.upcoming],['Nghỉ học',stats?.cancelled],['Giờ lịch đã kết thúc',hoursText(stats?.ended_hours)],['Giờ giáo viên (đã kết thúc)',hoursText(stats?.teacher_hours)],['Giờ trợ giảng (đã kết thúc)',hoursText(stats?.assistant_hours)]].map(([title,value])=><Col xs={12} md={6} key={title}><Card size='small'><Statistic title={title} value={value??0} valueStyle={title==='Nghỉ học'?{color:'#cf1322'}:undefined}/></Card></Col>)}</Row>
    <ScheduleTrend daily={data?.charts?.daily} from={query.from} to={query.to}/>
    <PersonnelCharts teachers={data?.charts?.teachers} assistants={data?.charts?.assistants} role={query.role} loading={isLoading&&!data} navigation={query.person_id?backButton:undefined} onSelect={openPerson}/>
    <Tabs activeKey={query.collection} onChange={collection=>setQuery({...query,collection,page:1,sort:undefined})} items={[{key:'sessions',label:'Lịch giảng dạy'},{key:'teachers',label:'Theo nhân sự'}]}/>
    <Table<any> className='teaching-report-table' sticky={{offsetHeader:screens.xl?-24:-12}} key={query.collection} rowKey='id' dataSource={data?.collection===query.collection?data.rows:[]} columns={query.collection==='teachers'?teacherColumns:sessionColumns} scroll={{x:1050}} pagination={{size:'small',position:['bottomRight'],current:query.page,pageSize:query.limit,total:data?.pagination?.total??0,showTotal:total=>`Tổng ${total} ${query.collection==='teachers'?'phân công nhân sự':'buổi học'}`,showSizeChanger:true,pageSizeOptions:[25,50,100],onChange:(page,limit)=>setQuery({...query,page:limit!==query.limit?1:page,limit})}}/>
    </section></Spin>
    </main>;
}
