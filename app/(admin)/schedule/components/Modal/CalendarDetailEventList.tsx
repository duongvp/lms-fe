'use client';
import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Collapse, DatePicker, Empty, Input, Popover, Select, Space, Spin, Table, Tag, Typography, message } from 'antd';
import { LeftOutlined, RightOutlined, MoreOutlined, WarningOutlined } from '@ant-design/icons';
import CalendarPresenceTimeline from './CalendarPresenceTimeline';
import { useAuthStore } from '@/stores/authStore';
import { eventLabels, eventDescription, roleLabel, chatTypeLabel, chatStatusLabel, reportRoomLabel, canViewReportDiagnostics, reportErrorMessage } from '@/helper/calendarReportPresentation';
import type { ColumnsType } from 'antd/es/table';
import { formatVietnamDateTime } from '@/helper/convertDate';
import { downloadDetailReport, getDetailEvents, type DetailEvent, type DetailFilters, type DetailOverview, type EventReport } from '@/services/calendarDetailReportService';

export { eventLabels } from '@/helper/calendarReportPresentation';
export default function CalendarDetailEventList({ calendarId, studentId, roomId, capabilities, source: initialSource = 'all', canExport = false, calendar, studentName }:
  { calendarId: number; studentId?: number; roomId?: DetailFilters['room_id']; capabilities: DetailOverview['capabilities']; source?: string; canExport?: boolean; calendar?: DetailOverview['calendar']; studentName?: string }) {
  const compactStudentEvents = studentId != null && (initialSource === 'moderation' || initialSource === 'activities');
  const studentPresence = initialSource === 'presence' && studentId != null;
  const diagnostics = useAuthStore(state => canViewReportDiagnostics(state.user));
  const [source, setSource] = useState(initialSource), [q, setQ] = useState(''), [order, setOrder] = useState('asc');
  const [range, setRange] = useState<{ from?: string; to?: string }>({});
  const [report, setReport] = useState<EventReport | null>(null), [loading, setLoading] = useState(false), [error, setError] = useState('');
  const [cursor, setCursor] = useState<string | undefined>(), [history, setHistory] = useState<Array<{ cursor?: string; count: number }>>([]), [retry, setRetry] = useState(0), [exporting, setExporting] = useState(false);
  const reportFilterKey = useRef('');
  const navigationPending = useRef(false);
  const filterKey = JSON.stringify({ calendarId, studentId, roomId, source, q, order, ...range });
  // Derive pagination from its filter key so a changed source never sends a stale cursor.
  const [pageKey, setPageKey] = useState(filterKey);
  const currentCursor = pageKey === filterKey ? cursor : undefined;
  useEffect(() => { setCursor(undefined); setHistory([]); setPageKey(filterKey); }, [filterKey]);
  useEffect(() => {
    const controller = new AbortController(); let active = true;
    setLoading(true); setError('');
    // Keep the current rows while navigating so the table does not collapse and jump.
    if (reportFilterKey.current !== filterKey) setReport(null);
    reportFilterKey.current = filterKey;
    getDetailEvents(calendarId, studentId, { room_id: roomId, source, q, order, ...range, cursor: currentCursor, limit: 50 }, controller.signal)
      .then(data => { if (active) setReport(data); }).catch(e => { if (active) { setReport(null); setError(e.status === 403 ? 'Bạn không có quyền xem nguồn dữ liệu này.' : reportErrorMessage(e, 'Chưa tải được lịch sử hoạt động. Vui lòng thử lại.')); } })
      .finally(() => { if (active) { navigationPending.current = false; setLoading(false); } });
    return () => { active = false; controller.abort(); };
  }, [filterKey, currentCursor, retry]); // eslint-disable-line react-hooks/exhaustive-deps
  const columns: ColumnsType<DetailEvent> = [
    { title: 'Thời gian', width: 150, render: (_, e) => formatVietnamDateTime(e.at, 'DD/MM HH:mm:ss') },
    { title: 'Hoạt động', width: 190, render: (_, e) => <Space direction="vertical" size={4}>
      <Typography.Text strong>{eventLabels[e.source] || 'Hoạt động được ghi nhận'}</Typography.Text>
      {e.source === 'chat' && <Tag>{roleLabel(e.metadata.role)}</Tag>}
      <Typography.Text type="secondary">{String(e.metadata.display_name || studentName || e.username || (e.student_hmid ? `Mã học sinh: ${e.student_hmid}` : 'Chưa xác định người tham gia'))}</Typography.Text>
      {e.identity !== 'matched' && <Tag color="orange">{e.identity === 'ambiguous' ? 'Chưa xác định chắc chắn người tham gia' : 'Chưa đối chiếu được với danh sách học sinh'}</Tag>}
    </Space> },
    { title: source === 'chat' ? 'Tin nhắn / Ghi chú' : 'Ghi chú', render: (_, e) => <Space direction="vertical" size={6} style={{ width: '100%', maxWidth: 560 }}>
      {e.source === 'chat' && <Space wrap><Tag>{chatTypeLabel(e.metadata.type)}</Tag><Typography.Text type="secondary">{chatStatusLabel(e.metadata.status)}</Typography.Text></Space>}
      <Typography.Text style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{eventDescription(e)}</Typography.Text>
      {e.source !== 'presence' && <Typography.Text type="secondary">Phòng ghi nhận hoạt động: {reportRoomLabel(e.room, calendar)}</Typography.Text>}
      {e.source.startsWith('chat_') && <Typography.Text type="secondary">Người thực hiện: {String(e.metadata.actor || 'Chưa có dữ liệu')} · Áp dụng cho: {e.metadata.scope === 'user' ? 'tin nhắn của người dùng' : e.metadata.scope === 'message' ? 'một tin nhắn' : 'chưa xác định'}</Typography.Text>}
      {diagnostics && <Collapse size="small" style={{ width: '100%' }} items={[{ key: 'diagnostics', label: 'Chẩn đoán kỹ thuật (quản trị viên)', children: <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', margin: 0 }}>{JSON.stringify({ id: e.id, source: e.source, classroom_id: e.room, ...e.metadata }, null, 2)}</pre> }]} />}
    </Space> },
  ];
  const messageInfo = (e: DetailEvent) => <Space direction="vertical" size={6} style={{ maxWidth: 320, overflowWrap: 'anywhere' }}>
    <Typography.Text>{formatVietnamDateTime(e.at, 'DD/MM/YYYY HH:mm:ss')}</Typography.Text>
    <Typography.Text>Người gửi: {String(e.metadata.display_name || studentName || e.username || (e.student_hmid ? `Mã học sinh: ${e.student_hmid}` : 'Chưa xác định'))}</Typography.Text>
    <Typography.Text>{roleLabel(e.metadata.role)} · {chatTypeLabel(e.metadata.type)} · {chatStatusLabel(e.metadata.status)}</Typography.Text>
    <Typography.Text>Phòng: {reportRoomLabel(e.room, calendar)}</Typography.Text>
    {e.identity !== 'matched' && <Typography.Text type="warning">{e.identity === 'ambiguous' ? 'Chưa xác định chắc chắn người gửi.' : 'Chưa đối chiếu được với danh sách học sinh.'}</Typography.Text>}
    {diagnostics && <Collapse size="small" items={[{ key: 'diagnostics', label: 'Chẩn đoán kỹ thuật (quản trị viên)', children: <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxWidth: 280 }}>{JSON.stringify({ id: e.id, classroom_id: e.room, ...e.metadata }, null, 2)}</pre> }]} />}
  </Space>;
  const chatColumns: ColumnsType<DetailEvent> = [
    { title: 'Thời gian', width: 86, render: (_, e) => <time dateTime={e.at} title={formatVietnamDateTime(e.at, 'DD/MM/YYYY HH:mm:ss')} style={{ color: '#8c8c8c', fontSize: 12, whiteSpace: 'nowrap' }}>
      {calendar && e.at.slice(0, 10) !== calendar.start_time.slice(0, 10) && <span style={{ display: 'block' }}>{formatVietnamDateTime(e.at, 'DD/MM')}</span>}
      {formatVietnamDateTime(e.at, 'HH:mm:ss')}
    </time> },
    ...(studentId == null ? [{ title: 'Người gửi', width: 160, render: (_: unknown, e: DetailEvent) => <Typography.Text style={{ overflowWrap: 'anywhere' }}>{String(e.metadata.display_name || e.username || (e.student_hmid ? `Mã học sinh: ${e.student_hmid}` : 'Chưa xác định'))}</Typography.Text> }] : []),
    { title: 'Nội dung tin nhắn', render: (_, e) => <span style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{eventDescription(e)}</span> },
    { title: '', width: 34, render: (_, e) => <Popover title="Thông tin tin nhắn" content={messageInfo(e)} trigger="click" placement="left" styles={{ body: { maxWidth: 'calc(100vw - 24px)' } }}>
      <Button type="text" size="small" aria-label={`Thông tin tin nhắn lúc ${formatVietnamDateTime(e.at, 'HH:mm:ss')}`} title={e.identity === 'matched' ? 'Thông tin tin nhắn' : 'Cần kiểm tra người gửi'} style={{ width: 24, minWidth: 24, padding: 0 }} icon={e.identity === 'matched' ? <MoreOutlined /> : <WarningOutlined style={{ color: '#d48806' }} />} />
    </Popover> },
  ];
  const activityInfo = (e: DetailEvent) => <Space direction="vertical" size={8} style={{ maxWidth: 300, overflowWrap: 'anywhere' }}>
    <Typography.Text>{formatVietnamDateTime(e.at, 'DD/MM/YYYY HH:mm:ss')}</Typography.Text>
    <Typography.Text>Phòng ghi nhận: {reportRoomLabel(e.room, calendar)}</Typography.Text>
    {e.source.startsWith('chat_') && <>
      <Typography.Text>Người thực hiện: {String(e.metadata.actor || 'Chưa có dữ liệu')}</Typography.Text>
      <Typography.Text>Áp dụng cho: {e.metadata.scope === 'user' ? 'tin nhắn của người dùng' : e.metadata.scope === 'message' ? 'một tin nhắn' : 'chưa xác định'}</Typography.Text>
      <Typography.Text type="secondary">Thao tác kiểm duyệt được ghi nhận không xác định quyền chat hiện tại.</Typography.Text>
    </>}
    {e.source === 'quiz_submission' && <>
      <Typography.Text>Bài luyện tập: {String(e.metadata.quiz_id ?? 'Chưa có dữ liệu')}</Typography.Text>
      <Typography.Text type="secondary">Thời gian làm bài không phải tổng thời gian tham gia lớp.</Typography.Text>
    </>}
    {e.identity !== 'matched' && <Typography.Text type="warning">Chưa xác định chắc chắn người tham gia.</Typography.Text>}
    {diagnostics && <Collapse size="small" items={[{ key: 'diagnostics', label: 'Chẩn đoán kỹ thuật (quản trị viên)', children: <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxWidth: 260 }}>{JSON.stringify({ id: e.id, classroom_id: e.room, ...e.metadata }, null, 2)}</pre> }]} />}
  </Space>;
  const activityColumns: ColumnsType<DetailEvent> = [
    { title: 'Thời gian', width: 86, render: (_, e) => <time dateTime={e.at} title={formatVietnamDateTime(e.at, 'DD/MM/YYYY HH:mm:ss')} style={{ fontSize: 12, color: '#8c8c8c', whiteSpace: 'nowrap' }}>
      {calendar && e.at.slice(0, 10) !== calendar.start_time.slice(0, 10) && <span style={{ display: 'block' }}>{formatVietnamDateTime(e.at, 'DD/MM')}</span>}
      {formatVietnamDateTime(e.at, 'HH:mm:ss')}
    </time> },
    { title: source === 'moderation' ? 'Thao tác / Lý do' : 'Hoạt động / Kết quả', render: (_, e) => <Space direction="vertical" size={0} style={{ width: '100%' }}>
      <Typography.Text strong style={{ fontSize: 13 }}>{eventLabels[e.source] || 'Hoạt động được ghi nhận'}</Typography.Text>
      {e.source === 'quiz_submission' ? <Typography.Text type="secondary" style={{ fontSize: 12, overflowWrap: 'anywhere' }}>
        {e.metadata.score != null ? `Điểm: ${String(e.metadata.score)}` : 'Chưa có điểm'}{e.metadata.answer_seconds != null ? ` · Làm bài: ${String(e.metadata.answer_seconds)} giây` : ''}
      </Typography.Text> : <Typography.Text type="secondary" style={{ fontSize: 12, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{e.content || 'Chưa lưu lý do'}</Typography.Text>}
    </Space> },
    { title: '', width: 34, render: (_, e) => <Popover title="Thông tin hoạt động" trigger="click" placement="left" content={activityInfo(e)} styles={{ body: { maxWidth: 'calc(100vw - 24px)' } }}>
      <Button type="text" size="small" aria-label={`Thông tin hoạt động lúc ${formatVietnamDateTime(e.at, 'HH:mm:ss')}`} title="Thông tin bổ sung" style={{ width: 24, minWidth: 24, padding: 0 }} icon={e.identity === 'matched' ? <MoreOutlined /> : <WarningOutlined style={{ color: '#d48806' }} />} />
    </Popover> },
  ];
  const emptyMessage = q || range.from || range.to || currentCursor ? 'Không có hoạt động phù hợp với bộ lọc đang chọn.'
    : source === 'chat' ? studentId != null ? 'Học sinh chưa có tin nhắn được ghi nhận trong buổi học này.' : 'Chưa có tin nhắn được ghi nhận trong phạm vi buổi học này.'
    : source === 'presence' ? 'Chưa có hoạt động tham gia được ghi nhận trong phạm vi đã chọn.'
    : source === 'moderation' ? report?.hidden_rules_available === false ? 'Chưa đủ dữ liệu để hiển thị lịch sử kiểm duyệt.' : 'Chưa có thao tác ẩn hoặc khôi phục tin nhắn được ghi nhận trong phạm vi đã chọn.'
    : 'Chưa có hoạt động được ghi nhận trong phạm vi đã chọn.';
  return <Space direction="vertical" size={12} style={{ width: '100%' }}>
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, maxWidth: '100%' }}>
      {initialSource === 'all' && <Select aria-label="Nguồn nhật ký" value={source} style={{ width: 190 }} onChange={setSource} options={[
        { value: 'all', label: 'Tất cả hoạt động được xem' }, { value: 'presence', label: 'Hoạt động tham gia' },
        ...(capabilities.chat ? [{ value: 'chat', label: 'Chat' }] : []), ...(capabilities.moderation ? [{ value: 'moderation', label: 'Ẩn/khôi phục chat' }] : []), ...(capabilities.activities ? [{ value: 'activities', label: 'Nộp bài luyện tập' }] : []),
      ]} />}
      <Select aria-label="Thứ tự thời gian" value={order} onChange={setOrder} options={[{ value: 'asc', label: 'Cũ đến mới' }, { value: 'desc', label: 'Mới đến cũ' }]} style={{ width: 135 }} />
      {source === 'chat' && <Input.Search aria-label="Tìm nội dung chat" placeholder="Tìm nội dung chat" allowClear onSearch={setQ} style={{ flex: '1 1 140px', minWidth: 0, maxWidth: '100%' }} />}
      {!(initialSource !== 'all' && studentId != null) && <DatePicker.RangePicker showTime={{ format: 'HH:mm' }} format="DD/MM/YYYY HH:mm" style={{ flex: '1 1 280px', minWidth: 0, maxWidth: '100%' }} onChange={value => setRange(value?.[0] && value[1] ? { from: `${value[0].format('YYYY-MM-DDTHH:mm:ss')}.000Z`, to: `${value[1].format('YYYY-MM-DDTHH:mm:ss')}.000Z` } : {})} presets={[]} />}
      {canExport && studentId != null && source !== 'all' && <Button loading={exporting} onClick={async () => {
        setExporting(true); try { await downloadDetailReport(calendarId, studentId, { room_id: roomId, source, q, order, ...range }); }
        catch (e) { message.error(reportErrorMessage(e, 'Chưa xuất được lịch sử hoạt động. Vui lòng thử lại.')); } finally { setExporting(false); }
      }}>Xuất nhật ký</Button>}
    </div>
    {error && <Alert type="error" message={error} action={<Button onClick={() => setRetry(v => v + 1)}>Thử lại</Button>} />}
    {report?.hidden_rules_available === false && <Alert type="warning" message="Chưa có đủ dữ liệu về các thao tác ẩn và khôi phục tin nhắn; chưa thể kết luận lịch sử kiểm duyệt." />}
    {!!report?.overlapping_calendar_ids.length && <Alert type="warning" message="Có lịch cùng chương trình và buổi học trùng giờ. Một số hoạt động chưa thể phân biệt chính xác giữa các lịch." />}
    {source === 'presence' && <Typography.Text type="secondary" style={{ fontSize: 12 }}>Các mốc hoạt động được ghi nhận, chưa phải thời điểm vào hoặc rời lớp.</Typography.Text>}
    {compactStudentEvents && source === 'moderation' && <Typography.Text type="secondary" style={{ fontSize: 12 }}>Các thao tác được ghi nhận trong buổi học, không phản ánh tình trạng chat hiện tại.</Typography.Text>}
    {studentPresence && calendar && <Typography.Text strong style={{ fontSize: 13 }}>Các mốc hoạt động · {formatVietnamDateTime(calendar.start_time, 'DD/MM/YYYY')}</Typography.Text>}
    {source === 'chat' && <Typography.Text type="secondary" style={{ fontSize: 12 }}>Tin nhắn được lưu trong buổi học. Bấm ⋮ để xem thông tin bổ sung.</Typography.Text>}
    <Spin spinning={loading}>{studentPresence ? <CalendarPresenceTimeline rows={report?.rows || []} diagnostics={diagnostics} calendarDate={calendar?.start_time} emptyMessage={error ? 'Không tải được dữ liệu' : emptyMessage} /> : <Table<DetailEvent> size="small" rowKey={e => `${e.source}:${e.id}:${e.at}`} dataSource={report?.rows || []} columns={source === 'chat' ? chatColumns : compactStudentEvents ? activityColumns : columns} pagination={false} scroll={source === 'chat' ? studentId == null ? { x: 520 } : undefined : compactStudentEvents ? undefined : { x: 680 }} locale={{ emptyText: error ? 'Không tải được dữ liệu' : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyMessage} /> }} />}</Spin>
    {(Boolean(report?.rows.length) || history.length > 0) && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', paddingTop: 4 }}>
      <Typography.Text type="secondary" style={{ fontSize: 12 }} aria-live="polite">
        {loading ? 'Đang tải…' : error ? 'Chưa tải được trang này' : report?.rows.length ?
          history.length || report.next_cursor ? `${history.reduce((n, page) => n + page.count, 0) + 1}–${history.reduce((n, page) => n + page.count, 0) + report.rows.length} ${source === 'chat' ? 'tin nhắn' : studentPresence ? 'mốc ghi nhận' : 'hoạt động'}`
            : `${report.rows.length} ${source === 'chat' ? 'tin nhắn' : studentPresence ? 'mốc ghi nhận' : 'hoạt động'}` : 'Trang này chưa có dữ liệu'}
      </Typography.Text>
      {(history.length > 0 || report?.next_cursor) && <nav aria-label={source === 'chat' ? 'Phân trang tin nhắn' : 'Phân trang hoạt động'} style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
        <Button type="text" size="small" aria-label="Trang trước" title="Trang trước" icon={<LeftOutlined />} disabled={loading || !history.length} onClick={() => { if (navigationPending.current || loading) return; navigationPending.current = true; setLoading(true); setCursor(history.at(-1)?.cursor); setHistory(h => h.slice(0, -1)); }} />
        <span aria-current="page" style={{ padding: '3px 10px', borderRadius: 6, background: '#e6f4ff', color: '#1677ff', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>Trang {history.length + 1}</span>
        <Button type="text" size="small" aria-label="Trang sau" title="Trang sau" icon={<RightOutlined />} disabled={loading || !report?.next_cursor} onClick={() => { if (navigationPending.current || loading) return; navigationPending.current = true; setLoading(true); setHistory(h => [...h, { cursor: currentCursor, count: report!.rows.length }]); setCursor(report!.next_cursor!); }} />
      </nav>}
    </div>}

  </Space>;
}
