'use client';
import Table from '@/components/ui/Table';
import responsive from './responsive.module.css';
import React, { useState } from 'react';
import { Alert, Button, Form, Grid, Input, Modal, Select, Space, Typography } from 'antd';
import { templateKindName } from './policyLabels';
import styles from './policy.module.css';

export default function PolicyTemplatesEditor({ templates, editable, onChange }: { templates: any[]; editable: boolean; onChange: (value: any[]) => void }) {
  const screens = Grid.useBreakpoint();
  const [query, setQuery] = useState(''), [audience, setAudience] = useState<string>();
  const [currentKey, setCurrentKey] = useState<string>(), [page, setPage] = useState(1);
  const current = templates.find(item => item.key === currentKey);
  const rows = templates.filter(item => (!audience || item.audience === audience)
    && (!query || `${item.body} ${item.guidance ?? ''} ${item.key}`.toLocaleLowerCase('vi-VN').includes(query.toLocaleLowerCase('vi-VN'))));
  const patch = (key: string, value: string) => onChange(templates.map(item => item.key === currentKey ? { ...item, [key]: value } : item));
  return <Space direction="vertical" size={16} className={styles.fullWidth}>
    <Alert type="info" showIcon message="Nội dung người dùng sẽ nhận được" description="Tìm thông báo cần sửa, chọn người nhận rồi mở nội dung. Việc chọn thông báo cho từng hành động nằm trong Quy tắc xử lý." />
    <div className={styles.filters}>
      <Input.Search aria-label="Tìm mẫu thông báo" placeholder="Tìm theo nội dung thông báo" className={styles.categoryFilter} allowClear onSearch={value => { setQuery(value.trim()); setPage(1); }} />
      <Select aria-label="Lọc người nhận" allowClear placeholder="Tất cả người nhận" className={styles.levelFilter} value={audience} onChange={value => { setAudience(value); setPage(1); }} options={[{ value: 'student', label: 'Học sinh' }, { value: 'teacher', label: 'Giáo viên' }]} />
    </div>
    <Table className={styles.templateTable} tableLayout="fixed" rowKey="key" dataSource={screens.lg ? rows : rows.slice((page - 1) * 10, page * 10)} pagination={{ total: rows.length, current: page, onChange: setPage, pageSize: 10, showSizeChanger: false, showTotal: total => `${total} thông báo` }} columns={[
      { title: 'Người nhận', dataIndex: 'audience', width: '14%', render: value => value === 'student' ? 'Học sinh' : 'Giáo viên' },
      { title: 'Loại thông báo', dataIndex: 'kind', width: '18%', render: templateKindName },
      { title: 'Nội dung', dataIndex: 'body', className: styles.templateContent },
      { title: 'Thao tác', width: 112, render: (_, row) => <Button size="small" onClick={() => setCurrentKey(row.key)}>{editable ? 'Chỉnh sửa' : 'Xem'}</Button> },
    ]} />
    <Modal className={`admin-responsive-modal ${responsive.modal}`} open={!!current} title={editable ? 'Chỉnh sửa thông báo' : 'Xem thông báo'} onCancel={() => setCurrentKey(undefined)} footer={<Button type="primary" onClick={() => setCurrentKey(undefined)}>Xong</Button>} width={640}>
      {current && <Form layout="vertical" disabled={!editable}>
        <Typography.Paragraph>{current.audience === 'student' ? 'Gửi học sinh' : 'Gửi giáo viên'} · {templateKindName(current.kind)}</Typography.Paragraph>
        <Form.Item label="Nội dung thông báo"><Input.TextArea aria-label={`Nội dung ${current.key}`} autoSize={{ minRows: 3, maxRows: 8 }} value={current.body} onChange={e => patch('body', e.target.value)} /></Form.Item>
        {current.guidance !== undefined && <Form.Item label="Hướng dẫn hỗ trợ"><Input.TextArea aria-label={`Hướng dẫn ${current.key}`} autoSize={{ minRows: 2, maxRows: 6 }} value={current.guidance} onChange={e => patch('guidance', e.target.value)} /></Form.Item>}
        <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>{editable ? 'Bấm Lưu nháp trong bộ cấu hình để ghi thay đổi.' : 'Bản đã phát hành chỉ được xem.'}</Typography.Paragraph>
      </Form>}
    </Modal>
  </Space>;
}
