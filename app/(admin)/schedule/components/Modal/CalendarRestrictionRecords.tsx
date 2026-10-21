'use client';
import { Button, Collapse, Popover, Space, Typography } from 'antd';
import { MoreOutlined } from '@ant-design/icons';
import { formatVietnamDateTime } from '@/helper/convertDate';
import type { RestrictionRecord } from '@/services/calendarDetailReportService';

export default function CalendarRestrictionRecords({ records, diagnostics }: { records: RestrictionRecord[] | null; diagnostics: boolean }) {
  if (!records?.length) return <Typography.Text type="secondary" style={{ fontSize: 12 }}>{records == null ? 'Chưa đủ dữ liệu để hiển thị thông tin hạn chế.' : 'Chưa có thông tin hạn chế đang lưu; chưa thể kết luận học sinh được phép chat.'}</Typography.Text>;
  return <ul aria-label="Thông tin hạn chế đang lưu" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
    {records.map(record => <li key={record.id} data-restriction-row style={{ display: 'grid', gridTemplateColumns: '104px minmax(0, 1fr) 28px', gap: 8, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
      <time dateTime={record.created_at || undefined} title={record.created_at ? formatVietnamDateTime(record.created_at, 'DD/MM/YYYY HH:mm:ss') : undefined} style={{ color: '#8c8c8c', fontSize: 12 }}>
        {record.created_at ? formatVietnamDateTime(record.created_at, 'DD/MM HH:mm') : 'Chưa xác định'}
      </time>
      <Typography.Text style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{record.note || 'Chưa lưu lý do'}</Typography.Text>
      <Popover trigger="click" placement="left" title="Thông tin hạn chế đang lưu" styles={{ body: { maxWidth: 'calc(100vw - 24px)' } }} content={<Space direction="vertical" size={8} style={{ maxWidth: 280 }}>
        <Typography.Text>Thời điểm ghi nhận: {record.created_at ? formatVietnamDateTime(record.created_at, 'DD/MM/YYYY HH:mm:ss') : 'Chưa xác định'}</Typography.Text>
        <Typography.Text>Thời hạn được lưu: {record.expired_at ? formatVietnamDateTime(record.expired_at, 'DD/MM/YYYY HH:mm:ss') : 'Chưa xác định'}</Typography.Text>
        <Typography.Text type="secondary">Thông tin có thể thuộc ngày học khác, chưa đủ để kết luận tình trạng chat hiện tại hoặc thời điểm mở lại chat.</Typography.Text>
        {diagnostics && <Collapse size="small" items={[{ key: 'diagnostics', label: 'Chẩn đoán kỹ thuật (quản trị viên)', children: <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxWidth: 250 }}>{JSON.stringify(record, null, 2)}</pre> }]} />}
      </Space>}>
        <Button size="small" type="text" aria-label="Xem thông tin hạn chế" title="Thông tin bổ sung" icon={<MoreOutlined />} />
      </Popover>
    </li>)}
  </ul>;
}
