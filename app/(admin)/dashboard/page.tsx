"use client"
import React, { useEffect } from 'react';
import {
    Card,
    Col,
    Row,
    Statistic,
    Skeleton,
    Tag,
    Flex,
    DatePicker,
    Select,
    Divider,
} from 'antd';
import {
    ArrowUpOutlined,
    DollarOutlined,
    FileTextOutlined,
    BarChartOutlined,
    CalendarOutlined,
    SyncOutlined,
    ArrowDownOutlined,
    PlusOutlined
} from '@ant-design/icons';
import { Line } from '@ant-design/charts';
import dayjs from 'dayjs';
import { getDashboardOverview, getRevenueChartOverView } from '@/services/dashboardService';
import { useAuthStore } from '@/stores/authStore';

interface DashboardStats {
    dailyRevenue: number;
    weeklyRevenue: number;
    monthlyRevenue: number;
    revenueChanges: {
        daily: string
        weekly: string
        monthly: string
    };
}

interface RevenueData {
    date: string;
    revenue: number;
}

// Component hiển thị xu hướng
const TrendTag = ({ change, color }: { change: string, color: string }) => {
    const getTrendStatus = () => {
        if (change.includes('(Bắt đầu phát sinh)')) return 'new';
        if (change.includes('(Không có giao dịch)')) return 'decrease';

        const changeValue = parseFloat(change.replace('%', ''));
        if (isNaN(changeValue)) return 'neutral';
        return changeValue >= 0 ? 'increase' : 'decrease';
    };

    const status = getTrendStatus();

    const tagConfig = {
        increase: {
            color,
            icon: <ArrowUpOutlined />,
            text: change
        },
        decrease: {
            color: 'red',
            icon: <ArrowDownOutlined />,
            text: change
        },
        new: {
            color: 'blue',
            icon: <PlusOutlined />,
            text: change.replace('(Bắt đầu phát sinh)', '')
        },
        neutral: {
            color,
            icon: <ArrowUpOutlined />,
            text: change
        }
    }[status];

    return (
        <Tag
            color={tagConfig.color}
            style={{
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                backgroundColor: status === 'decrease' ? '#fff1f0' : undefined
            }}
        >
            {tagConfig.icon}
            {tagConfig.text}
        </Tag>
    );
};

const Page: React.FC = () => {
    const { warehouseId } = useAuthStore(state => state.user);
    const [loading, setLoading] = React.useState(true);
    const [loadingChart, setLoadingChart] = React.useState(true);
    const [timeRange, setTimeRange] = React.useState<string>('day');
    const [selectedDate, setSelectedDate] = React.useState(dayjs());
    const [revenueChartConfig, setRevenueChartConfig] = React.useState({});
    const [stats, setStats] = React.useState<DashboardStats>({
        dailyRevenue: 0,
        weeklyRevenue: 0,
        monthlyRevenue: 0,
        revenueChanges: {
            daily: '0%',
            weekly: '0%',
            monthly: '0%'
        }
    });
    const [orderStats, setOrderStats] = React.useState({
        totalOrders: 0,
        completedOrders: 0,
        cancelledOrders: 0
    })
    const [returnStats, setReturnStats] = React.useState({
        totalReturns: 0,
    })

    const [revenueChartData, setRevenueChartData] = React.useState<RevenueData[]>([]);

    useEffect(() => {
        if (warehouseId == -1) return
        const fetchData = async () => {
            try {
                setLoading(true);
                const { revenueStats, orderStats, returnStats } = await getDashboardOverview(warehouseId);
                setStats(revenueStats);
                setOrderStats(orderStats)
                setReturnStats(returnStats)
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [warehouseId]);

    useEffect(() => {
        if (warehouseId == -1) return
        const fetchData = async () => {
            try {
                setLoadingChart(true);
                const revenueChartData = await getRevenueChartOverView(
                    timeRange,
                    selectedDate,
                    warehouseId
                );
                setRevenueChartData(revenueChartData);
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setLoadingChart(false);
            }
        };

        fetchData();
    }, [timeRange, selectedDate, warehouseId]);


    useEffect(() => {
        const revenueChartConfig = {
            data: revenueChartData,
            xField: 'date',
            yField: 'revenue',
            yAxis: {
                label: {
                    formatter: (value: number) => value
                }
            },
            tooltip: {
                items: [
                    (datum: any, index: number, data: any, column: any) => ({
                        name: "Doanh thu", // Specify the name of the item      
                        value: `${column.y.value[index].toLocaleString()} VND`, // Use the value of the y channel 
                    }),
                ],
            },
            responsive: true,
            animation: {
                appear: {
                    animation: 'scale-in-y',
                },
            },
        };
        setRevenueChartConfig(revenueChartConfig);
    }, [revenueChartData])


    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(value);
    };

    const cardStyle: React.CSSProperties = {
        boxShadow: '0 4px 8px 0 rgba(0,0,0,0.2)',
        borderRadius: '8px',
        transition: '0.3s',
        height: '100%',
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
        }}>
            <Row gutter={[16, 16]}>
                {/* Card doanh thu ngày */}
                <Col xs={24} sm={24} xl={12}>
                    <Card
                        style={cardStyle}
                        hoverable
                        loading={loading}
                    >
                        <Row gutter={[12, 12]} style={{ height: '100%' }}>
                            <Col xs={24} sm={12} lg={12}>
                                <Card
                                    loading={loading}
                                    style={{ border: 'none', borderRadius: 0, borderRight: '1px solid  #ccc' }}
                                    styles={{ body: { padding: 0 } }}
                                    className='daily-revenue'
                                >
                                    <Flex vertical gap={8}>
                                        <Flex align="center" gap={8}>
                                            <div style={{
                                                padding: '10px',
                                                borderRadius: '50%',
                                                background: 'rgba(16, 185, 129, 0.1)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <DollarOutlined style={{
                                                    fontSize: '12px',
                                                    color: '#3f8600'
                                                }} />
                                            </div>
                                            <span style={{
                                                fontSize: '16px',
                                                fontWeight: 500,
                                                color: '#5a5a5a'
                                            }}>
                                                Doanh thu ngày
                                            </span>
                                        </Flex>

                                        <Statistic
                                            value={formatCurrency(stats?.dailyRevenue ?? 0)}
                                            valueStyle={{
                                                fontSize: '24px',
                                                fontWeight: 500,
                                                color: '#3f8600'
                                            }}
                                            loading={loading}
                                        />

                                        <Flex align="center" gap={4}>
                                            <TrendTag change={stats.revenueChanges.daily} color='green' />
                                            <span style={{
                                                fontSize: '14px',
                                                color: '#8c8c8c'
                                            }}>
                                                so với hôm qua
                                            </span>
                                        </Flex>
                                    </Flex>
                                </Card>
                            </Col>
                            <Col xs={12} sm={6} lg={6} >
                                <Card
                                    loading={loading}
                                    style={{ border: 'none' }}
                                    styles={{ body: { padding: 0 } }}
                                >
                                    <Flex vertical gap={8}>
                                        <Flex align="center" justify='center' gap={8}>
                                            <div style={{
                                                padding: '10px',
                                                borderRadius: '50%',
                                                background: 'rgba(24, 144, 255, 0.1)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <FileTextOutlined style={{
                                                    fontSize: '12px',
                                                    color: '#1890ff'
                                                }} />
                                            </div>
                                            <span style={{
                                                fontSize: '16px',
                                                fontWeight: 500,
                                                color: '#5a5a5a'
                                            }}>
                                                Hóa đơn
                                            </span>
                                        </Flex>

                                        <Statistic
                                            value={orderStats.completedOrders}
                                            valueStyle={{
                                                fontSize: '24px',
                                                fontWeight: 500,
                                                color: '#1890ff',
                                                textAlign: 'center'
                                            }}
                                            loading={loading}
                                        />
                                    </Flex>
                                </Card>
                            </Col>
                            <Col xs={12} sm={6} lg={6}>
                                <Card
                                    loading={loading}
                                    style={{ border: 'none' }}
                                    styles={{ body: { padding: 0 } }}
                                >
                                    <Flex vertical gap={8}>
                                        <Flex align="center" justify='center' gap={8}>
                                            <div style={{
                                                padding: '10px',
                                                borderRadius: '50%',
                                                background: 'rgba(250, 180, 50, 0.1)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <SyncOutlined style={{
                                                    fontSize: '12px',
                                                    color: '#FAB432'
                                                }} />
                                            </div>
                                            <span style={{
                                                fontSize: '16px',
                                                fontWeight: 500,
                                                color: '#5a5a5a'
                                            }}>
                                                Trả hàng
                                            </span>
                                        </Flex>

                                        <Statistic
                                            value={returnStats.totalReturns}
                                            valueStyle={{
                                                fontSize: '24px',
                                                fontWeight: 500,
                                                color: '#FAB432',
                                                textAlign: 'center'
                                            }}
                                            loading={loading}
                                        />
                                    </Flex>
                                </Card>
                            </Col>

                        </Row>
                    </Card>
                </Col>

                {/* Card doanh thu tuần */}
                <Col xs={24} sm={12} xl={6}>
                    <Card
                        style={cardStyle}
                        hoverable
                        loading={loading}
                    >
                        <Flex vertical gap={8}>
                            <Flex align="center" gap={8}>
                                <div style={{
                                    padding: '10px',
                                    borderRadius: '50%',
                                    background: 'rgba(139, 92, 246, 0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <BarChartOutlined style={{
                                        fontSize: '12px',
                                        color: '#8b5cf6'
                                    }} />
                                </div>
                                <span style={{
                                    fontSize: '16px',
                                    fontWeight: 500,
                                    color: '#5a5a5a'
                                }}>
                                    Doanh thu tuần
                                </span>
                            </Flex>

                            <Statistic
                                value={formatCurrency(stats.weeklyRevenue ?? 0)}
                                valueStyle={{
                                    fontSize: '24px',
                                    fontWeight: 500,
                                    color: '#8b5cf6'
                                }}
                                loading={loading}
                            />

                            <Flex align="center" gap={4}>
                                <TrendTag change={stats.revenueChanges.weekly} color='purple' />
                                <span style={{
                                    fontSize: '14px',
                                    color: '#8c8c8c'
                                }}>
                                    so với tuần trước
                                </span>
                            </Flex>
                        </Flex>
                    </Card>
                </Col>
                {/* Card doanh thu tháng */}
                <Col xs={24} sm={12} xl={6}>
                    <Card
                        style={cardStyle}
                        hoverable
                        loading={loading}
                    >
                        <Flex vertical gap={8}>
                            <Flex align="center" gap={8}>
                                <div style={{
                                    padding: '10px',
                                    borderRadius: '50%',
                                    background: 'rgba(14, 165, 233, 0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <CalendarOutlined style={{
                                        fontSize: '12px',
                                        color: '#0ea5e9'
                                    }} />
                                </div>
                                <span style={{
                                    fontSize: '16px',
                                    fontWeight: 500,
                                    color: '#5a5a5a'
                                }}>
                                    Doanh thu tháng
                                </span>
                            </Flex>

                            <Statistic
                                value={formatCurrency(stats.monthlyRevenue ?? 0)}
                                valueStyle={{
                                    fontSize: '24px',
                                    fontWeight: 500,
                                    color: '#0ea5e9'
                                }}
                                loading={loading}
                            />

                            <Flex align="center" gap={4}>
                                <TrendTag change={stats.revenueChanges.monthly} color='cyan' />
                                <span style={{
                                    fontSize: '14px',
                                    color: '#8c8c8c'
                                }}>
                                    so với tháng trước
                                </span>
                            </Flex>
                        </Flex>
                    </Card>
                </Col>
            </Row>
            <Card
                title={
                    <Flex justify='space-between' align='center'>
                        <span style={{ fontWeight: 'revert' }}>Biểu đồ doanh thu</span>
                        <Flex gap={8}>
                            <Select
                                value={timeRange}
                                onChange={setTimeRange}
                                options={[
                                    { value: 'day', label: 'Theo ngày' },
                                    { value: 'week', label: 'Theo tuần' },
                                    { value: 'month', label: 'Theo tháng' },
                                ]}
                                style={{ width: 120 }}
                            />
                            <DatePicker
                                value={selectedDate}
                                onChange={(date) => setSelectedDate(date ? dayjs(date) : dayjs())}
                                picker={timeRange === 'month' ? 'year' : timeRange === 'week' ? 'week' : 'date'}
                                allowClear={false}
                                size="small"
                                disabledDate={(current) => current && current > dayjs().endOf('day')}
                            />
                        </Flex>
                    </Flex>
                }
                style={{
                    ...cardStyle,
                    flex: 1,
                    marginBottom: 0
                }}
                hoverable
                styles={{
                    body: {
                        padding: '20px',
                        height: 'calc(100% - 56px)',
                        display: 'flex',
                        flexDirection: 'column'
                    }
                }}
            >
                {loadingChart ? (
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Skeleton active paragraph={{ rows: 6 }} />
                    </div>
                ) : (
                    <div style={{ flex: 1 }}>
                        <Line {...revenueChartConfig} />
                    </div>
                )}
            </Card>
        </div>
    );
};

export default Page;