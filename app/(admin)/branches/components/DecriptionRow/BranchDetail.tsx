'use client';
import React from 'react';
import { Row, Col, Typography, Space, Button } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { ActionType } from '@/enums/action';
import { deleteWarehouse, getWarehouseById, toggleWarehouseStatus, WarehouseApiResponse } from '@/services/branchService';
import useBranchStore from '@/stores/branchStore';
import BtnDeActiveDetete from '@/components/shared/BtnDeActiveDetete';
import { useAuthStore } from '@/stores/authStore';
import { PermissionKey } from '@/types/permissions';

const { Text } = Typography;


const BranchDetail: React.FC<{ record: WarehouseApiResponse; }> = ({ record }) => {
    const { setModal, setShouldReload } = useBranchStore();
    const hasPermission = useAuthStore(state => state.hasPermission);
    const { warehouseId } = useAuthStore(state => state.user)
    const handleUpdate = async () => {
        const res = await getWarehouseById(record.warehouse_id);
        setModal({
            open: true,
            type: ActionType.UPDATE,
            warehouse: res,
        });
    };

    const dataRow = [
        { label: 'Tên chi nhánh:', value: record.warehouse_name },
        { label: 'Địa chỉ:', value: record.address },
        { label: 'Điện thoại:', value: record.phone },
        { label: 'Email:', value: record.email },
        { label: 'Người dùng:', value: record.user_names.join(', ') },
    ];

    return (
        <div>
            <div style={{ overflow: 'hidden', padding: 16 }}>
                <Row gutter={[16, 16]}>
                    <Col span={12}>
                        {dataRow.map((item, index) => (
                            <Row key={index} gutter={[8, 8]} style={{ marginBottom: 8 }}>
                                <Col span={6}>
                                    <Text strong>{item.label}</Text>
                                </Col>
                                <Col span={18}>
                                    <Text>{item.value}</Text>
                                </Col>
                            </Row>
                        ))}
                    </Col>
                </Row>
            </div>

            <Row justify="end" align="middle" style={{ marginTop: 16 }}>
                <Col>
                    <Space>
                        {
                            hasPermission(PermissionKey.BRANCH_EDIT) && (
                                <Button
                                    type="primary"
                                    icon={<UploadOutlined />}
                                    onClick={handleUpdate}
                                >
                                    Cập nhật
                                </Button>
                            )
                        }
                        {
                            (hasPermission(PermissionKey.BRANCH_DELETE) && warehouseId !== record.warehouse_id) && (
                                <BtnDeActiveDetete
                                    record={{ id: record.warehouse_id, ...record }}
                                    contextActive='Ban có chắc muốn hoạt động lại chi nhánh này không?'
                                    contextDeactive='Bạn có chắc chắn muốn ngừng hoạt động chi nhánh này? Thông tin giao dịch lịch sử của chi nhánh sẽ vẫn được giữ'
                                    contextDelete='Bạn có chắc chắn muốn xoá chi nhánh này? Hành động này sẽ không thể hoàn tác.'
                                    toggleStatus={toggleWarehouseStatus}
                                    onDelete={deleteWarehouse}
                                    setShouldReload={setShouldReload}
                                />
                            )
                        }
                    </Space>
                </Col>
            </Row>
        </div>
    );
};

export default BranchDetail;

