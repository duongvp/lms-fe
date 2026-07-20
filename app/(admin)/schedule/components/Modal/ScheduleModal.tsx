'use client';
import { Modal, Input, Row, Col, Form, Button, Typography, Select } from 'antd';
import { CloseCircleOutlined, SaveOutlined } from '@ant-design/icons';
import React from 'react';

const { Text, Title } = Typography;

const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => {
    return (
        <fieldset
            style={{
                border: `1px solid rgba(0, 0, 0, 0.1)`,
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
                    color: "#000"
                }}
            >
                {title}
            </legend>
            {children}
        </fieldset>
    );
};

interface ScheduleModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: (values: any) => void;
    initialData?: any;
    title?: string;
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({ open, onClose, onSuccess, initialData, title }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = React.useState(false);

    const handleClose = () => {
        form.resetFields();
        onClose();
    };

    const handleFinish = async (values: any) => {
        try {
            setLoading(true);
            // Simulate processing time
            await new Promise((resolve) => setTimeout(resolve, 300));
            onSuccess(values);
            handleClose();
        } catch (error) {
            console.error('Lỗi submit:', error);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        if (open) {
            if (initialData) {
                form.setFieldsValue({ ...initialData });
            } else {
                form.resetFields();
            }
        }
    }, [open, initialData, form]);

    return (
        <Modal
            title={
                <>
                    <Title level={5} style={{ marginBottom: 4 }}>
                        {title || 'Thêm / Cập nhật Lịch học'}
                    </Title>
                    <Text type="secondary" style={{ marginBottom: 0, fontSize: 13, fontWeight: 500 }}>
                        Điền thông tin chi tiết lịch học để dễ quản lý và theo dõi.
                    </Text>
                </>
            }
            open={open}
            onCancel={handleClose}
            onOk={() => form.submit()}
            width={900}
            centered
            footer={[
                <Button key="back" onClick={handleClose} icon={<CloseCircleOutlined />}>
                    Huỷ
                </Button>,
                <Button
                    key="submit"
                    type="primary"
                    onClick={() => form.submit()}
                    icon={<SaveOutlined />}
                    loading={loading}
                >
                    Lưu
                </Button>,
            ]}
        >
            <Form layout="vertical" form={form} onFinish={handleFinish} initialValues={{ status: "Chưa bắt đầu" }}>
                <FormSection title="Thông tin lớp học">
                    <Row gutter={24}>
                        <Col span={8}>
                            <Form.Item label="Mã lớp" name="class_code" rules={[{ required: true, message: 'Nhập mã lớp' }]}>
                                <Input placeholder="Ví dụ: CLASS-001" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label="Tên lớp" name="class_name" rules={[{ required: true, message: 'Nhập tên lớp' }]}>
                                <Input placeholder="Ví dụ: Lớp ReactJS Basic" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label="Môn học" name="subject" rules={[{ required: true, message: 'Nhập môn học' }]}>
                                <Input placeholder="Ví dụ: React Hooks" />
                            </Form.Item>
                        </Col>
                    </Row>
                </FormSection>

                <FormSection title="Chi tiết thời gian & địa điểm">
                    <Row gutter={24}>
                        <Col span={8}>
                            <Form.Item label="Ngày học" name="date" rules={[{ required: true, message: 'Nhập ngày học' }]}>
                                <Input type="date" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label="Giờ học" name="time" rules={[{ required: true, message: 'Nhập giờ học' }]}>
                                <Input placeholder="Ví dụ: 18:00 - 20:00" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label="Phòng học" name="room" rules={[{ required: true, message: 'Chọn phòng học' }]}>
                                <Select options={[
                                    { value: "Phòng 101", label: "Phòng 101" },
                                    { value: "Phòng 102", label: "Phòng 102" },
                                    { value: "Phòng 204", label: "Phòng 204" },
                                    { value: "Phòng Lab A", label: "Phòng Lab A" },
                                ]} placeholder="Chọn phòng" />
                            </Form.Item>
                        </Col>
                    </Row>
                </FormSection>

                <FormSection title="Thông tin quản lý">
                    <Row gutter={24}>
                        <Col span={8}>
                            <Form.Item label="Giáo viên" name="teacher" rules={[{ required: true, message: 'Chọn giáo viên' }]}>
                                <Select options={[
                                    { value: "Nguyễn Văn A", label: "Nguyễn Văn A" },
                                    { value: "Trần Thị B", label: "Trần Thị B" },
                                    { value: "Lê Hoàng C", label: "Lê Hoàng C" },
                                    { value: "Phạm Thảo D", label: "Phạm Thảo D" },
                                ]} placeholder="Chọn giáo viên" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label="Hệ thống" name="system" rules={[{ required: true, message: 'Nhập hệ thống' }]}>
                                <Input placeholder="Ví dụ: LMS-Main" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label="Trạng thái" name="status" rules={[{ required: true, message: 'Chọn trạng thái' }]}>
                                <Select options={[
                                    { value: "Chưa bắt đầu", label: "Chưa bắt đầu" },
                                    { value: "Đang diễn ra", label: "Đang diễn ra" },
                                    { value: "Đã kết thúc", label: "Đã kết thúc" },
                                ]} placeholder="Chọn trạng thái" />
                            </Form.Item>
                        </Col>
                    </Row>
                </FormSection>
            </Form>
        </Modal>
    );
};

export default ScheduleModal;

