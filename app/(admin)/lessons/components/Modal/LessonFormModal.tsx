"use client";

import React, { useEffect } from "react";
import {
    Button,
    Col,
    Form,
    Input,
    InputNumber,
    Modal,
    Row,
    Typography,
} from "antd";
import {
    CloseCircleOutlined,
    SaveOutlined,
} from "@ant-design/icons";
import type { ModuleField } from "@/types/fieldPolicy";
import type { LessonApiResponse, LessonPayload } from "@/services/lessonService";

const { Text, Title } = Typography;

interface LessonDataType extends LessonApiResponse {
    key: string;
}

export const FORM_FIELDS: ModuleField[] = [
    { fieldCode: "learn_number", fieldLabel: "Số thứ tự bài", fieldType: "number", sortOrder: 1 },
    { fieldCode: "lesson_name", fieldLabel: "Tên bài học", fieldType: "text", sortOrder: 2 },
];

export const FIELD_LABELS = Object.fromEntries(
    FORM_FIELDS.map((field) => [field.fieldCode, field.fieldLabel])
);

const toLessonPayload = (values: any): LessonPayload => ({
    grade: Number(values.grade),
    subject_code: String(values.subject_code).trim(),
    subject_name: String(values.subject_name).trim(),
    lesson_name: String(values.lesson_name).trim(),
});

export const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
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
    programContext: {
        grade?: number;
        subject_code?: string;
        subject_name?: string;
    };
    onClose: () => void;
    onSubmit: (values: LessonPayload) => Promise<void>;
}

const LessonFormModal: React.FC<LessonFormModalProps> = ({
    open,
    record,
    loading,
    visibleFieldCodes,
    editableFieldCodes,
    programContext,
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
            form.setFieldsValue(programContext);
        }
    }, [form, open, record, programContext.grade, programContext.subject_code, programContext.subject_name]);

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
            styles={{ body: { maxHeight: "calc(100vh - 210px)", overflowY: "auto" } }}
            footer={[
                <Button key="cancel" onClick={onClose} icon={<CloseCircleOutlined />}>Hủy</Button>,
                <Button key="save" type="primary" loading={loading} icon={<SaveOutlined />} onClick={() => form.submit()}>
                    Lưu
                </Button>,
            ]}
        >
            <Form
                className="responsive-modal-form"
                form={form}
                layout="vertical"
                onFinish={(values) => onSubmit(toLessonPayload(values))}
            >
                <FormSection title="Thông tin cơ bản">
                    <Form.Item name="grade" hidden><InputNumber /></Form.Item>
                    <Form.Item name="subject_name" hidden><Input /></Form.Item>
                    <Form.Item name="subject_code" hidden><Input /></Form.Item>
                    <Row gutter={12}>
                        {record && canView("learn_number") && (
                            <Col xs={24} md={4}>
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

                {/* <FormSection title="Nội dung & Tài liệu học tập">
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
                                            <Col xs={24}>
                                                <Form.Item label="Danh sách tài liệu" style={{ marginBottom: 8 }}>
                                                    <Form.List name="lesson_documents">
                                                        {(fields, { add, remove }) => (
                                                            <Space direction="vertical" style={{ width: "100%" }} size={8}>
                                                                {fields.map(({ key, name, ...restField }) => (
                                                                    <Row key={key} gutter={8} align="middle">
                                                                        <Col xs={24} md={7}>
                                                                            <Form.Item
                                                                                {...restField}
                                                                                name={[name, "title"]}
                                                                                rules={[{ required: true, message: "Nhập tiêu đề" }]}
                                                                                style={{ marginBottom: 0 }}
                                                                            >
                                                                                <Input placeholder="Tiêu đề, ví dụ Phiếu học tập" disabled={!canEdit("lesson_document")} />
                                                                            </Form.Item>
                                                                        </Col>
                                                                        <Col xs={24} md={4}>
                                                                            <Form.Item
                                                                                {...restField}
                                                                                name={[name, "type"]}
                                                                                initialValue="pdf"
                                                                                style={{ marginBottom: 0 }}
                                                                            >
                                                                                <Select
                                                                                    disabled={!canEdit("lesson_document")}
                                                                                    options={[
                                                                                        { value: "pdf", label: "PDF" },
                                                                                        { value: "video", label: "Video" },
                                                                                        { value: "scorm", label: "SCORM" },
                                                                                        { value: "link", label: "Link" },
                                                                                    ]}
                                                                                />
                                                                            </Form.Item>
                                                                        </Col>
                                                                        <Col xs={22} md={11}>
                                                                            <Form.Item
                                                                                {...restField}
                                                                                name={[name, "link"]}
                                                                                rules={[{ required: true, message: "Nhập đường dẫn" }]}
                                                                                style={{ marginBottom: 0 }}
                                                                            >
                                                                                <Input placeholder="https://..." disabled={!canEdit("lesson_document")} />
                                                                            </Form.Item>
                                                                        </Col>
                                                                        <Col xs={2} md={2}>
                                                                            <Button
                                                                                danger
                                                                                type="text"
                                                                                icon={<DeleteOutlined />}
                                                                                disabled={!canEdit("lesson_document")}
                                                                                onClick={() => remove(name)}
                                                                            />
                                                                        </Col>
                                                                    </Row>
                                                                ))}
                                                                {canEdit("lesson_document") && (
                                                                    <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ type: "pdf" })} block>
                                                                        Thêm tài liệu
                                                                    </Button>
                                                                )}
                                                            </Space>
                                                        )}
                                                    </Form.List>
                                                </Form.Item>
                                            </Col>
                                        )}
                                        {canView("evg_banner") && (
                                            <Col xs={24}>
                                                <Form.Item name="evg_banner" label="Banner">
                                                    <Input maxLength={500} placeholder="https://..." disabled={!canEdit("evg_banner")} />
                                                </Form.Item>
                                            </Col>
                                        )}
                                        {canView("evg_stream") && (
                                            <Col xs={24} md={12}>
                                                <Form.Item name="evg_stream" label="EVG Stream">
                                                    <Input maxLength={500} disabled={!canEdit("evg_stream")} />
                                                </Form.Item>
                                            </Col>
                                        )}
                                        {canView("lesson_link") && (
                                            <Col xs={24} md={12}>
                                                <Form.Item name="lesson_link" label="Link bài học">
                                                    <Input maxLength={500} placeholder="https://..." disabled={!canEdit("lesson_link")} />
                                                </Form.Item>
                                            </Col>
                                        )}
                                        {canView("lesson_baitap") && (
                                            <Col xs={24}>
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
                </FormSection> */}
            </Form>
        </Modal>
    );
};

export default LessonFormModal;
