"use client";

import { Alert, Button, Col, Form, Input, InputNumber, Modal, Row, Select, Typography } from "antd";
import { useEffect } from "react";
import { useLessonSubjectOptions } from "@/hooks/useLessonSubjectOptions";
import type { CreateLessonProgramPayload } from "@/services/lessonService";
import { GRADE_OPTIONS } from "@/constants/subjects";
import { buildLessonSubjectCode, getSuggestedSchoolYear } from "@/helper/lesson";

type Props = {
    open: boolean;
    loading: boolean;
    onClose: () => void;
    onSubmit: (payload: CreateLessonProgramPayload) => Promise<void>;
};

const normalizeSubjectName = (value: unknown) => String(
    Array.isArray(value) ? value.at(-1) : value ?? ""
).trim();

const ProgramCreateModal = ({ open, loading, onClose, onSubmit }: Props) => {
    const [form] = Form.useForm<CreateLessonProgramPayload & { school_year: number }>();
    // Chỉ lấy các môn đã có trong cột lessons.subject_name; người dùng vẫn có thể nhập môn mới.
    const subjectOptions = useLessonSubjectOptions(true, false);
    const selectedGrade = Form.useWatch("grade", form);
    const selectedSystemType = Form.useWatch("system_type", form);
    const selectedSubject = Form.useWatch("subject_name", form);
    const selectedSchoolYear = Form.useWatch("school_year", form);

    useEffect(() => {
        if (open) form.resetFields();
    }, [form, open]);

    useEffect(() => {
        if (selectedSystemType === "topuni" && !form.getFieldValue("grade")) {
            form.setFieldValue("grade", 12);
        }
    }, [form, selectedSystemType]);

    useEffect(() => {
        if (!open) return;
        const generatedCode = buildLessonSubjectCode(
            normalizeSubjectName(form.getFieldValue("subject_name")),
            selectedSystemType === "topclass" ? Number(form.getFieldValue("grade")) : undefined,
            Number(form.getFieldValue("school_year"))
        );
        form.setFieldValue("subject_code", generatedCode || undefined);
    }, [form, open, selectedGrade, selectedSchoolYear, selectedSubject, selectedSystemType]);

    return (
        <Modal
            open={open}
            title="Tạo Chương trình mới"
            width={680}
            destroyOnClose
            onCancel={onClose}
            footer={[
                <Button key="cancel" onClick={onClose}>Hủy</Button>,
                <Button key="save" type="primary" loading={loading} onClick={() => form.submit()}>
                    Tạo Chương trình
                </Button>,
            ]}
        >
            <Alert
                showIcon
                type="info"
                style={{ marginBottom: 16 }}
                message="Chương trình được quản lý theo Mã chương trình của đề cương"
                description="Hệ thống hiện lưu Chương trình qua các bài học, vì vậy cần khai báo bài học đầu tiên. Sau khi tạo, bạn có thể tiếp tục thêm hoặc import các bài còn lại."
            />
            <Form
                className="responsive-modal-form"
                form={form}
                layout="vertical"
                initialValues={{ school_year: getSuggestedSchoolYear(), system_type: "topclass" }}
                onFinish={({ school_year: _schoolYear, subject_name, ...values }) => onSubmit({
                    ...values,
                    subject_name: normalizeSubjectName(subject_name),
                })}
            >
                <Row gutter={12}>
                    <Col xs={24} md={7}>
                        <Form.Item name="system_type" label="Hệ thống" rules={[{ required: true }]}> 
                            <Select options={[
                                { value: "topclass", label: "Topclass" },
                                { value: "topuni", label: "Topuni" },
                            ]} />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={7}>
                        <Form.Item
                            name="grade"
                            label="Khối"
                            rules={[{ required: true, message: "Chọn khối" }]}
                        >
                            <Select options={GRADE_OPTIONS} placeholder="Chọn khối" />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={10}>
                        <Form.Item
                            name="subject_name"
                            label="Môn học"
                            rules={[{ required: true, message: "Chọn môn học" }]}
                        >
                            <Select
                                showSearch
                                mode="tags"
                                maxCount={1}
                                optionFilterProp="label"
                                placeholder="Chọn hoặc nhập môn học mới"
                                options={subjectOptions}
                            />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={7}>
                        <Form.Item
                            name="school_year"
                            label="Năm kết thúc"
                            rules={[{ required: true, message: "Nhập năm" }]}
                        >
                            <InputNumber min={2020} max={2100} precision={0} style={{ width: "100%" }} />
                        </Form.Item>
                    </Col>
                </Row>
                <Form.Item
                    name="subject_code"
                    label="Mã chương trình"
                    extra={<Typography.Text type="secondary">Tự sinh từ môn học, {selectedSystemType === "topclass" ? "khối và " : ""}năm kết thúc. Bạn có thể nhập môn mới trực tiếp và sửa mã khi cần.</Typography.Text>}
                    rules={[
                        { required: true, whitespace: true, message: "Nhập Mã chương trình" },
                        { max: 100, message: "Mã chương trình không được quá 100 ký tự" },
                        { pattern: /^[A-Za-z0-9_-]+$/, message: "Chỉ dùng chữ không dấu, số, dấu gạch ngang hoặc gạch dưới" },
                    ]}
                >
                    <Input placeholder="VD: nguvan-6-2027" maxLength={100} />
                </Form.Item>
                <Form.Item
                    name="lesson_name"
                    label="Tên bài học đầu tiên"
                    rules={[
                        { required: true, whitespace: true, message: "Nhập tên bài học đầu tiên" },
                        { max: 400, message: "Tên bài học không được quá 400 ký tự" },
                    ]}
                >
                    <Input placeholder="VD: Đọc hiểu văn bản" maxLength={400} />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default ProgramCreateModal;
