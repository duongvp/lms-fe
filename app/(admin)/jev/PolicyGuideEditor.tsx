'use client';
import React from 'react';
import { Alert, Collapse, Form, Input, Space, Tabs, Tag, Typography } from 'antd';
import { categoryName, levelName, questionNames } from './policyLabels';
import styles from './policy.module.css';
import { updatePolicyFramework } from './policyEditorModel';

export default function PolicyGuideEditor({ config, editable, onChange }: { config: any; editable: boolean; onChange: (value: any) => void }) {
  const framework = config.policy?.framework;
  const categories = framework?.categories ?? [], levels = framework?.levels ?? [];
  const patchFramework = (key: string, value: any) => {
    onChange(updatePolicyFramework(config, key, value));
  };
  const patchQuestion = (name: string, next: any) => onChange({ ...config, rubric: { ...config.rubric,
    questions: { ...config.rubric.questions, [name]: next } } });
  return <Space direction="vertical" size={16} className={styles.fullWidth}>
    <Alert type="info" showIcon message="Chọn nhóm hoặc mức độ cần chỉnh sửa" description="Tên tiếng Việt giúp tra cứu dễ hơn. Nội dung hướng dẫn gốc có thể bằng tiếng Anh vì được dùng trực tiếp để AI đánh giá; hệ thống không tự dịch hoặc thay đổi nội dung này." />
    <Tabs items={[
      { key: 'categories', label: `Nhóm nội dung (${categories.length})`, children: categories.length ? <Collapse items={categories.map((category: any, index: number) => ({
        key: category.code, label: categoryName(category.code, category.label),
        extra: <span className={styles.levelTags}>{(framework.pairs ?? []).filter((pair: any) => pair.category === category.code && pair.applicable).map((pair: any) => <Tag key={pair.severity}>{levelName(pair.severity, levels.find((level: any) => level.code === pair.severity)?.label)}</Tag>)}</span>,
        children: <Form layout="vertical" disabled={!editable}>
          <Form.Item label="Tên hiển thị" extra="Chỉ đổi tên hiển thị, giữ nguyên mã nhận diện và lịch sử của nhóm."><Input aria-label={`Tên nhóm ${category.code}`} value={category.label} maxLength={150} onChange={e => patchFramework('categories', categories.map((item: any, i: number) => i === index ? { ...item, label: e.target.value } : item))} /></Form.Item>
          <Form.Item label="Mô tả nhóm nội dung" extra="Khi sửa mô tả hoặc tiêu chí bên dưới, tiêu chí AI của nhóm này được cập nhật cùng nội dung."><Input.TextArea autoSize={{ minRows: 3, maxRows: 9 }} value={category.definition} onChange={e => patchFramework('categories', categories.map((item: any, i: number) => i === index ? { ...item, definition: e.target.value } : item))} /></Form.Item>
          <Typography.Paragraph type="secondary">{category.contextRequirement === 'LECTURE_KNOWN' ? 'Cần xác định rõ bài học đang diễn ra.' : 'Có thể xét ở các bối cảnh lớp học.'} {category.counterKey ? 'Có theo dõi số lần theo cấu hình của nhóm.' : 'Không có bộ đếm riêng cho nhóm.'}</Typography.Paragraph>
          <Typography.Title level={5}>Tiêu chí cho từng mức độ</Typography.Title>
          {(framework.pairs ?? []).map((pair: any, pairIndex: number) => pair.category === category.code && pair.applicable ? <Form.Item key={pair.severity} label={levelName(pair.severity, levels.find((level: any) => level.code === pair.severity)?.label)}>
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} value={pair.criterion} onChange={e => patchFramework('pairs', framework.pairs.map((item: any, i: number) => i === pairIndex ? { ...item, criterion: e.target.value } : item))} />
          </Form.Item> : null)}
          <Typography.Text type="secondary">Mã nhóm: {category.code}. Các mức chưa áp dụng và định danh nghiệp vụ được giữ nguyên.</Typography.Text>
        </Form>,
      }))} /> : <Alert type="warning" message="Bộ cấu hình này chưa có khung nhóm nội dung. Có thể kiểm tra cấu trúc tại Thiết lập nâng cao." /> },
      { key: 'levels', label: `Mức độ (${levels.length})`, children: <Collapse items={levels.map((level: any, index: number) => ({
        key: level.code, label: levelName(level.code, level.label),
        children: <Form layout="vertical" disabled={!editable}>
          <Form.Item label="Tên hiển thị"><Input aria-label={`Tên mức ${level.code}`} value={level.label} maxLength={150} onChange={e => patchFramework('levels', levels.map((item: any, i: number) => i === index ? { ...item, label: e.target.value } : item))} /></Form.Item>
          <Form.Item label="Mô tả mức độ"><Input.TextArea autoSize={{ minRows: 3, maxRows: 9 }} value={level.instructions} onChange={e => patchFramework('levels', levels.map((item: any, i: number) => i === index ? { ...item, instructions: e.target.value } : item))} /></Form.Item>
          <Typography.Text type="secondary">Mã mức: {level.code}. Thứ tự mức độ được giữ nguyên.</Typography.Text>
        </Form>,
      }))} /> },
      { key: 'instructions', label: 'Hướng dẫn đánh giá AI', children: <Space direction="vertical" className={styles.fullWidth}>
        <Typography.Paragraph>Đây là hướng dẫn AI đang sử dụng, khác với nội dung thông báo gửi học sinh. Mở đúng phần cần điều chỉnh; giữ nguyên nội dung khi chỉ muốn đổi tên nhóm hoặc mức độ.</Typography.Paragraph>
        <Collapse items={Object.entries(config.rubric?.questions ?? {}).map(([name, question]: [string, any]) => ({
          key: name, label: questionNames[name] ?? name,
          children: <Form layout="vertical" disabled={!editable}>
            <Form.Item label="Hướng dẫn chung"><Input.TextArea autoSize={{ minRows: 4, maxRows: 10 }} value={question.instructions} onChange={e => patchQuestion(name, { ...question, instructions: e.target.value })} /></Form.Item>
            {Object.entries(question.criteria ?? {}).map(([key, text]) => <Form.Item key={key} label={name === 'category' ? categoryName(key, categories.find((item: any) => item.code === key)?.label) : levelName(key, levels.find((item: any) => item.code === key)?.label)}>
              <Input.TextArea autoSize={{ minRows: 3, maxRows: 9 }} value={String(text)} onChange={e => patchQuestion(name, { ...question, criteria: { ...question.criteria, [key]: e.target.value } })} />
            </Form.Item>)}
          </Form>,
        }))} />
      </Space> },
    ]} />
  </Space>;
}
