'use client';
import React from 'react';
import { Alert, Button, Card, Form, InputNumber, Select, Space, Tag, Typography } from 'antd';
import type { FormInstance, InputNumberProps } from 'antd';
import { categoryName, contextNames, levelName } from './policyLabels';
import styles from './preview.module.css';

const scores = [
  { key: 'pCategory', label: 'Xác suất đúng nhóm', help: 'Điểm giả định cho khả năng nội dung thuộc nhóm đã chọn.' },
  { key: 'categoryConfidence', label: 'Độ tin cậy nhóm', help: 'Mức tin cậy của kết quả chọn nhóm, được kiểm tra riêng với xác suất đúng nhóm.' },
  { key: 'pSeverity', label: 'Xác suất đúng mức', help: 'Điểm giả định cho khả năng nội dung thuộc mức độ đã chọn.' },
  { key: 'severityConfidence', label: 'Độ tin cậy mức', help: 'Mức tin cậy của kết quả chọn mức độ, được kiểm tra riêng với xác suất đúng mức.' },
];
const safety = [
  { key: 'threat', label: 'Đe dọa an toàn' },
  { key: 'distress', label: 'Học sinh cần trợ giúp' },
];

export default function PolicyPreview({ policy, form, busy, disabled, result, actionNames, integerProps, onRun, onClear }: {
  policy: any; form: FormInstance; busy: boolean; disabled: boolean; result: any;
  actionNames: Record<string, string>;
  integerProps: Pick<InputNumberProps<number | ''>, 'formatter' | 'parser'>;
  onRun: () => void; onClear: () => void;
}) {
  const categories = policy.framework?.categories ?? [], levels = policy.framework?.levels ?? [];
  const actions = result?.preview?.eligibleActions ?? [];
  return <div className={styles.preview} data-testid="jev-policy-preview">
    <Alert type="info" showIcon message="Thử cách xử lý trên cấu hình đã lưu" description="Chọn tình huống và nhập điểm đánh giá giả định để xem hành động nào đủ điều kiện. Không gọi AI, gửi chat hoặc áp dụng chế tài cho học sinh." />
    <Form form={form} layout="vertical" className={styles.form} onValuesChange={onClear}
      initialValues={{ mode: 'LECTURE', pCategory: 95, categoryConfidence: 95, pSeverity: 95, severityConfidence: 95, threat: 0, distress: 0, priorCounts: {} }}>
      <Card size="small" title="1. Chọn tình huống">
        <div className={styles.situationFields}>
          <Form.Item name="mode" label="Bối cảnh lớp học" rules={[{ required: true, message: 'Chọn bối cảnh lớp học.' }]}>
            <Select aria-label="Bối cảnh tình huống" options={['LOBBY', 'LECTURE', 'UNKNOWN'].map(value => ({ value, label: contextNames[value] }))} />
          </Form.Item>
          <Form.Item name="category" label="Nhóm nội dung" rules={[{ required: true, message: 'Chọn nhóm nội dung.' }]}>
            <Select aria-label="Nhóm tình huống" placeholder="Chọn nhóm nội dung" options={categories.map((item: any) => ({ value: item.code, label: categoryName(item.code, item.label) }))} />
          </Form.Item>
          <Form.Item name="severity" label="Mức độ" rules={[{ required: true, message: 'Chọn mức độ.' }]}>
            <Select aria-label="Mức tình huống" placeholder="Chọn mức độ" options={levels.map((item: any) => ({ value: item.code, label: levelName(item.code, item.label) }))} />
          </Form.Item>
        </div>
      </Card>
      <div className={styles.scoreSections}>
        <Card size="small" title="2. Điểm nhận diện nội dung">
          <Typography.Paragraph className={styles.help}>Nhập từ 0–100%. Mỗi chỉ số được so với ngưỡng riêng trong Quy tắc xử lý.</Typography.Paragraph>
          <div className={styles.scoreFields}>{scores.map(item => <Form.Item key={item.key} name={item.key} label={item.label} tooltip={item.help} rules={[{ required: true, message: 'Nhập điểm từ 0–100%.' }]}>
            <InputNumber aria-label={item.label} min={0} max={100} step={1} addonAfter="%" />
          </Form.Item>)}</div>
        </Card>
        <Card size="small" title="3. Tín hiệu an toàn">
          <Typography.Paragraph className={styles.help}>Nhập điểm giả định cho từng tín hiệu. Để 0% nếu không có dấu hiệu đó.</Typography.Paragraph>
          <div className={styles.safetyFields}>{safety.map(item => <Form.Item key={item.key} name={item.key} label={item.label} rules={[{ required: true, message: 'Nhập điểm từ 0–100%.' }]}>
            <InputNumber aria-label={item.label} min={0} max={100} step={1} addonAfter="%" />
          </Form.Item>)}</div>
        </Card>
      </div>
      {(policy.counters ?? []).length > 0 && <Card size="small" title="4. Số lần đã ghi nhận trước đó">
        <Typography.Paragraph className={styles.help}>Không tính tin nhắn đang thử. Để 0 nếu đây là lần đầu.</Typography.Paragraph>
        <div className={styles.counterFields}>{policy.counters.map((counter: any) => {
          const label = categories.filter((category: any) => category.counterKey === counter.key).map((category: any) => categoryName(category.code, category.label)).join(', ') || counter.key;
          return <Form.Item key={counter.key} name={['priorCounts', counter.key]} label={label} initialValue={0}>
            <InputNumber aria-label={`Số lần trước: ${label}`} min={0} precision={0} {...integerProps} addonAfter="lần" />
          </Form.Item>;
        })}</div>
      </Card>}
      <div className={styles.footer}>
        <Space wrap><Button type="primary" disabled={disabled} loading={busy} onClick={onRun}>Chạy giả lập</Button>
          <Button disabled={busy} onClick={() => { form.resetFields(); onClear(); }}>Đặt lại</Button></Space>
        <Typography.Text type="secondary">Kết quả chỉ là mô phỏng, không ảnh hưởng lớp học.</Typography.Text>
      </div>
    </Form>
    {result && <Card size="small" title="Kết quả thử" className={styles.result}>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        {actions.length ? <><Typography.Text strong>Hành động đủ điều kiện</Typography.Text><Space wrap>{actions.map((action: string) => <Tag key={action} color="blue">{actionNames[action] ?? action}</Tag>)}</Space></>
          : <Alert type="info" showIcon message="Chưa có hành động đủ điều kiện trong kết quả trả về" description="Xem chi tiết kết quả để kiểm tra các điều kiện đánh giá." />}
        <details><summary>Chi tiết kết quả</summary><pre className={styles.resultDetails}>{JSON.stringify(result, null, 2)}</pre></details>
      </Space>
    </Card>}
  </div>;
}
