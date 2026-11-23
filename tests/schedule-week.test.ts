import test from 'node:test';
import assert from 'node:assert/strict';
import dayjs from 'dayjs';
import {weekMonday,weekScheduleParams,groupWeekSchedules,loadWeekSchedules,loadWeekProgramSchedules,weekFilterChoices} from '../helper/scheduleWeek';

test('week facets use only scheduled programs and cross-filter without locking their own choice',()=>{
    const programs=[{code:'A',curriculum_subject_name:'Toán'},{code:'B',curriculum_subject_name:'Ngữ văn'},{code:'C',curriculum_subject_name:'Toán'},{code:'D',curriculum_subject_name:'Sinh học'}];
    const links=[{code:'A',system_type:'topclass'},{code:'B',system_type:'topclass'},{code:'C',system_type:'topuni'}];
    const all=weekFilterChoices(links,programs,{system:'all'});
    assert.deepEqual([...all.programs],['A','B','C']);assert.deepEqual([...all.subjects],['Toán','Ngữ văn']);
    const math=weekFilterChoices(links,programs,{subjects:['Toán'],system:'topclass'});
    assert.deepEqual([...math.programs],['A']);assert.deepEqual([...math.systems],['topclass','topuni']);
    const chosen=weekFilterChoices(links,programs,{programs:['A'],system:'all'});
    assert.deepEqual([...chosen.subjects],['Toán']);assert.deepEqual([...chosen.systems],['topclass']);
    const multiple=weekFilterChoices(links,programs,{programs:['A','B'],subjects:['Toán','Ngữ văn'],system:'all'});
    assert.deepEqual([...multiple.subjects],['Toán','Ngữ văn']);assert.deepEqual([...multiple.systems],['topclass']);
    assert.deepEqual([...multiple.programs],['A','B','C']);
    const next=weekFilterChoices([links[2]],programs,{system:'all'});
    assert.deepEqual([...next.programs],['C']);assert.deepEqual([...next.systems],['topuni']);
    assert.equal(weekFilterChoices([],programs,{system:'all'}).programs.size,0);
});

test('multiple programs keep single-program API scope and merge all selected results',async()=>{
    const requested:string[]=[];let active=0,maxActive=0;
    const result=await loadWeekProgramSchedules({system_type:'topclass'},['A','B','A','C','D','E'],async params=>{
        assert.equal(params.system_type,'topclass');assert.equal(params.page,1);
        assert.ok(params.code&&!params.code.includes(','));requested.push(params.code!);
        active++;maxActive=Math.max(active,maxActive);await new Promise(resolve=>setTimeout(resolve,1));active--;
        return {data:{total:1,data:[{id:params.code,code:params.code}]}};
    });
    assert.deepEqual(requested,['A','B','C','D','E']);assert.equal(result.length,5);assert.ok(maxActive<=4);
});

test('week starts on Monday including Sundays and year boundaries; API bounds intersect filters',()=>{
    assert.equal(weekMonday(dayjs('2026-11-29')).format('YYYY-MM-DD'),'2026-11-23');
    assert.equal(weekMonday(dayjs('2027-01-01')).format('YYYY-MM-DD'),'2026-12-28');
    const filters={code:'A',teacher:['Cô An'],system_type:['topuni' as const],date_range:[dayjs('2026-11-25'),dayjs('2026-12-02')] as [dayjs.Dayjs,dayjs.Dayjs]};
    const params=weekScheduleParams(filters,dayjs('2026-11-23'))!;
    assert.equal(params.start_time,'2026-11-25T00:00:00.000Z');
    assert.equal(params.end_time,'2026-11-29T23:59:59.999Z');
    assert.equal(params.code,'A');assert.equal(params.teacher,'Cô An');assert.deepEqual(params.system_type,['topuni']);
    assert.equal(weekScheduleParams(filters,dayjs('2026-11-16')),null);
    assert.equal(weekScheduleParams(filters,dayjs('2026-12-07')),null);
});

test('group by curriculum grade, retain cancellations and Sunday, do not infer grades from codes',()=>{
    const groups=groupWeekSchedules([
        {id:2,code:'A',start_time:'2026-11-23T20:00:00Z',lesson_status:1},
        {id:1,code:'A',start_time:'2026-11-23T18:00:00Z'},
        {id:3,code:'B',start_time:'2026-11-29T23:30:00Z'},
        {id:4,code:'exam-12',start_time:'2026-11-24T18:00:00Z'},
        {id:5,code:'A',start_time:'2026-11-30T18:00:00Z'},
    ],[{code:'A',grade:8},{code:'B',grade:9}],dayjs('2026-11-23'));
    assert.deepEqual(groups.map(g=>g.label),['Lớp 8','Lớp 9','exam-12']);
    assert.deepEqual(groups[0].days[0].map(r=>r.id),[1,2]);
    assert.equal(groups[0].days[0][1].lesson_status,1);
    assert.equal(groups[1].days[6][0].id,3);
    assert.equal(groups.flatMap(g=>g.days.flat()).length,4);
});

test('load every page of a week instead of truncating at 300 schedules',async()=>{
    const rows=Array.from({length:605},(_,id)=>({id:id+1}));const requests:any[]=[];
    const actual=await loadWeekSchedules({code:'A'},async params=>{requests.push(params);return {data:{total:rows.length,data:rows.slice((params.page!-1)*300,params.page!*300)}}});
    assert.equal(actual.length,605);assert.deepEqual(requests.map(q=>q.page),[1,2,3]);
    assert.ok(requests.every(q=>q.code==='A'&&q.limit===300));
    await assert.rejects(()=>loadWeekSchedules({},async()=>({data:{total:301,data:[{id:1}]}})),/Danh sách lịch/);
    await assert.rejects(()=>loadWeekSchedules({},async()=>({})),/không hợp lệ/);
});
