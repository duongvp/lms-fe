'use client';
import { Modal, Form, Input, Button } from 'antd';
import React, { useEffect, useState } from 'react';
import { CloseCircleOutlined, SaveOutlined } from '@ant-design/icons';
import CustomSpin from '@/components/ui/Spins';
import { showErrorMessage, showSuccessMessage } from '@/ultils/message';
import useSupplierStore from "@/stores/supplierStore";
import { ActionType } from '@/enums/action';
import { createSupplier, updateSupplier } from '@/services/supplierService';
import { vietnamPhoneValidator } from '@/ultils/validators/phoneValidator';

const formItemLayout = {
    labelCol: { span: 6 },
    wrapperCol: { span: 18 },
};

const SupplierModal = () => {
    const [form] = Form.useForm();
    const { modal, resetModal, setShouldReload } = useSupplierStore();
    const [loadingModalVisible, setLoadingModalVisible] = useState(false);

    const onCloseModal = () => {
        form.resetFields();
        resetModal()
    }

    const handleFormSubmit = async () => {
        try {
            const rawValues = form.getFieldsValue();
            const values = Object.fromEntries(
                Object.entries(rawValues).map(([key, value]) => {
                    if (typeof value === 'string') {
                        return [key, value.trim()];
                    }
                    return [key, value];
                })
            );

            setLoadingModalVisible(true);

            if (modal.type === ActionType.CREATE) {
                await createSupplier(values);
            } else if (modal.type === ActionType.UPDATE) {
                await updateSupplier(modal.suppliers?.supplier_id || 0, values);
            }

            setShouldReload(true);
            form.resetFields();
            onCloseModal();
            showSuccessMessage(`${modal.title} thành công!`);
        } catch (error: Error | any) {
            console.error('Lỗi submit:', error);
            error.message ? showErrorMessage(error.message) : showErrorMessage(`${modal.title} thất bại!`);
        } finally {
            setLoadingModalVisible(false);
        }
    };


    useEffect(() => {
        if (modal.open) {
            form.setFieldsValue({
                ...modal.suppliers,
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
                destroyOnClose
            >
                <Form
                    form={form}
                    onFinish={handleFormSubmit}
                    {...formItemLayout}
                    labelAlign="left"
                >
                    <Form.Item label="Mã nhà cung cấp" name="supplier_code">
                        <Input placeholder="Mã mặc định" />
                    </Form.Item>
                    <Form.Item
                        label="Tên nhà cung cấp"
                        name="supplier_name"
                        rules={[{ required: true, message: 'Vui lòng nhập tên nhà cung cấp!' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item
                        label="Điện thoại"
                        name="phone"
                        rules={[
                            { required: true, message: 'Vui lòng nhập số điện thoại nhà cung cấp!' },
                            { validator: vietnamPhoneValidator },
                        ]}>
                        <Input />
                    </Form.Item>
                    <Form.Item label="Email" name="email"
                        rules={[
                            { type: "email", message: "Email không đúng định dạng!" }
                        ]}>
                        <Input />
                    </Form.Item>
                    <Form.Item label="Địa chỉ" name="address">
                        <Input />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};

export default SupplierModal;
