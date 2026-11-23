import dayjs, {type Dayjs} from 'dayjs';
import {buildScheduleApiParams, type ScheduleFilterValues} from './scheduleFilters';
import type {LivestreamListParams, SchedulingProgram} from '../services/livestreamService';

export type WeekSchedule = {id?: string | number; code?: string; start_time?: string; end_time?: string; subject?: string; teacher?: string; lesson_name?: string; assistant_teacher?: string; lesson_status?: number | string; system_type?: string; [key: string]: any};
export const weekProgramSubject = (program: SchedulingProgram) => (program.curriculum_subject_name === undefined ? program.subject_name : program.curriculum_subject_name)?.trim() || '';
export const weekFilterChoices = (
    links: Array<{code:string;system_type:string|null}>, programs: SchedulingProgram[],
    selected: {programs?:string[];subjects?:string[];system:'all'|'topuni'|'topclass'},
) => {
    const metadata=new Map(programs.map(program=>[program.code,program]));
    const choices={programs:new Set<string>(),subjects:new Set<string>(),systems:new Set<string>()};
    for (const link of links) {
        const program=metadata.get(link.code);
        const subject=program?weekProgramSubject(program):'';
        const codeMatches=!selected.programs?.length||selected.programs.includes(link.code);
        const subjectMatches=!selected.subjects?.length||selected.subjects.includes(subject);
        const systemMatches=selected.system==='all'||link.system_type===selected.system;
        if(subjectMatches&&systemMatches)choices.programs.add(link.code);
        if(codeMatches&&systemMatches&&subject)choices.subjects.add(subject);
        if(codeMatches&&subjectMatches&&link.system_type)choices.systems.add(link.system_type);
    }
    return choices;
};
export const weekMonday = (date: Dayjs) => date.startOf('day').subtract((date.day()+6)%7,'day');
export const weekScheduleParams = (filters: ScheduleFilterValues, monday: Dayjs): LivestreamListParams | null => {
    const params = buildScheduleApiParams(filters);
    const start = monday.startOf('day'), end = monday.add(6,'day').endOf('day');
    const from = filters.date_range?.[0]?.startOf('day'), to = filters.date_range?.[1]?.endOf('day');
    const lower = from?.isAfter(start) ? from : start;
    const upper = to?.isBefore(end) ? to : end;
    if (lower.isAfter(upper)) return null;
    return {...params,start_time:lower.format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),end_time:upper.format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),page:1,limit:300,sort_by:'start_time,id',sort_order:'asc,asc'};
};

export const loadWeekSchedules = async (params: LivestreamListParams, getPage: (params: LivestreamListParams)=>Promise<any>): Promise<WeekSchedule[]> => {
    const first = await getPage({...params,page:1,limit:300});
    if (!Array.isArray(first?.data?.data) || !Number.isInteger(Number(first?.data?.total)) || Number(first.data.total)<0) throw Error('Dữ liệu lịch tuần không hợp lệ');
    const total = Number(first.data.total), rows: WeekSchedule[] = [...first.data.data];
    const seen = new Set(rows.map(row=>String(row.id)));
    for (let page=2; rows.length<total; page++) {
        const result = await getPage({...params,page,limit:300});
        const next = result?.data?.data;
        if (!Array.isArray(next) || !next.length) throw Error('Chưa tải đủ lịch tuần. Vui lòng làm mới.');
        for (const row of next) {
            if (seen.has(String(row.id))) throw Error('Danh sách lịch vừa thay đổi. Vui lòng làm mới.');
            seen.add(String(row.id));
        }
        rows.push(...next);
    }
    const unique = new Map(rows.map(row=>[String(row.id),row]));
    if (unique.size !== total) throw Error('Danh sách lịch vừa thay đổi. Vui lòng làm mới.');
    return [...unique.values()];
};

export const loadWeekProgramSchedules = async (params: LivestreamListParams, codes: string[], getPage: (params: LivestreamListParams)=>Promise<any>): Promise<WeekSchedule[]> => {
    const selected=[...new Set(codes)];
    if(!selected.length)return loadWeekSchedules(params,getPage);
    const rows:WeekSchedule[]=[];
    // The existing list API accepts one program per request; keep its permission
    // checks and page through each program, with bounded request concurrency.
    for(let offset=0;offset<selected.length;offset+=4){
        const batches=await Promise.all(selected.slice(offset,offset+4).map(code=>loadWeekSchedules({...params,code},getPage)));
        rows.push(...batches.flat());
    }
    return [...new Map(rows.map(row=>[String(row.id),row])).values()];
};

export const groupWeekSchedules = (rows: WeekSchedule[], programs: SchedulingProgram[], monday: Dayjs) => {
    const metadata = new Map(programs.map(program=>[program.code,program]));
    const groups = new Map<string,{key:string;label:string;order:number;days:WeekSchedule[][]}>();
    for (const row of rows) {
        const date = dayjs(String(row.start_time??'').replace(/Z$/,''));
        const index = date.startOf('day').diff(monday.startOf('day'),'day');
        if (!date.isValid() || index<0 || index>6) continue;
        const program = metadata.get(row.code??'');
        const grade = Number(program?.grade);
        const hasGrade = Number.isInteger(grade) && grade>=1 && grade<=12;
        const key = hasGrade ? `grade:${grade}` : `program:${row.code??'unknown'}`;
        let group = groups.get(key);
        if (!group) {group={key,label:hasGrade?`Lớp ${grade}`:row.code||'Chưa có chương trình',order:hasGrade?grade:100,days:Array.from({length:7},()=>[])};groups.set(key,group);}
        group.days[index].push(row);
    }
    return [...groups.values()].sort((a,b)=>a.order-b.order||a.label.localeCompare(b.label,'vi')).map(group=>({...group,days:group.days.map(day=>day.sort((a,b)=>String(a.start_time).localeCompare(String(b.start_time))||String(a.id).localeCompare(String(b.id),'vi',{numeric:true})))}));
};
