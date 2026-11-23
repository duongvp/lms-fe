'use client';
import {useState} from 'react';
import {Line} from '@ant-design/charts';
import {ZoomInOutlined,ZoomOutOutlined,FullscreenOutlined} from '@ant-design/icons';
import {Button,Card,Empty,Select,Slider,Space,Tooltip,Typography} from 'antd';
import {scheduleTrend,type DailyCount,type TrendPeriod} from './report-chart-data';
type TrendRow=ReturnType<typeof scheduleTrend>[number];
function TrendPlot({rows,period}:{rows:TrendRow[];period:TrendPeriod}){
    const [window,setWindow]=useState<[number,number]>(()=>[period==='day'?Math.max(0,rows.length-30):0,rows.length-1]);
    const [start,end]=window,visible=rows.slice(start,end+1),count=end-start+1;
    const zoom=(factor:number)=>{
        const size=Math.min(rows.length,Math.max(2,Math.round(count*factor)));
        const left=Math.max(0,Math.min(rows.length-size,Math.floor((start+end-size+1)/2)));
        setWindow([left,left+size-1]);
    };
    const stride=Math.max(1,Math.ceil(visible.length/7));
    return <>
        <Space wrap style={{display:'flex',justifyContent:'space-between',margin:'12px 0'}}>
            <Typography.Text>{rows[start].label} – {rows[end].label} · {count} {period==='day'?'ngày':period==='week'?'tuần':'tháng'}</Typography.Text>
            <Space wrap>
                <Tooltip title='Phóng to'><Button size='small' aria-label='Phóng to' icon={<ZoomInOutlined/>} onClick={()=>zoom(.5)} disabled={count<=2}/></Tooltip>
                <Tooltip title='Thu nhỏ'><Button size='small' aria-label='Thu nhỏ' icon={<ZoomOutOutlined/>} onClick={()=>zoom(2)} disabled={count>=rows.length}/></Tooltip>
                <Tooltip title='Xem toàn bộ'><Button size='small' aria-label='Toàn bộ' icon={<FullscreenOutlined/>} onClick={()=>setWindow([0,rows.length-1])} disabled={count===rows.length}/></Tooltip>
            </Space>
        </Space>
        <Line data={visible} xField='label' yField='assigned' height={300} point={visible.length<=60?{size:3}:false}
            axis={{x:{title:false,labelAutoHide:true,labelAutoRotate:false,labelFilter:(_:unknown,index:number)=>index%stride===0||index===visible.length-1},y:{title:'Số lịch',tickCount:5}}}
            tooltip={{title:{field:'label'},items:[{field:'assigned',name:'Số lịch giảng dạy'}]}}
        />
        {rows.length>1&&<div style={{padding:'0 12px'}}>
            <Slider aria-label='Khoảng thời gian biểu đồ' range={{draggableTrack:true}} min={0} max={rows.length-1} step={1} value={window}
                onChange={(value:number[])=>setWindow(value as [number,number])} tooltip={{formatter:value=>rows[value??0]?.label}}/>
            <Typography.Text type='secondary'>Kéo hai đầu để phóng to/thu nhỏ; kéo đoạn ở giữa để dịch chuyển khoảng xem. Chỉ thay đổi biểu đồ, không đổi bộ lọc báo cáo.</Typography.Text>
        </div>}
    </>;
}
export default function ScheduleTrend({daily=[],from,to}:{daily?:DailyCount[];from:string;to:string}){
    const [period,setPeriod]=useState<TrendPeriod>('week');
    const rows=scheduleTrend(daily,from,to,period);
    return <Card title='Xu hướng lịch giảng dạy' style={{marginBottom:16}} extra={<Select id='schedule_trend_period' aria-label='Chu kỳ biểu đồ' value={period} onChange={setPeriod} options={[{value:'day',label:'Theo ngày'},{value:'week',label:'Theo tuần'},{value:'month',label:'Theo tháng'}]} style={{width:125}}/>}>
        <Typography.Text type='secondary' style={{display:'block',marginBottom:12}}>Số lịch phân công trong bộ lọc, gồm lịch nghỉ học. Tuần tính từ thứ Hai; kỳ đầu và cuối chỉ tính các ngày trong khoảng đã chọn. Theo ngày mặc định hiển thị tối đa 30 ngày cuối.</Typography.Text>
        {rows.length?<TrendPlot key={`${from}:${to}:${period}`} rows={rows} period={period}/>:<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='Không có lịch phù hợp với bộ lọc'/>}
    </Card>;
}
