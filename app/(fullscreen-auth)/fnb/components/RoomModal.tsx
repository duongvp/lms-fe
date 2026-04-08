'use client';
import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, Button, Row, Col } from 'antd';
import { SaveOutlined, CloseCircleOutlined } from '@ant-design/icons';
import useRoomStore from '@/stores/roomStore';

interface RoomModalProps {
    onAdd: (room: any) => void;
}

const RoomModal: React.FC<RoomModalProps> = ({ onAdd }) => {
    const { modal, resetModal } = useRoomStore();
    const [form] = Form.useForm();

    useEffect(() => {
        if (modal.open && modal.room) {
            form.setFieldsValue(modal.room);
        } else {
            form.resetFields();
            form.setFieldsValue({ status: 'available', floor: '1' });
        }
    }, [modal.open, modal.room, form]);

    const handleFinish = (values: any) => {
        onAdd({
            ...values,
            id: modal.room?.id || `r${Date.now()}`,
        });
        resetModal();
        form.resetFields();
    };

    return (
        <Modal
            title={modal.title}
            open={modal.open}
            onCancel={resetModal}
            onOk={() => form.submit()}
            footer={[
                <Button key="back" onClick={resetModal} icon={<CloseCircleOutlined />}>
                    Hủy
                </Button>,
                <Button key="submit" type="primary" onClick={() => form.submit()} icon={<SaveOutlined />}>
                    Lưu
                </Button>,
            ]}
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleFinish}
            >
                <Row gutter={16}>
                    <Col span={24}>
                        <Form.Item
                            name="label"
                            label="Tên Bàn / Phòng"
                            rules={[{ required: true, message: 'Vui lòng nhập tên' }]}
                        >
                            <Input placeholder="Ví dụ: Bàn 25, Phòng VIP 1..." />
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            name="floor"
                            label="Tầng / Khu vực"
                            rules={[{ required: true, message: 'Vui lòng chọn tầng' }]}
                        >
                            <Select placeholder="Chọn tầng">
                                <Select.Option value="1">Tầng 1</Select.Option>
                                <Select.Option value="2">Tầng 2</Select.Option>
                                <Select.Option value="5">Tầng 5</Select.Option>
                                <Select.Option value="takeaway">Mang về</Select.Option>
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            name="status"
                            label="Trạng thái"
                            rules={[{ required: true, message: 'Vui lòng chọn trạng thái' }]}
                        >
                            <Select placeholder="Chọn trạng thái">
                                <Select.Option value="available">Còn trống</Select.Option>
                                <Select.Option value="occupied">Đang sử dụng</Select.Option>
                                <Select.Option value="reserved">Đã đặt trước</Select.Option>
                            </Select>
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="price" label="Giá (nếu có)">
                            <Input type="number" placeholder="0" suffix="đ" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="customers" label="Số khách">
                            <Input type="number" placeholder="0" />
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
        </Modal>
    );
};

export default RoomModal;
