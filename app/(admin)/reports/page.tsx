"use client";
import React, { useMemo, useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Space, Button, Table, Tag, Skeleton, Switch, Select, DatePicker } from 'antd';
import { ReloadOutlined, FileExcelOutlined, FilterOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/stores/authStore';
import dayjs from 'dayjs';
import { getRevenueChartOverView } from '@/services/dashboardService';
import ReportFilterDrawer from '@/components/shared/ReportFilterDrawer';
import ReportChart from '@/components/shared/ReportChart';
import type { ColumnsType } from 'antd/es/table';

const { Title } = Typography;

interface ReportItem {
    key: number;
    productCode: string;
    productName: string;
    soldQty: number;
    listPrice: number;
    revenue: number;
    difference: number;
    returnQty: number;
    returnValue: number;
    netRevenue: number;
}

const rawData: ReportItem[] = [
    { key: 1, productCode: 'NAM002', productName: 'Áo vest nam màu kem', soldQty: 1, listPrice: 3699400, revenue: 3699400, difference: 0, returnQty: 0, returnValue: 0, netRevenue: 3699400 },
    { key: 2, productCode: 'NAM003', productName: 'Áo vest nam màu xanh', soldQty: 1, listPrice: 3699400, revenue: 3699400, difference: 0, returnQty: 0, returnValue: 0, netRevenue: 3699400 },
    { key: 3, productCode: 'NAM011', productName: 'Cà vạt nam màu xanh sọc', soldQty: 6, listPrice: 3594000, revenue: 3594000, difference: 0, returnQty: 0, returnValue: 0, netRevenue: 3594000 },
    { key: 4, productCode: 'NAM007', productName: 'Áo sơ mi nam sọc trắng', soldQty: 2, listPrice: 1438400, revenue: 1438400, difference: 0, returnQty: 0, returnValue: 0, netRevenue: 1438400 },
    { key: 5, productCode: 'NAM008', productName: 'Áo sơ mi nam màu đỏ sọc', soldQty: 2, listPrice: 1398400, revenue: 1398400, difference: 0, returnQty: 0, returnValue: 0, netRevenue: 1398400 },
    { key: 6, productCode: 'NAM014', productName: 'Thắt lưng nam cao cấp', soldQty: 4, listPrice: 1196400, revenue: 1196400, difference: 0, returnQty: 0, returnValue: 0, netRevenue: 1196400 },
    { key: 7, productCode: 'NAM010', productName: 'Cà vạt nam Hàn Quốc', soldQty: 5, listPrice: 1000000, revenue: 1000000, difference: 0, returnQty: 0, returnValue: 0, netRevenue: 1000000 },
    { key: 8, productCode: 'NAM015', productName: 'Thắt lưng nam LV caro xanh', soldQty: 1, listPrice: 899000, revenue: 899000, difference: 0, returnQty: 0, returnValue: 0, netRevenue: 899000 },
    { key: 9, productCode: 'NAM006', productName: 'Áo sơ mi nam màu xanh', soldQty: 1, listPrice: 749000, revenue: 749000, difference: 0, returnQty: 0, returnValue: 0, netRevenue: 749000 },
];

const getReportTitle = (reportType: string) => {
    switch (reportType) {
        case 'profit':
            return 'Báo cáo lợi nhuận theo hàng hóa';
        case 'inventory':
            return 'Báo cáo xuất nhập tồn';
        default:
            return 'Báo cáo bán hàng theo hàng hóa';
    }
};

const getColumns = (reportType: string): ColumnsType<ReportItem> => {
    const baseColumns: ColumnsType<ReportItem> = [
        { title: 'Mã hàng', dataIndex: 'productCode', key: 'productCode', render: (text: string) => <a>{text}</a> },
        { title: 'Tên hàng', dataIndex: 'productName', key: 'productName' },
        { title: 'SL Bán', dataIndex: 'soldQty', key: 'soldQty', align: 'right' },
        { title: 'Giá trị niêm yết', dataIndex: 'listPrice', key: 'listPrice', align: 'right', render: (value: number) => new Intl.NumberFormat('vi-VN').format(value) },
        { title: 'Doanh thu', dataIndex: 'revenue', key: 'revenue', align: 'right', render: (value: number) => new Intl.NumberFormat('vi-VN').format(value) },
    ];

    if (reportType === 'profit') {
        return [
            ...baseColumns,
            { title: 'Tổng giá vốn', dataIndex: 'difference', key: 'difference', align: 'right', render: (value: number) => new Intl.NumberFormat('vi-VN').format(value) },
            { title: 'Lợi nhuận', dataIndex: 'netRevenue', key: 'netRevenue', align: 'right', render: (value: number) => <strong>{new Intl.NumberFormat('vi-VN').format(value)}</strong> },
            { title: 'Tỷ suất', key: 'ratio', align: 'right', render: (_: any, record: ReportItem) => `${((record.netRevenue / (record.listPrice || 1)) * 100).toFixed(2)} %` },
        ];
    }

    if (reportType === 'inventory') {
        return [
            ...baseColumns,
            { title: 'SL Trả', dataIndex: 'returnQty', key: 'returnQty', align: 'right' },
            { title: 'Giá trị trả', dataIndex: 'returnValue', key: 'returnValue', align: 'right', render: (value: number) => new Intl.NumberFormat('vi-VN').format(value) },
            { title: 'Doanh thu thuần', dataIndex: 'netRevenue', key: 'netRevenue', align: 'right', render: (value: number) => new Intl.NumberFormat('vi-VN').format(value) },
        ];
    }

    return [
        ...baseColumns,
        { title: 'SL Trả', dataIndex: 'returnQty', key: 'returnQty', align: 'right' },
        { title: 'Giá trị trả', dataIndex: 'returnValue', key: 'returnValue', align: 'right', render: (value: number) => new Intl.NumberFormat('vi-VN').format(value) },
        { title: 'Doanh thu thuần', dataIndex: 'netRevenue', key: 'netRevenue', align: 'right', render: (value: number) => <strong>{new Intl.NumberFormat('vi-VN').format(value)}</strong> },
    ];
};

const ReportsPage: React.FC = () => {
    const [openFilter, setOpenFilter] = useState(false);
    const [filterValues, setFilterValues] = useState<any>({ reportType: 'sales', branch: 'all', dateFrom: dayjs().startOf('month'), dateTo: dayjs().endOf('month'), displayType: 'chart' });
    const [chartSource, setChartSource] = useState<'time' | 'product'>('time');
    const [loadingChart, setLoadingChart] = useState(false);
    const [timeSeriesData, setTimeSeriesData] = useState<{ name: string; value: number; }[]>([]);
    const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('day');
    const [selectedDate, setSelectedDate] = useState(dayjs());
    const warehouseName = useAuthStore(state => state.user.warehouseName);
    const warehouseId = useAuthStore(state => state.user.warehouseId);

    const filteredData = useMemo(() => {
        let data = rawData;

        const reportTypeVal = filterValues.reportType || 'sales';

        if (reportTypeVal === 'profit') {
            data = data.filter(item => item.netRevenue >= 0);
        } else if (reportTypeVal === 'inventory') {
            data = data.filter(item => item.soldQty > 0);
        }

        return data;
    }, [filterValues]);

    const reportTitle = getReportTitle(filterValues.reportType);
    const columns = getColumns(filterValues.reportType);

    const productChartData = filteredData.map(item => ({
        name: item.productCode,
        value: filterValues.reportType === 'profit' ? item.netRevenue : item.revenue,
    }));

    const chartData = chartSource === 'time' ? timeSeriesData : productChartData;

    useEffect(() => {
        const fetchTrend = async () => {
            if (filterValues.displayType !== 'chart' || chartSource !== 'time') return;

            setLoadingChart(true);
            try {
                const trend = await getRevenueChartOverView(timeRange, selectedDate, warehouseId);
                const formatted = trend.map(item => ({
                    name: item.date,
                    value: item.revenue,
                }));
                setTimeSeriesData(formatted);
            } catch (error) {
                console.error('Lấy dữ liệu biểu đồ thất bại', error);
                setTimeSeriesData([]);
            } finally {
                setLoadingChart(false);
            }
        };

        fetchTrend();
    }, [timeRange, selectedDate, filterValues.displayType]);

    return (
        <div style={{ padding: 16 }}>
            <Space style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }}>
                <Space>
                    <Button icon={<FilterOutlined />} type="default" onClick={() => setOpenFilter(true)}>
                        Bộ lọc
                    </Button>
                    <Button icon={<ReloadOutlined />} onClick={() => {
                        setFilterValues({ reportType: 'sales', branch: 'all', dateFrom: dayjs().startOf('month'), dateTo: dayjs().endOf('month'), displayType: 'report' });
                    }}>
                        Làm mới
                    </Button>
                    <Button type="primary" icon={<FileExcelOutlined />}>
                        Xuất tất cả
                    </Button>
                </Space>

                <Space align="center">
                    <span>Kiểu hiển thị</span>
                    <Switch
                        checked={filterValues.displayType === 'chart'}
                        checkedChildren="Biểu đồ"
                        unCheckedChildren="Báo cáo"
                        onChange={(checked) => setFilterValues((prev: any) => ({
                            ...prev,
                            displayType: checked ? 'chart' : 'report'
                        }))}
                    />
                </Space>
            </Space>

            <Space style={{ marginBottom: 16 }}>
                <span>Biểu đồ</span>
                <Select value={chartSource} onChange={(value) => setChartSource(value)} style={{ width: 180 }}>
                    <Select.Option value="time">Doanh thu theo thời gian</Select.Option>
                    <Select.Option value="product">Doanh thu theo sản phẩm</Select.Option>
                </Select>

                <span>Khoảng</span>
                <Select value={timeRange} onChange={(value) => setTimeRange(value)} style={{ width: 120 }}>
                    <Select.Option value="day">Theo ngày</Select.Option>
                    <Select.Option value="week">Theo tuần</Select.Option>
                    <Select.Option value="month">Theo tháng</Select.Option>
                </Select>

                <DatePicker value={selectedDate} onChange={(value) => value && setSelectedDate(value)} />
            </Space>

            <Row gutter={16}>
                <Col span={24}>
                    <Card bordered>
                        <div style={{ textAlign: 'center', marginBottom: 12 }}>
                            <Title level={4} style={{ marginBottom: 4 }}>{reportTitle}</Title>
                            <p style={{ margin: 0, color: '#555' }}>{`Từ ${dayjs(filterValues.dateFrom).format('DD/MM/YYYY')} đến ${dayjs(filterValues.dateTo).format('DD/MM/YYYY')}`}</p>
                            <p style={{ margin: 0, color: '#555' }}>{`Chi nhánh: ${warehouseName}`}</p>
                        </div>
                        <ReportFilterDrawer
                            open={openFilter}
                            onClose={() => setOpenFilter(false)}
                            handleSearch={(values) => {
                                setFilterValues(values);
                                setOpenFilter(false);
                            }}
                        />

                        {filterValues.displayType === 'chart' ? (
                            loadingChart ? (
                                <div style={{ padding: 32, textAlign: 'center' }}>
                                    <Skeleton active paragraph={{ rows: 6 }} />
                                </div>
                            ) : (
                                <Row gutter={16}>
                                    <Col span={8}>
                                        <Card title="Biểu đồ đường" size="small">
                                            <ReportChart
                                                data={chartData}
                                                type="line"
                                                reportType={filterValues.reportType}
                                            />
                                        </Card>
                                    </Col>
                                    <Col span={8}>
                                        <Card title="Biểu đồ cột" size="small">
                                            <ReportChart
                                                data={chartData}
                                                type="bar"
                                                reportType={filterValues.reportType}
                                            />
                                        </Card>
                                    </Col>
                                    <Col span={8}>
                                        <Card title="Biểu đồ tròn" size="small">
                                            <ReportChart
                                                data={chartData}
                                                type="pie"
                                                reportType={filterValues.reportType}
                                            />
                                        </Card>
                                    </Col>
                                </Row>
                            )
                        ) : (
                            <Table
                                rowKey="key"
                                columns={columns}
                                dataSource={filteredData}
                                pagination={{ pageSize: 10 }}
                                scroll={{ x: 1300 }}
                            />
                        )}
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default ReportsPage;