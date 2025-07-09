'use client';

import React from 'react';
import { Button, Space } from 'antd';
import { CheckCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import ConfirmModal from '@/components/templates/ConfirmModal';
import { showErrorMessage, showSuccessMessage } from '@/ultils/message';

interface props {
    record: any,
    contextDelete?: string,
    contextDeactive?: string,
    contextActive?: string,
    setShouldReload?: (value: boolean) => void,
    toggleStatus: (id: number, payload: {
        status: 1 | 0;
    }) => Promise<any>
    onDelete: (id: number) => Promise<any>
}

const BtnDeActiveDetete: React.FC<props> = ({
    record,
    contextDelete = 'Bạn có chắc chắn muốn xoá?  Hành động này sẽ không thể hoàn tác.',
    contextDeactive = 'Bạn có chắc chắn ngừng hoạt động?',
    contextActive = 'Bạn có chắc chắn muốn hoạt động lại?',
    setShouldReload,
    toggleStatus,
    onDelete
}) => {
    const [confirmOpen, setConfirmOpen] = React.useState(false);
    const [confirmType, setConfirmType] = React.useState<'deactivate' | 'delete' | 'active' | null>(null);
    const [loading, setLoading] = React.useState(false);

    const handleDeactivateClick = () => {
        setConfirmType('deactivate');
        setConfirmOpen(true);
    };

    const handleActivateClick = () => {
        setConfirmType('active');
        setConfirmOpen(true);
    };

    const handleDeleteClick = () => {
        setConfirmType('delete');
        setConfirmOpen(true);
    };

    const handleDeactivate = async (type: 0 | 1) => {
        setLoading(true);
        try {
            await toggleStatus(record.id, { status: type })
            setShouldReload && setShouldReload(true);
            showSuccessMessage('Chuyển trạng thái thàng công');
            setConfirmOpen(false);
        } catch (error) {
            showErrorMessage('Có lỗi xảy ra khi chuyển trạng thái');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        setLoading(true);
        try {
            // TODO: Gọi API xoá ở đây
            await onDelete(record.id)
            // await deleteUser(record.user_id);
            setShouldReload && setShouldReload(true);
            showSuccessMessage('Xoá thành công');
            setConfirmOpen(false);
        } catch (error: any) {
            console.log("🚀 ~ handleDelete ~ error:", error)
            showErrorMessage(error.message || 'Có lỗi xảy ra khi xoá');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmOk = () => {
        if (confirmType === 'delete') {
            return handleDelete();
        }
        return handleDeactivate(confirmType === 'deactivate' ? 0 : 1);
    };


    return (
        <>
            <Space>
                {
                    !record.is_active ? (
                        <Button
                            type="primary"
                            icon={<CheckCircleOutlined />}
                            onClick={handleActivateClick}
                        >
                            Hoạt động
                        </Button>

                    ) : (
                        <Button
                            type="primary"
                            icon={<CheckCircleOutlined />}
                            onClick={handleDeactivateClick}
                            variant='solid'
                            color='red'
                        >
                            Ngừng hoạt động
                        </Button>
                    )
                }
                <Button
                    type="primary"
                    icon={<DeleteOutlined />}
                    variant='solid'
                    color='red'
                    onClick={handleDeleteClick}
                >
                    Xoá
                </Button>

                <ConfirmModal
                    open={confirmOpen}
                    content={
                        confirmType === 'deactivate'
                            ? contextDeactive : confirmType === 'active' ? contextActive
                                : contextDelete
                    }
                    onOk={handleConfirmOk}
                    onCancel={() => setConfirmOpen(false)}
                    loading={loading}
                />
            </Space>
        </>
    );
};

export default BtnDeActiveDetete;

