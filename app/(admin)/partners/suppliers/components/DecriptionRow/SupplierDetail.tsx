'use client';
import React from 'react';
import { Row, Col, Typography, Space, Button } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { deleteSupplier, SupplierApiResponse, toggleSupplierStatus } from '@/services/supplierService';
import useSupplierStore from '@/stores/supplierStore';
import { ActionType } from '@/enums/action';
import BtnDeActiveDetete from '@/components/shared/BtnDeActiveDetete';
import { PermissionKey } from '@/types/permissions';
import { useAuthStore } from '@/stores/authStore';

const { Text } = Typography;

interface SupplierDetailProps {
    record: SupplierApiResponse;
}

const SupplierDetail: React.FC<SupplierDetailProps> = ({ record }) => {
    const { setModal, setShouldReload } = useSupplierStore();
    const { hasPermission } = useAuthStore();

    const handleUpdate = () => {
        setModal({
            open: true,
            type: ActionType.UPDATE,
            suppliers: record,
        });
    };

    const dataRow = [
        { label: 'Mã nhà cung cấp:', value: record.supplier_code },
        { label: 'Tên nhà cung cấp:', value: record.supplier_name },
        { label: 'Số điện thoại:', value: record.phone },
        { label: 'Email:', value: record.email },
        { label: 'Địa chỉ:', value: record.address },
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

            {
                record.supplier_id !== 1 && (
                    <Row justify="end" align="middle" style={{ marginTop: 16 }}>
                        <Col>
                            <Space>
                                {
                                    hasPermission(PermissionKey.SUPPLIER_EDIT) && (
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
                                    hasPermission(PermissionKey.SUPPLIER_DELETE) && (
                                        <BtnDeActiveDetete
                                            record={{ id: record.supplier_id, ...record }}
                                            contextActive='Ban có chắc muốn hoạt động lại nhà cung cấp này không?'
                                            contextDeactive='Bạn có chắc chắn muốn ngừng hoạt động nhà cung cấp này?'
                                            contextDelete='Bạn có chắc chắn muốn xoá nhà cung cấp này? Hành động này sẽ không thể hoàn tác.'
                                            toggleStatus={toggleSupplierStatus}
                                            onDelete={deleteSupplier}
                                            setShouldReload={setShouldReload}
                                        />
                                    )
                                }
                            </Space>
                        </Col>
                    </Row>
                )
            }
        </div>
    );
};

export default SupplierDetail;
