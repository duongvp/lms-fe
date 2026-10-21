'use client';
import { useEffect, useState } from 'react';
import { Alert, Button, Collapse, Drawer, Empty, Popover, Space, Spin, Tabs, Tag, Typography, message } from 'antd';
import { DownloadOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/stores/authStore';
import { attendanceLabels, attendancePresentation, studentAccuracyNotes, canViewReportDiagnostics, reportErrorMessage } from '@/helper/calendarReportPresentation';
import { formatVietnamDateTime } from '@/helper/convertDate';
import { downloadDetailReport, getDetailStudent, type DetailFilters, type StudentReport } from '@/services/calendarDetailReportService';
import CalendarRestrictionRecords from './CalendarRestrictionRecords';
import CalendarDetailEventList from './CalendarDetailEventList';

export { attendanceLabels } from '@/helper/calendarReportPresentation';
export const logTime = (value: string | null) => value ? formatVietnamDateTime(value, 'DD/MM HH:mm:ss') : 'Chưa có ghi nhận';
export default function CalendarStudentActivityDrawer({ calendarId, studentId, roomId, canExport, onClose }:
  { calendarId: number; studentId: number | null; roomId?: DetailFilters['room_id']; canExport: boolean; onClose: () => void }) {
  const [report, setReport] = useState<StudentReport | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(false), [retry, setRetry] = useState(0);
  const diagnostics = useAuthStore(state => canViewReportDiagnostics(state.user));
  const [tab, setTab] = useState('overview');
  const [exportingRestrictions, setExportingRestrictions] = useState(false);
  useEffect(() => { setTab('overview'); }, [studentId, calendarId, roomId]);
  useEffect(() => {
    setReport(null); setError(''); if (studentId == null) return;
    const controller = new AbortController(); let active = true; setLoading(true);
    getDetailStudent(calendarId, studentId, { room_id: roomId }, controller.signal).then(data => { if (active) setReport(data); })
      .catch(e => { if (active) setError(e.status === 403 ? 'Bạn không có quyền xem chi tiết học sinh.' : reportErrorMessage(e, 'Chưa tải được thông tin học sinh. Vui lòng thử lại.')); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [calendarId, studentId, roomId, retry]);
  const s = report?.student;
  const evaluation = attendancePresentation(s?.attendance);
  const eventPanel = (source: string) => report && studentId != null && <CalendarDetailEventList key={`${studentId}:${source}`} calendarId={calendarId} studentId={studentId} roomId={roomId} capabilities={report.capabilities} source={source} canExport={canExport} calendar={report.calendar} studentName={s?.name || s?.username} />;
  const metric = (label: string, value: string | number) => <div key={label} style={{ padding: '12px 14px', background: '#fafbfc', border: '1px solid #edf0f3', borderRadius: 10, minWidth: 0 }}>
    <Typography.Text type="secondary">{label}</Typography.Text><div style={{ fontSize: 18, fontWeight: 600, marginTop: 6, overflowWrap: 'anywhere' }}>{value}</div>
  </div>;
  return <Drawer title={s ? <div><div style={{ fontSize: 22, overflowWrap: 'anywhere' }}>{s.name || 'Học sinh chưa có tên'}</div><Typography.Text type="secondary" style={{ fontSize: 13, fontWeight: 400, overflowWrap: 'anywhere' }}>{s.username} · Mã học sinh: {s.student_hmid || 'Chưa có dữ liệu'}</Typography.Text></div> : 'Chi tiết học sinh'} open={studentId != null} onClose={onClose} width="min(1050px, 100vw)" destroyOnClose>
    {error && <Alert type="error" message={error} action={<Button onClick={() => setRetry(v => v + 1)}>Thử lại</Button>} />}
    <Spin spinning={loading}>
      {report && s && <Space direction="vertical" style={{ width: '100%' }} size={12}>
        <Space wrap><Tag style={{ maxWidth: '100%', whiteSpace: 'normal', overflowWrap: 'anywhere' }}>{report.calendar.code}</Tag><Tag>Buổi {report.calendar.learn_number}</Tag><Tag>{s.room_id == null ? 'Chưa phân bổ phòng' : `Phòng được phân bổ: ${s.room_id}`}</Tag>{tab !== 'overview' && <Tag title={evaluation.description} color={evaluation.color === 'success' ? 'green' : evaluation.color === 'warning' ? 'orange' : 'default'}>{evaluation.label}</Tag>}</Space>
        {tab === 'overview' && <Alert showIcon icon={evaluation.color === 'info' ? <InfoCircleOutlined style={{ color: '#8c8c8c' }} /> : undefined} style={evaluation.color === 'info' ? { background: '#fafafa', borderColor: '#d9d9d9' } : undefined} type={evaluation.color} message={<Space size={8} wrap><strong>{evaluation.label}</strong><Typography.Text style={{ fontSize: 13 }}>{evaluation.description}</Typography.Text></Space>} />}
        <Tabs activeKey={tab} onChange={setTab} destroyInactiveTabPane items={[
          { key: 'overview', label: 'Tổng quan', children: <Space direction="vertical" data-testid="student-overview" style={{ width: '100%' }} size={12}>
            <Typography.Text strong>Hoạt động trong buổi học</Typography.Text>
            <div data-testid="student-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              {metric('Ghi nhận đầu tiên', logTime(s.first_seen))}
              {metric('Ghi nhận gần nhất', logTime(s.last_seen))}
              {metric('Số mốc tham gia', s.presence_records)}
              {metric('Tin nhắn đã gửi', report.capabilities.chat ? s.chat_count ?? 'Chưa đối chiếu được' : 'Chưa được cấp quyền')}
            </div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>Các mốc tham gia là hoạt động được ghi nhận, chưa phải các lần vào hoặc rời lớp.{report.capabilities.chat && (s.chat_count == null ? ' Chưa đối chiếu được người gửi để thống kê tin nhắn.' : ' Tin nhắn gồm tin thường và trả lời được đối chiếu với học sinh.')}</Typography.Text>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', borderRadius: 8, background: '#fafafa', border: '1px solid #f0f0f0' }}>
              <InfoCircleOutlined style={{ color: '#8c8c8c', marginTop: 4 }} />
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>Chưa đủ dữ liệu để tính thời lượng học, số lần vào lớp{report.capabilities.moderation ? ' và kết luận tình trạng chat hiện tại' : ''}. Các thông tin này không ảnh hưởng đến kết quả chuyên cần đã đánh giá.{!report.capabilities.moderation && ' Bạn chưa được cấp quyền xem thông tin hạn chế chat.'}</Typography.Text>
            </div>
            <Collapse items={[{ key: 'accuracy', label: 'Thông tin về độ chính xác của báo cáo', children: studentAccuracyNotes(report).map(note => <p key={note}>{note}</p>) }]} />
            {diagnostics && <Collapse items={[{ key: 'diagnostics', label: 'Chẩn đoán kỹ thuật (quản trị viên)', children: <Space direction="vertical">
              <Typography.Text>ID lịch: {calendarId} · ID học sinh trong danh sách: {s.user_id}</Typography.Text>
              <Typography.Text>Số log: {s.presence_records} · status=1: {s.status_1_records} · Socket ID khác nhau: {s.socket_ids_count}</Typography.Text>
              {report.data_quality.limitations.map(note => <Typography.Text key={note}>{note}</Typography.Text>)}
            </Space> }]} />}
          </Space> },
          { key: 'presence', label: 'Lịch sử tham gia', children: tab === 'presence' ? eventPanel('presence') : null },
          ...(report.capabilities.chat ? [{ key: 'chat', label: 'Tin nhắn chat', children: tab === 'chat' ? eventPanel('chat') : null }] : []),
          ...(report.capabilities.moderation ? [{ key: 'moderation', label: 'Hạn chế chat và kiểm duyệt', children: tab === 'moderation' ? <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
              <Tag>Chưa xác định tình trạng chat</Tag>
              <Popover trigger="click" placement="bottomRight" title="Thông tin về báo cáo" content={<Typography.Paragraph style={{ maxWidth: 300, margin: 0 }}>Hệ thống hiện lưu một phần thông tin hạn chế chat, chưa có đầy đủ lịch sử các lần thay đổi. Những thông tin đang lưu có thể thuộc ngày học khác và chưa đủ để kết luận học sinh đang bị hạn chế hay đã được mở lại chat.</Typography.Paragraph>}>
                <Button type="text" size="small" icon={<InfoCircleOutlined />}>Lưu ý dữ liệu</Button>
              </Popover>
            </Space>
            <div>
              <Space wrap style={{ justifyContent: 'space-between', width: '100%', marginBottom: 4 }}>
                <Typography.Text strong>Thông tin hạn chế đang lưu{report.restriction_records != null ? ` (${report.restriction_records.length})` : ''}</Typography.Text>
                {canExport && <Button size="small" icon={<DownloadOutlined />} loading={exportingRestrictions} onClick={async () => {
                  setExportingRestrictions(true); try { await downloadDetailReport(calendarId, studentId!, { room_id: roomId, source: 'restriction_snapshot' }); }
                  catch (e) { message.error(reportErrorMessage(e, 'Chưa xuất được thông tin hạn chế. Vui lòng thử lại.')); } finally { setExportingRestrictions(false); }
                }}>Xuất thông tin đang lưu</Button>}
              </Space>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>Có thể thuộc ngày học khác; chưa phản ánh đầy đủ lịch sử hạn chế chat.</Typography.Text>
              <CalendarRestrictionRecords records={report.restriction_records} diagnostics={diagnostics} />
            </div>
            <Typography.Text strong>Kiểm duyệt trong buổi học</Typography.Text>{eventPanel('moderation')}
          </Space> : null }] : []),
          { key: 'activities', label: 'Hoạt động khác', children: tab === 'activities' ? <Space direction="vertical" style={{ width: '100%' }}>
            <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
              <Typography.Text strong>Hoạt động học tập được ghi nhận</Typography.Text>
              <Popover trigger="click" placement="bottomRight" title="Thông tin về dữ liệu hoạt động" content={<Typography.Paragraph style={{ maxWidth: 300, margin: 0 }}>Chưa có dữ liệu lịch sử camera, micro hoặc mất kết nối để hiển thị. Thời gian làm bài luyện tập được tính riêng với thời gian học.</Typography.Paragraph>}>
                <Button type="text" size="small" icon={<InfoCircleOutlined />}>Lưu ý dữ liệu</Button>
              </Popover>
            </Space>
            {report.capabilities.activities ? eventPanel('activities') : <Empty description="Bạn chưa được cấp quyền xem hoạt động làm bài" />}
          </Space> : null },
        ]} />
      </Space>}
    </Spin>
  </Drawer>;
}
