"use client";
import { Modal, Form, Input, Button, Row, Col, Select } from "antd";
import { useEffect, useState } from "react";
import { CloseCircleOutlined, SaveOutlined } from "@ant-design/icons";
import CustomSpin from "@/components/ui/Spins";
import { showErrorMessage, showSuccessMessage } from "@/ultils/message";
import useUserStore from "@/stores/userStore";
import useRoleStore from "@/stores/roleStore";
import { ActionType } from "@/enums/action";
import { getRoles } from "@/services/roleService";
import { updateUser } from "@/services/userService";
import { registerUser } from "@/services/authService";
import { useAuthStore } from "@/stores/authStore";

const formItemLayout = {
    labelCol: { span: 8 },
    wrapperCol: { span: 16 },
};

const UserModal = () => {
    const [form] = Form.useForm();
    const { modal, resetModal, setShouldReload } = useUserStore();
    const { shouldReload: shouldReloadRole, setShouldReload: setShouldReloadRole, setModal: setRoleModal } = useRoleStore();
    const [loadingModalVisible, setLoadingModalVisible] = useState(false);
    const [roleOptions, setRoleOptions] = useState<{ label: string; value: number }[]>([]);
    const { userId } = useAuthStore(state => state.user);
    const { user, setUser } = useAuthStore();

    const onCloseModal = () => {
        form.resetFields();
        resetModal();
    };

    const handleFormSubmit = async (values: any) => {
        try {
            setLoadingModalVisible(true);
            const { confirmPassword, ...dataToSend } = values;

            // Chuẩn bị payload
            const payload = {
                username: dataToSend.username,
                name: dataToSend.full_name,
                email: dataToSend.email,
                phone: dataToSend.phone,
                password: dataToSend.password || undefined,
                roleIds: dataToSend.roleIds || [],
            };

            if (modal.type === ActionType.CREATE) {
                // await registerUser(payload);
            } else if (modal.type === ActionType.UPDATE) {
                await updateUser(modal.user?.id || 0, payload);
                // Cập nhật store nếu là user hiện tại
                if (modal.user?.id === userId && user.username !== values.username) {
                    setUser({ ...user, username: values.username });
                }
            }
            onCloseModal();
            setShouldReload(true);
            showSuccessMessage(`${modal.title} thành công!`);
        } catch (error: any) {
            console.error("Lỗi submit:", error);
            showErrorMessage(error.message);
        } finally {
            setLoadingModalVisible(false);
        }
    };

    const fetchRoles = async (reload = false) => {
        try {
            const apiData = await getRoles();
            // Giả sử apiData là mảng RoleApiResponse (id, name)
            const options = apiData.map(item => ({
                label: item.name,
                value: item.id,
            }));
            setRoleOptions(options);
            if (reload && options.length > 0) {
                form.setFieldsValue({ roleIds: [options[options.length - 1].value] });
            }
        } catch (error) {
            console.error("Lỗi fetch roles:", error);
        }
    };

    useEffect(() => {
        if (modal.open) {
            fetchRoles();
            // Set giá trị ban đầu cho form
            const initialValues: any = {
                username: modal.user?.username,
                full_name: modal.user?.name,
                email: modal.user?.email,
                phone: modal.user?.phone,
            };
            // Nếu là edit, set roleIds từ mảng roles
            if (modal.user?.roles) {
                initialValues.roleIds = modal.user.roles.map((r: any) => r.role_id || r.id);
            }
            form.setFieldsValue(initialValues);
        }
    }, [modal.open, modal.user, form]);

    useEffect(() => {
        if (shouldReloadRole) {
            if (modal.open) {
                fetchRoles(true);
            }
            setShouldReloadRole(false);
        }
    }, [shouldReloadRole, modal.open]);

    return (
        <>
            <CustomSpin openSpin={loadingModalVisible} />
            <Modal
                title={modal.title}
                open={modal.open}
                onCancel={onCloseModal}
                width={800}
                centered
                footer={[
                    <Button key="back" onClick={onCloseModal} icon={<CloseCircleOutlined />}>
                        Huỷ
                    </Button>,
                    <Button key="submit" type="primary" onClick={() => form.submit()} icon={<SaveOutlined />}>
                        Lưu
                    </Button>,
                ]}
            >
                <Form
                    form={form}
                    onFinish={handleFormSubmit}
                    {...formItemLayout}
                    labelAlign="left"
                >
                    <Row gutter={24} style={{ marginTop: 12 }}>
                        <Col span={12}>
                            <Form.Item
                                label="Tên đăng nhập"
                                name="username"
                                rules={[{ required: true, message: "Vui lòng nhập tên đăng nhập!" }]}
                            >
                                <Input />
                            </Form.Item>

                            <Form.Item
                                label="Email"
                                name="email"
                                rules={[
                                    { required: true, message: "Vui lòng nhập email!" },
                                    { type: "email", message: "Email không đúng định dạng!" }
                                ]}
                            >
                                <Input />
                            </Form.Item>
                            <Form.Item
                                label="Vai trò"
                                name="roleIds"
                                rules={[{ required: true, message: "Vui lòng chọn ít nhất một vai trò!" }]}
                            >
                                <Select
                                    mode="multiple"
                                    placeholder="--Chọn vai trò--"
                                    options={roleOptions}
                                    disabled={modal.type === ActionType.UPDATE && modal.user?.id === userId}
                                    dropdownRender={(menu) => (
                                        <>
                                            {menu}
                                            <div style={{ padding: '8px', borderTop: '1px solid #f0f0f0' }}>
                                                <Button
                                                    type="link"
                                                    onClick={() => setRoleModal({ open: true, type: ActionType.CREATE, role: null })}
                                                    style={{ padding: 0 }}
                                                >
                                                    + Thêm vai trò mới
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                label="Tên người dùng"
                                name="full_name"
                                rules={[{ required: true, message: "Vui lòng nhập tên người dùng!" }]}
                            >
                                <Input />
                            </Form.Item>
                            <Form.Item label="Điện thoại" name="phone">
                                <Input />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>
        </>
    );
};

export default UserModal;
