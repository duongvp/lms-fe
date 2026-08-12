'use client';
import React from 'react';
import { Row, Col, Typography, Space, Button } from 'antd';
import { CheckCircleOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import ConfirmModal from '@/components/templates/ConfirmModal';
import { showErrorMessage, showSuccessMessage } from '@/ultils/message';
import { deleteRole, getRoleById, RoleApiResponse } from '@/services/roleService';
import useRoleStore from '@/stores/roleStore';
import { ActionType } from '@/enums/action';
import { useAuthStore } from '@/stores/authStore';
import { PermissionKey } from '@/types/permissions';

const { Text } = Typography;

interface RoleDetailProps {
    record: RoleApiResponse;
}

const RoleDetail: React.FC<RoleDetailProps> = ({ record }) => {
    console.log("🚀 ~ record:", record)
    const { setModal, setShouldReload } = useRoleStore();
    const [confirmOpen, setConfirmOpen] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const canUpdate = useAuthStore((state) =>
        state.hasPermission(PermissionKey.ROLE_EDIT)
    );
    const canDelete = useAuthStore((state) =>
        state.hasPermission(PermissionKey.ROLE_DELETE)
    );

    const handleUpdate = async () => {
        const res = await getRoleById(record.id);
        setModal({
            open: true,
            type: ActionType.UPDATE,
            role: res,
        });
    };

    const handleDeleteClick = () => {
        setConfirmOpen(true);
    };

    const handleDelete = async () => {
        setLoading(true);
        try {
            console.log('Xoá người dùng...');
            // TODO: Gọi API xoá ở đây
            await deleteRole(record.id);
            setShouldReload(true);
            showSuccessMessage('Xoá thành công');
            setConfirmOpen(false);
        } catch (error: any) {
            showErrorMessage(error.message || 'Xoá role thất bại');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmOk = async () => {
        await handleDelete();
    };

    const dataRow = [
        { label: 'Tên vai trò:', value: record.name },
        { label: 'Mô tả:', value: record.description },
    ];

    return (
        <div>
            <div style={{ overflow: 'hidden', padding: 16 }}>
                <Row gutter={[16, 16]}>
                    <Col xs={24} lg={12}>
                        {dataRow.map((item, index) => (
                            <Row key={index} gutter={[8, 8]} style={{ marginBottom: 8 }}>
                                <Col xs={24} sm={6}>
                                    <Text strong>{item.label}</Text>
                                </Col>
                                <Col xs={24} sm={18}>
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
                        {canUpdate && (
                            <Button
                                type="primary"
                                icon={<UploadOutlined />}
                                onClick={handleUpdate}
                            >
                                Cập nhật
                            </Button>
                        )}
                        {
                            canDelete && record.code !== 'admin' && (
                                <Button
                                    type="primary"
                                    icon={<DeleteOutlined />}
                                    style={{ backgroundColor: '#ff4d4f', borderColor: '#ff4d4f' }}
                                    onClick={handleDeleteClick}
                                >
                                    Xoá
                                </Button>
                            )
                        }
                    </Space>
                </Col>
            </Row>

            <ConfirmModal
                open={confirmOpen}
                content='Bạn có chắc chắn muốn xoá vai trò này? Hành động này sẽ không thể hoàn tác.'
                onOk={handleConfirmOk}
                onCancel={() => setConfirmOpen(false)}
                loading={loading}
            />
        </div>
    );
};

export default RoleDetail;
