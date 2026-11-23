export type TrendPeriod = 'day' | 'week' | 'month';
export type DailyCount = {date:string; assigned:number};
const dateKey=(date:Date)=>date.toISOString().slice(0,10);
const bucket=(value:string,period:TrendPeriod)=>{
    const date=new Date(value+'T00:00:00Z');
    if(period==='month')date.setUTCDate(1);
    else if(period==='week')date.setUTCDate(date.getUTCDate()-(date.getUTCDay()+6)%7);
    return date;
};
/** Fill empty periods; aggregate counts only, never sum personnel hours across overlapping schedules. */
export const scheduleTrend=(daily:DailyCount[],from:string,toExclusive:string,period:TrendPeriod)=>{
    if(!daily.length)return [];
    const start=bucket(from,period),end=new Date(toExclusive+'T00:00:00Z');
    const counts=new Map<string,number>();
    for(const row of daily){if(row.date>=from&&row.date<toExclusive){const key=dateKey(bucket(row.date,period));counts.set(key,(counts.get(key)??0)+row.assigned);}}
    const rows:Array<{date:string;label:string;assigned:number}>=[];
    for(let date=start;date<end;){
        const key=dateKey(date),label=period==='month'?`${key.slice(5,7)}/${key.slice(0,4)}`:`${period==='week'?'Tuần ':''}${key.slice(8,10)}/${key.slice(5,7)}/${key.slice(0,4)}`;
        rows.push({date:key,label,assigned:counts.get(key)??0});
        date=new Date(+date);if(period==='month')date.setUTCMonth(date.getUTCMonth()+1);else date.setUTCDate(date.getUTCDate()+(period==='week'?7:1));
    }
    return rows;
};
