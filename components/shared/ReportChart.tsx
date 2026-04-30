"use client";
import React from 'react';
import { Line, Pie, Column } from '@ant-design/charts';
import { Card, Radio, Space } from 'antd';

interface ChartItem {
    name: string;
    value: number;
}

interface ReportChartProps {
    data: ChartItem[];
    type?: 'line' | 'pie' | 'bar';
    title?: string;
    reportType?: string;
    onTypeChange?: (type: 'line' | 'pie' | 'bar') => void;
}

const ReportChart: React.FC<ReportChartProps> = ({ data, type = 'line', title, reportType, onTypeChange }) => {
    const titleText = title ?? (reportType === 'profit' ? 'Lợi nhuận theo hàng hóa' : reportType === 'inventory' ? 'Xuất nhập tồn theo hàng hóa' : 'Doanh thu theo hàng hóa');

    const tooltipFormatter = (datum: any) => {
        // G2Plot / @ant-design/charts might pass raw object or nested in `data`
        const d = datum.data || datum;
        const name = d.name || titleText || 'Giá trị';
        const value = Number(d.value || 0);
        return { name, value: `${value.toLocaleString('vi-VN')} VND` };
    };

    const lineConfig = {
        data,
        xField: 'name',
        yField: 'value',
        smooth: true,
        tooltip: { formatter: tooltipFormatter },
        xAxis: { label: { autoRotate: true } },
        yAxis: { label: { formatter: (v: number) => v.toLocaleString('vi-VN') } },
        animation: { appear: { animation: 'scale-in-y' } },
        height: 340,
    };

    const pieConfig = {
        appendPadding: 10,
        data,
        angleField: 'value',
        colorField: 'name',
        radius: 0.9,
        label: { type: 'inner', offset: '-30%', content: '{percentage}', style: { textAlign: 'center', fontSize: 12 } },
        interactions: [{ type: 'element-active' }],
        tooltip: { formatter: tooltipFormatter },
        height: 340,
    };

    const barConfig = {
        data,
        xField: 'name',
        yField: 'value',
        label: { position: 'middle', style: { fill: '#FFFFFF', opacity: 0.6 } },
        xAxis: { label: { autoRotate: true } },
        yAxis: { label: { formatter: (v: number) => v.toLocaleString('vi-VN') } },
        tooltip: { formatter: tooltipFormatter },
        animation: { appear: { animation: 'scale-in-y' } },
        height: 340,
    };

    return (
        <div>
            {type === 'pie' ? <Pie {...pieConfig} /> : type === 'bar' ? <Column {...barConfig} /> : <Line {...lineConfig} />}
        </div>
    );
};

export default ReportChart;
