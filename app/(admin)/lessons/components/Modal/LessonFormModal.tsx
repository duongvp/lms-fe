"use client";

import React, { useEffect } from "react";
import {
    Button,
    Col,
    Form,
    Input,
    Modal,
    Row,
    Select,
    Tabs,
    Typography,
} from "antd";
import {
    CloseCircleOutlined,
    SaveOutlined,
} from "@ant-design/icons";
import type { ModuleField } from "@/types/fieldPolicy";
import type { LessonApiResponse, LessonPayload } from "@/services/lessonService";
import { GRADE_OPTIONS, SUBJECT_OPTIONS } from "@/constants/subjects";

const { Text, Title } = Typography;

interface LessonDataType extends LessonApiResponse {
    key: string;
}

export const FORM_FIELDS: ModuleField[] = [
    { fieldCode: "grade", fieldLabel: "Khối", fieldType: "select", sortOrder: 1 },
    { fieldCode: "subject_name", fieldLabel: "Môn học", fieldType: "select", sortOrder: 2 },
    { fieldCode: "learn_number", fieldLabel: "Số thứ tự bài", fieldType: "number", sortOrder: 3 },
    { fieldCode: "lesson_name", fieldLabel: "Tên bài học", fieldType: "text", sortOrder: 4 },
    { fieldCode: "lesson_document", fieldLabel: "Tài liệu bài học", fieldType: "textarea", sortOrder: 5 },
    { fieldCode: "lesson_baitap", fieldLabel: "Bài tập", fieldType: "textarea", sortOrder: 6 },
    { fieldCode: "lesson_tomtat", fieldLabel: "Tóm tắt", fieldType: "textarea", sortOrder: 7 },
    { fieldCode: "lesson_phuongphap", fieldLabel: "Phương pháp", fieldType: "textarea", sortOrder: 8 },
    { fieldCode: "lesson_luuy", fieldLabel: "Lưu ý", fieldType: "textarea", sortOrder: 9 },
    { fieldCode: "lesson_ketqua", fieldLabel: "Kết quả", fieldType: "textarea", sortOrder: 10 },
];

export const FIELD_LABELS = Object.fromEntries(
    FORM_FIELDS.map((field) => [field.fieldCode, field.fieldLabel])
);

const emptyToNull = (value?: string | null) => {
    const trimmed = typeof value === "string" ? value.trim() : "";
    return trimmed || null;
};

const toLessonPayload = (values: any): LessonPayload => ({
    grade: Number(values.grade),
    subject_name: String(values.subject_name).trim(),
    lesson_name: String(values.lesson_name).trim(),
    lesson_document: emptyToNull(values.lesson_document),
    lesson_baitap: emptyToNull(values.lesson_baitap),
    lesson_tomtat: emptyToNull(values.lesson_tomtat),
    lesson_phuongphap: emptyToNull(values.lesson_phuongphap),
    lesson_luuy: emptyToNull(values.lesson_luuy),
    lesson_ketqua: emptyToNull(values.lesson_ketqua),
});

const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <fieldset
        style={{
            border: "1px solid rgba(0, 0, 0, 0.1)",
            borderRadius: 6,
            padding: "20px 16px 16px 16px",
            marginBottom: 24,
            backgroundColor: "transparent",
        }}
    >
        <legend
            style={{
                padding: "0 8px",
                marginLeft: 12,
                fontSize: 14,
                fontWeight: 500,
                width: "auto",
                borderBottom: "none",
                marginBottom: 0,
                color: "#000",
            }}
        >
            {title}
        </legend>
        {children}
    </fieldset>
);

interface LessonFormModalProps {
    open: boolean;
    record: LessonDataType | null;
    loading: boolean;
    visibleFieldCodes: string[];
    editableFieldCodes: string[];
    onClose: () => void;
    onSubmit: (values: LessonPayload) => Promise<void>;
}

const LessonFormModal: React.FC<LessonFormModalProps> = ({
    open,
    record,
    loading,
    visibleFieldCodes,
    editableFieldCodes,
    onClose,
    onSubmit,
}) => {
    const [form] = Form.useForm();

    useEffect(() => {
        if (!open) return;
        if (record) {
            form.setFieldsValue(record);
        } else {
            form.resetFields();
        }
    }, [form, open, record]);

    const canView = (fieldCode: string) => visibleFieldCodes.includes(fieldCode);
    const canEdit = (fieldCode: string) => editableFieldCodes.includes(fieldCode);

    return (
        <Modal
            title={
                <>
                    <Title level={5} style={{ marginBottom: 4 }}>
                        {record ? "Cập nhật bài học" : "Thêm bài học"}
                    </Title>
                    <Text type="secondary" style={{ marginBottom: 0, fontSize: 13, fontWeight: 500 }}>
                        {record ? "Chỉnh sửa thông tin nội dung bài học." : "Tạo nội dung bài học dùng chung theo khối và môn học."}
                    </Text>
                </>
            }
            open={open}
            onCancel={onClose}
            width={820}
            centered
            destroyOnClose
            footer={[
                <Button key="cancel" onClick={onClose} icon={<CloseCircleOutlined />}>Hủy</Button>,
                <Button key="save" type="primary" loading={loading} icon={<SaveOutlined />} onClick={() => form.submit()}>
                    Lưu
                </Button>,
            ]}
        >
            <Form form={form} layout="vertical" onFinish={(values) => onSubmit(toLessonPayload(values))}>
                <FormSection title="Thông tin cơ bản">
                    <Row gutter={12}>
                        {canView("grade") && (
                            <Col xs={24} md={record && canView("learn_number") ? 8 : 12}>
                                <Form.Item name="grade" label="Khối" rules={[{ required: true, message: "Chọn khối" }]}>
                                    <Select
                                        disabled={!canEdit("grade")}
                                        options={GRADE_OPTIONS}
                                        placeholder="Chọn khối"
                                    />
                                </Form.Item>
                            </Col>
                        )}

                        {canView("subject_name") && (
                            <Col xs={24} md={record && canView("learn_number") ? 8 : 12}>
                                <Form.Item name="subject_name" label="Môn học" rules={[{ required: true, message: "Chọn môn học" }]}>
                                    <Select
                                        disabled={!canEdit("subject_name")}
                                        options={SUBJECT_OPTIONS}
                                        placeholder="Chọn môn học"
                                        showSearch
                                        optionFilterProp="label"
                                    />
                                </Form.Item>
                            </Col>
                        )}

                        {record && canView("learn_number") && (
                            <Col xs={24} md={8}>
                                <Form.Item name="learn_number" label="Số thứ tự bài">
                                    <Input disabled />
                                </Form.Item>
                            </Col>
                        )}
                    </Row>
                    <Row gutter={12}>
                        {canView("lesson_name") && (
                            <Col xs={24}>
                                <Form.Item name="lesson_name" label="Tên bài học" rules={[{ required: true, message: "Nhập tên bài học" }]}>
                                    <Input
                                        maxLength={400}
                                        disabled={!canEdit("lesson_name")}
                                    />
                                </Form.Item>
                            </Col>
                        )}
                    </Row>
                </FormSection>

                <FormSection title="Nội dung & Tài liệu học tập">
                    <Tabs
                        defaultActiveKey="1"
                        type="card"
                        items={[
                            {
                                key: "1",
                                label: "Tài liệu & Bài tập",
                                children: (
                                    <Row gutter={12} style={{ marginTop: 12 }}>
                                        {canView("lesson_document") && (
                                            <Col xs={24} md={12}>
                                                <Form.Item name="lesson_document" label="Tài liệu bài học">
                                                    <Input.TextArea rows={4} showCount maxLength={500} disabled={!canEdit("lesson_document")} />
                                                </Form.Item>
                                            </Col>
                                        )}
                                        {canView("lesson_baitap") && (
                                            <Col xs={24} md={12}>
                                                <Form.Item name="lesson_baitap" label="Bài tập">
                                                    <Input.TextArea rows={4} showCount maxLength={500} disabled={!canEdit("lesson_baitap")} />
                                                </Form.Item>
                                            </Col>
                                        )}
                                    </Row>
                                ),
                            },
                            {
                                key: "2",
                                label: "Tóm tắt & Phương pháp",
                                children: (
                                    <Row gutter={12} style={{ marginTop: 12 }}>
                                        {canView("lesson_tomtat") && (
                                            <Col xs={24} md={12}>
                                                <Form.Item name="lesson_tomtat" label="Tóm tắt">
                                                    <Input.TextArea rows={4} showCount maxLength={500} disabled={!canEdit("lesson_tomtat")} />
                                                </Form.Item>
                                            </Col>
                                        )}
                                        {canView("lesson_phuongphap") && (
                                            <Col xs={24} md={12}>
                                                <Form.Item name="lesson_phuongphap" label="Phương pháp">
                                                    <Input.TextArea rows={4} showCount maxLength={500} disabled={!canEdit("lesson_phuongphap")} />
                                                </Form.Item>
                                            </Col>
                                        )}
                                    </Row>
                                ),
                            },
                            {
                                key: "3",
                                label: "Lưu ý & Kết quả",
                                children: (
                                    <Row gutter={12} style={{ marginTop: 12 }}>
                                        {canView("lesson_luuy") && (
                                            <Col xs={24} md={12}>
                                                <Form.Item name="lesson_luuy" label="Lưu ý">
                                                    <Input.TextArea rows={4} showCount maxLength={500} disabled={!canEdit("lesson_luuy")} />
                                                </Form.Item>
                                            </Col>
                                        )}
                                        {canView("lesson_ketqua") && (
                                            <Col xs={24} md={12}>
                                                <Form.Item name="lesson_ketqua" label="Kết quả">
                                                    <Input.TextArea rows={4} showCount maxLength={500} disabled={!canEdit("lesson_ketqua")} />
                                                </Form.Item>
                                            </Col>
                                        )}
                                    </Row>
                                ),
                            },
                        ]}
                    />
                </FormSection>
            </Form>
        </Modal>
    );
};

export default LessonFormModal;
