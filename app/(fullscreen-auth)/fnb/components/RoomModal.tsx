'use client';
import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Button, Row, Col, message } from 'antd';
import { SaveOutlined, CloseCircleOutlined, PlusOutlined } from '@ant-design/icons';
import useRoomStore from '@/stores/roomStore';
import { getAllAreas, createTable, updateTable, createArea, AreaApiResponse } from '@/services/fnbService';
import { createGolfLine, getGolfLines, updateGolfLine } from '@/services/golfService';
import { ActionType } from '@/enums/action';
import { useAuthStore } from '@/stores/authStore';

interface RoomModalProps {
    onSuccess: (payload?: { action: 'created' | 'updated'; roomType: 'fnb' | 'golf' | 'area' }) => void;
}

const RoomModal: React.FC<RoomModalProps> = ({ onSuccess }) => {
    const { modal, resetModal } = useRoomStore();
    const { warehouseId } = useAuthStore((state) => state.user);
    const [form] = Form.useForm();
    const [areas, setAreas] = useState<AreaApiResponse[]>([]);
    const [loading, setLoading] = useState(false);

    // Area Modal state
    const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
    const [newAreaName, setNewAreaName] = useState('');
    const [addingArea, setAddingArea] = useState(false);
    const [isGolfType, setIsGolfType] = useState(false);

    const GOLF_AREA_ID = 9999;

    const fetchAreas = async () => {
        try {
            const data = await getAllAreas();
            // Manually add virtual Golf area
            const extendedAreas = [...data, { 
                area_id: GOLF_AREA_ID, 
                area_name: 'Khu vực Golf', 
                warehouse_id: warehouseId 
            } as AreaApiResponse];
            setAreas(extendedAreas);
        } catch (error) {
            console.error("Failed to fetch areas", error);
        }
    };

    useEffect(() => {
        if (modal.open) {
            fetchAreas();
        }
    }, [modal.open]);

    useEffect(() => {
        if (modal.open && modal.room) {
            const isGolf = modal.room.isGolf;
            setIsGolfType(!!isGolf);
            form.setFieldsValue({
                ...modal.room,
                label: modal.room.label,
                floor: isGolf ? GOLF_AREA_ID : (modal.room.floor === 'null' ? 'takeaway' : (modal.room.floor ? Number(modal.room.floor) : undefined)),
                status: (modal.room.status === 'in_use' || modal.room.status === 'occupied') ? 'occupied' : 'available',
                line_code: modal.room.golfData?.line_code,
                base_rate_per_min: modal.room.golfData?.base_rate_per_min || 833,
                peak_rate_per_min: modal.room.golfData?.peak_rate_per_min || 1167,
            });
        } else {
            form.resetFields();
            setIsGolfType(false);
            form.setFieldsValue({ 
                status: 'available',
                base_rate_per_min: 833,
                peak_rate_per_min: 1167
            });
        }
    }, [modal.open, modal.room, form]);

    const handleFinish = async (values: any) => {
        if (warehouseId === -1) {
            message.error("Vui lòng chọn chi nhánh trước");
            return;
        }

        setLoading(true);
        try {
            const action = modal.type === ActionType.UPDATE ? 'updated' : 'created';
            if (isGolfType) {
                const golfLineData = {
                    line_name: values.label,
                    line_code: values.line_code || `GOLF-${Date.now().toString().slice(-4)}`,
                    base_rate_per_min: Number(values.base_rate_per_min),
                    peak_rate_per_min: Number(values.peak_rate_per_min),
                    warehouse_id: warehouseId,
                    is_active: 1,
                    status: 'AVAILABLE'
                };

                if (modal.type === ActionType.UPDATE && modal.room?.id) {
                    const lineId = Number(modal.room.id.replace('golf-', ''));
                    await updateGolfLine(lineId, golfLineData as any);
                    message.success('Cập nhật Line Golf thành công');
                } else {
                    await createGolfLine(golfLineData as any);
                    message.success('Thêm Line Golf mới thành công');
                }
            } else {
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
            }

            onSuccess({ action, roomType: isGolfType ? 'golf' : 'fnb' });
            resetModal();
            form.resetFields();
        } catch (error) {
            console.error("Failed to save room", error);
            message.error('Lỗi khi lưu dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    const handleAddArea = async () => {
        if (!newAreaName.trim()) {
            message.warning('Vui lòng nhập tên khu vực');
            return;
        }
        setAddingArea(true);
        try {
            const newArea = await createArea({
                area_name: newAreaName.trim(),
                warehouse_id: warehouseId
            } as any);
            message.success('Thêm khu vực thành công');
            await fetchAreas(); // Refresh list
            onSuccess({ action: 'created', roomType: 'area' });
            form.setFieldValue('floor', newArea.area_id); // Auto select new area
            setIsAreaModalOpen(false);
            setNewAreaName('');
        } catch (error) {
            message.error('Lỗi khi thêm khu vực');
        } finally {
            setAddingArea(false);
        }
    };

    return (
        <>
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
                        <Col span={16}>
                            <Form.Item
                                name="label"
                                label="Tên Bàn / Phòng / Line"
                                rules={[{ required: true, message: 'Vui lòng nhập tên' }]}
                            >
                                <Input placeholder="Ví dụ: Bàn 25, Phòng VIP 1, Line 1..." />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label="Loại hình" required>
                                <Select 
                                    value={isGolfType ? 'golf' : 'fnb'} 
                                    onChange={(val) => {
                                        setIsGolfType(val === 'golf');
                                        if (val === 'golf') {
                                            form.setFieldValue('floor', GOLF_AREA_ID);
                                        } else {
                                            form.setFieldValue('floor', areas[0]?.area_id);
                                        }
                                    }}
                                >
                                    <Select.Option value="fnb">F&B</Select.Option>
                                    <Select.Option value="golf">Golf Simulator</Select.Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    {isGolfType && (
                        <Row gutter={16}>
                            <Col span={8}>
                                <Form.Item name="line_code" label="Mã Line">
                                    <Input placeholder="Tự động" />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item name="base_rate_per_min" label="Giá giờ thường (đ/phút)">
                                    <Input type="number" />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item name="peak_rate_per_min" label="Giá giờ cao điểm (đ/phút)">
                                    <Input type="number" />
                                </Form.Item>
                            </Col>
                        </Row>
                    )}
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                label="Tầng / Khu vực"
                                required
                            >
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <Form.Item
                                        name="floor"
                                        noStyle
                                        rules={[{ required: true, message: 'Vui lòng chọn tầng' }]}
                                    >
                                        <Select 
                                            placeholder="Chọn tầng" 
                                            style={{ flex: 1 }}
                                            onChange={(val) => {
                                                setIsGolfType(val === GOLF_AREA_ID);
                                            }}
                                        >
                                            {areas.map(area => (
                                                <Select.Option key={area.area_id} value={area.area_id}>
                                                    {area.area_name}
                                                </Select.Option>
                                            ))}
                                            <Select.Option value="takeaway">Mang về</Select.Option>
                                        </Select>
                                    </Form.Item>
                                    <Button 
                                        icon={<PlusOutlined />} 
                                        onClick={() => setIsAreaModalOpen(true)}
                                        title="Thêm khu vực mới"
                                    />
                                </div>
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

            {/* Quick Add Area Modal */}
            <Modal
                title="Thêm Tầng / Khu vực mới"
                open={isAreaModalOpen}
                onCancel={() => {
                    setIsAreaModalOpen(false);
                    setNewAreaName('');
                }}
                onOk={handleAddArea}
                confirmLoading={addingArea}
                zIndex={1001} // Ensure it's above the RoomModal
            >
                <Input
                    placeholder="Nhập tên tầng / khu vực"
                    value={newAreaName}
                    onChange={(e) => setNewAreaName(e.target.value)}
                    onPressEnter={handleAddArea}
                    autoFocus
                />
            </Modal>
        </>
    );
};

export default RoomModal;
