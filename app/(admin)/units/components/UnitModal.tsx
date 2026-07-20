'use client';
import { Modal, Form, Flex, Input, Button } from 'antd';
import React, { useEffect } from 'react';
import { CloseCircleOutlined, SaveOutlined } from '@ant-design/icons';
import { showErrorMessage, showSuccessMessage } from '@/ultils/message';
import useUnitStore from '@/stores/unitStore';
import { createUnit } from '@/services/unitService';

const UnitModal = () => {
    const [form] = Form.useForm();
    const [loadingModalVisible, setLoadingModalVisible] = React.useState(false);
    const { modal, resetModal, setShouldReload } = useUnitStore();

    const onCloseModal = () => {
        form.resetFields();
        resetModal()
    }

    const handleFormSubmit = async (values: any) => {
        try {
            setLoadingModalVisible(true);
            await createUnit(values);
            form.resetFields();
            setShouldReload(true);
            onCloseModal();
            showSuccessMessage('Thêm giáo viên thành công!');
        } catch (error) {
            console.error('Lỗi submit:', error);
            showErrorMessage('Thêm giáo viên thất bại!');
        } finally {
            setLoadingModalVisible(false);
        }
    };

    useEffect(() => {
        if (modal.open) {
            form.setFieldsValue({
                ...modal.unit,
            });
        }
    }, [modal.open]);

    return (
        <Modal
            title={modal.title}
            open={modal.open}
            onCancel={onCloseModal}
            footer={[
                <Button key="back" onClick={onCloseModal} icon={<CloseCircleOutlined />}>
                    Huỷ
                </Button>,
                <Button
                    key="submit"
                    type="primary"
                    onClick={() => form.submit()}
                    icon={<SaveOutlined />}
                    loading={loadingModalVisible}
                >
                    Lưu
                </Button>,
            ]}
        >
            <Form
                form={form}
                onFinish={handleFormSubmit}
            >
                <Flex style={{ flexDirection: 'column' }}>
                    <Form.Item label="Tên giáo viên" name="unit_name" rules={[{ required: true, message: 'Vui lòng nhập tên đơn vị' }]}>
                        <Input placeholder="Tên giáo viên" />
                    </Form.Item>
                </Flex>
            </Form>
        </Modal>
    );
};

export default UnitModal;
