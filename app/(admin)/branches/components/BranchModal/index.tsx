'use client';
import { Modal, Form, Input, Button } from 'antd';
import React, { useEffect, useState } from 'react';
import { CloseCircleOutlined, SaveOutlined } from '@ant-design/icons';
import CustomSpin from '@/components/ui/Spins';
import { showErrorMessage, showSuccessMessage } from '@/ultils/message';
import useBranchStore from '@/stores/branchStore';
import { ActionType } from '@/enums/action';
import { createWarehouse, updateWarehouse } from '@/services/branchService';
import { useAuthStore } from '@/stores/authStore';
import { vietnamPhoneValidator } from '@/ultils/validators/phoneValidator';

const formItemLayout = {
    labelCol: { span: 6 },
    wrapperCol: { span: 18 },
};

const BranchModal = () => {
    const [form] = Form.useForm();
    const { modal, resetModal, setShouldReload } = useBranchStore();
    const [loadingModalVisible, setLoadingModalVisible] = useState(false);
    const { user, setUser } = useAuthStore()

    const onCloseModal = () => {
        form.resetFields();
        resetModal()
    }

    const handleFormSubmit = async (values: any) => {
        try {
            setLoadingModalVisible(true);
            if (modal.type === ActionType.CREATE) {
                await createWarehouse(values);
            } else if (modal.type === ActionType.UPDATE) {
                await updateWarehouse(modal.warehouse?.warehouse_id || 0, values);
                if (modal.warehouse?.warehouse_id == user.warehouseId && user.warehouseName !== values.warehouse_name) {
                    setUser({ ...user, warehouseName: values.warehouse_name })
                }
            }

            form.resetFields();
            onCloseModal();
            setShouldReload(true);
            showSuccessMessage(`${modal.title} thành công!`);
        } catch (error) {
            console.error('Lỗi submit:', error);
            showErrorMessage(`${modal.title} thất bại!`);
        } finally {
            setLoadingModalVisible(false);
        }
    };

    useEffect(() => {
        if (modal.open) {
            form.setFieldsValue({
                ...modal.warehouse,
            });
        }
    }, [modal.open]);

    return (
        <>
            <CustomSpin openSpin={loadingModalVisible} />
            <Modal
                title={modal.title}
                open={modal.open}
                onCancel={onCloseModal}
                width={600}
                centered
                footer={[
                    <Button key="back" onClick={onCloseModal} icon={<CloseCircleOutlined />}>
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
                    form={form}
                    onFinish={handleFormSubmit}
                    {...formItemLayout}
                    labelAlign="left"
                >
                    <Form.Item
                        label="Tên chi nhánh"
                        name="warehouse_name"
                        rules={[{ required: true, message: "Vui lòng nhập tên chi nhánh!" }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        label="Điện thoại"
                        name="phone"
                        rules={[
                            { required: true, message: "Vui lòng nhập số điện thoại!" },
                            { validator: vietnamPhoneValidator }
                        ]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        label="Email"
                        name="email"
                        rules={[
                            { type: 'email', message: "Email không đúng định dạng!" }
                        ]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        label="Địa chỉ"
                        name="address"
                        rules={[
                            { required: true, message: "Vui lòng nhập địa chỉ!" }
                        ]}
                    >
                        <Input />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};

export default BranchModal;
