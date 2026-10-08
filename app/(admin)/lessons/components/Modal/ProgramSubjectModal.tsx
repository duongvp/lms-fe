"use client";

import Select from "@/components/ui/MobileSelect";
import { Alert, Button, Form, Input, Modal } from "antd";
import { useEffect } from "react";
import { useLessonSubjectOptions } from "@/hooks/useLessonSubjectOptions";

type Props = { open: boolean; loading: boolean; programCode: string; currentSubject: string; renameCode?: boolean; systemType?: string | null; grade?: number | null; onClose: () => void; onSubmit: (subject: string, programCode?: string) => Promise<void>; };

export default function ProgramSubjectModal({ open, loading, programCode, currentSubject, renameCode = false, onClose, onSubmit }: Props) {
  const [form] = Form.useForm<{ subject_name: string[]; subject_code: string }>();
  const options = useLessonSubjectOptions(open, true);
  useEffect(() => { if (open) form.setFieldsValue({ subject_code: programCode, subject_name: currentSubject ? [currentSubject] : [] }); }, [currentSubject, programCode, form, open]);
  return <Modal open={open} title={renameCode ? "Đổi tên chương trình" : "Đổi tên môn học"} destroyOnClose onCancel={onClose} footer={[<Button key="cancel" onClick={onClose}>Hủy</Button>, <Button key="save" type="primary" loading={loading} onClick={() => form.submit()}>Lưu thay đổi</Button>]}>
    <Alert showIcon type="info" style={{ marginBottom: 16 }} message={"Chương trình: " + programCode} description={renameCode ? "Chỉ được đổi mã chương trình khi chưa có lịch học nào được tạo." : "Tên môn học sẽ được cập nhật cho toàn bộ đề cương và lịch học, kể cả lịch đã diễn ra. Ngày giờ của lịch học được giữ nguyên."} />
    <Form form={form} layout="vertical" onFinish={({ subject_name, subject_code }) => onSubmit(String((subject_name || []).at(-1) || "").trim(), renameCode ? subject_code.trim() : undefined)}>
      {renameCode && <Form.Item name="subject_code" label="Mã chương trình" rules={[
        { required: true, whitespace: true, message: "Nhập mã chương trình" },
        { max: 100, message: "Mã chương trình không được quá 100 ký tự" },
        { pattern: /^[A-Za-z0-9_-]+$/, message: "Chỉ dùng chữ không dấu, số, dấu gạch ngang hoặc gạch dưới" },
      ]}><Input autoFocus maxLength={100} placeholder="VD: toan-6-2027" /></Form.Item>}
      <Form.Item name="subject_name" label="Tên môn học" rules={[{ validator: (_, value: string[]) => { const name = String((value || []).at(-1) || "").trim(); return name && name.length <= 100 ? Promise.resolve() : Promise.reject(new Error("Nhập tên môn học tối đa 100 ký tự")); } }]}><Select showSearch mode="tags" maxCount={1} optionFilterProp="label" placeholder="Chọn hoặc nhập môn học mới" options={options} /></Form.Item>
    </Form>
  </Modal>;
}
