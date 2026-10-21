"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Modal, Pagination, Select, Space, Table, Tag, Typography, message, type TableProps } from 'antd';
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import CalendarLessonDetailReportModal from './CalendarLessonDetailReportModal';
import { useAuthStore } from '@/stores/authStore';
import { formatVietnamDateTime } from '@/helper/convertDate';
import {
    getCalendarRoomReport, getCalendarRoomReportLiveTimes, exportCalendarRoomReport,
    type CalendarRoomReport, type CalendarRoomReportRow, type LivestreamListParams,
} from '@/services/livestreamService';

type Props = { open: boolean; params: LivestreamListParams; canExport: boolean; onClose: () => void };

const hasRecordingErrors = (value: CalendarRoomReport) => value.data.some((row) => row.live_recording?.status === 'error');

export default function CalendarRoomReportModal({ open, params, canExport, onClose }: Props) {
    const canViewDetail = useAuthStore(s => Boolean(s.user?.roles?.some(role => role === 'admin' || role?.code === 'admin')) || s.hasPermission('calendar.report.detail.view'));
    const [detailTarget, setDetailTarget] = useState<{ row: CalendarRoomReportRow; roomId?: number | 'unassigned' } | null>(null);
    useEffect(() => { if (!open) setDetailTarget(null); }, [open]);
    const [report, setReport] = useState<CalendarRoomReport | null>(null);
    const [groupBy, setGroupBy] = useState<'program' | 'room'>('program');
    const [roomId, setRoomId] = useState<number | 'unassigned' | undefined>();
    const [pagination, setPagination] = useState({ filterKey: '', page: 1 });
    const [loading, setLoading] = useState(false);
    const [attendanceLoading, setAttendanceLoading] = useState(false);
    const [recordingsLoading, setRecordingsLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState('');
    const [reloadKey, setReloadKey] = useState(0);
    const retryRecordings = useRef<(() => void) | null>(null);
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
        let currentReport: CalendarRoomReport | null = null;
        let attendanceState: 'pending' | 'success' | 'error' = 'pending';
        const requestedRecordingIds = new Set<number>();
        let pendingRecordingRequests = 0;
        const times = new Map<number, CalendarRoomReportRow['live_recording']>();
        const withTimes = (value: CalendarRoomReport): CalendarRoomReport => ({ ...value, data: value.data.map(row => ({ ...row, live_recording: times.get(row.calendar_id) || row.live_recording })) });
        const publish = (value: CalendarRoomReport, cacheAttendance = false) => {
            if (!active) return;
            const next = withTimes(value);
            currentReport = next;
            if (cacheAttendance) cache.current.set(key, next);
            setReport(next); setLoading(false);
        };
        const startRecordings = (value: CalendarRoomReport) => {
            if (!active) return;
            const ids = [...new Set(value.data.filter(row => (!row.live_recording || row.live_recording.status === 'error') && !requestedRecordingIds.has(row.calendar_id)).map(row => row.calendar_id))];
            if (!ids.length) { if (!pendingRecordingRequests) setRecordingsLoading(false); return; }
            ids.forEach(id => requestedRecordingIds.add(id));
            pendingRecordingRequests++;
            setRecordingsLoading(true);
            const applyTimes = () => {
                if (!active) return;
                setReport(previous => {
                    if (!active || !previous) return previous;
                    currentReport = withTimes(previous); return currentReport;
                });
                const cached = cache.current.get(key);
                if (cached) cache.current.set(key, withTimes(cached));
            };
            getCalendarRoomReportLiveTimes({ ...filters, calendar_ids: ids, page: 1 })
                .then((response: any) => {
                    if (!active) return;
                    response.data.forEach((item: any) => times.set(item.calendar_id, item.live_recording));
                    for (const id of ids) if (!times.get(id)) times.set(id, { status: 'error', ranges: [] });
                    applyTimes();
                })
                .catch(() => {
                    if (!active) return;
                    ids.forEach(id => times.set(id, { status: 'error', ranges: [] }));
                    applyTimes();
                })
                .finally(() => { if (active) { pendingRecordingRequests--; setRecordingsLoading(pendingRecordingRequests > 0); } });
        };
        retryRecordings.current = () => {
            if (!active || !currentReport) return;
            currentReport.data.forEach(row => { if (!row.live_recording || row.live_recording.status === 'error') requestedRecordingIds.delete(row.calendar_id); });
            startRecordings(currentReport);
        };
        const cached = cache.current.get(key);
        setError('');
        if (cached) {
            attendanceState = 'success'; setAttendanceLoading(false);
            publish(cached); startRecordings(cached);
        } else {
            setLoading(true);
            setAttendanceLoading(true);
            setRecordingsLoading(false);
            setReport(null);
            // Metadata, attendance and live times are independent. Never show missing counts as zero.
            getCalendarRoomReport({ ...filters, page, include_attendance: false, include_recordings: false })
                .then((response: any) => {
                    if (!active || attendanceState === 'success') return;
                    const metadata: CalendarRoomReport = response.data;
                    publish(attendanceState === 'error' ? { ...metadata, data: metadata.data.map(row => ({ ...row, attendance_status: 'error' })) } : metadata);
                    startRecordings(metadata);
                }).catch(() => { /* The attendance response can still render the complete table. */ });
            getCalendarRoomReport({ ...filters, page, include_recordings: false })
                .then((response: any) => {
                    if (!active) return;
                    attendanceState = 'success'; setAttendanceLoading(false);
                    publish(response.data, true); startRecordings(response.data);
                })
                .catch((failure: any) => {
                    if (!active) return;
                    attendanceState = 'error'; setAttendanceLoading(false); setLoading(false);
                    setError(failure.message || 'Không tải được số liệu chuyên cần');
                    setReport(previous => previous ? { ...previous, data: previous.data.map(row => ({ ...row, attendance_status: 'error' })) } : null);
                });
        }
        return () => { active = false; retryRecordings.current = null; };
    }, [open, filters, filterKey, page, reloadKey]);
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
    const columns: NonNullable<TableProps<CalendarRoomReportRow>['columns']> = [
        { title: 'Chương trình / Buổi', width: groupBy === 'room' ? '17%' : '18%', render: (_, row) => <Space direction="vertical" size={2} style={{ maxWidth: '100%' }}>
            {canViewDetail ? <Button type="link" aria-label={`Xem chi tiết ${row.code} · Buổi ${row.learn_number}`} style={{ height: 'auto', padding: 0, maxWidth: '100%', whiteSpace: 'normal', textAlign: 'left' }}
                onClick={() => setDetailTarget({ row, roomId: groupBy === 'room' && !row.attendance_status ? row.room_id ?? 'unassigned' : undefined })}>
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', overflowWrap: 'anywhere' }}><span style={{ fontWeight: 600 }}>{row.code}</span><span>Buổi {row.learn_number} · #{row.calendar_id}</span></span>
            </Button> : <><Typography.Text strong>{row.code}</Typography.Text><Typography.Text>Buổi {row.learn_number} · #{row.calendar_id}</Typography.Text></>}
            {row.lesson_status === 1 && <Tag>Nghỉ/Hủy</Tag>}
        </Space> },
        { title: 'Bài học / Giáo viên', width: groupBy === 'room' ? '23%' : '24%', render: (_, row) => <Space direction="vertical" size={0}>
            <Typography.Text>{row.lesson_name}</Typography.Text><Typography.Text type="secondary">{row.teacher || '—'}</Typography.Text>
        </Space> },
        ...(groupBy === 'room' ? [{ title: 'Room', dataIndex: 'room_id', width: '8%',
            render: (value: number | null, row: CalendarRoomReportRow) => row.attendance_status ? <Typography.Text type="secondary">{row.attendance_status === 'pending' ? 'Đang tải…' : 'Chưa tải được'}</Typography.Text> : value === null ? <Tag>Chưa chia</Tag> : <Tag color="blue">Room {value}</Tag> }] : []),
        { title: 'Ngày live', dataIndex: 'scheduled_start_time', width: '10%',
            render: (value) => formatVietnamDateTime(value, 'DD/MM/YYYY') },
        { title: 'Khung giờ', width: '11%', render: (_, row) =>
            `${formatVietnamDateTime(row.scheduled_start_time, 'HH:mm')} - ${formatVietnamDateTime(row.scheduled_end_time, 'HH:mm')}` },
        { title: 'Khung giờ live thật', width: '12%', render: (_, row) => {
            const ranges = row.live_recording?.ranges || [];
            if (ranges.length) {
                const start = ranges.reduce((value, range) => range.start_time < value ? range.start_time : value, ranges[0].start_time);
                const end = ranges.reduce((value, range) => range.end_time > value ? range.end_time : value, ranges[0].end_time);
                return <Typography.Text>{formatVietnamDateTime(start, 'HH:mm')} - {formatVietnamDateTime(end, 'HH:mm')}
                    {end.slice(0, 10) !== start.slice(0, 10) && ` (${formatVietnamDateTime(end, 'DD/MM')})`}
                </Typography.Text>;
            }
            return <Typography.Text type="secondary">{!row.live_recording && recordingsLoading ? 'Đang tải…'
                : row.live_recording?.status === 'error' ? row.live_recording.error_code === 'rate_limited'
                    ? 'EVG giới hạn tần suất, vui lòng tải lại' : 'Không tải được dữ liệu EVG' : 'Chưa có dữ liệu'}</Typography.Text>;
        } },
        { title: groupBy === 'room' ? 'HS học / Được thêm đúng lịch, room' : 'HS học / Được thêm đúng lịch', width: groupBy === 'room' ? '10%' : '12%', render: (_, row) => row.attendance_status ? <Typography.Text type="secondary">{row.attendance_status === 'pending' ? 'Đang tính…' : 'Chưa tải được'}</Typography.Text> : <Space direction="vertical" size={0}>
            <Typography.Text strong>{row.attended_students} / {row.added_students}</Typography.Text>
            <Typography.Text type="secondary">{row.added_students && row.attended_students != null ? Math.round(row.attended_students * 1000 / row.added_students) / 10 : 0}%</Typography.Text>
        </Space> },
        { title: 'Tổng HS học / Tổng HS được thêm', width: groupBy === 'room' ? '9%' : '13%',
            render: (_, row) => row.attendance_status ? <Typography.Text type="secondary">{row.attendance_status === 'pending' ? 'Đang tính…' : 'Chưa tải được'}</Typography.Text> : <Space direction="vertical" size={0}>
                <Typography.Text strong>{row.lesson_attended_students} / {row.lesson_added_students}</Typography.Text>
                <Typography.Text type="secondary">{row.lesson_added_students && row.lesson_attended_students != null ? Math.round(row.lesson_attended_students * 1000 / row.lesson_added_students) / 10 : 0}%</Typography.Text>
            </Space> },
    ];
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
                        style={{ minWidth: 180 }} disabled={attendanceLoading} value={roomId} options={roomOptions} onChange={setRoomId} />}
                </Space>
                <Space wrap>
                {report && hasRecordingErrors(report) && <Button icon={<ReloadOutlined />} loading={loading || recordingsLoading} onClick={() => {
                    retryRecordings.current?.();
                }}>Tải lại dữ liệu EVG</Button>}
                {canExport && <Button type="primary" icon={<DownloadOutlined />} loading={exporting}
                    onClick={() => void exportExcel()}>Xuất Excel toàn bộ kết quả lọc</Button>}
                </Space>
            </Space>
            <Alert type="info" showIcon message={groupBy === 'room' ? 'Hiển thị riêng từng room của mỗi buổi học, có thể lọc theo room.' : 'Phân biệt học sinh đúng lịch và tổng học sinh cùng chương trình, cùng số bài.'}
                description="HS học: có ít nhất 2 ghi nhận chuyên cần liên tiếp (~10 phút); join lại ngắt chuỗi. Cột theo lịch chỉ tính học sinh có class_id đúng ngày, số bài và room; lịch sử chia lớp được dùng cho lịch đã chia lại. Cột tổng lấy toàn bộ học sinh cùng chương trình + số bài, không lọc class_id hoặc room. Cột tổng hợp nhất HS học qua cả lịch 1 và lịch 2, kể cả lịch ngoài bộ lọc ngày; mỗi HS tính một lần. Cả hai đều loại giáo viên/trợ giảng. Khung giờ live thật lấy từ bản ghi video EVG đúng ngày lịch; hiển thị giờ bắt đầu sớm nhất và kết thúc muộn nhất theo HH:mm." />
            {attendanceLoading && <Typography.Text type="secondary">Đang tính số liệu chuyên cần; bạn có thể xem thông tin buổi học trước.</Typography.Text>}
            {error && <Alert type="error" showIcon message={error} action={<Button onClick={() => setReloadKey(value => value + 1)}>Thử lại</Button>} />}
            <Table<CalendarRoomReportRow> size="small" rowKey="key" dataSource={rows} loading={loading}
                className="calendar-room-report-table" tableLayout="fixed" pagination={false} scroll={{ y: 520 }} columns={columns.map(column => ({
                    ...column, onCell: () => ({ style: { overflowWrap: 'anywhere' }, 'data-label': typeof column.title === 'string' ? column.title : '' }),
                }))} />
            <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
                <Typography.Text type="secondary">{report?.total_schedules || 0} buổi theo bộ lọc lịch, phân trang theo buổi. {groupBy === 'room' ? 'Mỗi dòng là một lịch + room.' : 'Mỗi dòng là một lịch học.'} Các phiên live của cùng lịch được gộp, mỗi HS chỉ tính một lần.</Typography.Text>
                <Pagination current={page} pageSize={20} total={report?.total_schedules || 0} showSizeChanger={false} onChange={setPage} />
            </Space>
        </Space>
        <CalendarLessonDetailReportModal target={detailTarget} onClose={() => setDetailTarget(null)} />
    </Modal>;
}
