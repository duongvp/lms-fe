'use client';
import { Button, Collapse, Empty, Popover, Space, Typography } from 'antd';
import { MoreOutlined, WarningOutlined } from '@ant-design/icons';
import { formatVietnamDateTime } from '@/helper/convertDate';
import type { DetailEvent } from '@/services/calendarDetailReportService';

type Props = { rows: DetailEvent[]; diagnostics: boolean; emptyMessage: string; calendarDate?: string };
export default function CalendarPresenceTimeline({ rows, diagnostics, emptyMessage, calendarDate }: Props) {
  if (!rows.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyMessage} />;
  return <ol aria-label="Các mốc hoạt động tham gia" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
    {rows.map((event, index) => <li key={`${event.id}:${event.at}`} data-presence-row style={{ display: 'grid', gridTemplateColumns: '84px 18px minmax(0, 1fr) 28px', alignItems: 'center', gap: 8, minHeight: 44, padding: '6px 0', borderBottom: index === rows.length - 1 ? undefined : '1px solid #f0f0f0' }}>
      <time dateTime={event.at} title={formatVietnamDateTime(event.at, 'DD/MM/YYYY HH:mm:ss')} style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums', color: '#595959' }}>
        {formatVietnamDateTime(event.at, 'HH:mm:ss')}
        {event.at.slice(0, 10) !== calendarDate?.slice(0, 10) && (index === 0 || event.at.slice(0, 10) !== rows[index - 1].at.slice(0, 10)) && <span style={{ display: 'block', fontSize: 11, color: '#8c8c8c' }}>{formatVietnamDateTime(event.at, 'DD/MM')}</span>}
      </time>
      <span aria-hidden style={{ alignSelf: 'stretch', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {index !== rows.length - 1 && <span style={{ position: 'absolute', width: 1, background: '#d6e4ff', top: '50%', bottom: -7 }} />}
        {index !== 0 && <span style={{ position: 'absolute', width: 1, background: '#d6e4ff', top: -7, bottom: '50%' }} />}
        <span style={{ zIndex: 1, width: 7, height: 7, borderRadius: '50%', background: '#91caff' }} />
      </span>
      <div style={{ minWidth: 0 }}><Typography.Text style={{ fontSize: 13 }}>Ghi nhận tham gia</Typography.Text>
        {event.identity !== 'matched' && <div><Typography.Text type="warning" style={{ fontSize: 12 }}>Cần kiểm tra người tham gia</Typography.Text></div>}
      </div>
      <Popover title="Thông tin mốc hoạt động" trigger="click" placement="left" styles={{ body: { maxWidth: 'calc(100vw - 24px)' } }} content={<Space direction="vertical" size={8} style={{ maxWidth: 280 }}>
        <Typography.Text>{formatVietnamDateTime(event.at, 'DD/MM/YYYY HH:mm:ss')}</Typography.Text>
        <Typography.Text type="secondary">Mốc ghi nhận hoạt động, chưa xác định đây là lúc vào lớp, rời lớp hay kết nối lại.</Typography.Text>
        {event.identity !== 'matched' && <Typography.Text type="warning">{event.identity === 'ambiguous' ? 'Chưa xác định chắc chắn người tham gia.' : 'Chưa đối chiếu được với danh sách học sinh.'}</Typography.Text>}
        {diagnostics && <Collapse size="small" items={[{ key: 'diagnostics', label: 'Chẩn đoán kỹ thuật (quản trị viên)', children: <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxWidth: 250 }}>{JSON.stringify({ id: event.id, ...event.metadata }, null, 2)}</pre> }]} />}
      </Space>}>
        <Button type="text" size="small" aria-label={`Thông tin mốc hoạt động lúc ${formatVietnamDateTime(event.at, 'HH:mm:ss')}`} title="Thông tin bổ sung" icon={event.identity === 'matched' ? <MoreOutlined /> : <WarningOutlined style={{ color: '#d48806' }} />} />
      </Popover>
    </li>)}
  </ol>;
}
