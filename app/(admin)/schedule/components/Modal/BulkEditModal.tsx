'use client';

import React, { useEffect } from 'react';
import {
    Modal,
    Form,
    Radio,
    Select,
    InputNumber,
    TimePicker,
    Checkbox,
    Row,
    Col,
    Button,
    Typography,
    Space,
    Alert,
    Divider,
    Tag,
    Card,
    Input,
} from 'antd';
import { EditOutlined, CloseCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <fieldset
        style={{
            border: `1px solid rgba(0, 0, 0, 0.1)`,
            borderRadius: 6,
            padding: "20px 16px 16px 16px",
            marginBottom: 20,
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
                color: "#1890ff"
            }}
        >
            {title}
        </legend>
        {children}
    </fieldset>
);

const TEACHER_OPTIONS = [
    { label: "Nguyễn Văn A", value: "Nguyễn Văn A" },
    { label: "Trần Thị B", value: "Trần Thị B" },
    { label: "Lê Hoàng C", value: "Lê Hoàng C" },
    { label: "Phạm Thảo D", value: "Phạm Thảo D" },
];

const ROOM_OPTIONS = [
    { label: "Phòng 101 - Lý Thuyết", value: "Phòng 101" },
    { label: "Phòng 202 - Lab Máy Tính", value: "Phòng 202" },
    { label: "Phòng Online - Zoom 01", value: "Zoom 01" },
];

interface BulkEditModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: (updatedData: any) => void;
    selectedRowKeys?: React.Key[]; // Danh sách ID/Bài học đã chọn từ Bảng
}

export const BulkEditModal: React.FC<BulkEditModalProps> = ({
    open,
    onClose,
    onSuccess,
    selectedRowKeys = [],
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = React.useState(false);

    // Form Watchers
    const editScope = Form.useWatch('edit_scope', form) || 'selected_rows';
    const configMode = Form.useWatch('config_mode', form) || 'common';
    const selectedLessons = Form.useWatch('selected_lessons', form) || selectedRowKeys;

    // Tự động set giá trị mặc định khi mở Modal
    useEffect(() => {
        if (open) {
            const hasSelectedRows = selectedRowKeys.length > 0;
            form.setFieldsValue({
                edit_scope: hasSelectedRows ? 'selected_rows' : 'range',
                config_mode: 'common',
                selected_lessons: selectedRowKeys,
            });
        }
    }, [open, selectedRowKeys, form]);

    const handleClose = () => {
        form.resetFields();
        onClose();
    };

    const handleFinish = async (values: any) => {
        try {
            setLoading(true);

            // Chuẩn hóa separate_config (Format TimePicker dayjs -> "HH:mm")
            let formattedSeparateConfig = values.separate_config;
            if (values.edit_scope === 'selected_rows' && values.config_mode === 'separate' && values.separate_config) {
                formattedSeparateConfig = {};
                Object.keys(values.separate_config).forEach(key => {
                    const config = values.separate_config[key];
                    formattedSeparateConfig[key] = {
                        ...config,
                        start_time: config.start_time ? dayjs(config.start_time).format('HH:mm') : undefined,
                        end_time: config.end_time ? dayjs(config.end_time).format('HH:mm') : undefined,
                    };
                });
            }

            const payload = {
                scope: {
                    type: values.edit_scope,
                    selected_lessons: values.edit_scope === 'selected_rows' ? values.selected_lessons : undefined,
                    start_lesson: values.start_lesson,
                    end_lesson: values.end_lesson,
                    pattern_type: values.pattern_type,
                },
                config_mode: values.edit_scope === 'selected_rows' ? values.config_mode : 'common',
                common_config: values.config_mode === 'common' || values.edit_scope !== 'selected_rows' ? {
                    teacher: values.enable_teacher ? values.common_teacher : undefined,
                    room: values.enable_room ? values.common_room : undefined,
                    start_time: values.enable_time && values.common_start_time ? dayjs(values.common_start_time).format('HH:mm') : undefined,
                    end_time: values.enable_time && values.common_end_time ? dayjs(values.common_end_time).format('HH:mm') : undefined,
                } : undefined,
                separate_config: formattedSeparateConfig,
            };

            onSuccess(payload);
            handleClose();
        } catch (err) {
            console.error("Lỗi cập nhật hàng loạt:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title={
                <div>
                    <Title level={5} style={{ marginBottom: 0 }}>Cập Nhật Lịch Học Hàng Loạt</Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Điều chỉnh Giáo viên, Khung giờ và Phòng học cho nhiều bài học cùng lúc.
                    </Text>
                </div>
            }
            open={open}
            onCancel={handleClose}
            width={850}
            centered
            footer={[
                <Button key="cancel" onClick={handleClose} icon={<CloseCircleOutlined />}>
                    Hủy
                </Button>,
                <Button
                    key="submit"
                    type="primary"
                    onClick={() => form.submit()}
                    loading={loading}
                    icon={<EditOutlined />}
                >
                    Áp dụng thay đổi
                </Button>
            ]}
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleFinish}
                initialValues={{
                    edit_scope: 'selected_rows',
                    config_mode: 'common',
                    pattern_type: 'even',
                    enable_teacher: true,
                    enable_time: true,
                    enable_room: false,
                }}
            >
                {/* SECTION 1: PHẠM VI ÁP DỤNG */}
                <FormSection title="1. Chọn Phạm Vi Bài Học Muốn Cập Nhật">
                    <Form.Item name="edit_scope" style={{ marginBottom: 16 }}>
                        <Radio.Group buttonStyle="solid" style={{ width: '100%' }}>
                            <Row gutter={[8, 8]}>
                                <Col span={12}>
                                    <Radio.Button value="selected_rows" style={{ width: '100%', textAlign: 'center' }}>
                                        1. Theo các dòng đã tích chọn ({selectedRowKeys.length})
                                    </Radio.Button>
                                </Col>
                                <Col span={12}>
                                    <Radio.Button value="from_to_end" style={{ width: '100%', textAlign: 'center' }}>
                                        2. Từ Bài X đổi đến hết
                                    </Radio.Button>
                                </Col>
                                <Col span={12}>
                                    <Radio.Button value="range" style={{ width: '100%', textAlign: 'center' }}>
                                        3. Đổi trong khoảng (Từ X đến Y)
                                    </Radio.Button>
                                </Col>
                                <Col span={12}>
                                    <Radio.Button value="pattern" style={{ width: '100%', textAlign: 'center' }}>
                                        4. Đổi theo Bài Chẵn / Lẻ
                                    </Radio.Button>
                                </Col>
                            </Row>
                        </Radio.Group>
                    </Form.Item>

                    {/* Case 1: Chọn trực tiếp các dòng từ Bảng */}
                    {editScope === 'selected_rows' && (
                        <div>
                            <Form.Item
                                label="Danh sách bài học được chọn:"
                                name="selected_lessons"
                                rules={[{ required: true, message: 'Vui lòng chọn ít nhất 1 bài học!' }]}
                            >
                                <Select
                                    mode="multiple"
                                    placeholder="Chưa chọn bài nào từ bảng"
                                    options={Array.from({ length: 30 }, (_, i) => ({
                                        label: `Bài ${i + 1}`,
                                        value: i + 1,
                                    }))}
                                    style={{ width: '100%' }}
                                />
                            </Form.Item>
                        </div>
                    )}

                    {/* Case 2: Từ bài X đến hết */}
                    {editScope === 'from_to_end' && (
                        <Row gutter={16} align="middle">
                            <Col span={12}>
                                <Form.Item
                                    label="Bắt đầu từ Bài số"
                                    name="start_lesson"
                                    rules={[{ required: true, message: 'Nhập bài bắt đầu' }]}
                                >
                                    <InputNumber min={1} style={{ width: '100%' }} placeholder="VD: 5" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Text type="secondary">
                                    → Sẽ áp dụng thay đổi từ <b>Bài này đến hết khóa học</b>.
                                </Text>
                            </Col>
                        </Row>
                    )}

                    {/* Case 3: Trong khoảng từ Bài X đến Bài Y */}
                    {editScope === 'range' && (
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    label="Từ Bài số"
                                    name="start_lesson"
                                    rules={[{ required: true, message: 'Nhập bài bắt đầu' }]}
                                >
                                    <InputNumber min={1} style={{ width: '100%' }} placeholder="VD: 5" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    label="Đến Bài số"
                                    name="end_lesson"
                                    rules={[{ required: true, message: 'Nhập bài kết thúc' }]}
                                >
                                    <InputNumber min={1} style={{ width: '100%' }} placeholder="VD: 20" />
                                </Form.Item>
                            </Col>
                        </Row>
                    )}

                    {/* Case 4: Bài Chẵn / Lẻ */}
                    {editScope === 'pattern' && (
                        <Form.Item label="Chọn quy luật áp dụng" name="pattern_type">
                            <Radio.Group>
                                <Radio value="even">Tất cả bài CHẴN (2, 4, 6...)</Radio>
                                <Radio value="odd">Tất cả bài LẺ (1, 3, 5...)</Radio>
                            </Radio.Group>
                        </Form.Item>
                    )}
                </FormSection>

                {/* SECTION 2: THÔNG TIN CẦN CẬP NHẬT */}
                <FormSection title="2. Thông Tin Cần Cập Nhật">
                    {/* CHỈ HIỂN THỊ LỰA CHỌN CẤU HÌNH CHUNG / RIÊNG CHO PHẠM VI 1 (SELECTED ROWS) */}
                    {editScope === 'selected_rows' && (
                        <div style={{ marginBottom: 16 }}>
                            <Form.Item name="config_mode" style={{ marginBottom: 0 }}>
                                <Radio.Group value={configMode}>
                                    <Radio value="common">Dùng chung cấu hình cho tất cả bài đã chọn</Radio>
                                    <Radio value="separate">Cấu hình riêng cho từng bài đã chọn</Radio>
                                </Radio.Group>
                            </Form.Item>
                        </div>
                    )}

                    {/* CHẾ ĐỘ 1: CẤU HÌNH CHUNG (Áp dụng cho Phạm vi 2, 3, 4 hoặc Phạm vi 1 chọn 'common') */}
                    {(editScope !== 'selected_rows' || configMode === 'common') && (
                        <Card size="small" style={{ background: '#fafafa', borderRadius: 8 }}>
                            <Alert
                                message="Tích chọn các ô dưới đây để xác định thông tin cần ghi đè."
                                type="info"
                                showIcon
                                style={{ marginBottom: 16 }}
                            />

                            {/* Tùy chọn Giáo viên */}
                            <Row gutter={16} align="middle" style={{ marginBottom: 12 }}>
                                <Col span={8}>
                                    <Form.Item name="enable_teacher" valuePropName="checked" style={{ marginBottom: 0 }}>
                                        <Checkbox><Text strong>Đổi Giáo viên</Text></Checkbox>
                                    </Form.Item>
                                </Col>
                                <Col span={16}>
                                    <Form.Item
                                        name="common_teacher"
                                        style={{ marginBottom: 0 }}
                                        rules={[{ required: form.getFieldValue('enable_teacher'), message: 'Chọn giáo viên' }]}
                                    >
                                        <Select
                                            placeholder="Chọn giáo viên mới"
                                            options={TEACHER_OPTIONS}
                                            disabled={!form.getFieldValue('enable_teacher')}
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Divider style={{ margin: '12px 0' }} />

                            {/* Tùy chọn Khung giờ */}
                            <Row gutter={16} align="middle" style={{ marginBottom: 12 }}>
                                <Col span={8}>
                                    <Form.Item name="enable_time" valuePropName="checked" style={{ marginBottom: 0 }}>
                                        <Checkbox><Text strong>Đổi Khung giờ</Text></Checkbox>
                                    </Form.Item>
                                </Col>
                                <Col span={8}>
                                    <Form.Item name="common_start_time" style={{ marginBottom: 0 }}>
                                        <TimePicker format="HH:mm" style={{ width: '100%' }} placeholder="Giờ bắt đầu" />
                                    </Form.Item>
                                </Col>
                                <Col span={8}>
                                    <Form.Item name="common_end_time" style={{ marginBottom: 0 }}>
                                        <TimePicker format="HH:mm" style={{ width: '100%' }} placeholder="Giờ kết thúc" />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Divider style={{ margin: '12px 0' }} />

                            {/* Tùy chọn Phòng học */}
                            <Row gutter={16} align="middle">
                                <Col span={8}>
                                    <Form.Item name="enable_room" valuePropName="checked" style={{ marginBottom: 0 }}>
                                        <Checkbox><Text strong>Đổi Phòng học</Text></Checkbox>
                                    </Form.Item>
                                </Col>
                                <Col span={16}>
                                    <Form.Item name="common_room" style={{ marginBottom: 0 }}>
                                        <Select placeholder="Chọn phòng học" options={ROOM_OPTIONS} />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </Card>
                    )}

                    {/* CHẾ ĐỘ 2: CẤU HÌNH RIÊNG CHO TỪNG BÀI (Chỉ xuất hiện ở Phạm vi 1 & chọn 'separate') */}
                    {editScope === 'selected_rows' && configMode === 'separate' && (
                        <div style={{ background: '#fafafa', padding: 16, borderRadius: 8, border: '1px solid #f0f0f0' }}>
                            <Text strong style={{ display: 'block', marginBottom: 16, color: '#1890ff' }}>
                                Điền cấu hình điều chỉnh chi tiết cho từng bài học:
                            </Text>

                            {Array.isArray(selectedLessons) && selectedLessons.length > 0 ? (
                                (selectedLessons as (string | number)[]).map((lessonKey) => (
                                    <Card
                                        key={lessonKey}
                                        size="small"
                                        title={<Tag color="blue" style={{ fontSize: 13, padding: '2px 8px' }}>Bài số {lessonKey}</Tag>}
                                        style={{ marginBottom: 12, borderRadius: 6 }}
                                    >
                                        <Row gutter={12}>
                                            <Col span={6}>
                                                <Form.Item
                                                    label="Giờ bắt đầu"
                                                    name={['separate_config', lessonKey, 'start_time']}
                                                    style={{ marginBottom: 0 }}
                                                >
                                                    <TimePicker format="HH:mm" style={{ width: '100%' }} placeholder="HH:mm" />
                                                </Form.Item>
                                            </Col>
                                            <Col span={6}>
                                                <Form.Item
                                                    label="Giờ kết thúc"
                                                    name={['separate_config', lessonKey, 'end_time']}
                                                    style={{ marginBottom: 0 }}
                                                >
                                                    <TimePicker format="HH:mm" style={{ width: '100%' }} placeholder="HH:mm" />
                                                </Form.Item>
                                            </Col>
                                            <Col span={6}>
                                                <Form.Item
                                                    label="Giáo viên"
                                                    name={['separate_config', lessonKey, 'teacher']}
                                                    style={{ marginBottom: 0 }}
                                                >
                                                    <Select options={TEACHER_OPTIONS} placeholder="Chọn giáo viên" />
                                                </Form.Item>
                                            </Col>
                                            <Col span={6}>
                                                <Form.Item
                                                    label="Phòng học"
                                                    name={['separate_config', lessonKey, 'room']}
                                                    style={{ marginBottom: 0 }}
                                                >
                                                    <Select options={ROOM_OPTIONS} placeholder="Chọn phòng" />
                                                </Form.Item>
                                            </Col>
                                        </Row>
                                    </Card>
                                ))
                            ) : (
                                <Text type="secondary">Vui lòng chọn ít nhất 1 bài học từ Bảng ở trên.</Text>
                            )}
                        </div>
                    )}
                </FormSection>
            </Form>
        </Modal>
    );
};

export default BulkEditModal;