'use client';
import Table from '@/components/ui/Table';
import responsive from './responsive.module.css';
import React, { useState } from 'react';
import { Alert, Button, Checkbox, Select, Space, Tag, Typography } from 'antd';
import { categoryName, contextNames, incidentLabel, levelName } from './policyLabels';
import styles from './policy.module.css';

export default function PolicyRulesTable({ policy, actionNames, onEdit }: { policy: any; actionNames: Record<string, string>; onEdit: (index: number) => void }) {
  const [category, setCategory] = useState<string>(), [severity, setSeverity] = useState<string>();
  const [showResolution, setShowResolution] = useState(false);
  const categories = policy.framework?.categories ?? [], levels = policy.framework?.levels ?? [];
  const rules = (policy.rules ?? []).map((item: any, index: number) => ({ ...item, sourceIndex: index }))
    .filter((item: any) => (!category || item.category === category) && (!severity || item.severity === severity) && (showResolution || !item.resolutionOnly));
  return <Space direction="vertical" size={16} className={styles.fullWidth}>
    <Alert type="info" showIcon message="Chọn tình huống để điều chỉnh cách xử lý" description="Lọc theo nhóm và mức độ, sau đó mở Chi tiết để bật/tắt hành động, đặt ngưỡng đánh giá hoặc sửa thời hạn. Các thay đổi chỉ được ghi khi bấm Lưu nháp." />
    <div className={styles.filters}>
      <Select aria-label="Lọc nhóm quy tắc" allowClear placeholder="Tất cả nhóm nội dung" value={category} onChange={setCategory} className={styles.categoryFilter} options={categories.map((item: any) => ({ value: item.code, label: categoryName(item.code, item.label) }))} />
      <Select aria-label="Lọc mức quy tắc" allowClear placeholder="Tất cả mức độ" value={severity} onChange={setSeverity} className={styles.levelFilter} options={levels.map((item: any) => ({ value: item.code, label: levelName(item.code, item.label) }))} />
      <Typography.Text type="secondary">{rules.length} quy tắc</Typography.Text>
    </div>
    <Table rowKey="id" dataSource={rules} size="small" scroll={{ x: 850 }} pagination={{ pageSize: 10, showSizeChanger: false }} columns={[
      { title: 'Nhóm nội dung', dataIndex: 'category', render: code => categoryName(code, categories.find((item: any) => item.code === code)?.label) },
      { title: 'Mức độ', dataIndex: 'severity', render: code => levelName(code, levels.find((item: any) => item.code === code)?.label) },
      { title: 'Bối cảnh lớp', render: (_, row: any) => row.conditions?.modes?.map((mode: string) => contextNames[mode] ?? mode).join(', ') },
      { title: 'Lần xảy ra', render: (_, row: any) => row.conditions ? incidentLabel(row.conditions.minPriorCount, row.conditions.maxPriorCount) : '—' },
      { title: 'Cách xử lý', render: (_, row: any) => <Space size={[0, 4]} wrap>{row.actions.map((action: string) => <Tag key={action} color={row.gates[action]?.enabled ? 'blue' : undefined}>{actionNames[action] ?? action}{!row.gates[action]?.enabled && ' (tắt)'}</Tag>)}</Space> },
      { title: 'Thao tác', width: 90, render: (_, row: any) => <Button onClick={() => onEdit(row.sourceIndex)}>Chi tiết</Button> },
    ]} />
    <Checkbox checked={showResolution} onChange={e => setShowResolution(e.target.checked)}>Hiện cả quy tắc khi AI trả nhóm và mức không phù hợp với nhau</Checkbox>
  </Space>;
}
