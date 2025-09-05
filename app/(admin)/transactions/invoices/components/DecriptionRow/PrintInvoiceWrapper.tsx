'use client';
import React, { useRef, useState } from 'react';
import { Button, Dropdown, Space, message } from 'antd';
import type { MenuProps } from 'antd';
import { useReactToPrint } from 'react-to-print';
import { PrinterFilled, DownloadOutlined } from '@ant-design/icons';
import InvoiceToPrint from '@/components/shared/InvoiceToPrint';
import { IInvoiceDetail, IInvoiceTableData } from '@/types/invoice';
import { toPng } from 'html-to-image';
import ActionButton from '@/components/ui/ActionButton';

interface PrintWrapperProps {
    data: Partial<IInvoiceTableData>[];
    invoiceDetails: Partial<IInvoiceDetail>;
    invoiceSummary: any;
}

const PrintInvoiceWrapper: React.FC<PrintWrapperProps> = ({
    data,
    invoiceDetails,
    invoiceSummary,
}) => {
    const componentRef = useRef<HTMLDivElement>(null);
    const [printMode, setPrintMode] = useState<'full' | 'simple' | 'shortening'>('full');
    const [isDownloading, setIsDownloading] = useState(false);

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
    });

    const downloadAsImage = async () => {
        if (!componentRef.current) return;
        setIsDownloading(true); // bật A4
        await new Promise(resolve => setTimeout(resolve, 100)); // đợi DOM update

        try {
            const dataUrl = await toPng(componentRef.current, {
                cacheBust: true,
                pixelRatio: 2, // tăng độ nét mà không làm to
                backgroundColor: '#ffffff',
            });

            const link = document.createElement('a');
            link.download = `invoice-${printMode}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Lỗi khi xuất ảnh:', err);
            message.error('Không thể xuất hóa đơn thành ảnh!');
        } finally {
            setIsDownloading(false); // về lại khổ in
        }
    };


    const printItems: MenuProps['items'] = [
        {
            key: 'full',
            label: 'Hoá đơn tính tiền',
            onClick: () => {
                setPrintMode('full');
                setTimeout(() => handlePrint(), 100);
            },
        },
        {
            key: 'simple',
            label: 'Phiếu giao hàng',
            onClick: () => {
                setPrintMode('simple');
                setTimeout(() => handlePrint(), 100);
            },
        },
        {
            key: 'shortening',
            label: 'Phiếu giao hàng rút gọn',
            onClick: () => {
                setPrintMode('shortening');
                setTimeout(() => handlePrint(), 100);
            },
        },
    ];

    const downloadItems: MenuProps['items'] = [
        {
            key: 'download-full',
            label: 'Tải Hoá đơn tính tiền',
            onClick: () => {
                setPrintMode('full');
                setTimeout(() => downloadAsImage(), 100);
            },
        },
        {
            key: 'download-simple',
            label: 'Tải Phiếu giao hàng',
            onClick: () => {
                setPrintMode('simple');
                setTimeout(() => downloadAsImage(), 100);
            },
        },
        {
            key: 'download-shortening',
            label: 'Tải Phiếu rút gọn',
            onClick: () => {
                setPrintMode('shortening');
                setTimeout(() => downloadAsImage(), 100);
            },
        },
    ];

    return (
        <div>
            <Space>
                <Dropdown menu={{ items: printItems }} placement="bottomRight">
                    <ActionButton
                        type='primary'
                        label='In'
                        color='orange'
                        variant='solid'
                        icon={<PrinterFilled />}
                    />
                </Dropdown>
                <Dropdown menu={{ items: downloadItems }} placement="bottomRight">
                    <ActionButton
                        type='primary'
                        label='Tải ảnh'
                        color='orange'
                        variant='solid'
                        icon={<DownloadOutlined />}
                    />
                </Dropdown>
            </Space>

            {/* Nội dung in và xuất ảnh */}
            <div style={{ position: 'absolute', top: -9999, left: -9999 }}>
                <div ref={componentRef}>
                    <InvoiceToPrint
                        sizePrint={isDownloading ? '559px' : '300px'}
                        data={data}
                        invoiceDetails={invoiceDetails}
                        invoiceSummary={invoiceSummary}
                        printMode={printMode}
                    />
                </div>
            </div>
        </div>
    );
};

export default PrintInvoiceWrapper;
