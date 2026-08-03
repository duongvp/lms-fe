'use client';
import React from 'react';
import { Row, Col, Typography, Space, Button } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
// import { deleteUser, toggleUserStatus, UserApiResponse } from '@/services/userService';
import { UserApiResponse } from '@/services/userService';
import useUserStore from '@/stores/userStore';
import { ActionType } from '@/enums/action';
import { useAuthStore } from '@/stores/authStore';
import { PermissionKey } from '@/types/permissions';

const { Text } = Typography;

interface UserDetailProps {
    record: UserApiResponse;
}

const UserDetail: React.FC<UserDetailProps> = ({ record }) => {
    const { setModal } = useUserStore();
    const hasPermission = useAuthStore(state => state.hasPermission);
    const isAdminAccount = record.roles?.some((role) => role.role_code === 'admin');

    const handleUpdate = () => {
        setModal({
            open: true,
            type: ActionType.UPDATE,
            user: record,
        });
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
                        {/* {
                            hasPermission(PermissionKey.USER_DELETE) && (userId != record.user_id) && (
                                <BtnDeActiveDetete
                                    record={{ id: record.user_id, ...record }}
                                    contextActive='Ban có chắc muốn hoạt động lại người dùng này không?'
                                    contextDeactive='Bạn có chắc chắn muốn ngừng hoạt động người dùng này?'
                                    contextDelete='Bạn có chắc chắn muốn xoá người dùng này? Hành động này sẽ không thể hoàn tác.'
                                    toggleStatus={toggleUserStatus}
                                    onDelete={deleteUser}
                                    setShouldReload={setShouldReload}
                                />
                            )
                        } */}
                    </Space>
                </Col>
            </Row>
        </div>
    );
};

export default UserDetail;
