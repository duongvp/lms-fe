'use client';
import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Collapse, Descriptions, Empty, Input, Modal, Pagination, Select, Space, Statistic, Table, Tabs, Tag, Typography, message } from 'antd';
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import { formatVietnamDateTime } from '@/helper/convertDate';
import { reportErrorMessage } from '@/helper/calendarReportPresentation';
import { useAuthStore } from '@/stores/authStore';
import { downloadDetailReport, getDetailLiveTimes, getDetailStudents, type DetailLiveTimes, type DetailFilters, type DetailReport, type DetailStudent } from '@/services/calendarDetailReportService';
import type { CalendarRoomReportRow } from '@/services/livestreamService';
import CalendarDetailEventList from './CalendarDetailEventList';
import CalendarStudentActivityDrawer, { attendanceLabels, logTime } from './CalendarStudentActivityDrawer';

type Target = { row: CalendarRoomReportRow; roomId?: number | 'unassigned' };
export default function CalendarLessonDetailReportModal({ target, onClose }: { target: Target | null; onClose: () => void }) {
  // A separate mounted component resets all detail state when the selected schedule changes.
  return target ? <DetailContent key={`${target.row.calendar_id}:${target.roomId ?? 'all'}`} target={target} onClose={onClose} /> : null;
}
function DetailContent({ target, onClose }: { target: Target; onClose: () => void }) {
  const { row } = target, hasPermission = useAuthStore(s => s.hasPermission);
  const isAdmin = useAuthStore(s => Boolean(s.user?.roles?.some(role => role === 'admin' || role?.code === 'admin')));
  const canExport = isAdmin || (hasPermission('calendar.export') && hasPermission('calendar.report.detail.export'));
  const [filters, setFilters] = useState<DetailFilters>({ room_id: target.roomId, page: 1, limit: 50 });
  const [report, setReport] = useState<DetailReport | null>(null), [loading, setLoading] = useState(false), [error, setError] = useState('');
  const [retry, setRetry] = useState(0), [exporting, setExporting] = useState(false), [tab, setTab] = useState('students'), [student, setStudent] = useState<number | null>(null), [timelineStudent, setTimelineStudent] = useState<number | undefined>();
  const [timelineOptions, setTimelineOptions] = useState<Array<{ value: number; label: string }>>([]);
  const filterKey = JSON.stringify(filters);
  const lastRefresh = useRef(0);
  useEffect(() => {
    const controller = new AbortController(); let active = true; setLoading(true); setError(''); setReport(null);
    const refresh = lastRefresh.current !== retry; lastRefresh.current = retry;
    getDetailStudents(row.calendar_id, { ...filters, refresh }, controller.signal).then(data => { if (active) setReport(data); })
      .catch(e => { if (active) setError(e.status === 403 ? 'Bạn chưa được cấp quyền xem báo cáo chi tiết cho chương trình này.' : reportErrorMessage(e, 'Chưa tải được báo cáo. Vui lòng thử lại.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [row.calendar_id, filterKey, retry]); // eslint-disable-line react-hooks/exhaustive-deps
  const update = (patch: Partial<DetailFilters>) => { setFilters(f => ({ ...f, ...patch, page: 1 })); setTimelineStudent(undefined); };
  useEffect(() => {
    if (tab !== 'timeline') return;
    setTimelineOptions((report?.rows || []).map(s => ({ value: s.user_id, label: `${s.name} · ${s.username}` })));
  }, [tab, report]);
  const [timelineQuery, setTimelineQuery] = useState('');
  useEffect(() => {
    if (tab !== 'timeline' || !timelineQuery) return;
    let active = true; const controller = new AbortController();
    const timer = setTimeout(() => getDetailStudents(row.calendar_id, { room_id: filters.room_id, q: timelineQuery, limit: 50 }, controller.signal)
      .then(data => { if (active) setTimelineOptions(data.rows.map(s => ({ value: s.user_id, label: `${s.name} · ${s.username}` }))); })
      .catch(() => { if (active) setTimelineOptions([]); }), 300);
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [timelineQuery, tab, row.calendar_id, filters.room_id]);
  const exportStudents = async () => { setExporting(true); try { await downloadDetailReport(row.calendar_id, undefined, filters); } catch (e) { message.error(reportErrorMessage(e, 'Chưa xuất được báo cáo. Vui lòng thử lại.')); } finally { setExporting(false); } };
  const [live, setLive] = useState<DetailLiveTimes | null>(row.live_recording || null);
  const [liveLoading, setLiveLoading] = useState(false);
  useEffect(() => {
    if (row.live_recording?.status === 'ready') return;
    const controller = new AbortController(); let active = true; setLiveLoading(true);
    getDetailLiveTimes(row.calendar_id, controller.signal).then(data => { if (active) setLive(data); })
      .catch(() => { if (active) setLive({ status: 'error', ranges: [] }); })
      .finally(() => { if (active) setLiveLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [row.calendar_id, row.live_recording, retry]);
  const ranges = live?.ranges || [];
  const start = ranges.length ? ranges.reduce((v, r) => r.start_time < v ? r.start_time : v, ranges[0].start_time) : null;
  const end = ranges.length ? ranges.reduce((v, r) => r.end_time > v ? r.end_time : v, ranges[0].end_time) : null;
  return <Modal title="Báo cáo chi tiết buổi học" open onCancel={onClose} width={1320} style={{ top: 24 }} styles={{ body: { maxHeight: 'calc(100dvh - 160px)', overflowY: 'auto' } }} footer={<Button onClick={onClose}>Đóng</Button>}>
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space wrap><Tag color="blue">{row.code}</Tag><Tag>Buổi {row.learn_number}</Tag><Tag>{filters.room_id === undefined ? 'Tất cả phòng của buổi học' : filters.room_id === 'unassigned' ? 'Chưa phân bổ phòng' : `Phòng ${filters.room_id}`}</Tag></Space>
      <Typography.Title level={5} style={{ margin: 0 }}>{row.lesson_name}</Typography.Title>
      <Descriptions size="small" layout="vertical" column={{ xs: 2, sm: 2, md: 4 }} items={[
        { key: 'date', label: 'Ngày học', children: formatVietnamDateTime(row.scheduled_start_time, 'DD/MM/YYYY') },
        { key: 'time', label: 'Theo lịch', children: `${formatVietnamDateTime(row.scheduled_start_time, 'HH:mm')} - ${formatVietnamDateTime(row.scheduled_end_time, 'HH:mm')}` },
        { key: 'live', label: 'Live thực tế', children: start && end ? `${formatVietnamDateTime(start, 'HH:mm')} - ${formatVietnamDateTime(end, 'HH:mm')}` : liveLoading ? 'Đang tải giờ phát…' : live?.status === 'error' ? 'Chưa tải được giờ phát' : 'Chưa có dữ liệu giờ phát' },
        { key: 'teacher', label: 'Giáo viên / Trợ giảng', children: `${report?.calendar.teacher || row.teacher || '—'} / ${report?.calendar.assistant_teacher || '—'}` },
      ]} />
      <Space wrap>
        <Select aria-label="Phòng báo cáo chi tiết" allowClear placeholder="Tất cả phòng" style={{ width: 180 }} value={filters.room_id} onChange={v => update({ room_id: v })} options={(report?.rooms || []).map(v => ({ value: v ?? 'unassigned', label: v == null ? 'Chưa phân bổ phòng' : `Phòng ${v}` }))} />
        <Button icon={<ReloadOutlined />} loading={loading} onClick={() => setRetry(v => v + 1)}>Làm mới</Button>
        {canExport && <Button icon={<DownloadOutlined />} loading={exporting} disabled={!report || loading} onClick={() => void exportStudents()}>Xuất học sinh theo bộ lọc</Button>}
      </Space>
      {error && <Alert type="error" message={error} action={<Button onClick={() => setRetry(v => v + 1)}>Thử lại</Button>} />}
      {report && <>
        {!!report.data_quality.ambiguous_chat_student_ids?.length && <Alert type="warning" message="Một mã học sinh được gắn với nhiều thông tin đăng ký. Chưa thể xác định chính xác người gửi nên các tin nhắn này chưa được cộng vào thống kê." />}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(125px, 1fr))', gap: 12 }}>
          {[['Tổng được thêm', report.counts.added], ['Đủ chuyên cần', report.counts.attended], ['Chưa đủ chuyên cần', report.counts.observed], ['Chưa ghi nhận tham gia', report.counts.unobserved], ['Tin nhắn được tính', report.counts.chat_messages ?? 'Chưa có quyền'], ['HS có chat', report.counts.students_with_chat ?? 'Chưa có quyền']].map(([label, value]) => <div key={String(label)} style={{ padding: 12, background: '#f5f7fa', borderRadius: 8 }}><Statistic title={label} value={value as string | number} valueStyle={{ fontSize: 22 }} /></div>)}
        </div>
        <Alert type="info" showIcon message="Báo cáo theo buổi học và phòng đang chọn; mỗi học sinh được tính một lần." description="Chuyên cần được đánh giá theo quy định của buổi học. Các mốc hoạt động chưa đủ để xác định chính xác tổng thời gian học hoặc giờ rời lớp." />
        {!!report.data_quality.overlapping_calendar_ids.length && <Alert type="warning" message="Có lịch cùng chương trình và buổi học trùng giờ; một số hoạt động chưa thể phân biệt chính xác giữa các lịch." />}
        <Collapse items={[{ key: 'accuracy', label: 'Thông tin về độ chính xác của báo cáo', children: <Space direction="vertical">
          <Typography.Text>Danh sách học sinh phản ánh thông tin đang được lưu. Phòng được phân bổ không chứng minh học sinh đã tham gia phòng đó.</Typography.Text>
          <Typography.Text>Chuyên cần được đánh giá từ hoạt động liên tiếp trong từng phiên học. Chưa có ghi nhận không đồng nghĩa học sinh chắc chắn vắng mặt.</Typography.Text>
          <Typography.Text>Chỉ tính tin nhắn thường và trả lời xác định được người gửi; không gồm thông báo chung hoặc bài luyện tập.</Typography.Text>
          <Typography.Text>Thông tin hạn chế chat chưa phản ánh đầy đủ các lần thay đổi. Chưa đủ dữ liệu xác định số lần vào lớp hoặc kết nối lại.</Typography.Text>
          <Typography.Text>{report.data_quality.unmatched_presence_records} ghi nhận hoạt động chưa đối chiếu được với danh sách học sinh, chưa xác định phòng và không được cộng vào số học sinh. Tin nhắn chưa đối chiếu được: {report.data_quality.unmatched_chat_messages ?? 'Chưa được cấp quyền'}.</Typography.Text>
          <Typography.Text type="secondary">Cập nhật lúc {new Date(report.computed_at).toLocaleTimeString('vi-VN')}.</Typography.Text>
        </Space> }]} />
      </>}
      <Tabs activeKey={tab} onChange={setTab} items={[
        { key: 'students', label: 'Học sinh', children: <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Space wrap>
            <Input.Search aria-label="Tìm học sinh" placeholder="Tên, tài khoản hoặc mã học sinh" allowClear style={{ width: 245 }} onSearch={q => update({ q })} />
            <Select aria-label="Lọc chuyên cần" placeholder="Tất cả chuyên cần" value={filters.attendance || 'all'} onChange={attendance => update({ attendance })} style={{ width: 200 }} options={[{ value: 'all', label: 'Tất cả chuyên cần' }, ...Object.entries(attendanceLabels).map(([value, label]) => ({ value, label }))]} />
            {report?.capabilities.chat && <Select aria-label="Lọc chat" value={filters.chat || 'all'} onChange={chat => update({ chat })} style={{ width: 160 }} options={[{ value: 'all', label: 'Tất cả chat' }, { value: 'yes', label: 'Có tin nhắn được tính' }, { value: 'no', label: 'Chưa có tin nhắn được tính' }]} />}
            {report?.capabilities.moderation && <Select aria-label="Lọc kiểm duyệt" value={filters.moderation || 'all'} onChange={moderation => update({ moderation })} style={{ width: 220 }} options={[{ value: 'all', label: 'Tất cả hạn chế/kiểm duyệt' }, { value: 'yes', label: 'Có bản ghi hiện lưu' }, { value: 'no', label: 'Không có bản ghi hiện lưu' }]} />}
          </Space>
          <Table<DetailStudent> rowKey="user_id" size="small" dataSource={report?.rows || []} loading={loading} pagination={false} scroll={{ x: 1050 }} locale={{ emptyText: error ? 'Không tải được dữ liệu' : <Empty description="Không có học sinh phù hợp" /> }} columns={[
            { title: 'Học sinh', width: 230, render: (_, s) => <Space direction="vertical" size={0}><Button type="link" style={{ padding: 0, height: 'auto', whiteSpace: 'normal', textAlign: 'left' }} onClick={() => setStudent(s.user_id)}>{s.name || s.username}</Button><Typography.Text type="secondary">{s.username} · {s.student_hmid || 'Chưa có mã học sinh'}</Typography.Text></Space> },
            { title: 'Phòng phân bổ', width: 100, render: (_, s) => s.room_id ?? 'Chưa chia' },
            { title: 'Chuyên cần', width: 170, render: (_, s) => <Tag color={s.attendance === 'attended' ? 'green' : s.attendance === 'observed' ? 'orange' : 'default'}>{attendanceLabels[s.attendance]}</Tag> },
            { title: 'Hoạt động đầu / gần nhất', width: 170, render: (_, s) => <Space direction="vertical" size={0}><span>{logTime(s.first_seen)}</span><span>{logTime(s.last_seen)}</span></Space> },
            { title: 'Phút học', width: 110, render: () => <Typography.Text type="secondary">Chưa xác định</Typography.Text> },
            ...(report?.capabilities.chat ? [{ title: 'Tin nhắn được tính', width: 120, dataIndex: 'chat_count', render: (v: number | null) => v ?? 'Chưa xác định người gửi' }] : []),
            ...(report?.capabilities.moderation ? [{ title: 'Thông tin hạn chế/kiểm duyệt đang lưu', width: 150, dataIndex: 'moderation_records', render: (v: number | null) => v ?? 'Nguồn chưa đầy đủ' }] : []),
          ]} />
          <Pagination current={filters.page} pageSize={filters.limit} total={report?.total || 0} showSizeChanger pageSizeOptions={[25, 50, 100]} onChange={(page, limit) => setFilters(f => ({ ...f, page, limit }))} showTotal={n => `${n} học sinh theo bộ lọc`} />
        </Space> },
        { key: 'timeline', label: 'Nhật ký buổi', children: report && tab === 'timeline' ? <Space direction="vertical" style={{ width: '100%' }}>
          <Select aria-label="Học sinh trong nhật ký" showSearch allowClear placeholder="Tìm tên, tài khoản hoặc mã học sinh" filterOption={false} onSearch={setTimelineQuery} value={timelineStudent} onChange={setTimelineStudent} options={timelineOptions} style={{ width: 'min(420px, 100%)' }} />
          <CalendarDetailEventList key={`${timelineStudent ?? 'all'}:${filters.room_id ?? 'all'}`} calendarId={row.calendar_id} studentId={timelineStudent} roomId={filters.room_id} capabilities={report.capabilities} calendar={report.calendar} />
        </Space> : null },
      ]} />
    </Space>
    <CalendarStudentActivityDrawer calendarId={row.calendar_id} studentId={student} roomId={filters.room_id} canExport={canExport} onClose={() => setStudent(null)} />
  </Modal>;
}
