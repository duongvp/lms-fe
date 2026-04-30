"use client";
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Typography, Space, Button, Table, Tag, Skeleton, Switch, Select, DatePicker, Tabs, Statistic, message } from 'antd';
import { ReloadOutlined, FileExcelOutlined, FilterOutlined, TrophyOutlined, UserOutlined, ShoppingOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/stores/authStore';
import dayjs from 'dayjs';
import { getRevenueChartOverView } from '@/services/dashboardService';
import { getReportByProduct, getReportByCreator, ProductReportItem, CreatorReportItem } from '@/services/invoiceService';
import ReportFilterDrawer from '@/components/shared/ReportFilterDrawer';
import ReportChart from '@/components/shared/ReportChart';
import * as XLSX from 'xlsx';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;


const fmt = (val: number) => new Intl.NumberFormat('vi-VN').format(val ?? 0);

const productColumns: ColumnsType<ProductReportItem> = [
    {
        title: '#',
        key: 'index',
        width: 50,
        render: (_: any, __: any, idx: number) => <Text type="secondary">{idx + 1}</Text>,
    },
    { title: 'Mã hàng', dataIndex: 'product_code', key: 'product_code', render: (text: string) => <a>{text}</a> },
    { title: 'Tên hàng', dataIndex: 'product_name', key: 'product_name' },
    { title: 'SL Bán', dataIndex: 'sold_qty', key: 'sold_qty', align: 'right' },
    { title: 'Doanh thu', dataIndex: 'revenue', key: 'revenue', align: 'right', render: (v: number) => fmt(v) },
    { title: 'Giá vốn', dataIndex: 'total_cost', key: 'total_cost', align: 'right', render: (v: number) => fmt(v) },
    {
        title: 'Lợi nhuận',
        dataIndex: 'net_revenue',
        key: 'net_revenue',
        align: 'right',
        render: (v: number) => <strong style={{ color: v >= 0 ? '#52c41a' : '#ff4d4f' }}>{fmt(v)}</strong>,
    },
    {
        title: 'Tỷ suất',
        key: 'ratio',
        align: 'right',
        render: (_: any, r: ProductReportItem) => {
            const ratio = r.revenue > 0 ? ((r.net_revenue / r.revenue) * 100).toFixed(1) : '0.0';
            return <Tag color={parseFloat(ratio) >= 0 ? 'green' : 'red'}>{ratio}%</Tag>;
        },
    },
];

const creatorColumns: ColumnsType<CreatorReportItem> = [
    {
        title: '#',
        key: 'rank',
        width: 50,
        render: (_: any, __: any, idx: number) => {
            if (idx === 0) return <TrophyOutlined style={{ color: '#FFD700', fontSize: 18 }} />;
            if (idx === 1) return <TrophyOutlined style={{ color: '#C0C0C0', fontSize: 18 }} />;
            if (idx === 2) return <TrophyOutlined style={{ color: '#CD7F32', fontSize: 18 }} />;
            return <Text type="secondary">{idx + 1}</Text>;
        },
    },
    {
        title: 'Nhân viên',
        key: 'creator',
        render: (_: any, r: CreatorReportItem) => (
            <Space>
                <UserOutlined style={{ color: '#1890ff' }} />
                <span><strong>{r.created_by || r.username}</strong></span>
                <Text type="secondary">@{r.username}</Text>
            </Space>
        ),
    },
    { title: 'Số hóa đơn', dataIndex: 'total_invoices', key: 'total_invoices', align: 'right' },
    {
        title: 'Doanh thu',
        dataIndex: 'revenue',
        key: 'revenue',
        align: 'right',
        render: (v: number, _: any, idx: number) => (
            <strong style={{ color: idx === 0 ? '#fa8c16' : undefined, fontSize: idx === 0 ? 15 : 14 }}>
                {fmt(v)}
            </strong>
        ),
    },
    {
        title: 'Tỷ lệ',
        key: 'percent',
        align: 'right',
        render: (_: any, r: CreatorReportItem, idx: number, ...args: any[]) => null, // filled below via summary
    },
];

const ReportsPage: React.FC = () => {
    const [openFilter, setOpenFilter] = useState(false);
    const [filterValues, setFilterValues] = useState<any>({
        reportType: 'sales',
        branch: 'all',
        dateFrom: dayjs().startOf('month'),
        dateTo: dayjs().endOf('month'),
        displayType: 'report',
    });
    const [chartSource, setChartSource] = useState<'time' | 'product'>('time');
    const [loadingChart, setLoadingChart] = useState(false);
    const [loadingTable, setLoadingTable] = useState(false);
    const [timeSeriesData, setTimeSeriesData] = useState<{ name: string; value: number }[]>([]);
    const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('day');
    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [productData, setProductData] = useState<ProductReportItem[]>([]);
    const [creatorData, setCreatorData] = useState<CreatorReportItem[]>([]);
    const [activeTab, setActiveTab] = useState<'product' | 'creator'>('product');

    const warehouseName = useAuthStore(state => state.user.warehouseName);
    const warehouseId = useAuthStore(state => state.user.warehouseId);

    // Build filter for API
    const buildApiFilter = useCallback(() => {
        const f: any = { warehouse_id: warehouseId };
        if (filterValues.dateFrom && filterValues.dateTo) {
            f.date = [
                dayjs(filterValues.dateFrom).format('YYYY-MM-DD 00:00:00'),
                dayjs(filterValues.dateTo).format('YYYY-MM-DD 23:59:59'),
            ];
        }
        return f;
    }, [warehouseId, filterValues.dateFrom, filterValues.dateTo]);

    // Fetch product report
    const fetchProductReport = useCallback(async () => {
        setLoadingTable(true);
        try {
            const data = await getReportByProduct(buildApiFilter());
            setProductData(data);
        } catch {
            message.error('Không thể tải báo cáo sản phẩm');
        } finally {
            setLoadingTable(false);
        }
    }, [buildApiFilter]);

    // Fetch creator report
    const fetchCreatorReport = useCallback(async () => {
        setLoadingTable(true);
        try {
            const data = await getReportByCreator(buildApiFilter());
            setCreatorData(data);
        } catch {
            message.error('Không thể tải báo cáo người tạo');
        } finally {
            setLoadingTable(false);
        }
    }, [buildApiFilter]);

    // Fetch chart
    const fetchTrend = useCallback(async () => {
        if (filterValues.displayType !== 'chart' || chartSource !== 'time') return;
        setLoadingChart(true);
        try {
            const trend = await getRevenueChartOverView(timeRange, selectedDate, warehouseId);
            setTimeSeriesData(trend.map(item => ({ name: item.date, value: item.revenue })));
        } catch {
            setTimeSeriesData([]);
        } finally {
            setLoadingChart(false);
        }
    }, [timeRange, selectedDate, filterValues.displayType, chartSource, warehouseId]);

    useEffect(() => { fetchProductReport(); fetchCreatorReport(); }, [fetchProductReport, fetchCreatorReport]);
    useEffect(() => { fetchTrend(); }, [fetchTrend]);

    const totalRevenue = useMemo(() => productData.reduce((s, r) => s + Number(r.revenue), 0), [productData]);
    const totalCost = useMemo(() => productData.reduce((s, r) => s + Number(r.total_cost), 0), [productData]);
    const totalProfit = useMemo(() => totalRevenue - totalCost, [totalRevenue, totalCost]);

    const productChartData = productData.map(item => ({
        name: item.product_code,
        value: Number(item.revenue),
    }));

    const chartData = chartSource === 'time' ? timeSeriesData : productChartData;

    // Add percentage column to creator table dynamically
    const creatorColumnsWithPercent: ColumnsType<CreatorReportItem> = useMemo(() => {
        const totalCreatorRevenue = creatorData.reduce((s, r) => s + Number(r.revenue), 0);
        return [
            ...creatorColumns.slice(0, -1), // remove placeholder last col
            {
                title: 'Tỷ lệ',
                key: 'percent',
                align: 'right' as const,
                render: (_: any, r: CreatorReportItem) => {
                    const pct = totalCreatorRevenue > 0 ? ((Number(r.revenue) / totalCreatorRevenue) * 100).toFixed(1) : '0.0';
                    return <Tag color="blue">{pct}%</Tag>;
                },
            },
        ];
    }, [creatorData]);

    const handleRefresh = () => {
        setFilterValues({ reportType: 'sales', branch: 'all', dateFrom: dayjs().startOf('month'), dateTo: dayjs().endOf('month'), displayType: 'report' });
    };

    useEffect(() => {
        if (filterValues.dateFrom && filterValues.dateTo) {
            fetchProductReport();
            fetchCreatorReport();
        }
    }, [filterValues.dateFrom, filterValues.dateTo]);

    const handleExportExcel = () => {
        try {
            const wb = XLSX.utils.book_new();

            const productExportData = productData.map((item, idx) => ({
                'STT': idx + 1,
                'Mã hàng': item.product_code,
                'Tên hàng': item.product_name,
                'SL Bán': item.sold_qty,
                'Doanh thu': item.revenue,
                'Giá vốn': item.total_cost,
                'Lợi nhuận': item.net_revenue,
                'Tỷ suất (%)': item.revenue > 0 ? ((item.net_revenue / item.revenue) * 100).toFixed(2) : 0
            }));
            const wsProduct = XLSX.utils.json_to_sheet(productExportData);
            XLSX.utils.book_append_sheet(wb, wsProduct, 'Theo Sản Phẩm');

            const totalCreatorRevenue = creatorData.reduce((s, r) => s + Number(r.revenue), 0);
            const creatorExportData = creatorData.map((item, idx) => ({
                'STT': idx + 1,
                'Nhân viên': item.created_by || item.username,
                'Tên đăng nhập': item.username,
                'Số hóa đơn': item.total_invoices,
                'Doanh thu': item.revenue,
                'Tỷ lệ (%)': totalCreatorRevenue > 0 ? ((Number(item.revenue) / totalCreatorRevenue) * 100).toFixed(2) : 0
            }));
            const wsCreator = XLSX.utils.json_to_sheet(creatorExportData);
            XLSX.utils.book_append_sheet(wb, wsCreator, 'Theo Nhân Viên');

            const fileName = `Bao_Cao_Ban_Hang_${dayjs(filterValues.dateFrom).format('DDMMYYYY')}_${dayjs(filterValues.dateTo).format('DDMMYYYY')}.xlsx`;
            XLSX.writeFile(wb, fileName);
            message.success('Xuất file Excel thành công!');
        } catch (error) {
            message.error('Có lỗi xảy ra khi xuất file Excel');
        }
    };

    return (
        <div style={{ padding: 16 }}>
            {/* Toolbar */}
            <Space style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }}>
                <Space>
                    <Button icon={<FilterOutlined />} type="default" onClick={() => setOpenFilter(true)}>
                        Bộ lọc
                    </Button>
                    <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
                        Làm mới
                    </Button>
                    <Button type="primary" icon={<FileExcelOutlined />} onClick={handleExportExcel}>
                        Xuất tất cả
                    </Button>
                </Space>

                <Space align="center">
                    <span>Kiểu hiển thị</span>
                    <Switch
                        checked={filterValues.displayType === 'chart'}
                        checkedChildren="Biểu đồ"
                        unCheckedChildren="Báo cáo"
                        onChange={(checked) => setFilterValues((prev: any) => ({ ...prev, displayType: checked ? 'chart' : 'report' }))}
                    />
                </Space>
            </Space>

            {/* Summary cards */}
            <Row gutter={12} style={{ marginBottom: 16 }}>
                <Col span={8}>
                    <Card size="small" bordered>
                        <Statistic title="Tổng doanh thu" value={totalRevenue} formatter={(v) => fmt(Number(v))} valueStyle={{ color: '#1890ff' }} />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card size="small" bordered>
                        <Statistic title="Tổng giá vốn" value={totalCost} formatter={(v) => fmt(Number(v))} valueStyle={{ color: '#fa8c16' }} />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card size="small" bordered>
                        <Statistic
                            title="Lợi nhuận"
                            value={totalProfit}
                            formatter={(v) => fmt(Number(v))}
                            valueStyle={{ color: totalProfit >= 0 ? '#52c41a' : '#ff4d4f' }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Chart controls (only visible in chart mode) */}
            {filterValues.displayType === 'chart' && (
                <Space style={{ marginBottom: 16 }}>
                    <span>Biểu đồ</span>
                    <Select value={chartSource} onChange={(v) => setChartSource(v)} style={{ width: 180 }}>
                        <Select.Option value="time">Doanh thu theo thời gian</Select.Option>
                        <Select.Option value="product">Doanh thu theo sản phẩm</Select.Option>
                    </Select>
                    <span>Khoảng</span>
                    <Select value={timeRange} onChange={(v) => setTimeRange(v)} style={{ width: 120 }}>
                        <Select.Option value="day">Theo ngày</Select.Option>
                        <Select.Option value="week">Theo tuần</Select.Option>
                        <Select.Option value="month">Theo tháng</Select.Option>
                    </Select>
                    <DatePicker value={selectedDate} onChange={(v) => v && setSelectedDate(v)} />
                </Space>
            )}

            <Card bordered>
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                    <Title level={4} style={{ marginBottom: 4 }}>Báo cáo bán hàng</Title>
                    <p style={{ margin: 0, color: '#555' }}>
                        {`Từ ${dayjs(filterValues.dateFrom).format('DD/MM/YYYY')} đến ${dayjs(filterValues.dateTo).format('DD/MM/YYYY')}`}
                    </p>
                    <p style={{ margin: 0, color: '#555' }}>{`Chi nhánh: ${warehouseName}`}</p>
                </div>

                <ReportFilterDrawer
                    open={openFilter}
                    onClose={() => setOpenFilter(false)}
                    handleSearch={(values) => { setFilterValues(values); setOpenFilter(false); }}
                />

                {filterValues.displayType === 'chart' ? (
                    loadingChart ? (
                        <div style={{ padding: 32 }}><Skeleton active paragraph={{ rows: 6 }} /></div>
                    ) : (
                        <Row gutter={16}>
                            <Col span={8}>
                                <Card title="Biểu đồ đường" size="small">
                                    <ReportChart data={chartData} type="line" reportType={filterValues.reportType} />
                                </Card>
                            </Col>
                            <Col span={8}>
                                <Card title="Biểu đồ cột" size="small">
                                    <ReportChart data={chartData} type="bar" reportType={filterValues.reportType} />
                                </Card>
                            </Col>
                            <Col span={8}>
                                <Card title="Biểu đồ tròn" size="small">
                                    <ReportChart data={chartData} type="pie" reportType={filterValues.reportType} />
                                </Card>
                            </Col>
                        </Row>
                    )
                ) : (
                    <Tabs
                        activeKey={activeTab}
                        onChange={(k) => setActiveTab(k as any)}
                        items={[
                            {
                                key: 'product',
                                label: (
                                    <Space>
                                        <ShoppingOutlined />
                                        Theo sản phẩm
                                    </Space>
                                ),
                                children: (
                                    <Table
                                        rowKey="product_code"
                                        columns={productColumns}
                                        dataSource={productData}
                                        loading={loadingTable}
                                        pagination={{ pageSize: 15 }}
                                        scroll={{ x: 900 }}
                                        summary={() => (
                                            <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 600 }}>
                                                <Table.Summary.Cell index={0} colSpan={4}>Tổng cộng</Table.Summary.Cell>
                                                <Table.Summary.Cell index={4} align="right">{fmt(totalRevenue)}</Table.Summary.Cell>
                                                <Table.Summary.Cell index={5} align="right">{fmt(totalCost)}</Table.Summary.Cell>
                                                <Table.Summary.Cell index={6} align="right">
                                                    <strong style={{ color: totalProfit >= 0 ? '#52c41a' : '#ff4d4f' }}>{fmt(totalProfit)}</strong>
                                                </Table.Summary.Cell>
                                                <Table.Summary.Cell index={7} align="right">
                                                    <Tag color={totalProfit >= 0 ? 'green' : 'red'}>
                                                        {totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0.0'}%
                                                    </Tag>
                                                </Table.Summary.Cell>
                                            </Table.Summary.Row>
                                        )}
                                    />
                                ),
                            },
                            {
                                key: 'creator',
                                label: (
                                    <Space>
                                        <UserOutlined />
                                        Theo người tạo
                                    </Space>
                                ),
                                children: (
                                    <Table
                                        rowKey="user_id"
                                        columns={creatorColumnsWithPercent}
                                        dataSource={creatorData}
                                        loading={loadingTable}
                                        pagination={false}
                                        summary={() => {
                                            const totalInvoices = creatorData.reduce((s, r) => s + Number(r.total_invoices), 0);
                                            const totalRev = creatorData.reduce((s, r) => s + Number(r.revenue), 0);
                                            return (
                                                <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 600 }}>
                                                    <Table.Summary.Cell index={0} colSpan={2}>Tổng cộng</Table.Summary.Cell>
                                                    <Table.Summary.Cell index={2} align="right">{totalInvoices}</Table.Summary.Cell>
                                                    <Table.Summary.Cell index={3} align="right">
                                                        <strong style={{ color: '#1890ff' }}>{fmt(totalRev)}</strong>
                                                    </Table.Summary.Cell>
                                                    <Table.Summary.Cell index={4} align="right">
                                                        <Tag color="blue">100%</Tag>
                                                    </Table.Summary.Cell>
                                                </Table.Summary.Row>
                                            );
                                        }}
                                    />
                                ),
                            },
                        ]}
                    />
                )}
            </Card>
        </div>
    );
};

export default ReportsPage;