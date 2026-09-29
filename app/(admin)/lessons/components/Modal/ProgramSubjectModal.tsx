"use client";

import { Alert, Button, Form, Modal, Select, Typography } from "antd";
import { useEffect } from "react";
import { useLessonSubjectOptions } from "@/hooks/useLessonSubjectOptions";

type Props = { open: boolean; loading: boolean; programCode: string; currentSubject: string; systemType?: string | null; grade?: number | null; onClose: () => void; onSubmit: (subject: string) => Promise<void>; };

export default function ProgramSubjectModal({ open, loading, programCode, currentSubject, systemType, grade, onClose, onSubmit }: Props) {
  const [form] = Form.useForm<{ subject_name: string[] }>();
  const options = useLessonSubjectOptions(open, true);
  const selected = Form.useWatch("subject_name", form);
  const subjectName = String((selected || [currentSubject]).at(-1) || "").trim();
  const calendarSubject = systemType === "topclass" && grade ? subjectName + " " + grade : subjectName;
  useEffect(() => { if (open) form.setFieldsValue({ subject_name: currentSubject ? [currentSubject] : [] }); }, [currentSubject, form, open]);
  return <Modal open={open} title="Đổi môn học của Chương trình" destroyOnClose onCancel={onClose} footer={[<Button key="cancel" onClick={onClose}>Hủy</Button>, <Button key="save" type="primary" loading={loading} onClick={() => form.submit()}>Cập nhật môn học</Button>]}>
    <Alert showIcon type="warning" style={{ marginBottom: 16 }} message={"Chương trình: " + programCode} description={"Calendar.subject mới: " + (calendarSubject || "-") + ". Toàn bộ đề cương và lịch của chương trình sẽ được cập nhật."} />
    <Form form={form} layout="vertical" onFinish={({ subject_name }) => onSubmit(String((subject_name || []).at(-1) || "").trim())}>
      <Form.Item name="subject_name" label="Môn học mới" rules={[{ validator: (_, value: string[]) => { const name = String((value || []).at(-1) || "").trim(); return name ? Promise.resolve() : Promise.reject(new Error("Chọn hoặc nhập môn học")); } }]}><Select autoFocus showSearch mode="tags" maxCount={1} optionFilterProp="label" placeholder="Chọn hoặc nhập môn học mới" options={options} /></Form.Item>
      <Typography.Text type="secondary">Mã chương trình, khối, bài học và lịch học không thay đổi.</Typography.Text>
    </Form>
  </Modal>;
}
