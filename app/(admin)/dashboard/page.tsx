"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Alert,
    Avatar,
    Badge,
    Button,
    Card,
    Col,
    DatePicker,
    Empty,
    Flex,
    List,
    Progress,
    Row,
    Skeleton,
    Space,
    Statistic,
    Tag,
    Typography,
} from 'antd';
import {
    BookOutlined,
    CalendarOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    CloudSyncOutlined,
    DashboardOutlined,
    ExclamationCircleOutlined,
    NotificationOutlined,
    PlusOutlined,
    QuestionCircleOutlined,
    ReloadOutlined,
    RightOutlined,
    TeamOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { Column } from '@ant-design/charts';
import dayjs, { Dayjs } from 'dayjs';
import { DashboardOverview, getDashboardOverview } from '@/services/dashboardService';
import { useAuthStore } from '@/stores/authStore';
import { PermissionKey } from '@/types/permissions';
import styles from './dashboard.module.css';

const { Text, Title } = Typography;

const EMPTY_DASHBOARD: DashboardOverview = {
    generatedAt: '',
    summary: {
        courses: 0,
        lessons: 0,
        quizzes: 0,
        teachingStaff: 0,
        teachers: 0,
        assistants: 0,
        adminUsers: 0,
        outlinesWithQuiz: 0,
        outlinesWithoutQuiz: 0,
    },
    today: { total: 0, upcoming: 0, ongoing: 0, completed: 0, cancelled: 0 },
    nextSevenDays: [],
    upcomingSchedules: [],
    recentChanges: [],
    integrations: {
        teams: { pending: 0, failed: 0, sentToday: 0 },
        hocmai: { pending: 0, failed: 0, syncedToday: 0 },
    },
};

const actionLabels: Record<string, { label: string; color: string }> = {
    cancel: { label: 'Nghỉ học', color: 'red' },
    makeup: { label: 'Tạo lịch bù', color: 'gold' },
    following: { label: 'Dời chuỗi', color: 'purple' },
};

const formatWallClock = (value: string, pattern: string) => {
    const matched = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
    if (!matched) return '—';
    const [, year, month, date, hour, minute] = matched;
    if (pattern === 'time') return `${hour}:${minute}`;
    if (pattern === 'date') return `${date}/${month}/${year}`;
    return `${date}/${month}/${year} ${hour}:${minute}`;
};

const SummaryCard = ({
    title,
    value,
    description,
    icon,
    color,
}: {
    title: string;
    value: number;
    description: string;
    icon: React.ReactNode;
    color: string;
}) => (
    <Card className={styles.summaryCard} styles={{ body: { padding: 20 } }}>
        <Flex justify="space-between" align="flex-start" gap={12}>
            <div>
                <Text type="secondary">{title}</Text>
                <Statistic value={value} valueStyle={{ fontSize: 28, fontWeight: 650, color: '#17233c' }} />
                <Text type="secondary" className={styles.cardDescription}>{description}</Text>
            </div>
            <Avatar size={44} icon={icon} style={{ background: `${color}18`, color }} />
        </Flex>
    </Card>
);

const Page: React.FC = () => {
    const router = useRouter();
    const user = useAuthStore((state) => state.user);
    const hasPermission = useAuthStore((state) => state.hasPermission);
    const [data, setData] = useState<DashboardOverview>(EMPTY_DASHBOARD);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
        dayjs().startOf('week'),
        dayjs().endOf('week'),
    ]);

    const loadDashboard = useCallback(async (manual = false) => {
        manual ? setRefreshing(true) : setLoading(true);
        setError('');
        try {
            setData(await getDashboardOverview({
                from: dateRange[0].startOf('day').format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
                to: dateRange[1].endOf('day').format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
            }));
        } catch (loadError: any) {
            setError(loadError?.message || 'Không thể tải dữ liệu tổng quan.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [dateRange]);

    useEffect(() => {
        void loadDashboard();
    }, [loadDashboard]);

    const chartData = useMemo(() => data.nextSevenDays.flatMap((item) => [
        {
            date: dayjs(item.date).format('DD/MM'),
            type: 'Lịch hoạt động',
            value: Math.max(0, item.total - item.cancelled),
        },
        { date: dayjs(item.date).format('DD/MM'), type: 'Lịch nghỉ', value: item.cancelled },
    ]), [data.nextSevenDays]);

    const quickActions = [
        {
            label: 'Thêm lịch học',
            description: 'Tạo và phân công buổi học mới',
            path: '/schedule',
            permission: PermissionKey.SCHEDULE_CREATE,
            icon: <CalendarOutlined />,
            color: '#1677ff',
        },
        {
            label: 'Quản lý nội dung',
            description: 'Cập nhật và sắp xếp bài học',
            path: '/lessons',
            permission: PermissionKey.LESSON_VIEW,
            icon: <BookOutlined />,
            color: '#722ed1',
        },
        {
            label: 'Quản lý câu hỏi',
            description: 'Tạo và kiểm tra ngân hàng câu hỏi',
            path: '/quizzes',
            permission: PermissionKey.QUIZ_VIEW,
            icon: <QuestionCircleOutlined />,
            color: '#fa8c16',
        },
        {
            label: 'Nhân sự giảng dạy',
            description: 'Giáo viên và trợ giảng',
            path: '/teacher-profiles',
            permission: PermissionKey.TEACHER_PROFILE_VIEW,
            icon: <TeamOutlined />,
            color: '#13a8a8',
        },
    ].filter((item) => hasPermission(item.permission));

    const activeToday = data.today.upcoming + data.today.ongoing + data.today.completed;
    const completionPercent = activeToday
        ? Math.round((data.today.completed / activeToday) * 100)
        : 0;

    return (
        <div className={styles.page}>
            <section className={styles.hero}>
                <Flex justify="space-between" align="center" wrap="wrap" gap={16}>
                    <div>
                        <Flex align="center" gap={8}>
                            <DashboardOutlined className={styles.heroIcon} />
                            <Text className={styles.eyebrow}>TRUNG TÂM ĐIỀU HÀNH LMS</Text>
                        </Flex>
                        <Title level={2} className={styles.heroTitle}>
                            Xin chào, {user.username || 'Quản trị viên'}
                        </Title>
                        <Text className={styles.heroSubtitle}>
                            Theo dõi lịch học, nội dung và trạng thái đồng bộ trên một màn hình.
                        </Text>
                    </div>
                    <Flex vertical align="flex-end" gap={8}>
                        <DatePicker.RangePicker
                            value={dateRange}
                            allowClear={false}
                            format="DD/MM/YYYY"
                            presets={[
                                { label: 'Tuần này', value: [dayjs().startOf('week'), dayjs().endOf('week')] },
                                { label: 'Tháng này', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
                            ]}
                            onChange={(value) => {
                                if (value?.[0] && value?.[1]) setDateRange([value[0], value[1]]);
                            }}
                        />
                        <Button
                            icon={<ReloadOutlined spin={refreshing} />}
                            onClick={() => void loadDashboard(true)}
                            loading={refreshing}
                        >
                            Làm mới
                        </Button>
                        <Text type="secondary">
                            {data.generatedAt
                                ? `Cập nhật lúc ${dayjs(data.generatedAt).format('HH:mm DD/MM/YYYY')}`
                                : dayjs().format('dddd, DD/MM/YYYY')}
                        </Text>
                    </Flex>
                </Flex>
            </section>

            {error && (
                <Alert
                    type="error"
                    showIcon
                    message="Không thể tải dashboard"
                    description={error}
                    action={<Button size="small" onClick={() => void loadDashboard(true)}>Thử lại</Button>}
                />
            )}

            {loading ? (
                <Card><Skeleton active paragraph={{ rows: 12 }} /></Card>
            ) : (
                <>
                    <Row gutter={[16, 16]}>
                        <Col xs={24} sm={12} xl={6}>
                            <SummaryCard title="Khóa học" value={data.summary.courses} description="Có lịch trên hệ thống" icon={<CalendarOutlined />} color="#1677ff" />
                        </Col>
                        <Col xs={24} sm={12} xl={6}>
                            <SummaryCard title="Đề cương đã gán Quiz" value={data.summary.outlinesWithQuiz} description="Trong khoảng thời gian đã chọn" icon={<CheckCircleOutlined />} color="#52c41a" />
                        </Col>
                        <Col xs={24} sm={12} xl={6}>
                            <SummaryCard title="Đề cương chưa gán Quiz" value={data.summary.outlinesWithoutQuiz} description="Cần bổ sung Quiz" icon={<ExclamationCircleOutlined />} color="#ff4d4f" />
                        </Col>
                        <Col xs={24} sm={12} xl={6}>
                            <SummaryCard title="Nội dung bài học" value={data.summary.lessons} description="Bài học đang hoạt động" icon={<BookOutlined />} color="#722ed1" />
                        </Col>
                        <Col xs={24} sm={12} xl={6}>
                            <SummaryCard title="Câu hỏi" value={data.summary.quizzes} description="Câu hỏi đang sử dụng" icon={<QuestionCircleOutlined />} color="#fa8c16" />
                        </Col>
                        <Col xs={24} sm={12} xl={6}>
                            <SummaryCard
                                title="Nhân sự giảng dạy"
                                value={data.summary.teachingStaff}
                                description={`${data.summary.teachers} giáo viên · ${data.summary.assistants} trợ giảng`}
                                icon={<TeamOutlined />}
                                color="#13a8a8"
                            />
                        </Col>
                    </Row>

                    <Row gutter={[16, 16]}>
                        <Col xs={24} xl={9}>
                            <Card title="Lịch học trong khoảng đã chọn" className={styles.panelCard} extra={<Tag color="blue">{data.today.total} buổi</Tag>}>
                                <div className={styles.todayLead}>
                                    <Progress
                                        type="dashboard"
                                        percent={completionPercent}
                                        size={132}
                                        strokeColor="#1677ff"
                                        format={() => <div><strong>{data.today.completed}</strong><small>Đã kết thúc</small></div>}
                                    />
                                    <div className={styles.statusGrid}>
                                        <div><Badge status="processing" /><Text>Đang diễn ra</Text><strong>{data.today.ongoing}</strong></div>
                                        <div><Badge color="#1677ff" /><Text>Sắp diễn ra</Text><strong>{data.today.upcoming}</strong></div>
                                        <div><Badge status="success" /><Text>Hoàn thành</Text><strong>{data.today.completed}</strong></div>
                                        <div><Badge status="error" /><Text>Nghỉ học</Text><strong>{data.today.cancelled}</strong></div>
                                    </div>
                                </div>
                            </Card>
                        </Col>
                        <Col xs={24} xl={15}>
                            <Card title="Biểu đồ lịch học theo thời gian" className={styles.panelCard} extra={<Text type="secondary">Theo ngày</Text>}>
                                {chartData.some((item) => item.value > 0) ? (
                                    <Column
                                        height={245}
                                        data={chartData}
                                        xField="date"
                                        yField="value"
                                        colorField="type"
                                        stack
                                        scale={{ color: { range: ['#1677ff', '#ff7875'] } }}
                                        axis={{ y: { title: false }, x: { title: false } }}
                                        legend={{ color: { position: 'top' } }}
                                    />
                                ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có lịch trong khoảng đã chọn" />}
                            </Card>
                        </Col>
                    </Row>

                    <Row gutter={[16, 16]}>
                        <Col xs={24} xl={16}>
                            <Card
                                title="Lịch học sắp diễn ra"
                                className={styles.panelCard}
                                extra={hasPermission(PermissionKey.SCHEDULE_VIEW) && (
                                    <Button type="link" onClick={() => router.push('/schedule')}>Xem tất cả <RightOutlined /></Button>
                                )}
                            >
                                {data.upcomingSchedules.length ? (
                                    <List
                                        dataSource={data.upcomingSchedules}
                                        renderItem={(item) => (
                                            <List.Item className={styles.scheduleItem}>
                                                <div className={styles.dateTile}>
                                                    <strong>{formatWallClock(item.startTime, 'time')}</strong>
                                                    <span>{formatWallClock(item.startTime, 'date').slice(0, 5)}</span>
                                                </div>
                                                <div className={styles.scheduleMain}>
                                                    <Flex align="center" gap={8} wrap="wrap">
                                                        <Text strong>{item.lessonName || `Bài ${item.learnNumber}`}</Text>
                                                        <Tag color="blue">Buổi {item.learnNumber}</Tag>
                                                    </Flex>
                                                    <Text type="secondary">{item.subject || 'Chưa có môn học'} · {item.code}</Text>
                                                    <Space size={[12, 4]} wrap>
                                                        <Text><UserOutlined /> {item.teacher || 'Chưa phân công'}</Text>
                                                        <Text><ClockCircleOutlined /> {formatWallClock(item.startTime, 'time')} – {formatWallClock(item.endTime, 'time')}</Text>
                                                        <Text><CalendarOutlined /> {item.room || 'Phòng Online'}</Text>
                                                    </Space>
                                                </div>
                                            </List.Item>
                                        )}
                                    />
                                ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có lịch học sắp diễn ra" />}
                            </Card>
                        </Col>
                        <Col xs={24} xl={8}>
                            <Card title="Thao tác nhanh" className={styles.panelCard}>
                                <div className={styles.quickGrid}>
                                    {quickActions.map((item) => (
                                        <button key={item.path} className={styles.quickAction} onClick={() => router.push(item.path)}>
                                            <Avatar icon={item.icon} style={{ background: `${item.color}16`, color: item.color }} />
                                            <span><strong>{item.label}</strong><small>{item.description}</small></span>
                                            <RightOutlined />
                                        </button>
                                    ))}
                                    {!quickActions.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có thao tác phù hợp quyền hiện tại" />}
                                </div>
                            </Card>
                        </Col>
                    </Row>

                    <Row gutter={[16, 16]}>
                        <Col xs={24} xl={12}>
                            <Card title="Trạng thái tích hợp" className={styles.panelCard}>
                                <div className={styles.integrationGrid}>
                                    <div className={styles.integrationItem}>
                                        <Avatar size={42} icon={<NotificationOutlined />} style={{ background: '#6264a7' }} />
                                        <div><Text strong>Microsoft Teams</Text><Text type="secondary">Thông báo lịch học</Text></div>
                                        <div className={styles.integrationMetrics}>
                                            <Tag color="green">Đã gửi hôm nay: {data.integrations.teams.sentToday}</Tag>
                                            <Tag color={data.integrations.teams.pending ? 'processing' : 'default'}>Chờ: {data.integrations.teams.pending}</Tag>
                                            <Tag color={data.integrations.teams.failed ? 'error' : 'default'}>Lỗi: {data.integrations.teams.failed}</Tag>
                                        </div>
                                    </div>
                                    <div className={styles.integrationItem}>
                                        <Avatar size={42} icon={<CloudSyncOutlined />} style={{ background: '#1677ff' }} />
                                        <div><Text strong>Học Mãi</Text><Text type="secondary">Đồng bộ lịch học</Text></div>
                                        <div className={styles.integrationMetrics}>
                                            <Tag color="green">Đồng bộ hôm nay: {data.integrations.hocmai.syncedToday}</Tag>
                                            <Tag color={data.integrations.hocmai.pending ? 'processing' : 'default'}>Chờ: {data.integrations.hocmai.pending}</Tag>
                                            <Tag color={data.integrations.hocmai.failed ? 'error' : 'default'}>Lỗi: {data.integrations.hocmai.failed}</Tag>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </Col>
                        <Col xs={24} xl={12}>
                            <Card title="Thay đổi lịch gần đây" className={styles.panelCard} extra={<Text type="secondary">{data.summary.adminUsers} quản trị viên</Text>}>
                                {data.recentChanges.length ? (
                                    <List
                                        dataSource={data.recentChanges}
                                        renderItem={(item) => {
                                            const action = actionLabels[item.action] || { label: item.action, color: 'blue' };
                                            return (
                                                <List.Item className={styles.changeItem}>
                                                    <Avatar icon={item.action === 'cancel' ? <ExclamationCircleOutlined /> : <CheckCircleOutlined />} />
                                                    <div className={styles.changeMain}>
                                                        <Flex align="center" gap={8} wrap="wrap">
                                                            <Text strong>{item.code} · Buổi {item.learnNumber}</Text>
                                                            <Tag color={action.color}>{action.label}</Tag>
                                                        </Flex>
                                                        <Text type="secondary">{item.actorUsername} · {dayjs(item.createdAt).format('HH:mm DD/MM/YYYY')}</Text>
                                                    </div>
                                                </List.Item>
                                            );
                                        }}
                                    />
                                ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có thay đổi lịch" />}
                            </Card>
                        </Col>
                    </Row>
                </>
            )}
        </div>
    );
};

export default Page;
