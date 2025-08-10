'use client';
import React, { useState } from 'react';
import {
    Button,
    Space,
    Spin,
    Upload,
    message,
    notification,
    Modal,
    Flex,
} from 'antd';
import { DownloadOutlined, FullscreenOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd/es/upload';
import { useAuthStore } from '@/stores/authStore';
import * as XLSX from 'xlsx';
import { isEmpty } from 'lodash';

interface ImportButtonProps {
    importApiFn: (formData: FormData) => Promise<any>;
    onFileImport?: (data: any[]) => void;
    label?: string;
    onCloseImportModal?: () => void;
    setShouldReload: (value: boolean) => void;
    conditionImport?: Record<string, any>;
}

export default function ImportButton({
    importApiFn,
    onFileImport,
    label = 'Chọn file dữ liệu',
    onCloseImportModal,
    setShouldReload,
    conditionImport
}: ImportButtonProps) {
    const [api, contextHolder] = notification.useNotification();
    const { userId, warehouseId } = useAuthStore((state) => state.user);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [importErrors, setImportErrors] = useState<React.ReactNode[]>([]);
    const [importFileName, setImportFileName] = useState<string>('');

    const handleBeforeUpload = async (file: File) => {
        if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
            message.error('Chỉ chấp nhận file Excel (.xlsx, .xls, .csv)');
            return Upload.LIST_IGNORE;
        }

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

            if (jsonData.length > 500) {
                message.warning(`File quá lớn, chỉ chấp nhận tối đa 500 dòng (file có ${jsonData.length} dòng)`);
                return Upload.LIST_IGNORE;
            }
        } catch (error) {
            message.error('Không thể đọc file. Vui lòng kiểm tra lại định dạng file.');
            return Upload.LIST_IGNORE;
        }

        if (onCloseImportModal) {
            onCloseImportModal();
        }

        const notificationKey = `import-${Date.now()}`;
        api.info({
            key: notificationKey,
            message: file.name,
            description: <Space><Spin size='small' />Đang xử lý import...</Space>,
            duration: 0,
            placement: 'bottomRight',
        });

        try {
            await new Promise((resolve) => setTimeout(resolve, 500));
            const formData = new FormData();
            formData.append('file', file);
            formData.append('warehouse_id', String(warehouseId));
            formData.append('user_id', String(userId));
            !isEmpty(conditionImport) && formData.append('condition', JSON.stringify(conditionImport));

            const result = await importApiFn(formData);
            setShouldReload(true);

            if (result.data.errors?.length > 0) {
                const groupedErrors: Record<number, string[]> = {};
                result.data.errors.forEach((err: { row: number; error: string }) => {
                    if (!groupedErrors[err.row]) {
                        groupedErrors[err.row] = [];
                    }
                    groupedErrors[err.row].push(err.error);
                });

                const errorList = Object.entries(groupedErrors).map(([row, errors], index) => (
                    <div key={index} className='text-red-500'>
                        {row && row !== "undefined" ? <span>Dòng {row}:</span> : <span>Lỗi:</span>}
                        <ul style={{ paddingLeft: '1rem', margin: 0 }}>
                            {errors.map((err, idx) => (
                                <li key={idx}>- {err}</li>
                            ))}
                        </ul>
                    </div>
                ));

                // Lưu lỗi vào state để mở modal
                setImportErrors(errorList);
                setImportFileName(file.name);

                api.warning({
                    key: notificationKey,
                    message: file.name,
                    description: (
                        <Flex justify='space-between' style={{ fontSize: '13px', lineHeight: 1.6, maxHeight: 180, overflow: 'auto' }}>
                            <span className="text-sm text-red-500">Import file lỗi</span>
                            <Button
                                type="link"
                                size="small"
                                icon={<FullscreenOutlined />}
                                onClick={() => setIsModalOpen(true)}
                            >
                                Xem chi tiết
                            </Button>
                        </Flex>
                    ),
                    duration: 60,
                    placement: 'bottomRight',
                });
            } else {
                api.success({
                    key: notificationKey,
                    message: file.name,
                    description: (
                        <div className="flex flex-col">
                            <span className="text-emerald-700 text-sm">Import thành công</span>
                        </div>
                    ),
                    duration: 2.5,
                    placement: 'bottomRight',
                });
            }

            if (result.data.errors?.length > 0) {
                message.warning(`Có ${result.data.errors.length} lỗi`);
            }

            if (onFileImport) {
                onFileImport(result.data);
            }
        } catch (error: any) {
            api.error({
                key: notificationKey,
                message: file.name,
                description: (
                    <div className="flex flex-col">
                        <span className="text-gray-500 text-sm" style={{ paddingRight: 8 }}>Lỗi khi import</span>
                        <span className="mt-1 text-sm text-red-500">
                            {error.message || 'Đã xảy ra lỗi khi import file'}
                        </span>
                    </div>
                ),
                duration: 5,
                placement: 'bottomRight',
            });
        }

        return Upload.LIST_IGNORE;
    };

    const uploadProps: UploadProps = {
        beforeUpload: handleBeforeUpload,
        showUploadList: false,
        accept: '.xlsx,.xls,.csv',
    };

    return (
        <>
            {contextHolder}
            <Upload {...uploadProps}>
                <Button
                    type="primary"
                    style={{ marginTop: 16, backgroundColor: '#52C41A' }}
                    icon={<DownloadOutlined />}
                >
                    {label}
                </Button>
            </Upload>

            <Modal
                title={`Chi tiết lỗi - ${importFileName}`}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                width={600}
                styles={{ body: { maxHeight: '60vh', overflowY: 'auto' } }}
            >
                {importErrors.length > 0 ? (
                    <div>{importErrors}</div>
                ) : (
                    <p>Không có lỗi nào để hiển thị.</p>
                )}
            </Modal>
        </>
    );
}
