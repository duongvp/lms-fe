'use client';
import { Alert, Button, Col, Grid, Modal, Progress, Row, Space, Statistic, Table, Typography } from 'antd';
import { SearchOutlined, UserAddOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { yesterdayRegistrationDate } from '@/ultils/registrationAuditDate';
import { useEffect, useRef, useState } from 'react';
import { DatePicker } from '../MobileSchedulePickers';
import { applyRegistrationAudit, getRegistrationAudit, startRegistrationAudit, type RegistrationAudit } from '@/services/calendarRegistrationAuditService';

export default function RegistrationAuditModal({ids, onClose}: {ids: string[]; onClose: () => void}) {
    const screens = Grid.useBreakpoint();
    const [date] = useState(() => dayjs(yesterdayRegistrationDate()));
    const [audit, setAudit] = useState<RegistrationAudit | null>(null);
    const [jobId, setJobId] = useState<string>();
    const [busy, setBusy] = useState(false);
    const [loadingPage, setLoadingPage] = useState(false);
    const [error, setError] = useState('');
    const generation = useRef(0);
    useEffect(() => () => {generation.current += 1;}, []);

    const poll = async (id: string, current: number) => {
        let failures = 0;
        while (generation.current === current) {
            let response: any;
            try { response = await getRegistrationAudit(id); failures = 0; }
            catch (err: any) {
                if (++failures >= 3) throw new Error(err?.message || 'Không tải được kết quả. Hãy bấm Tải lại kết quả.');
                await new Promise(resolve => setTimeout(resolve, 1500));
                continue;
            }
            if (generation.current !== current) return;
            const next: RegistrationAudit = response.data;
            setAudit(next);
            if (next.status === 'failed') throw new Error(next.error || next.message);
            if (next.status === 'ready' || next.status === 'completed') return;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    };

    const perform = async (action: 'check' | 'apply' | 'resume') => {
        if (busy || !date) return;
        const current = ++generation.current;
        setBusy(true); setError('');
        try {
            let id = jobId;
            if (action === 'check') {
                setAudit(null); setJobId(undefined);
                const response: any = await startRegistrationAudit(ids, date.format('DD/MM/YYYY'));
                id = response.data.jobId;
                setJobId(id);
            } else if (action === 'apply' && id) {
                await applyRegistrationAudit(id);
            }
            if (id) await poll(id, current);
        } catch (err: any) {
            if (generation.current === current) setError(err?.message || 'Không thể hoàn tất thao tác.');
        } finally { if (generation.current === current) setBusy(false); }
    };

    const loadPage = async (page: number) => {
        if (!jobId || busy || loadingPage) return;
        const current = generation.current;
        setLoadingPage(true); setError('');
        try {
            const response: any = await getRegistrationAudit(jobId, page);
            if (generation.current === current) setAudit(response.data);
        } catch (err: any) {if (generation.current === current) setError(err?.message || 'Không thể tải trang.');}
        finally {if (generation.current === current) setLoadingPage(false);}
    };

    return <Modal open title="Kiểm tra học viên thiếu hôm qua" width={1000}
        rootClassName="schedule-responsive-modal" onCancel={() => {if (!busy) onClose();}} closable={!busy} maskClosable={!busy} keyboard={!busy}
        styles={{body: {maxHeight: '72dvh', overflowY: 'auto'}}}
        footer={<Space wrap>
            <Button disabled={busy} onClick={onClose}>Đóng</Button>
            {jobId && error && audit?.status !== 'failed' && <Button disabled={busy} onClick={() => void perform('resume')}>Tải lại kết quả</Button>}
            <Button icon={<SearchOutlined />} loading={busy && audit?.status !== 'inserting'} disabled={busy || !date}
                onClick={() => void perform('check')}>{audit ? 'Kiểm tra lại' : 'Kiểm tra'}</Button>
            {audit?.status === 'ready' && audit.totalMissing > 0 && <Button type="primary" icon={<UserAddOutlined />}
                loading={busy} disabled={busy || Boolean(error)} onClick={() => void perform('apply')}>
                Bổ sung {audit.totalMissing.toLocaleString('vi-VN')} enrollment thiếu
            </Button>}
        </Space>}>
        <Space direction="vertical" size={16} style={{width: '100%'}}>
            <Alert showIcon type="info" message={`Đối chiếu ${ids.length} lịch đã chọn`}
                description="Chỉ kiểm tra đăng ký của hôm qua theo giờ Việt Nam cho các lịch đã chọn. API lấy đăng ký từ ngày truyền vào đến hiện tại; hệ thống lấy thêm danh sách từ hôm nay để loại khỏi kết quả. Mỗi enrollment được đối chiếu theo username + mã chương trình + buổi học." />
            <div>
                <Typography.Text strong>Ngày đăng ký cần kiểm tra (hôm qua)</Typography.Text>
                <div style={{marginTop: 8, maxWidth: screens.md ? 240 : undefined}}>
                    <DatePicker value={date} format="DD/MM/YYYY" allowClear={false} disabled style={{width: '100%'}} />
                </div>
            </div>
            {busy && <div><Progress percent={audit?.progress || 3} status="active" /><Typography.Text>{audit?.message || 'Đang khởi tạo đối chiếu...'}</Typography.Text></div>}
            {error && <Alert showIcon type="error" message={error} />}
            {audit?.stats && <>
                <Row gutter={[16, 12]}>
                    <Col xs={12} md={6}><Statistic title="Đăng ký hôm qua" value={audit.stats.apiRows} /></Col>
                    <Col xs={12} md={6}><Statistic title="Username riêng biệt" value={audit.stats.uniqueUsers} /></Col>
                    <Col xs={12} md={6}><Statistic title="Enrollment đã có" value={audit.stats.existingEnrollments} /></Col>
                    <Col xs={12} md={6}><Statistic title="Enrollment còn thiếu" value={audit.stats.missingEnrollments} valueStyle={{color: audit.stats.missingEnrollments ? '#cf1322' : '#389e0d'}} /></Col>
                </Row>
                <Typography.Text type="secondary">Đã lấy đủ các trang API của cả hai mốc ngày; loại {audit.stats.excludedNewerRows ?? 0} dòng đăng ký từ hôm nay khỏi {audit.stats.apiRowsSinceDate ?? audit.stats.apiRows} dòng tổng. Một username đăng ký nhiều gói chỉ được tính một lần trên mỗi chương trình/buổi.</Typography.Text>
                {audit.summary.length > 0 && <Table size="small" rowKey={row => `${row.code}:${row.learnNumber}`} pagination={false} scroll={{x: 540}}
                    dataSource={audit.summary} columns={[
                        {title: 'Chương trình', dataIndex: 'code'}, {title: 'Buổi', dataIndex: 'learnNumber', width: 60},
                        {title: 'Cần có', dataIndex: 'expected', width: 80}, {title: 'Đã có', dataIndex: 'existing', width: 80},
                        {title: 'Thiếu', dataIndex: 'missing', width: 70},
                    ]} />}
                {audit.status === 'ready' && audit.totalMissing === 0 && <Alert showIcon type="success" message="Không thiếu học viên theo dữ liệu API của ngày đã chọn." />}
                {audit.totalMissing > 0 && <>
                    <Typography.Text strong>Danh sách enrollment còn thiếu</Typography.Text>
                    <Table size="small" rowKey="key" loading={loadingPage} scroll={{x: 780}} dataSource={audit.rows}
                        pagination={{current: audit.page, pageSize: 50, total: audit.totalMissing, showSizeChanger: false, onChange: page => void loadPage(page)}}
                        columns={[
                            {title: 'Username', dataIndex: 'username', width: 160}, {title: 'Họ tên', dataIndex: 'name', width: 240},
                            {title: 'Chương trình', dataIndex: 'code', width: 200}, {title: 'Buổi', dataIndex: 'learnNumber', width: 65},
                            {title: 'Package ID', dataIndex: 'packages', render: values => values.join(', ')},
                        ]} />
                    <Alert type="warning" showIcon message="Chỉ bổ sung dòng còn thiếu khi bạn bấm nút Bổ sung. Học viên đã có được giữ nguyên; không đổi trạng thái học, lớp/phòng hay đánh dấu lịch đã đồng bộ." />
                </>}
            </>}
            {audit?.result && <Alert showIcon type={audit.result.remaining ? 'warning' : 'success'}
                message={`Đã thêm ${audit.result.inserted} enrollment; ${audit.result.alreadyPresent} dòng đã được bổ sung trước đó; còn thiếu ${audit.result.remaining}.`} />}
        </Space>
    </Modal>;
}
