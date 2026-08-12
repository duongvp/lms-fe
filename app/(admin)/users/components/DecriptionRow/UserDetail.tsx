'use client';
import React from 'react';
import { Row, Col, Typography, Space, Button } from 'antd';
import { DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { deleteUser, UserApiResponse } from '@/services/userService';
import useUserStore from '@/stores/userStore';
import { ActionType } from '@/enums/action';
import { useAuthStore } from '@/stores/authStore';
import { PermissionKey } from '@/types/permissions';
import ConfirmModal from '@/components/templates/ConfirmModal';
import { showErrorMessage, showSuccessMessage } from '@/ultils/message';

const { Text } = Typography;

interface UserDetailProps {
    record: UserApiResponse;
}

const UserDetail: React.FC<UserDetailProps> = ({ record }) => {
    const { setModal, setShouldReload } = useUserStore();
    const hasPermission = useAuthStore(state => state.hasPermission);
    const currentUserId = useAuthStore(state => state.user.userId);
    const isAdminAccount = record.roles?.some((role) => role.role_code === 'admin');
    const [confirmOpen, setConfirmOpen] = React.useState(false);
    const [deleting, setDeleting] = React.useState(false);

    const handleUpdate = () => {
        setModal({
            open: true,
            type: ActionType.UPDATE,
            user: record,
        });
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await deleteUser(record.id);
            setConfirmOpen(false);
            setShouldReload(true);
            showSuccessMessage('Xóa tài khoản thành công');
        } catch (error: any) {
            showErrorMessage(error?.message || 'Không thể xóa tài khoản');
        } finally {
            setDeleting(false);
        }
    };

    const dataRow = [
        { label: 'Tên người dùng:', value: record.name },
        { label: 'Tên đăng nhập:', value: record.username },
        { label: 'Số điện thoại:', value: record.phone },
        { label: 'Email:', value: record.email },
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
                    <Space wrap>
                        {
                            hasPermission(PermissionKey.USER_EDIT) && !isAdminAccount && (
                                <Button
                                    type="primary"
                                    icon={<UploadOutlined />}
                                    onClick={handleUpdate}
                                >
                                    Cập nhật
                                </Button>
                            )
                        }
                        {hasPermission(PermissionKey.USER_DELETE) && currentUserId !== record.id && (
                            <Button
                                danger
                                type="primary"
                                icon={<DeleteOutlined />}
                                onClick={() => setConfirmOpen(true)}
                            >
                                Xóa
                            </Button>
                        )}
                    </Space>
                </Col>
            </Row>

            <ConfirmModal
                open={confirmOpen}
                title="Xóa tài khoản"
                content={`Bạn có chắc chắn muốn xóa tài khoản '${record.username}'?`}
                okText="Xóa"
                onOk={handleDelete}
                onCancel={() => setConfirmOpen(false)}
                loading={deleting}
            />
        </div>
    );
};

export default UserDetail;
