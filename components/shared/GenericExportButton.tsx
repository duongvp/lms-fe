// export default GenericExportButton;
import { Button, notification, Space, Spin } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useState } from 'react';

interface GenericExportButtonProps<T extends any[]> {
    exportService: (...args: T) => Promise<Blob>;
    serviceParams?: T;
    fileNamePrefix?: string;
    buttonText?: string;
    buttonProps?: import('antd').ButtonProps;
}

const GenericExportButton = <T extends any[]>({
    exportService,
    serviceParams,
    fileNamePrefix = 'export',
    buttonText = 'Xuất Excel',
    buttonProps = {},
}: GenericExportButtonProps<T>) => {
    const [loading, setLoading] = useState(false);
    const [api, contextHolder] = notification.useNotification();

    const handleExport = async () => {
        const randomNumber = Math.floor(Math.random() * 100000) + 1;
        const key = `export-${Date.now()}`;
        const filename = `${fileNamePrefix}_${new Date().toISOString().slice(0, 10)}_${randomNumber}.xlsx`;

        api.info({
            key,
            message: filename,
            description: <Space><Spin size='small' />Đang xử lý xuất file...</Space>,
            placement: 'bottomRight',
            duration: 0,
        });
        await new Promise(resolve => setTimeout(resolve, 200)); // Giả lập thời gian xử lý
        setLoading(true);

        try {
            const blob = await exportService(...(serviceParams ?? ([] as unknown as T)));

            // Tạo URL và xử lý download
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);

            api.success({
                key,
                message: filename,
                description: (
                    <span
                        onClick={() => {
                            a.click();
                            setTimeout(() => {
                                document.body.removeChild(a);
                                window.URL.revokeObjectURL(url);
                            }, 100);
                        }}
                        style={{ color: '#1890ff', cursor: 'pointer' }}
                    >
                        Nhấn vào đây để tải xuống
                    </span>
                ),
                placement: 'bottomRight',
                duration: 0,
            });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Đã xảy ra lỗi khi xuất file';

            api.error({
                key,
                message: filename,
                description: 'Xuất file lỗi: ' + errorMessage,
                placement: 'bottomRight',
                duration: 4.5,
            });

        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {contextHolder}
            <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleExport}
                loading={loading}
                {...buttonProps}
            >
                {buttonText}
            </Button>
        </>
    );
};

export default GenericExportButton;