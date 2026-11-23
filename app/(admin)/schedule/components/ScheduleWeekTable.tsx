'use client';

import React,{useMemo,useState} from 'react';
import dayjs from 'dayjs';
import useSWR from 'swr';
import {Alert,Button,DatePicker,Empty,Radio,Select,Space,Spin,Tag} from 'antd';
import {LeftOutlined,RightOutlined} from '@ant-design/icons';
import {useAuthStore} from '@/stores/authStore';
import {SWR_NAMESPACES} from '@/lib/swrKeys';
import {getCalendarCrossFilterOptions,getLivestreams,type SchedulingProgram} from '@/services/livestreamService';
import type {ScheduleFilterValues} from '@/helper/scheduleFilters';
import {groupWeekSchedules,loadWeekProgramSchedules,weekFilterChoices,weekMonday,weekProgramSubject,weekScheduleParams,type WeekSchedule} from '@/helper/scheduleWeek';

type Props={programs:SchedulingProgram[];assistantNames:Map<string,string>;allowAllPrograms?:boolean;onOpen:(row:WeekSchedule)=>void};
const weekdayNames=['Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7','Chủ nhật'];
const subjectColor=(subject:string)=>{const colors=['#2458ad','#722ed1','#08979c','#ad6800','#c41d7f'];return colors[Array.from(subject).reduce((sum,c)=>sum+c.charCodeAt(0),0)%colors.length]};
const clock=(value:unknown)=>{const date=dayjs(String(value??'').replace(/Z$/,''));return date.isValid()?date.format('HH:mm'):'—'};

export default function ScheduleWeekTable({programs,assistantNames,allowAllPrograms=false,onOpen}:Props){
    const [monday,setMonday]=useState(()=>weekMonday(dayjs()));
    const [programCodes,setProgramCodes]=useState<string[]>([]);
    const [subjects,setSubjects]=useState<string[]>([]);
    const [system,setSystem]=useState<'all'|'topuni'|'topclass'>('all');
    const weekFilters:ScheduleFilterValues={calendar_source:'livestream',system_type:system==='all'?undefined:[system]};
    const authScope=useAuthStore(s=>`${s.user.userId}:${s.authSessionVersion}`);
    const optionParams=weekScheduleParams({calendar_source:'livestream'},monday)!;
    const optionQuery=useSWR([SWR_NAMESPACES.schedules,'week-filter-links',authScope,optionParams] as const,([,,,requestParams])=>getCalendarCrossFilterOptions({...requestParams,week_links:true}),{revalidateOnFocus:false});
    const choices=weekFilterChoices(optionQuery.data?.program_systems??[],programs,{programs:programCodes,subjects,system});
    const programLabel=(item:SchedulingProgram)=>item.subject_name&&item.subject_name!==item.code?`${item.code} · ${item.subject_name}`:item.code;
    const programOptions=programs.filter(item=>choices.programs.has(item.code)).map(item=>({value:item.code,label:programLabel(item)}));
    const subjectOptions=[...choices.subjects].sort((a,b)=>a.localeCompare(b,'vi')).map(value=>({value,label:value}));
    const params=allowAllPrograms||programCodes.length?weekScheduleParams(weekFilters,monday):null;
    const {data,error,isLoading,isValidating,mutate}=useSWR(params?[SWR_NAMESPACES.schedules,'week-table',authScope,params,programCodes] as const:null,([,,,requestParams,codes])=>loadWeekProgramSchedules(requestParams,codes,getLivestreams),{revalidateOnFocus:false});
    const groups=useMemo(()=>{
        const matchingCodes=new Set(programs.filter(item=>subjects.includes(weekProgramSubject(item))).map(item=>item.code));
        return groupWeekSchedules((data??[]).filter(row=>!subjects.length||matchingCodes.has(row.code??'')),programs,monday);
    },[data,programs,monday,subjects]);
    const days=Array.from({length:7},(_,i)=>monday.add(i,'day'));
    const count=groups.reduce((total,group)=>total+group.days.reduce((sum,day)=>sum+day.length,0),0);
    return <section className="schedule-week" aria-label="Bảng lịch tuần">
        <div className="schedule-week-toolbar">
            <div className="schedule-week-toolbar-main"><Space wrap><Button aria-label="Tuần trước" icon={<LeftOutlined/>} disabled={!weekScheduleParams(weekFilters,monday.subtract(7,'day'))} onClick={()=>setMonday(monday.subtract(7,'day'))}>Tuần trước</Button>
            <span className="schedule-week-picker">
                <span className="schedule-week-picker-measure" aria-hidden="true">{monday.format('DD/MM/YYYY')} – {monday.add(6,'day').format('DD/MM/YYYY')}</span>
                <DatePicker aria-label="Chọn tuần" picker="week" allowClear={false} value={monday} inputReadOnly format={date=>{const start=weekMonday(date);return `${start.format('DD/MM/YYYY')} – ${start.add(6,'day').format('DD/MM/YYYY')}`}} onChange={date=>date&&setMonday(weekMonday(date))} disabledDate={date=>!weekScheduleParams(weekFilters,weekMonday(date))}/>
            </span>
            <Button aria-label="Tuần tiếp theo" icon={<RightOutlined/>} disabled={!weekScheduleParams(weekFilters,monday.add(7,'day'))} onClick={()=>setMonday(monday.add(7,'day'))}>Tuần tiếp</Button></Space>
            <Select id="week-program" aria-label="Chương trình lịch tuần" className="schedule-week-program-filter" mode="multiple" maxTagCount={1} value={programCodes} allowClear showSearch optionFilterProp="label" loading={optionQuery.isLoading||optionQuery.isValidating} labelRender={selected=>{const item=programs.find(item=>item.code===selected.value);return item?programLabel(item):selected.label??selected.value}} placeholder={allowAllPrograms?'Tất cả chương trình':'Chọn chương trình'} options={programOptions} onChange={setProgramCodes}/>
            <Select id="week-subject" aria-label="Môn học lịch tuần" className="schedule-week-subject-filter" mode="multiple" maxTagCount={1} value={subjects} allowClear showSearch optionFilterProp="label" loading={optionQuery.isLoading||optionQuery.isValidating} placeholder="Tất cả môn" options={subjectOptions} onChange={setSubjects}/>
            </div>
            <div className="schedule-week-toolbar-side"><Radio.Group aria-label="Hệ thống lịch tuần" className="schedule-week-systems" value={system} onChange={event=>setSystem(event.target.value)} buttonStyle="solid">
                <Radio.Button value="all">Tất cả</Radio.Button><Radio.Button value="topuni" disabled={!choices.systems.has('topuni')}>Top Uni</Radio.Button><Radio.Button value="topclass" disabled={!choices.systems.has('topclass')}>Top Class</Radio.Button>
            </Radio.Group><Tag color="blue">{count} buổi</Tag></div>
        </div>
        {error&&<Alert showIcon type="error" message="Không tải được bảng lịch tuần" description={error.message} action={<Button onClick={()=>void mutate()}>Thử lại</Button>} style={{marginBottom:12}}/>}
        {optionQuery.error&&<Alert showIcon type="error" message="Không tải được lựa chọn lọc của tuần" action={<Button onClick={()=>void optionQuery.mutate()}>Thử lại</Button>} style={{marginBottom:12}}/>}
        <Spin spinning={isLoading||isValidating}>
            <div className="schedule-week-scroll" aria-busy={isLoading||isValidating}>
                <table className="schedule-week-grid"><caption className="schedule-week-caption">Lịch học theo khối/lớp và ngày trong tuần</caption>
                    <thead><tr><th scope="col">Kỳ thi / Khối lớp</th>{days.map((date,i)=><th scope="col" key={i}>{weekdayNames[i]}<br/>{date.format('DD/MM/YYYY')}</th>)}</tr></thead>
                    <tbody>{groups.map(group=><tr key={group.key}><th scope="row">{group.label}</th>{group.days.map((rows,i)=><td key={i}>{rows.map(row=>{
                        const cancelled=Number(row.lesson_status)===1;
                        const assistants=String(row.assistant_teacher??'').split(',').map(name=>name.trim()).filter(Boolean).map(name=>assistantNames.get(name)||name).join(', ');
                        return <button type="button" className={`schedule-week-card${cancelled?' schedule-week-cancelled':''}`} key={String(row.id)} onClick={()=>onOpen(row)} style={{borderLeftColor:cancelled?'#cf1322':subjectColor(row.subject??'')}}>
                            <strong>{clock(row.start_time)} – {clock(row.end_time)}</strong>
                            <span style={{color:subjectColor(row.subject??''),fontWeight:600}}>{row.subject||'Chưa có môn học'}</span>
                            {row.teacher&&<span className="schedule-week-teacher">{row.teacher}</span>}
                            <span className="schedule-week-lesson">{row.lesson_name||'Chưa có tên bài'}</span>
                            <span>Trợ giảng: {assistants||'—'}</span>
                            <span className="schedule-week-code">{row.code}</span>
                            {cancelled&&<span className="schedule-week-cancelled-label">Nghỉ học</span>}
                        </button>;
                    })}</td>)}</tr>)}</tbody>
                </table>
                {!isLoading&&!error&&!groups.length&&<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={!allowAllPrograms&&!programCodes.length?'Chọn chương trình để xem lịch tuần':'Không có lịch học trong tuần theo bộ lọc đã chọn'} style={{padding:24}}/>}
            </div>
        </Spin>
        <style>{`
            .schedule-week{min-width:0}.schedule-week-toolbar{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:14px}
            .schedule-week-toolbar-main,.schedule-week-toolbar-side{display:flex;align-items:center;gap:10px;flex-wrap:wrap;min-width:0}
            .schedule-week-toolbar-main{flex:1 1 760px}.schedule-week-toolbar-side{margin-left:auto}
            .schedule-week-program-filter{width:240px;max-width:100%}.schedule-week-subject-filter{width:180px;max-width:100%}
            .schedule-week-program-filter .ant-select-selection-overflow,.schedule-week-subject-filter .ant-select-selection-overflow{flex-wrap:nowrap}
            .schedule-week-program-filter .ant-select-selection-overflow-item,.schedule-week-subject-filter .ant-select-selection-overflow-item{min-width:0;flex-shrink:1;max-width:100%}
            .schedule-week-program-filter .ant-select-selection-overflow-item-rest,.schedule-week-subject-filter .ant-select-selection-overflow-item-rest{flex-shrink:0}
            .schedule-week-program-filter .ant-select-selection-overflow-item-suffix,.schedule-week-subject-filter .ant-select-selection-overflow-item-suffix{flex:1 1 4px;min-width:4px}
            .schedule-week-program-filter .ant-select-selection-item,.schedule-week-subject-filter .ant-select-selection-item{max-width:100%}
            .schedule-week-program-filter .ant-select-selection-item-content,.schedule-week-subject-filter .ant-select-selection-item-content{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
            .schedule-week-systems{display:flex;gap:6px;flex-wrap:wrap}.schedule-week-systems .ant-radio-button-wrapper{border:1px solid #b7d4ff;border-radius:16px;font-size:12px;padding-inline:12px}
            .schedule-week-systems .ant-radio-button-wrapper:before{display:none}
            .schedule-week-picker{position:relative;display:inline-block;max-width:100%;font-size:14px}
            .schedule-week-picker-measure{display:block;visibility:hidden;white-space:pre;line-height:22px;padding:4px 29px 4px 11px;border:1px solid transparent}
            .schedule-week-picker>.ant-picker{position:absolute;inset:0;width:100%;font:inherit}
            .schedule-week-scroll{max-height:72vh;overflow:auto;border:1px solid #e5e7eb;border-radius:6px}
            .schedule-week-grid{width:100%;min-width:1320px;border-collapse:separate;border-spacing:0;table-layout:fixed;font-size:12px}
            .schedule-week-caption{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
            .schedule-week-grid th,.schedule-week-grid td{padding:6px;border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;vertical-align:top;overflow-wrap:anywhere}
            .schedule-week-grid thead th{position:sticky;top:0;z-index:2;background:#2458ad;color:white;text-align:center;padding:12px 6px;font-size:13px}
            .schedule-week-grid th:first-child{width:130px;position:sticky;left:0;z-index:1;background:#f5f7fa;color:#2458ad;text-align:left;padding:12px}
            .schedule-week-grid thead th:first-child{z-index:3;background:#2458ad;color:#fff}
            .schedule-week-card{display:flex;flex-direction:column;gap:3px;width:100%;min-width:0;text-align:left;background:#f0f6ff;border:1px solid #d6e4ff;border-left:3px solid;padding:8px;margin-bottom:6px;border-radius:4px;color:#434343;font:inherit;line-height:1.45;cursor:pointer;overflow-wrap:anywhere}
            .schedule-week-card:hover{background:#e6f4ff}.schedule-week-card:focus-visible{outline:2px solid #1677ff;outline-offset:2px}
            .schedule-week-teacher{color:#08979c;font-weight:600}.schedule-week-lesson{font-style:italic;color:#262626}.schedule-week-code{color:#666;font-size:11px}
            .schedule-week-cancelled{background:#fff1f0;border-color:#ffa39e}.schedule-week-cancelled:hover{background:#ffccc7}.schedule-week-cancelled-label{color:#cf1322;font-size:16px;font-weight:700;font-style:italic}
        `}</style>
    </section>;
}
