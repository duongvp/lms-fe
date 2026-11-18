'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, Descriptions, Form, Input, Modal, Select, Space, Switch, Table, Tabs, Tag, Tooltip, Typography, message } from 'antd';
import { useAuthStore } from '@/stores/authStore';
import { jevRequest } from '@/services/jevService';
import styles from './l1.module.css';

type Entry = { id: number; list_type: 'WHITELIST' | 'BLACKLIST'; match_mode: string; pattern: string; is_active: number; category: string | null; note: string | null; created_by: string | null };
type Settings = { revision: number; mode: string; counts: { list_type: string; is_active: number; _count: { _all: number } }[] };
const modeOptions = [{ value: 'off', label: 'Tắt' }, { value: 'shadow', label: 'Quan sát (shadow)' }, { value: 'enforce', label: 'Thực thi (enforce)' }];
const matchOptions = [
  { value: 'BOUNDED', label: 'Từ ngắn (2–5 ký tự) — Chèn dấu và lặp chữ' },
  { value: 'SEPARATED', label: 'Từ dài (2–32 ký tự) — Chèn dấu' },
  { value: 'LITERAL', label: 'Từ ngắn hoặc dài (2–32 ký tự) — Khớp nguyên từ' },
];
// Plain-language descriptions of Live prisma/CHAT_L1_ADMIN_INTEGRATION.md, section “Match mode và giới hạn”.
// Limits are enforced by Live chat-l1/policy-loader.ts and profanity-patterns.ts.
const matchHelp: Record<string, { description: string; input: string }> = {
  BOUNDED: {
    description: 'Nhận diện từ ngắn, kể cả khi người gửi chèn dấu, khoảng trắng hoặc kéo dài từng chữ. Mỗi chữ được lặp tối đa 8 lần.',
    input: 'Nhập từ gốc dài 2–5 ký tự, chỉ gồm chữ cái, viết liền và giữ dấu tiếng Việt. Ví dụ: nhập “dmm”, không nhập “d_m_m”.',
  },
  SEPARATED: {
    description: 'Nhận diện từ viết liền và từ bị chèn dấu hoặc khoảng trắng giữa các chữ. Không áp dụng cho cách kéo dài từng chữ.',
    input: 'Nhập từ gốc dài 2–32 ký tự, viết liền và giữ dấu tiếng Việt. Phải có ít nhất một chữ cái; có thể thêm số và dấu ! nhưng không đặt ! ở đầu hoặc cuối.',
  },
  LITERAL: {
    description: 'Nhận diện nguyên từ theo dạng đã lưu, không tự bỏ dấu tiếng Việt.',
    input: 'Nhập từ gốc dài 2–32 ký tự, viết liền và giữ dấu tiếng Việt. Phải có ít nhất một chữ cái; có thể thêm số và dấu ! nhưng không đặt ! ở đầu hoặc cuối.',
  },
};
const routeLabels: Record<string, string> = { SHORT_SAFE: 'Câu an toàn — bỏ đánh giá AI nội dung', L1_BLOCK: 'Đề xuất chặn tại L1', L2_CANDIDATE: 'Chuyển bước đánh giá JEV', DISABLED: 'L1 đang tắt trong giả lập', INVALID: 'Đầu vào không hợp lệ' };
const number = (value: number) => new Intl.NumberFormat('vi-VN').format(value);
const categoryOptions = [
  { value: 'PROFANITY', label: 'Từ ngữ không phù hợp' },
  { value: 'SHORT_SAFE', label: 'Câu an toàn ngắn' },
];
const categoryLabel = (value: string | null) => categoryOptions.find(option => option.value === value)?.label ?? value ?? '—';
const noteLabel = (value: string | null) => {
  if (value === 'Classroom acknowledgement') return 'Câu xác nhận trong lớp học';
  if (value && /^Seed rule VI-PROF-\d+$/.test(value)) return 'Từ khóa chặn mặc định của hệ thống';
  return value;
};

export default function L1Panel() {
  const has = useAuthStore(s => s.hasPermission);
  const [settings, setSettings] = useState<Settings | null>(null), [mode, setMode] = useState('off');
  const [listType, setListType] = useState<'BLACKLIST' | 'WHITELIST'>('BLACKLIST');
  const [q, setQ] = useState(''), [active, setActive] = useState('all'), [page, setPage] = useState(1);
  const [rows, setRows] = useState<Entry[]>([]), [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [sync, setSync] = useState<{ confirmed: boolean; message: string } | null>(null);
  const [editing, setEditing] = useState<Entry | 'new' | null>(null), [editRevision, setEditRevision] = useState(0);
  const [status, setStatus] = useState<any>(null), [statusError, setStatusError] = useState('');
  const [preview, setPreview] = useState<any>(null), [form] = Form.useForm(), [previewForm] = Form.useForm();
  const selectedMatchMode = Form.useWatch('matchMode', form);
  const selectedMatchHelp = matchHelp[selectedMatchMode ?? 'BOUNDED'];
  const sequence = useRef(0), lock = useRef(false);
  const refreshSettings = useCallback(async () => {
    const result = await jevRequest('/l1/settings'); setSettings(result.data); setMode(result.data.mode);
  }, []);
  const refreshRows = useCallback(async () => {
    const request = ++sequence.current;
    const query = new URLSearchParams({ listType, q, active, page: String(page) });
    const result = await jevRequest('/l1/lexicon?' + query);
    if (request !== sequence.current) return;
    setRows(result.data.rows); setTotal(result.data.total);
  }, [listType, q, active, page]);
  const report = (e: any) => {
    const text = e.message || 'Không thể xử lý cấu hình L1.';
    setError(text); message.error({ key: 'l1-error', content: text });
  };
  useEffect(() => {
    let disposed = false;
    setLoading(true); setError('');
    void Promise.all([refreshSettings(), refreshRows()]).catch(e => { if (!disposed) report(e); })
      .finally(() => { if (!disposed) setLoading(false); });
    return () => { disposed = true; sequence.current++; };
  }, [refreshSettings, refreshRows]);
  const task = async (fn: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await fn(); } catch (e: any) { if (!e.errorFields) report(e); }
    finally { lock.current = false; setBusy(false); }
  };
  const showSync = (result: any) => {
    setSync(result);
    if (result.confirmed) message.success(result.message);
    else message.warning({ key: 'l1-sync', content: result.message });
  };
  const open = (entry: Entry | 'new') => {
    setEditing(entry); setEditRevision(settings!.revision); form.resetFields();
    form.setFieldsValue(entry === 'new' ? { listType, matchMode: listType === 'WHITELIST' ? 'EXACT_PHRASE' : 'BOUNDED', isActive: true }
      : { listType: entry.list_type, matchMode: entry.match_mode === 'EXACT' ? 'LITERAL' : entry.match_mode,
        pattern: entry.pattern, isActive: entry.is_active === 1, note: noteLabel(entry.note) });
  };
  const save = () => task(async () => {
    const entry = await form.validateFields();
    // Localize seed notes for reading without rewriting their stored provenance on an unrelated edit.
    if (editing && editing !== 'new' && entry.note === noteLabel(editing.note)) entry.note = editing.note;
    const result = await jevRequest(editing === 'new' ? '/l1/lexicon' : `/l1/lexicon/${(editing as Entry).id}`,
      editing === 'new' ? 'POST' : 'PUT', { expectedRevision: editRevision, entry });
    setEditing(null); setPreview(null); showSync(result.sync);
    await Promise.all([refreshSettings(), refreshRows()]);
  });
  const count = (type: string, state?: number) => settings?.counts
    .filter(row => row.list_type === type && (state === undefined || row.is_active === state))
    .reduce((sum, row) => sum + row._count._all, 0) ?? 0;
  const tabLabel = (type: 'BLACKLIST' | 'WHITELIST', label: string) => <span className={styles.tabLabel}>
    {label}
    <Tooltip title={settings ? `${number(count(type, 1))} đang bật · ${number(count(type, 0))} đã tắt` : 'Đang tải số lượng'}>
      <span className={styles.tabCount} aria-label={`${label}: ${settings ? number(count(type)) : 'đang tải'} mục`}>
        {settings ? number(count(type)) : '—'}
      </span>
    </Tooltip>
  </span>;
  return <Space direction="vertical" size={16} style={{ width: '100%' }}>
    <Alert type="info" showIcon message="Bộ lọc dùng chung toàn hệ thống" description="Whitelist khớp toàn câu, không bỏ qua quyền học, mute/ban hoặc chống flood/lặp. Blacklist không tự cộng cảnh cáo hay cấm chat. Thay đổi áp dụng qua bộ xử lý hiện có của Live." />
    {error && <Alert type="error" showIcon message={error} action={<Button onClick={() => void task(async () => { await Promise.all([refreshSettings(), refreshRows()]); })}>Tải lại</Button>} />}
    {sync && <Alert type={sync.confirmed ? 'success' : 'warning'} showIcon message={sync.message} />}
    <Card size="small">
      <div className={styles.modeBar}>
        <Typography.Text strong>Chế độ L1</Typography.Text>
        <Select aria-label="Chế độ L1" className={styles.modeSelect} value={mode} options={modeOptions} disabled={!settings || busy || !has('l1.runtime')} onChange={setMode} />
        <Button type="primary" disabled={!settings || !has('l1.runtime') || mode === settings.mode} loading={busy} onClick={() => Modal.confirm({ title: 'Áp dụng chế độ L1 toàn hệ thống?', content: 'Mode hiệu lực còn chịu giới hạn CHAT_L1_MODE trên Live. Các hạn chế học sinh đang có vẫn giữ hiệu lực.', okText: 'Áp dụng', cancelText: 'Hủy', onOk: () => task(async () => {
          const result = await jevRequest('/l1/settings', 'PUT', { expectedRevision: settings!.revision, mode });
          showSync(result.sync); setPreview(null); await refreshSettings();
        }) })}>Lưu chế độ</Button>
        <Typography.Text type="secondary" className={styles.revision}>Revision {settings ? number(settings.revision) : '—'}</Typography.Text>
      </div>
    </Card>
    <Card title="Danh sách bộ lọc" size="small">
      <Tabs activeKey={listType} onChange={key => { setListType(key as typeof listType); setPage(1); }} items={[{ key: 'BLACKLIST', label: tabLabel('BLACKLIST', 'Blacklist (Danh sách chặn)') }, { key: 'WHITELIST', label: tabLabel('WHITELIST', 'Whitelist (Câu an toàn)') }]} />
      <div className={styles.toolbar}>
        <Input.Search aria-label="Tìm bộ lọc" placeholder={listType === 'BLACKLIST' ? 'Tìm từ khóa chặn…' : 'Tìm câu an toàn…'} allowClear className={styles.search} onSearch={value => { setQ(value.trim()); setPage(1); }} />
        <Select aria-label="Trạng thái bộ lọc" className={styles.statusFilter} value={active} onChange={value => { setActive(value); setPage(1); }} options={[{ value: 'all', label: 'Tất cả trạng thái' }, { value: '1', label: 'Đang bật' }, { value: '0', label: 'Đã tắt' }]} />
        <Button disabled={busy} onClick={() => void task(async () => { await Promise.all([refreshSettings(), refreshRows()]); })}>Tải lại</Button>
        <Button type="primary" className={styles.addButton} disabled={!settings || busy || !has('l1.edit')} onClick={() => open('new')}>Thêm {listType === 'BLACKLIST' ? 'từ khóa' : 'câu an toàn'}</Button>
      </div>
      <Table<Entry> rowKey="id" loading={loading || busy} dataSource={rows} scroll={{ x: 760 }} pagination={{ current: page, total, pageSize: 20, showSizeChanger: false, onChange: setPage, showTotal: value => `${number(value)} kết quả` }} columns={[
        { title: listType === 'BLACKLIST' ? 'Từ khóa' : 'Câu an toàn', dataIndex: 'pattern', width: 260 },
        { title: 'Cách khớp', dataIndex: 'match_mode', render: value => value === 'EXACT_PHRASE' ? 'Toàn câu' : matchOptions.find(option => option.value === (value === 'EXACT' ? 'LITERAL' : value))?.label ?? value },
        { title: 'Nhóm', dataIndex: 'category', render: categoryLabel },
        { title: 'Ghi chú', dataIndex: 'note', render: value => noteLabel(value) || '—' },
        { title: 'Trạng thái', dataIndex: 'is_active', width: 100, render: value => <Tag color={value === 1 ? 'green' : 'default'}>{value === 1 ? 'Đang bật' : 'Đã tắt'}</Tag> },
        { title: 'Thao tác', width: 90, render: (_, entry) => <Button disabled={!settings || busy || !has('l1.edit')} onClick={() => open(entry)}>Sửa</Button> },
      ]} />
    </Card>
    <Card title="Thử bộ lọc đã lưu">
      <Form form={previewForm} layout="vertical" initialValues={{ mode: 'enforce' }} onFinish={values => void task(async () => { const result = await jevRequest('/l1/preview', 'POST', values); setPreview(result.data); })}>
        <Form.Item name="text" label="Câu mẫu" rules={[{ required: true, whitespace: true, message: 'Nhập câu mẫu.' }]}><Input.TextArea aria-label="Câu mẫu L1" maxLength={500} showCount rows={3} /></Form.Item>
        <Space wrap align="start"><Form.Item name="mode" label="Chế độ giả lập"><Select aria-label="Chế độ giả lập L1" style={{ width: 220 }} options={modeOptions} /></Form.Item><Form.Item label=" "><Button htmlType="submit" loading={busy} disabled={!settings}>Kiểm tra câu mẫu</Button></Form.Item></Space>
      </Form>
      {preview && <Space direction="vertical" style={{ width: '100%' }}>
        <Alert type="info" message={routeLabels[preview.decision.reviewRoute] ?? preview.decision.reviewRoute} description={preview.disclaimer} />
        <Typography.Text>Revision {number(preview.revision)} · Không gọi AI · Không thực thi chế tài</Typography.Text>
        <details><summary>Chi tiết giả lập</summary><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(preview, null, 2)}</pre></details>
      </Space>}
    </Card>
    <Card title="Đồng bộ bộ lọc với Live" extra={<Space wrap>
      <Button loading={busy} onClick={() => void task(async () => { try { const result = await jevRequest('/l1/status'); setStatus(result.data.policy); setStatusError(''); } catch (e: any) { setStatusError(e.message); } })}>Kiểm tra L1</Button>
      <Button loading={busy} disabled={!has('l1.runtime') || !settings} onClick={() => void task(async () => { const result = await jevRequest('/l1/reload', 'POST', {}); showSync(result.data); if (result.data.status?.policy) setStatus(result.data.status.policy); })}>Thử đồng bộ L1</Button>
    </Space>}>
      {statusError && <Alert type="warning" message={statusError} />}
      <Descriptions bordered size="small" column={{ xs: 1, md: 2 }} items={[
        { key: 'source', label: 'Nguồn cấu hình worker', children: status?.source ?? 'Chưa kiểm tra' },
        { key: 'revision', label: 'Revision worker', children: status ? number(status.revision) : '—' },
        { key: 'mode', label: 'Mode hiệu lực', children: status?.mode ?? '—' },
        { key: 'loaded', label: 'Lần nạp', children: status?.loadedAt ? new Date(status.loadedAt).toLocaleString('vi-VN') : '—' },
      ]} />
      <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>Thông tin phản ánh worker trả lời; chưa xác nhận tất cả worker đã đồng bộ. Mode hiệu lực bị giới hạn bởi ENV trên Live.</Typography.Paragraph>
    </Card>
    <Modal title={editing === 'new' ? 'Thêm bộ lọc L1' : 'Chỉnh sửa bộ lọc L1'} open={editing !== null} confirmLoading={busy} okText="Lưu và đồng bộ" cancelText="Hủy" onOk={save} onCancel={() => { if (!busy) setEditing(null); }} maskClosable={false}>
      <Form form={form} layout="vertical">
        <Form.Item name="listType" hidden><Input /></Form.Item>
        <Form.Item name="pattern" label={listType === 'BLACKLIST' ? 'Từ khóa' : 'Câu an toàn'} rules={[{ required: true, whitespace: true, message: 'Nhập nội dung bộ lọc.' }]}><Input aria-label="Nội dung bộ lọc" maxLength={150} /></Form.Item>
        <Form.Item name="matchMode" label="Cách khớp" rules={[{ required: true }]} extra={listType === 'BLACKLIST' && selectedMatchHelp
          ? <div className={styles.matchHelp} aria-live="polite">
            <span>{selectedMatchHelp.description}</span>
            <span>{selectedMatchHelp.input}</span>
            {selectedMatchMode !== 'LITERAL' && <span>Trong tin nhắn, hỗ trợ khoảng trắng và các dấu . _ , * · - giữa các chữ, tối đa 3 dấu hoặc khoảng trắng liên tiếp. Khi thêm từ khóa, chỉ nhập từ gốc.</span>}
            <span>Hệ thống còn xem từ khóa có nằm trong từ khác và ngữ cảnh sử dụng. Không phải cứ có từ khóa là tin nhắn sẽ bị chặn.</span>
          </div>
          : 'Khớp toàn câu; tối đa 64 ký tự, không có dấu chấm/chấm than cuối câu.'}>
          <Select aria-label="Cách khớp từ khóa" disabled={listType === 'WHITELIST'} options={listType === 'WHITELIST' ? [{ value: 'EXACT_PHRASE', label: 'Khớp toàn câu' }] : matchOptions} />
        </Form.Item>
        <Form.Item name="note" label="Ghi chú (không bắt buộc)"><Input.TextArea rows={2} maxLength={255} placeholder="Ghi lý do thêm hoặc điều cần lưu ý khi sử dụng bộ lọc này" /></Form.Item>
        <Form.Item name="isActive" label="Bật bộ lọc" valuePropName="checked"><Switch /></Form.Item>
        <Typography.Text type="secondary">Revision khi mở form: {number(editRevision)}. Khi có xung đột, giữ lại nội dung để đối chiếu; đóng form và tải lại trước khi sửa tiếp.</Typography.Text>
      </Form>
    </Modal>
  </Space>;
}
