'use client';
import {type ReactNode,useRef,useState} from 'react';
import {Bar} from '@ant-design/charts';
import {Button,Card,Col,Empty,Grid,Row,Select,Space,Typography} from 'antd';

type PersonnelRow = {id:string; teacher_profile_id:number; name:string; username:string; assigned:number; scheduled_hours:number; ended_hours:number};
type Metric = 'ended_hours' | 'scheduled_hours' | 'assigned';
const metrics = [
    {value:'ended_hours' as const,label:'Giờ lịch đã kết thúc'},
    {value:'scheduled_hours' as const,label:'Giờ theo lịch'},
    {value:'assigned' as const,label:'Số lịch phân công'},
];
export default function PersonnelCharts({teachers=[],assistants=[],role,loading=false,onSelect,navigation}:{teachers?:PersonnelRow[];assistants?:PersonnelRow[];role?:string;loading?:boolean;navigation?:ReactNode;onSelect?:(id:number,role:'teacher'|'assistant')=>void}){
    const screens=Grid.useBreakpoint(),compact=!screens.sm;
    const shortName=(value:unknown)=>{const text=String(value??'');const limit=compact?12:22;return text.length>limit?text.slice(0,limit-1)+'…':text;};
    const selectRef=useRef(onSelect);selectRef.current=onSelect;
    const [showAll,setShowAll]=useState<Record<string,boolean>>({});
    const [metric,setMetric]=useState<Metric>('ended_hours');
    const metricLabel=metrics.find(option=>option.value===metric)!.label;
    const format=(value:unknown)=>metric==='assigned'?String(Number(value)):Number(value).toFixed(2);
    const panels=[
        {role:'teacher' as const,title:'Thống kê giáo viên',rows:teachers,color:'#1677FF'},
        {role:'assistant' as const,title:'Thống kê trợ giảng',rows:assistants,color:'#13A8A8'},
    ].filter(panel=>!role || panel.role===role);
    return <section aria-label='Biểu đồ giáo viên và trợ giảng' style={{marginBottom:16}}>
        <Space wrap style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
            <Typography.Text type='secondary'>Thống kê theo bộ lọc đã áp dụng và cách tính giờ đang chọn. Chỉ gồm nhân sự đã khớp hồ sơ.</Typography.Text>
            <Space wrap>{navigation}<Space direction={compact?'vertical':'horizontal'} size={compact?4:8}><label style={{whiteSpace:'nowrap'}} htmlFor='personnel_chart_metric'>Chỉ số biểu đồ</label><Select id='personnel_chart_metric' value={metric} onChange={setMetric} options={metrics} style={{width:200}}/></Space></Space>
        </Space>
        <Row gutter={[16,16]}>{panels.map(panel=>{
            const duplicates=new Map<string,number>();
            panel.rows.forEach(row=>duplicates.set(row.name,(duplicates.get(row.name)??0)+1));
            const chartData=panel.rows.map(row=>({...row,label:(duplicates.get(row.name)??0)>1?`${row.name} · ${row.username}`:row.name,value:Number(row[metric])||0})).sort((a,b)=>b.value-a.value || a.label.localeCompare(b.label,'vi'));
            const visible=showAll[panel.role]?chartData:chartData.slice(0,10);
            return <Col xs={24} lg={panels.length===1?24:12} key={panel.role} style={{minWidth:0}}>
                <Card data-personnel-role={panel.role} title={panel.title} loading={loading} extra={<Typography.Text type='secondary'>{visible.length}{visible.length<panel.rows.length?` / ${panel.rows.length}`:''} người</Typography.Text>}>
                    <Typography.Text style={{display:'block',marginBottom:12}}>{metricLabel}{metric!=='assigned'?' (giờ)':''} · Bấm vào thanh để xem lịch</Typography.Text>
                    {chartData.length?<div style={{maxHeight:420,overflowY:'auto',overflowX:'hidden',width:'100%',minWidth:0}}><Bar
                        data={visible} xField='label' yField='value' height={Math.max(220,visible.length*38)} paddingLeft={compact?94:150} paddingRight={56}
                        onReady={chart=>{chart.chart.on('element:click',(event:any)=>{const row=event.data?.data;if(row?.teacher_profile_id)selectRef.current?.(row.teacher_profile_id,panel.role);});}}
                        style={{fill:panel.color,cursor:'pointer'}} legend={false}
                        axis={{x:{title:false,labelAutoHide:false,labelAutoRotate:false,labelFormatter:shortName,labelFill:'#434343',labelFillOpacity:1},y:{title:false,labelFormatter:(value:unknown)=>format(value)}}}
                        tooltip={{title:{field:'label'},items:[{field:'value',name:metricLabel,valueFormatter:(value:unknown)=>format(value)}]}}
                        label={{text:(row:{value:number})=>format(row.value),position:'right',dx:6,textAlign:'left',fill:'#1F1F1F',fontWeight:600,fontSize:12,fillOpacity:1}}
                    /></div>:<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='Không có nhân sự phù hợp với bộ lọc'/>}
                    {panel.rows.length>10&&<Button type='link' onClick={()=>setShowAll(current=>({...current,[panel.role]:!current[panel.role]}))}>{showAll[panel.role]?'Thu gọn':`Xem tất cả (${panel.rows.length})`}</Button>}
                </Card>
            </Col>;
        })}</Row>
    </section>;
}
