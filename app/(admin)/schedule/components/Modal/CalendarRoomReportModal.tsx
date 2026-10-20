"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Modal, Pagination, Select, Space, Table, Tag, Typography, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { formatVietnamDateTime } from '@/helper/convertDate';
import {
    getCalendarRoomReport, exportCalendarRoomReport,
    type CalendarRoomReport, type CalendarRoomReportRow, type LivestreamListParams,
} from '@/services/livestreamService';

type Props = { open: boolean; params: LivestreamListParams; canExport: boolean; onClose: () => void };

export default function CalendarRoomReportModal({ open, params, canExport, onClose }: Props) {
    const [report, setReport] = useState<CalendarRoomReport | null>(null);
    const [groupBy, setGroupBy] = useState<'program' | 'room'>('program');
    const [roomId, setRoomId] = useState<number | 'unassigned' | undefined>();
    const [pagination, setPagination] = useState({ filterKey: '', page: 1 });
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState('');
    const cache = useRef(new Map<string, CalendarRoomReport>());
    const filterKey = JSON.stringify({ ...params, page: undefined, limit: undefined, group_by: groupBy });
    const filters = useMemo<LivestreamListParams & { group_by: 'program' | 'room' }>(() => JSON.parse(filterKey), [filterKey]);
    const page = pagination.filterKey === filterKey ? pagination.page : 1;
    const setPage = (value: number) => setPagination({ filterKey, page: value });
    useEffect(() => {
        cache.current.clear();
        setRoomId(undefined);
        if (!open) setPagination({ filterKey: '', page: 1 });
    }, [open, filterKey]);
    useEffect(() => {
        if (!open) return;
        let active = true;
        const key = `${filterKey}:${page}`;
        const cached = cache.current.get(key);
        if (cached) { setReport(cached); setLoading(false); setError(''); return; }
        setLoading(true);
        setReport(null);
        setError('');
        getCalendarRoomReport({ ...filters, page })
            .then((response: any) => { if (active) { cache.current.set(key, response.data); setReport(response.data); } })
            .catch((failure: any) => { if (active) { setReport(null); setError(failure.message || 'Không tải được báo cáo'); } })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [open, filters, filterKey, page]);
    const rows = (report?.data || []).filter((row) => roomId === undefined || row.room_id === (roomId === 'unassigned' ? null : roomId));
    const roomOptions = Array.from(new Set([...(report?.rooms || []), ...(typeof roomId === 'number' ? [roomId] : [])]))
        .filter((value): value is number => value !== null).sort((a, b) => a - b)
        .map((value) => ({ value: value as number | 'unassigned', label: `Room ${value}` }));
    roomOptions.push({ value: 'unassigned', label: 'Chưa chia room' });
    const exportExcel = async () => {
        setExporting(true);
        try {
            const blob = await exportCalendarRoomReport({ ...filters, room_id: roomId });
            const url = URL.createObjectURL(blob as Blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'bao-cao-lop-hoc.xlsx';
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (failure: any) { message.error(failure.message || 'Không xuất được báo cáo'); }
        finally { setExporting(false); }
    };
    return <Modal title="Báo cáo lớp học theo chương trình / buổi" open={open} onCancel={onClose} width={1400}
        footer={<Button onClick={onClose}>Đóng</Button>}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
                <Space wrap>
                    <Typography.Text>Đang dùng bộ lọc lịch học đang chọn.</Typography.Text>
                    <Tag>{filters.calendar_source === 'feed' ? 'Feed' : 'Livestream'}</Tag>
                    {filters.code && <Tag>{filters.code}</Tag>}
                    {filters.calendar_ids && <Tag color="blue">{filters.calendar_ids.length} lịch trong phạm vi chọn</Tag>}
                    <Select aria-label="Cách hiển thị báo cáo" value={groupBy} style={{ minWidth: 230 }}
                        options={[{ value: 'program', label: 'Tổng hợp tất cả room' }, { value: 'room', label: 'Chi tiết từng room' }]}
                        onChange={(value) => { setGroupBy(value); setRoomId(undefined); }} />
                    {groupBy === 'room' && <Select aria-label="Lọc room báo cáo" allowClear placeholder="Tất cả room"
                        style={{ minWidth: 180 }} value={roomId} options={roomOptions} onChange={setRoomId} />}
                </Space>
                {canExport && <Button type="primary" icon={<DownloadOutlined />} loading={exporting}
                    onClick={() => void exportExcel()}>Xuất Excel toàn bộ kết quả lọc</Button>}
            </Space>
            <Alert type="info" showIcon message={groupBy === 'room' ? 'Hiển thị riêng từng room của mỗi buổi học, có thể lọc theo room.' : 'Tổng hợp toàn bộ room và học sinh chưa chia room của chương trình trong từng buổi học.'}
                description="HS học: có ít nhất 2 ghi nhận chuyên cần liên tiếp, mỗi 5 phút (~10 phút học); join lại sẽ ngắt chuỗi; nếu thiếu giờ thực tế, dùng khung giờ lịch. Tổng HS là danh sách được thêm hiện có, không gồm giáo viên/trợ giảng. Ngày live và khung giờ lấy theo lịch học." />
            {error && <Alert type="error" showIcon message={error} />}
            <Table<CalendarRoomReportRow> size="small" rowKey="key" dataSource={rows} loading={loading}
                pagination={false} scroll={{ x: 1100, y: 520 }} columns={[
                    { title: 'Chương trình / Buổi', width: 210, fixed: 'left', render: (_, row) => <Space direction="vertical" size={0}>
                        <Typography.Text strong>{row.code}</Typography.Text><Typography.Text>Buổi {row.learn_number} · #{row.calendar_id}</Typography.Text>
                        {row.lesson_status === 1 && <Tag>Nghỉ/Hủy</Tag>}
                    </Space> },
                    { title: 'Bài học / Giáo viên', width: 280, render: (_, row) => <Space direction="vertical" size={0}>
                        <Typography.Text>{row.lesson_name}</Typography.Text><Typography.Text type="secondary">{row.teacher || '—'}</Typography.Text>
                    </Space> },
                    ...(groupBy === 'room' ? [{ title: 'Room', dataIndex: 'room_id', width: 110,
                        render: (value: number | null) => value === null ? <Tag>Chưa chia</Tag> : <Tag color="blue">Room {value}</Tag> }] : []),
                    { title: 'Ngày live', dataIndex: 'scheduled_start_time', width: 130,
                        render: (value) => formatVietnamDateTime(value, 'DD/MM/YYYY') },
                    { title: 'Khung giờ', width: 150, render: (_, row) =>
                        `${formatVietnamDateTime(row.scheduled_start_time, 'HH:mm')} - ${formatVietnamDateTime(row.scheduled_end_time, 'HH:mm')}` },
                    { title: 'HS học / Tổng được thêm', width: 150, render: (_, row) => <Space direction="vertical" size={0}>
                        <Typography.Text strong>{row.attended_students} / {row.added_students}</Typography.Text>
                        <Typography.Text type="secondary">{row.added_students ? Math.round(row.attended_students * 1000 / row.added_students) / 10 : 0}%</Typography.Text>
                    </Space> },
                ]} />
            <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
                <Typography.Text type="secondary">{report?.total_schedules || 0} buổi theo bộ lọc lịch, phân trang theo buổi. {groupBy === 'room' ? 'Mỗi dòng là một room trong một phiên học.' : 'Mỗi dòng là tổng cả chương trình trong một phiên học.'} Số HS có thể lặp giữa các phiên học.</Typography.Text>
                <Pagination current={page} pageSize={20} total={report?.total_schedules || 0} showSizeChanger={false} onChange={setPage} />
            </Space>
        </Space>
    </Modal>;
}
