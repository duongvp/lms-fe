'use client';
import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Button, Row, Col, message } from 'antd';
import { SaveOutlined, CloseCircleOutlined } from '@ant-design/icons';
import useRoomStore from '@/stores/roomStore';
import { getAllAreas, createTable, updateTable, AreaApiResponse } from '@/services/fnbService';
import { ActionType } from '@/enums/action';
import { useAuthStore } from '@/stores/authStore';

interface RoomModalProps {
    onSuccess: () => void;
}

const RoomModal: React.FC<RoomModalProps> = ({ onSuccess }) => {
    const { modal, resetModal } = useRoomStore();
    const { warehouseId } = useAuthStore((state) => state.user);
    const [form] = Form.useForm();
    const [areas, setAreas] = useState<AreaApiResponse[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchAreas = async () => {
            try {
                const data = await getAllAreas();
                setAreas(data);
            } catch (error) {
                console.error("Failed to fetch areas", error);
            }
        };
        if (modal.open) {
            fetchAreas();
        }
    }, [modal.open]);

    useEffect(() => {
        if (modal.open && modal.room) {
            form.setFieldsValue({
                ...modal.room,
                label: modal.room.label,
                floor: modal.room.floor === 'null' ? 'takeaway' : (modal.room.floor ? Number(modal.room.floor) : undefined),
                status: (modal.room.status === 'in_use' || modal.room.status === 'occupied') ? 'occupied' : 'available',
            });
        } else {
            form.resetFields();
            form.setFieldsValue({ status: 'available' });
        }
    }, [modal.open, modal.room, form]);

    const handleFinish = async (values: any) => {
        if (warehouseId === -1) {
            message.error("Vui lòng chọn chi nhánh trước");
            return;
        }

        setLoading(true);
        try {
            const tableData = {
                table_name: values.label,
                area_id: values.floor === 'takeaway' ? null : Number(values.floor),
                status: values.status === 'occupied' ? 'in_use' : 'empty',
                seat_count: 4,
                warehouse_id: warehouseId
            };

            if (modal.type === ActionType.UPDATE && modal.room?.id) {
                await updateTable(Number(modal.room.id), tableData as any);
                message.success('Cập nhật bàn thành công');
            } else {
                await createTable(tableData as any);
                message.success('Thêm bàn mới thành công');
            }

            onSuccess();
            resetModal();
            form.resetFields();
        } catch (error) {
            console.error("Failed to save room", error);
            message.error('Lỗi khi lưu dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title={modal.title}
            open={modal.open}
            onCancel={resetModal}
            onOk={() => form.submit()}
            footer={[
                <Button key="back" onClick={resetModal} icon={<CloseCircleOutlined />} disabled={loading}>
                    Hủy
                </Button>,
                <Button key="submit" type="primary" onClick={() => form.submit()} icon={<SaveOutlined />} loading={loading}>
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
                                {areas.map(area => (
                                    <Select.Option key={area.area_id} value={area.area_id}>
                                        {area.area_name}
                                    </Select.Option>
                                ))}
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
            </Form>
        </Modal>
    );
};

export default RoomModal;
