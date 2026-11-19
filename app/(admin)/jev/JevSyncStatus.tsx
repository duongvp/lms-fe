'use client';
import responsive from './responsive.module.css';
import React, { useState } from 'react';
import { Alert, Button, Card, Descriptions, Grid, Modal, Space, Typography } from 'antd';

type Props = {
  status: any; error: string; checkedAt: string | null; checking: boolean; busy: boolean; canRetry: boolean;
  retryError: string; retryResult: { confirmed: boolean } | null; onCheck: () => void; onRetry: () => void;
};
const formatTime = (value: string | null | undefined) => {
  if (!value || !Number.isFinite(new Date(value).getTime())) return 'Chưa có thông tin';
  return new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
};
function connectionError(error: string) {
  return /JEV_CHAT_API_URL|JEV_INTERNAL_API_SECRET/.test(error)
    ? 'Chưa thiết lập đầy đủ kết nối tới dịch vụ kiểm duyệt. Nhờ bộ phận kỹ thuật kiểm tra cấu hình kết nối, sau đó bấm Kiểm tra lại.'
    : 'Chưa lấy được phản hồi mới từ dịch vụ kiểm duyệt. Bấm Kiểm tra lại; nếu vẫn gặp lỗi, gửi phần Chi tiết kỹ thuật cho bộ phận hỗ trợ.';
}
const modeLabels: Record<string, string> = { off: 'Đang tắt kiểm duyệt JEV', shadow: 'Chỉ theo dõi, chưa xử lý vi phạm', enforce: 'Cho phép xử lý vi phạm theo cấu hình' };
const reasons: Record<string, string> = {
  OFF: 'JEV đang tắt theo thiết lập vận hành hoặc giới hạn của hệ thống.',
  MISSING_KEY: 'Chưa có thông tin xác thực cần thiết để sử dụng dịch vụ đánh giá. Nhờ bộ phận kỹ thuật kiểm tra.',
  INVALID_CONFIG: 'Cấu hình vận hành chưa hợp lệ. Nhờ bộ phận kỹ thuật kiểm tra trước khi bật JEV.',
};
export default function JevSyncStatus(props: Props) {
  const screens = Grid.useBreakpoint();
  const [detailsOpen, setDetailsOpen] = useState(false);
  // A failed refresh must not present a previous response as current state.
  const current = props.error ? null : props.status;
  const policy = current?.policy;
  const mode = current?.runtimeStatus?.mode;
  const reason = current?.runtimeStatus?.reason;
  const loaded = policy?.source === 'database' && !!policy?.snapshotHash;
  const needsReload = !!policy?.lastError;
  const nextStep = props.error ? connectionError(props.error) : !current
    ? 'Bấm Kiểm tra lại để lấy trạng thái từ dịch vụ kiểm duyệt.'
    : !loaded || needsReload ? 'Bấm Thử đồng bộ lại để yêu cầu dịch vụ nạp cấu hình đã lưu. Nếu vẫn chưa nạp được, gửi Chi tiết kỹ thuật cho bộ phận hỗ trợ.'
    : mode === 'off' ? 'Nếu muốn sử dụng JEV, kiểm tra mục Chế độ chung và thiết lập trong Thiết lập từng lớp.'
    : mode === 'shadow' ? 'Hệ thống đang chỉ theo dõi. Nếu muốn xử lý vi phạm, kiểm tra chế độ vận hành toàn hệ thống và thiết lập của lớp học.'
    : mode === 'enforce' ? 'Kiểm tra Thiết lập từng lớp để biết mỗi chương trình hoặc buổi học đang dùng bộ cấu hình nào.'
    : 'Chưa xác nhận được chế độ kiểm duyệt. Kiểm tra lại hoặc gửi Chi tiết kỹ thuật cho bộ phận hỗ trợ.';
  return <Card className={responsive.panel}>
    <Space direction="vertical" size={16} style={{ width: '100%' }} data-testid="jev-sync-status">
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Kiểm tra kết nối và cấu hình kiểm duyệt</Typography.Title>
        <Space wrap><Button loading={props.checking} disabled={props.busy} onClick={props.onCheck}>Kiểm tra lại</Button><Button loading={props.busy} disabled={!props.canRetry || props.checking} onClick={props.onRetry}>Thử đồng bộ lại</Button></Space>
      </div>
      <Typography.Paragraph style={{ margin: 0 }}>Kiểm tra lại để xem dịch vụ kiểm duyệt đang phản hồi ra sao. Thử đồng bộ lại để yêu cầu dịch vụ nạp cấu hình đã lưu; thao tác này không sửa cấu hình.</Typography.Paragraph>
      <Alert showIcon type={props.error ? 'error' : !current || props.checking || !loaded || needsReload ? 'info' : 'success'}
        message={props.checking ? 'Đang kiểm tra kết nối' : props.error ? 'Chưa xác nhận được trạng thái hiện tại' : current ? 'Dịch vụ kiểm duyệt đã phản hồi' : 'Chưa có thông tin trạng thái'}
        description={props.error ? connectionError(props.error) : 'Thông tin phản ánh dịch vụ vừa trả lời yêu cầu. Chưa đủ để xác nhận toàn bộ hệ thống đã dùng cấu hình mới nhất hoặc dịch vụ đánh giá AI đã kết nối thành công.'} />
      {props.retryError && <Alert type="warning" showIcon message="Chưa gửi được yêu cầu đồng bộ" description={connectionError(props.retryError)} />}
      {props.retryResult && <Alert showIcon type={props.retryResult.confirmed ? 'info' : 'warning'} message={props.retryResult.confirmed ? 'Đã gửi yêu cầu đồng bộ' : 'Chưa xác nhận yêu cầu đồng bộ'} description="Yêu cầu đồng bộ không đồng nghĩa toàn bộ hệ thống đã cập nhật. Xem phản hồi kiểm tra bên dưới; nếu vẫn chưa nạp được cấu hình, thử lại hoặc liên hệ bộ phận hỗ trợ." />}
      <Descriptions className={responsive.descriptions} layout={screens.md ? 'horizontal' : 'vertical'} bordered column={1} size="small" items={[
        { key: 'connection', label: 'Kết nối với dịch vụ', children: props.error ? 'Chưa xác nhận' : current ? 'Đã nhận phản hồi' : 'Chưa kiểm tra xong' },
        { key: 'mode', label: 'Chế độ dịch vụ báo về', children: modeLabels[mode] ?? 'Chưa xác nhận' },
        { key: 'reason', label: 'Giải thích', children: reason ? reasons[reason] ?? 'Dịch vụ có thông tin giải thích bổ sung. Xem Chi tiết kỹ thuật để bộ phận hỗ trợ kiểm tra.' : mode === 'enforce' ? 'Việc xử lý của từng lớp còn phụ thuộc vào thiết lập và quy tắc của lớp đó.' : mode === 'shadow' ? 'JEV ghi nhận kết quả đánh giá, chưa áp dụng biện pháp xử lý theo kết quả đó.' : 'Chưa có giải thích bổ sung' },
        { key: 'config', label: 'Cấu hình tại dịch vụ', children: !current ? 'Chưa xác nhận' : needsReload ? 'Chưa xác nhận được bản cấu hình mới nhất' : loaded ? 'Đã nạp một bản cấu hình đã lưu' : 'Chưa xác nhận đã nạp cấu hình' },
        { key: 'loaded', label: 'Lần dịch vụ nạp cấu hình', children: formatTime(policy?.loadedAt) },
        { key: 'checked', label: 'Lần kiểm tra gần nhất (giờ Việt Nam)', children: formatTime(props.checkedAt) },
      ]} />
      <Alert type="info" showIcon message="Việc cần làm tiếp theo" description={nextStep} />
      <Button style={{ alignSelf: 'flex-start' }} onClick={() => setDetailsOpen(true)}>Chi tiết kỹ thuật</Button>
    </Space>
    <Modal className={`admin-responsive-modal ${responsive.modal}`} title="Chi tiết kỹ thuật về trạng thái đồng bộ" open={detailsOpen} width={720} onCancel={() => setDetailsOpen(false)} footer={<Button onClick={() => setDetailsOpen(false)}>Đóng</Button>}>
      <Typography.Paragraph>Gửi thông tin này cho bộ phận hỗ trợ khi cần kiểm tra kết nối hoặc cấu hình. Nếu lần kiểm tra mới bị lỗi, phản hồi cũ dưới đây chỉ dùng để đối chiếu.</Typography.Paragraph>
      <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: '60vh', overflowY: 'auto' }}>{JSON.stringify({ checkedAt: props.checkedAt, error: props.error || null, retryError: props.retryError || null, retryResult: props.retryResult, response: props.status }, null, 2)}</pre>
    </Modal>
  </Card>;
}
