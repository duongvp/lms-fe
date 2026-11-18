'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Form, Input, InputNumber, Modal, Select, Space, Typography } from 'antd';
import type { InputNumberProps } from 'antd';
import { jevRequest, type JevPolicy } from '@/services/jevService';

const sourceName = (item: JevPolicy) => `${item.policy_key} · Phiên bản ${item.revision} · ${item.status === 'PUBLISHED' ? 'Đã phát hành' : 'Bản nháp'}`;
const merge = (items: JevPolicy[]) => [...new Map(items.map(item => [item.id, item])).values()];

export default function PolicyCreateModal({ open, initialSource, initialRows, integerProps, onCancel, onCreated }: {
  open: boolean; initialSource: JevPolicy | null; initialRows: JevPolicy[];
  integerProps: Pick<InputNumberProps<number | ''>, 'formatter' | 'parser'>;
  onCancel: () => void; onCreated: (row: JevPolicy) => Promise<void>;
}) {
  const [form] = Form.useForm();
  const [sources, setSources] = useState<JevPolicy[]>([]), [sourcePage, setSourcePage] = useState(0), [sourceTotal, setSourceTotal] = useState(0);
  const [loading, setLoading] = useState(false), [saving, setSaving] = useState(false);
  const [error, setError] = useState(''), [lookupError, setLookupError] = useState('');
  const generation = useRef(0), lock = useRef(false);
  const sourceRows = useRef<JevPolicy[]>([]), revisionEdited = useRef(false);
  const nextRevision = (key: string, rows: JevPolicy[]) => Math.max(0, ...rows.filter(row => row.policy_key === key).map(row => row.revision)) + 1;
  const loadSources = async (page: number, requestGeneration: number) => {
    setLoading(true); setLookupError('');
    try {
      const response = await jevRequest(`/policies?page=${page}&limit=100`);
      if (generation.current !== requestGeneration) return;
      const rows = merge([...sourceRows.current, ...response.data.rows]);
      sourceRows.current = rows; setSources(rows);
      setSourcePage(page); setSourceTotal(response.data.total);
      const key = form.getFieldValue('policyKey');
      if (!revisionEdited.current) {
        form.setFieldValue('revision', nextRevision(key, rows));
      }
    } catch (e: any) {
      if (generation.current === requestGeneration) setLookupError(e.message || 'Không tải được danh sách cấu hình mẫu.');
    } finally { if (generation.current === requestGeneration) setLoading(false); }
  };
  useEffect(() => {
    if (!open) return;
    const requestGeneration = ++generation.current;
    const rows = merge([...(initialSource ? [initialSource] : []), ...initialRows]);
    const selected = initialSource ?? initialRows[0];
    sourceRows.current = rows; revisionEdited.current = false;
    setSources(rows); setSourcePage(0); setSourceTotal(0); setError(''); setLookupError('');
    form.resetFields();
    const key = selected?.policy_key ?? 'jev-classroom';
    form.setFieldsValue({ source: selected?.id ?? 'LIVE', policyKey: key, revision: nextRevision(key, rows) });
    void loadSources(1, requestGeneration);
    return () => { generation.current++; };
  }, [open, initialSource, initialRows, form]);
  const submit = async () => {
    if (lock.current) return;
    lock.current = true; setSaving(true); setError('');
    try {
      const values = await form.validateFields();
      const response = await jevRequest('/policies/from-template', 'POST', { policyKey: values.policyKey, revision: values.revision,
        ...(values.source === 'LIVE' ? {} : { sourcePolicyId: values.source }) });
      onCancel();
      await onCreated(response.data);
    } catch (e: any) {
      if (!e.errorFields) setError(e.status === 409 ? 'Mã và phiên bản này đã tồn tại. Chọn phiên bản khác rồi thử lại.' : e.message || 'Không tạo được bản nháp.');
    } finally { lock.current = false; setSaving(false); }
  };
  return <Modal open={open} title={initialSource ? 'Nhân bản bộ cấu hình' : 'Tạo bộ cấu hình'} width={640}
    okText="Tạo và mở cấu hình" cancelText="Hủy" confirmLoading={saving} okButtonProps={{ disabled: loading }}
    onOk={() => void submit()} onCancel={() => { if (!saving) onCancel(); }} maskClosable={false}>
    <Space direction="vertical" size={16} style={{ width: '100%', marginBottom: 16 }}>
      <Alert type="info" showIcon message="Bắt đầu từ một bộ cấu hình mẫu" description="Sau khi tạo, bạn sẽ chỉnh nhóm nội dung, quy tắc xử lý và thông báo bằng giao diện cấu hình. Bộ gốc được giữ nguyên; bản mới chưa được phát hành hoặc áp dụng." />
      {error && <Alert type="error" showIcon message={error} />}
      {lookupError && <Alert type="warning" showIcon message={lookupError} action={<Button onClick={() => void loadSources(sourcePage || 1, generation.current)}>Tải lại</Button>} />}
    </Space>
    <Form form={form} layout="vertical" disabled={saving}>
      <Form.Item name="source" label="Dựa trên bộ cấu hình" rules={[{ required: true, message: 'Chọn một bộ cấu hình làm mẫu.' }]}>
        <Select aria-label="Bộ cấu hình làm mẫu" loading={loading} showSearch optionFilterProp="label" options={[
          { value: 'LIVE', label: 'Mẫu chuẩn từ Live' },
          ...sources.map(item => ({ value: item.id, label: sourceName(item) })),
        ]} onChange={value => {
          revisionEdited.current = false;
          const source = sources.find(item => item.id === value);
          const key = source?.policy_key ?? 'jev-classroom';
          form.setFieldsValue({ policyKey: key, revision: nextRevision(key, sources) });
        }} dropdownRender={menu => <>{menu}{sourcePage * 100 < sourceTotal && <Button block type="text" loading={loading} onClick={() => void loadSources(sourcePage + 1, generation.current)}>Tải thêm bộ cấu hình</Button>}</>} />
      </Form.Item>
      <Form.Item name="policyKey" label="Mã bộ cấu hình" extra="Giữ mã để tạo phiên bản tiếp theo, hoặc đổi mã để tạo một bộ cấu hình riêng."
        rules={[{ required: true, message: 'Nhập mã bộ cấu hình.' }, { pattern: /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/, message: 'Dùng chữ không dấu, số, dấu gạch ngang hoặc gạch dưới; tối đa 64 ký tự.' }]}>
        <Input aria-label="Mã bộ cấu hình mới" maxLength={64} placeholder="Ví dụ: kiem-duyet-lop-hoc" onChange={e => { revisionEdited.current = false; form.setFieldValue('revision', nextRevision(e.target.value, sources)); }} />
      </Form.Item>
      <Form.Item name="revision" label="Phiên bản" extra="Đã gợi ý phiên bản tiếp theo trong danh sách được tải. Có thể điều chỉnh nếu cần."
        rules={[{ required: true, message: 'Nhập số phiên bản.' }]}>
        <InputNumber aria-label="Phiên bản bộ cấu hình mới" min={1} max={4294967295} precision={0} {...integerProps} style={{ width: 160 }} onChange={() => { revisionEdited.current = true; }} />
      </Form.Item>
      <Typography.Text type="secondary">Sau khi chỉnh sửa: Lưu nháp → Kiểm tra → Phát hành. Việc áp dụng được thực hiện riêng trong Phạm vi áp dụng.</Typography.Text>
    </Form>
  </Modal>;
}
