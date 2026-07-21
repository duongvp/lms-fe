'use client';
import { Modal, Input, Row, Col, Form, Button, Typography, Select, Radio, Checkbox, Card, TimePicker, DatePicker } from 'antd';
import { CloseCircleOutlined, SaveOutlined } from '@ant-design/icons';
import React, { useState } from 'react';
import { normalizeSchedulePayload } from '@/helper/convertDate';
import {
    createLivestream,
    createLivestreamBulk,
    toBulkLivestreamPayload,
    toLivestreamPayload,
    updateLivestream,
    cancelLivestream,
    toUpdateLivestreamPayload
} from '@/services/livestreamService';

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

const DAYS_OPTIONS = [
    { label: 'Thứ 2', value: 2 },
    { label: 'Thứ 3', value: 3 },
    { label: 'Thứ 4', value: 4 },
    { label: 'Thứ 5', value: 5 },
    { label: 'Thứ 6', value: 6 },
    { label: 'Thứ 7', value: 7 },
    { label: 'Chủ Nhật', value: 1 },
];

const TEACHER_OPTIONS = [
    { value: "Nguyễn Văn A", label: "Nguyễn Văn A" },
    { value: "Trần Thị B", label: "Trần Thị B" },
    { value: "Lê Hoàng C", label: "Lê Hoàng C" },
    { value: "Phạm Thảo D", label: "Phạm Thảo D" },
];

const ScheduleModal: React.FC<ScheduleModalProps> = ({ open, onClose, onSuccess, initialData, title }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    // For Add
    const [addMode, setAddMode] = useState<"single" | "bulk">("single");
    const [bulkConfigMode, setBulkConfigMode] = useState<"common" | "separate">("common");

    // For Update
    const [updateMode, setUpdateMode] = useState<"current" | "following" | "cancel">("current");

    const isEdit = true;

    const selectedDays = Form.useWatch('days_of_week', form) || [];

    const handleClose = () => {
        form.resetFields();
        setAddMode("single");
        setBulkConfigMode("common");
        setUpdateMode("current");
        onClose();
    };

    const handleFinish = async (values: any) => {
        try {
            setLoading(true);
            let finalValues = { ...values };
            if (!isEdit) {
                finalValues.addMode = addMode;
                if (addMode === 'bulk') {
                    finalValues.bulkConfigMode = bulkConfigMode;
                }
            } else {
                finalValues.update_mode = updateMode;
                if (updateMode === 'cancel') {
                    finalValues.lesson_status = 1; // 1 for cancel
                } else if (updateMode === 'following') {
                    finalValues.lesson_status = 1;
                }
            }

            console.log("finalValues", finalValues)

            if (!isEdit) {
                if (addMode === 'bulk') {
                    await createLivestreamBulk(toBulkLivestreamPayload(finalValues));
                } else {
                    await createLivestream(toLivestreamPayload(finalValues));
                }
            } else {
                const updatePayload = toUpdateLivestreamPayload(finalValues);
                const id = initialData?.id || initialData?.key;
                if (updateMode === 'cancel') {
                    await cancelLivestream(id);
                } else {
                    await updateLivestream(id, updatePayload);
                }
            }

            const normalizedValues = normalizeSchedulePayload(finalValues);
            console.log("normalizedValues", normalizedValues)
            onSuccess(normalizedValues);
            handleClose();
        } catch (error) {
            console.error('Lỗi submit:', error);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        if (open) {
            if (isEdit) {
                form.setFieldsValue({ ...initialData, update_mode: 'current' });
                setUpdateMode("current");
            } else {
                form.resetFields();
                setAddMode("single");
                setBulkConfigMode("common");
            }
        }
    }, [open, initialData, form, isEdit]);

    return (
        <Modal
            title={
                <>
                    <Title level={5} style={{ marginBottom: 4 }}>
                        {title || (isEdit ? 'Cập nhật Lịch học' : 'Thêm mới Lịch học')}
                    </Title>
                    <Text type="secondary" style={{ marginBottom: 0, fontSize: 13, fontWeight: 500 }}>
                        {isEdit ? 'Chỉnh sửa thông tin hoặc dời lịch học.' : 'Điền thông tin chi tiết để tạo lịch học mới.'}
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
            {!isEdit && (
                <div style={{ marginBottom: 24 }}>
                    <Radio.Group
                        value={addMode}
                        onChange={(e) => setAddMode(e.target.value)}
                        buttonStyle="solid"
                    >
                        <Radio.Button value="single">Thêm 1 buổi</Radio.Button>
                        <Radio.Button value="bulk">Thêm nhiều lịch tự động</Radio.Button>
                    </Radio.Group>
                </div>
            )}

            {isEdit && (
                <div style={{ marginBottom: 24 }}>
                    <Radio.Group
                        value={updateMode}
                        onChange={(e) => {
                            setUpdateMode(e.target.value);
                            form.setFieldsValue({ update_mode: e.target.value });
                        }}
                        buttonStyle="solid"
                    >
                        <Radio.Button value="current">Chỉ cập nhật buổi hiện tại</Radio.Button>
                        <Radio.Button value="following">Nghỉ học & Dời lịch</Radio.Button>
                        <Radio.Button value="cancel">Nghỉ học (Không dời)</Radio.Button>
                    </Radio.Group>
                </div>
            )}

            <Form layout="vertical" form={form} onFinish={handleFinish} initialValues={{ status: "Chưa bắt đầu" }}>

                {/* Form fields for Single Add and Current Update */}
                {((!isEdit && addMode === 'single') || (isEdit && updateMode === 'current')) && (
                    <>
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
                                    <Form.Item label="Môn học / Mã bài" name="subject" rules={[{ required: true, message: 'Nhập môn học' }]}>
                                        <Input placeholder="Ví dụ: React Hooks" />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </FormSection>

                        <FormSection title="Chi tiết thời gian & địa điểm">
                            <Row gutter={24}>
                                <Col span={8}>
                                    <Form.Item label="Ngày học" name="date" rules={[{ required: true, message: 'Nhập ngày học' }]}>
                                        <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="DD/MM/YYYY" />
                                    </Form.Item>
                                </Col>
                                <Col span={8}>
                                    <Form.Item label="Thời gian bắt đầu" name="start_time" rules={[{ required: true, message: 'Nhập giờ bắt đầu' }]}>
                                        <TimePicker format="HH:mm" style={{ width: '100%' }} placeholder="HH:mm" />
                                    </Form.Item>
                                </Col>
                                <Col span={8}>
                                    <Form.Item label="Thời gian kết thúc" name="end_time" rules={[{ required: true, message: 'Nhập giờ kết thúc' }]}>
                                        <TimePicker format="HH:mm" style={{ width: '100%' }} placeholder="HH:mm" />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </FormSection>

                        <FormSection title="Thông tin quản lý">
                            <Row gutter={24}>
                                <Col span={8}>
                                    <Form.Item label="Giáo viên" name="teacher" rules={[{ required: true, message: 'Chọn giáo viên' }]}>
                                        <Select options={TEACHER_OPTIONS} placeholder="Chọn giáo viên" />
                                    </Form.Item>
                                </Col>
                                <Col span={8}>
                                    <Form.Item label="Hệ thống" name="system_type" rules={[{ required: true, message: 'Nhập hệ thống' }]}>
                                        <Input placeholder="Ví dụ: topclass" />
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
                    </>
                )}

                {/* Form fields for Bulk Add */}
                {!isEdit && addMode === 'bulk' && (
                    <>
                        <FormSection title="Cấu hình lịch tự động">
                            <Row gutter={24}>
                                <Col span={12}>
                                    <Form.Item label="Ngày bắt đầu" name="bulk_start_date" rules={[{ required: true, message: 'Chọn ngày bắt đầu' }]}>
                                        <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="DD/MM/YYYY" />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item label="Ngày kết thúc" name="bulk_end_date" rules={[{ required: true, message: 'Chọn ngày kết thúc' }]}>
                                        <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="DD/MM/YYYY" />
                                    </Form.Item>
                                </Col>
                                <Col span={24}>
                                    <Form.Item
                                        label={
                                            <div >
                                                <Checkbox
                                                    indeterminate={
                                                        selectedDays.length > 0 && selectedDays.length < DAYS_OPTIONS.length
                                                    }
                                                    onChange={(e) => {
                                                        const allValues = DAYS_OPTIONS.map((d) => d.value);
                                                        form.setFieldsValue({
                                                            days_of_week: e.target.checked ? allValues : [],
                                                        });
                                                    }}
                                                    checked={
                                                        selectedDays.length === DAYS_OPTIONS.length && DAYS_OPTIONS.length > 0
                                                    }
                                                >
                                                    <span>Các ngày học trong tuần (Chọn tất cả)</span>
                                                </Checkbox>
                                            </div>
                                        }
                                        required
                                        style={{ marginBottom: 8 }}
                                    >
                                        <Form.Item
                                            name="days_of_week"
                                            noStyle
                                            rules={[{ required: true, message: 'Chọn ít nhất 1 ngày' }]}
                                        >
                                            <Checkbox.Group options={DAYS_OPTIONS} style={{ marginLeft: 11 }} />
                                        </Form.Item>
                                    </Form.Item>
                                </Col>
                                {/* <Col span={24}>
                                    <Form.Item label="Các ngày học trong tuần" name="days_of_week" rules={[{ required: true, message: 'Chọn ít nhất 1 ngày' }]}>
                                        <Checkbox.Group options={DAYS_OPTIONS} />
                                    </Form.Item>
                                </Col> */}
                            </Row>
                            <Row gutter={24}>
                                <Col span={8}>
                                    <Form.Item label="Mã khóa học / Lớp" name="bulk_code" rules={[{ required: true, message: 'Nhập mã khóa học' }]}>
                                        <Input placeholder="Ví dụ: toan-6" />
                                    </Form.Item>
                                </Col>
                                <Col span={8}>
                                    <Form.Item label="Hệ thống" name="bulk_system_type" rules={[{ required: true, message: 'Nhập hệ thống' }]}>
                                        <Input placeholder="Ví dụ: topclass" />
                                    </Form.Item>
                                </Col>
                                <Col span={8}>
                                    <Form.Item label="Bài học bắt đầu (Lesson Start)" name="bulk_learn_number" rules={[{ required: true, message: 'Nhập số bài bắt đầu' }]}>
                                        <Input type="number" placeholder="Ví dụ: 1" />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <div style={{ marginBottom: 16 }}>
                                <Radio.Group value={bulkConfigMode} onChange={(e) => setBulkConfigMode(e.target.value)}>
                                    <Radio value="common">Dùng chung cấu hình cho tất cả các ngày</Radio>
                                    <Radio value="separate">Cấu hình riêng theo từng ngày</Radio>
                                </Radio.Group>
                            </div>

                            {bulkConfigMode === 'common' && (
                                <Card size="small" title="Cấu hình chung" style={{ background: '#fafafa', marginBottom: 16 }}>
                                    <Row gutter={24}>
                                        <Col span={8}>
                                            <Form.Item label="Giờ bắt đầu" name="bulk_start_time" rules={[{ required: true, message: 'Nhập giờ bắt đầu' }]}>
                                                <TimePicker format="HH:mm" style={{ width: '100%' }} placeholder="HH:mm" />
                                            </Form.Item>
                                        </Col>
                                        <Col span={8}>
                                            <Form.Item label="Giờ kết thúc" name="bulk_end_time" rules={[{ required: true, message: 'Nhập giờ kết thúc' }]}>
                                                <TimePicker format="HH:mm" style={{ width: '100%' }} placeholder="HH:mm" />
                                            </Form.Item>
                                        </Col>
                                        <Col span={8}>
                                            <Form.Item label="Giáo viên" name="bulk_teacher" rules={[{ required: true, message: 'Chọn giáo viên' }]}>
                                                <Select options={TEACHER_OPTIONS} placeholder="Chọn giáo viên" />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                </Card>
                            )}

                            {bulkConfigMode === 'separate' && (
                                <div style={{ background: '#fafafa', padding: 16, borderRadius: 8, border: '1px solid #f0f0f0' }}>
                                    <Text strong style={{ display: 'block', marginBottom: 16 }}>Cấu hình riêng cho từng ngày</Text>
                                    {selectedDays && selectedDays.length > 0 ? (
                                        selectedDays.map((dayValue: number) => {
                                            const dayLabel = DAYS_OPTIONS.find(d => d.value === dayValue)?.label;
                                            return (
                                                <Row gutter={24} key={dayValue} style={{ marginBottom: 8, alignItems: 'center' }}>
                                                    <Col span={4}>
                                                        <Text strong>{dayLabel}</Text>
                                                    </Col>
                                                    <Col span={6}>
                                                        <Form.Item name={['separate_config', dayValue, 'start_time']} rules={[{ required: true, message: 'Nhập giờ bắt đầu' }]} style={{ marginBottom: 8 }}>
                                                            {/* <Input type="time" placeholder="Giờ bắt đầu" /> */}
                                                            <DatePicker
                                                                format="HH:mm"
                                                                picker="time"
                                                                placeholder="Giờ bắt đầu HH:mm"
                                                                style={{ width: '100%' }}
                                                            />
                                                        </Form.Item>
                                                    </Col>
                                                    <Col span={6}>
                                                        <Form.Item name={['separate_config', dayValue, 'end_time']} rules={[{ required: true, message: 'Nhập giờ kết thúc' }]} style={{ marginBottom: 8 }}>
                                                            {/* <Input type="time" placeholder="Giờ kết thúc" /> */}
                                                            <DatePicker
                                                                format="HH:mm"
                                                                picker="time"
                                                                placeholder="Giờ kết thúc HH:mm"
                                                                style={{ width: '100%' }}
                                                            />
                                                        </Form.Item>
                                                    </Col>
                                                    <Col span={8}>
                                                        <Form.Item name={['separate_config', dayValue, 'teacher']} rules={[{ required: true, message: 'Chọn giáo viên' }]} style={{ marginBottom: 8 }}>
                                                            <Select options={TEACHER_OPTIONS} placeholder="Giáo viên" />
                                                        </Form.Item>
                                                    </Col>
                                                </Row>
                                            );
                                        })
                                    ) : (
                                        <Text type="secondary">Vui lòng chọn ít nhất 1 ngày học trong tuần ở trên.</Text>
                                    )}
                                </div>
                            )}

                        </FormSection>
                    </>
                )}

                {/* Form fields for Update Following */}
                {isEdit && updateMode === 'following' && (
                    <>
                        <FormSection title="Thông tin buổi học sẽ nghỉ">
                            <Row gutter={24}>
                                <Col span={12}>
                                    <Form.Item label="Mã lớp">
                                        <Input disabled value={initialData?.class_code || 'CLASS-001'} />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item label="Giáo viên">
                                        <Input disabled value={initialData?.teacher || 'Nguyễn Văn A'} />
                                    </Form.Item>
                                </Col>
                            </Row>
                            <div style={{ padding: '12px 16px', background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 6, marginBottom: 16 }}>
                                <Text type="warning">
                                    Lưu ý: Hành động này sẽ đánh dấu buổi học hiện tại là Nghỉ học, và dời toàn bộ đề cương xuống các buổi tiếp theo. Bạn cần điền thông tin để tạo thêm 1 buổi học bù ở cuối khóa.
                                </Text>
                            </div>
                        </FormSection>

                        <FormSection title="Thông tin buổi học bù (New Session)">
                            <Row gutter={24}>
                                <Col span={8}>
                                    <Form.Item label="Ngày học bù" name={['new_session', 'date']} rules={[{ required: true, message: 'Nhập ngày học bù' }]}>
                                        <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="DD/MM/YYYY" />
                                    </Form.Item>
                                </Col>
                                <Col span={8}>
                                    <Form.Item label="Thời gian bắt đầu" name={['new_session', 'start_time']} rules={[{ required: true, message: 'Nhập giờ bắt đầu' }]}>
                                        <TimePicker format="HH:mm" style={{ width: '100%' }} placeholder="HH:mm" />
                                    </Form.Item>
                                </Col>
                                <Col span={8}>
                                    <Form.Item label="Thời gian kết thúc" name={['new_session', 'end_time']} rules={[{ required: true, message: 'Nhập giờ kết thúc' }]}>
                                        <TimePicker format="HH:mm" style={{ width: '100%' }} placeholder="HH:mm" />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item label="Giáo viên dạy bù" name={['new_session', 'teacher']} rules={[{ required: true, message: 'Chọn giáo viên' }]}>
                                        <Select options={TEACHER_OPTIONS} placeholder="Chọn giáo viên" />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </FormSection>
                    </>
                )}

                {/* Form fields for Update Cancel */}
                {isEdit && updateMode === 'cancel' && (
                    <>
                        <FormSection title="Xác nhận nghỉ học">
                            <div style={{ padding: '12px 16px', background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: 6 }}>
                                <Text type="danger">
                                    Lưu ý: Hành động này chỉ đánh dấu buổi học hiện tại là Nghỉ/Hủy. Sẽ không dời đề cương và không ảnh hưởng đến các buổi học sau.
                                </Text>
                            </div>
                        </FormSection>
                    </>
                )}

            </Form>
        </Modal>
    );
};

export default ScheduleModal;
