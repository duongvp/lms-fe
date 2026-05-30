'use client';

import React from 'react';
import { Row, Col, Typography, Space, Button } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { CustomerApiResponse, deleteCustomer, toggleCustomerStatus } from '@/services/customerService';
import useCustomerStore from '@/stores/customerStore';
import { ActionType } from '@/enums/action';
import BtnDeActiveDetete from '@/components/shared/BtnDeActiveDetete';
import { PermissionKey } from '@/types/permissions';
import { useAuthStore } from '@/stores/authStore';
import dayjs from 'dayjs';

const { Text } = Typography;

interface SupplierDetailProps {
    record: CustomerApiResponse;
}

const CustomerDetail: React.FC<SupplierDetailProps> = ({ record }) => {
    const { setModal, setShouldReload } = useCustomerStore();
    const { hasPermission } = useAuthStore();

    const handleUpdate = () => {
        setModal({
            open: true,
            type: ActionType.UPDATE,
            customer: record,
        });
    };

    const dataRow = [
        { label: 'Mã khách hàng:', value: record.customer_code },
        { label: 'Tên khách hàng:', value: record.customer_name },
        {
            label: 'Giới tính:',
            value: record.gender === 'male' ? 'Nam' : record.gender === 'female' ? 'Nữ' : record.gender === 'other' ? 'Khác' : ''
        },
        {
            label: 'Ngày sinh:',
            value: record.birthday ? dayjs(record.birthday).format('DD/MM/YYYY') : ''
        },
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
            {record.customer_id !== 1 && (
                <Row justify="end" align="middle" style={{ marginTop: 16 }}>
                    <Col>
                        <Space>
                            {
                                hasPermission(PermissionKey.CUSTOMER_EDIT) && (
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
                                hasPermission(PermissionKey.CUSTOMER_DELETE) && (
                                    <BtnDeActiveDetete
                                        record={{ id: record.customer_id, ...record }}
                                        contextActive='Ban có chắc muốn hoạt động lại khách hàng này không?'
                                        contextDeactive='Bạn có chắc chắn muốn ngừng hoạt động khách hàng này?'
                                        contextDelete='Bạn có chắc chắn muốn xoá khách hàng này? Hành động này sẽ không thể hoàn tác.'
                                        toggleStatus={toggleCustomerStatus}
                                        onDelete={deleteCustomer}
                                        setShouldReload={setShouldReload}
                                    />
                                )
                            }
                        </Space>
                    </Col>
                </Row>
            )}
        </div>
    );
};

export default CustomerDetail;
