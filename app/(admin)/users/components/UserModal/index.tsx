"use client";
import { Modal, Form, Input, Button, Row, Col, Checkbox } from "antd";
import React, { useEffect, useState } from "react";
import { CloseCircleOutlined, SaveOutlined } from "@ant-design/icons";
import CustomSpin from "@/components/ui/Spins";
import { showErrorMessage, showSuccessMessage } from "@/ultils/message";
import useUserStore from "@/stores/userStore";
import SelectWithButton from "@/components/ui/Selects/SelectWithButton";
import useRoleStore from "@/stores/roleStore";
import { ActionType } from "@/enums/action";
import { getRoles } from "@/services/roleService";
import useBranchStore from "@/stores/branchStore";
import { getWarehouses } from "@/services/branchService";
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
    const { shouldReload: shouldReloadBranch, setShouldReload: setShouldReloadBranch, setModal: setBranchModal } = useBranchStore();
    const [loadingModalVisible, setLoadingModalVisible] = useState(false);
    const [roleOptions, setRoleOptions] = useState<{ label: string; value: number; labelText: string }[]>([]);
    const [branchOptions, setBranchOptions] = useState<{ label: string; value: number; labelText: string }[]>([]);
    const { userId } = useAuthStore(state => state.user)
    const { user, setUser } = useAuthStore()

    const onCloseModal = () => {
        form.resetFields();
        resetModal();
    };

    const handleFormSubmit = async (values: any) => {
        try {
            const {
                confirmPassword,
                ...dataToSend
            } = values
            setLoadingModalVisible(true);
            if (modal.type === ActionType.CREATE) {
                await registerUser(dataToSend);
            } else if (modal.type === ActionType.UPDATE) {
                await updateUser(modal.user?.user_id || 0, dataToSend);
                if (modal.user?.user_id === userId && user.username !== values.username) {
                    setUser({ ...user, username: values.username })
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

    const fetchRoles = async (shouldReloadRole: boolean = false) => {
        try {
            const apiData = await getRoles();
            const newRoleOptions = apiData.map((item) => ({ label: item.role_name, value: item.role_id, labelText: item.role_name }))
            setRoleOptions(newRoleOptions);
            if (shouldReloadRole) {
                form.setFieldsValue({ role_id: newRoleOptions[newRoleOptions.length - 1].value });
            }
        } catch (error) {
            console.error("Lỗi fetch API:", error);
        }
    };

    const fetchBranchs = async (shouldReloadBranch: boolean = false) => {
        try {
            const apiData = await getWarehouses();
            const newBranchOptions = apiData.map((item) => ({ labelText: item.warehouse_name, value: item.warehouse_id, label: `${item.is_active ? item.warehouse_name : `(${item.warehouse_name})-ngừng hoạt động`}`, disabled: !item.is_active }))
            setBranchOptions(newBranchOptions);
            if (shouldReloadBranch) {
                form.setFieldsValue({ warehouse_id: newBranchOptions[newBranchOptions.length - 1].value });
            }
        } catch (error) {
            console.error("Lỗi fetch API:", error);
        }
    };

    useEffect(() => {
        if (modal.open) {
            // form.setFieldsValue({ ...modal.user, role_id: 1 });
            form.setFieldsValue({ ...modal.user, role_id: modal.user?.roles[0]?.role_id });
        }
    }, [modal.open]);

    useEffect(() => {
        fetchRoles();
        fetchBranchs();
    }, [])

    useEffect(() => {
        if (shouldReloadRole) {
            fetchRoles(shouldReloadRole);
            setShouldReloadRole(false);
        }
    }, [shouldReloadRole])

    useEffect(() => {
        if (shouldReloadBranch) {
            fetchBranchs(shouldReloadBranch);
            setShouldReloadBranch(false);
        }
    }, [shouldReloadBranch])

    return (
        <>
            <CustomSpin openSpin={loadingModalVisible} />
            <Modal
                title={modal.title}
                open={modal.open}
                onCancel={onCloseModal}
                width={900}
                centered
                footer={[
                    <Button
                        key="back"
                        onClick={onCloseModal}
                        icon={<CloseCircleOutlined />}
                    >
                        Huỷ
                    </Button>,
                    <Button
                        key="submit"
                        type="primary"
                        onClick={() => form.submit()}
                        icon={<SaveOutlined />}
                    >
                        Lưu
                    </Button>,
                ]}
            >
                <Form
                    // key={modal.user?.user_id || "new-user"}
                    form={form}
                    onFinish={handleFormSubmit}
                    {...formItemLayout}
                    labelAlign="left"
                // initialValues={modal.user ?? {}}
                >
                    <Row gutter={24} style={{ marginBottom: 12, marginTop: 12 }}>
                        <Col span={12}>
                            <Form.Item
                                label="Tên đăng nhập"
                                name="username"
                                rules={[
                                    { required: true, message: "Vui lòng nhập tên đăng nhập!" },
                                ]}
                            >
                                <Input />
                            </Form.Item>
                            <Form.Item
                                label="Mật khẩu"
                                name="password"
                                rules={modal.type === ActionType.CREATE ? [
                                    {
                                        required: true,
                                        message: "Vui lòng nhập mật khẩu!",
                                    },
                                ] : []}
                            >
                                <Input.Password />
                            </Form.Item>

                            <Form.Item
                                label="Gõ lại mật khẩu"
                                name="confirmPassword"
                                dependencies={["password"]}
                                rules={[
                                    ({ getFieldValue }) => ({
                                        validator(_, value) {
                                            const password = getFieldValue("password");

                                            if (modal.type === ActionType.CREATE) {
                                                if (!value) {
                                                    return Promise.reject(new Error("Vui lòng xác nhận mật khẩu!"));
                                                }
                                                if (value !== password) {
                                                    return Promise.reject(new Error("Mật khẩu xác nhận không khớp!"));
                                                }
                                            }

                                            // Nếu không phải create mà password có giá trị => confirmPassword bắt buộc
                                            if (modal.type !== ActionType.CREATE && password) {
                                                if (!value) {
                                                    return Promise.reject(new Error("Vui lòng xác nhận mật khẩu!"));
                                                }
                                                if (value !== password) {
                                                    return Promise.reject(new Error("Mật khẩu xác nhận không khớp!"));
                                                }
                                            }

                                            return Promise.resolve();
                                        },
                                    }),
                                ]}
                            >
                                <Input.Password />
                            </Form.Item>
                            <Form.Item
                                label="Chi nhánh"
                                name="warehouse_id"
                                extra={
                                    modal.user?.user_id == userId
                                        ? "Bạn không thể thay đổi chi nhánh của tài khoản đang đăng nhập."
                                        : ""
                                }
                                rules={[{ required: true, message: "Vui lòng chọn chi nhánh!" }]}
                            >
                                <SelectWithButton
                                    options={branchOptions}
                                    placeholder="--Chọn chi nhánh---"
                                    disabled={modal.user?.user_id == userId}
                                    onAddClick={() => { setBranchModal({ open: true, type: ActionType.CREATE, warehouse: null }) }}
                                />
                            </Form.Item>
                            <Form.Item
                                label="Vai trò"
                                name="role_id"
                                extra={
                                    modal.user?.user_id == userId
                                        ? "Bạn không thể thay đổi vai trò của tài khoản đang đăng nhập."
                                        : ""
                                }
                                rules={[{ required: true, message: "Vui lòng chọn vai trò!" }]}
                            >
                                <SelectWithButton
                                    options={roleOptions}
                                    placeholder="--Chọn vai trò---"
                                    disabled={modal.type === ActionType.UPDATE && modal.user?.user_id == userId}
                                    onAddClick={() => { setRoleModal({ open: true, type: ActionType.CREATE, role: null }) }}
                                />
                            </Form.Item>
                            {/* <Form.Item name="isSystem" valuePropName="checked">
                                <Checkbox>Toàn hệ thống</Checkbox>
                            </Form.Item> */}
                        </Col>

                        <Col span={12}>
                            <Form.Item label="Tên người dùng" name="full_name" rules={[{ required: true, message: "Vui lòng nhập tên người dùng!" }]}>
                                <Input />
                            </Form.Item>
                            <Form.Item label="Email" name="email"
                                rules={[
                                    { required: true, message: "Vui lòng nhập email!" },
                                    { type: "email", message: "Email không đúng định dạng!" }
                                ]}>
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
