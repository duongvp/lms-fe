import React from 'react';
import { Row, Col, Typography, Space } from 'antd';
import { CheckCircleFilled, CheckCircleOutlined, CloseCircleFilled, CopyOutlined, DownloadOutlined, RetweetOutlined, SaveFilled, SaveOutlined, ShareAltOutlined } from '@ant-design/icons';
import CustomTable from '@/components/ui/Table';
import { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import { IInvoiceDetail, IInvoiceTableData } from '@/types/invoice';
import { getInvoiceStatusLabel, InvoiceStatus } from '@/enums/invoice';
import PrintInvoiceWrapper from './PrintInvoiceWrapper';
import ConfirmButton from '@/components/ui/ConfirmButton';
import ActionButton from '@/components/ui/ActionButton';
import { cancelInvoice, exportInvoices } from '@/services/invoiceService';
import { useAuthStore } from '@/stores/authStore';
import { PermissionKey } from '@/types/permissions';
import useInvoiceStore from '@/stores/invoiceStore';
import GenericExportButton from '@/components/shared/GenericExportButton';
const { Text, Link } = Typography;

// Sửa lại prop nhận vào cho TableWithActions
interface TableWithActionsProps {
    data: Partial<IInvoiceTableData>[]; // Dữ liệu bảng
    invoiceDetails: Partial<IInvoiceDetail>;
    invoiceSummary: any;
}

const TableWithActions: React.FC<TableWithActionsProps> = ({ data, invoiceDetails, invoiceSummary }) => {
    console.log("🚀 ~ data:", data)
    console.log("🚀 ~ invoiceDetails:", invoiceDetails)
    const router = useRouter()
    const hasPermission = useAuthStore(state => state.hasPermission);
    const setShouldReload = useInvoiceStore(state => state.setShouldReload);
    const { warehouseId } = useAuthStore((state) => state.user)

    const columns: ColumnsType<Partial<IInvoiceTableData>> = [
        { title: 'Mã hàng', dataIndex: 'product_code', key: 'product_code' },
        {
            title: 'Tên hàng',
            dataIndex: 'product_name',
            key: 'product_name',
        },
        { title: 'Số lượng', dataIndex: 'quantity', key: 'quantity' },
        { title: 'Đơn giá', dataIndex: 'unit_price', key: 'unit_price', render: (value: any) => { return <span>{Number(value).toLocaleString()}</span> } },
        { title: 'Giảm giá', dataIndex: 'discount', key: 'discount', render: (value: any) => { return <span>{Number(value).toLocaleString()}</span> } },
        // { title: 'Giá bán', dataIndex: 'selling_price', key: 'selling_price', render: (value: any) => { return <span>{Number(value).toLocaleString()}</span> } },
        { title: 'Thành tiền', dataIndex: 'total_price', key: 'total_price', render: (value: any) => { return <span>{Number(value).toLocaleString()}</span> } },
    ];

    const handleConfirmOk = async () => {
        await cancelInvoice(invoiceDetails.invoice_id as number);
    };

    const handleCopyClick = () => {
        window.open(`/transactions/invoices/copy-invoice/${invoiceDetails.invoice_id}/${invoiceDetails.invoice_code}`, '_blank');
    }

    const handleEditClick = () => {
        window.open(`/transactions/invoices/edit/${invoiceDetails.invoice_id}/${invoiceDetails.invoice_code}`, '_blank');
    }

    const handleReturnClick = () => {
        let url = `/transactions/returns/create/${invoiceDetails.invoice_id}`
        if (invoiceDetails.return_id) {
            url = `/transactions/returns/edit/${invoiceDetails.return_id}`
        }
        router.push(url);
    }

    return (
        <div>
            <Row gutter={24} style={{ marginBottom: 12 }}>
                <Col xs={24} md={12} xl={10} xxl={6}>
                    <Row style={{ marginBottom: 8 }}>
                        <Col span={8}><Text strong>Mã hoá đơn:</Text></Col>
                        <Col><Text>{invoiceDetails?.invoice_code}</Text></Col>
                    </Row>
                    <Row style={{ marginBottom: 8 }}>
                        <Col span={8}><Text strong>Thời gian:</Text></Col>
                        <Col><Text>{dayjs(invoiceDetails.invoice_date).format('DD/MM/YYYY HH:mm')}</Text></Col>
                    </Row>
                    <Row style={{ marginBottom: 8 }}>
                        <Col span={8}><Text strong>Khách hàng:</Text></Col>
                        <Col><Link href="#">{invoiceDetails.customer_name}</Link></Col>
                    </Row>
                    <Row style={{ marginBottom: 8 }}>
                        <Col span={8}><Text strong>SĐT:</Text></Col>
                        <Col><Text>{invoiceDetails.customer_phone}</Text></Col>
                    </Row>
                    <Row style={{ marginBottom: 8 }}>
                        <Col span={8}><Text strong>Địa chỉ:</Text></Col>
                        <Col><Text>{invoiceDetails.customer_address}</Text></Col>
                    </Row>
                </Col>

                <Col xs={24} md={12} xl={8} xxl={6}>
                    <Row style={{ marginBottom: 8 }}>
                        <Col span={8}><Text strong>Trạng thái:</Text></Col>
                        <Col><Text>{getInvoiceStatusLabel(invoiceDetails.status as InvoiceStatus)}</Text></Col>
                    </Row>
                    <Row style={{ marginBottom: 8 }}>
                        <Col span={8}><Text strong>Chi nhánh:</Text></Col>
                        <Col><Text>{invoiceDetails.warehouse_name}</Text></Col>
                    </Row>
                    <Row style={{ marginBottom: 8 }}>
                        <Col span={8}><Text strong>Người tạo:</Text></Col>
                        <Col><Text>{invoiceDetails.created_by}</Text></Col>
                    </Row>
                    <Row style={{ marginBottom: 8 }}>
                        <Col span={8}><Text strong>Phiếu trả hàng:</Text></Col>
                        {invoiceDetails.return_code && <Col><Text copyable>{invoiceDetails.return_code}</Text></Col>}
                    </Row>
                </Col>
                <Col xs={24} md={24} xl={6} xxl={8} style={{ height: '100%' }}>
                    <Text strong italic style={{ paddingRight: 8 }}>Ghi chú:</Text>
                    <Text>{invoiceDetails.notes}</Text>
                </Col>
            </Row>

            <CustomTable
                bordered={true}
                dataSource={data}
                columns={columns}
                pagination={false}
                size='small'
            />

            <Row gutter={24} justify={"end"} align={"top"} style={{ marginTop: 12 }}>
                <Col xs={12} xl={8} xxl={6}>
                    <Row style={{ marginBottom: 8 }}>
                        <Col span={8}><Text strong>Tổng số lượng</Text></Col>
                        <Col span={16} style={{ textAlign: "end" }}><Text>{invoiceSummary?.total_quantity}</Text></Col>
                    </Row>
                    <Row style={{ marginBottom: 8 }}>
                        <Col span={8}><Text strong>Tổng số mặt hàng</Text></Col>
                        <Col span={16} style={{ textAlign: "end" }}><Text>{invoiceSummary?.total_items}</Text></Col>
                    </Row>
                    <Row style={{ marginBottom: 8 }}>
                        <Col span={8}><Text strong>Tổng thành tiền</Text></Col>
                        <Col span={16} style={{ textAlign: "end" }}><Text>{Number(invoiceSummary?.subtotal)?.toLocaleString()}</Text></Col>
                    </Row>
                    <Row style={{ marginBottom: 8 }}>
                        <Col span={8}><Text strong>Giảm giá</Text></Col>
                        <Col span={16} style={{ textAlign: "end" }}><Text>{Number(invoiceSummary?.discount_amount)?.toLocaleString()}</Text></Col>
                    </Row>
                    <Row style={{ marginBottom: 8 }}>
                        <Col span={8}><Text strong>VAT({Number(invoiceSummary?.VAT)}%)</Text></Col>
                        <Col span={16} style={{ textAlign: "end" }}><Text>{((Number(invoiceSummary?.VAT) / 100) * (Number(invoiceSummary?.subtotal) - Number(invoiceSummary?.discount_amount)))?.toLocaleString()}</Text></Col>
                    </Row>
                    <Row style={{ marginBottom: 8 }}>
                        <Col span={8}><Text strong>Tổng cộng</Text></Col>
                        <Col span={16} style={{ textAlign: "end" }}>{Number(invoiceSummary?.total_amount)?.toLocaleString()}</Col>
                    </Row>
                </Col>
            </Row>

            {
                invoiceDetails.status !== InvoiceStatus.CANCELLED && (
                    <Row justify="end" align="middle" style={{ marginTop: 16 }}>
                        <Col>
                            <Space>
                                {
                                    hasPermission(PermissionKey.RETURN_PROCESS) && (
                                        <ActionButton
                                            type='primary'
                                            label={`Trả hàng (${invoiceDetails.return_code ? 'cập nhật' : 'mới'})`}
                                            color='green'
                                            variant='solid'
                                            icon={<CheckCircleOutlined />}
                                            onClick={handleReturnClick}
                                        />
                                    )
                                }
                                {
                                    hasPermission(PermissionKey.INVOICE_EDIT) && !invoiceDetails.return_code && (
                                        <ActionButton
                                            type='primary'
                                            label='Cập nhật'
                                            color='green'
                                            variant='solid'
                                            icon={<CheckCircleFilled />}
                                            onClick={handleEditClick}
                                        />
                                    )
                                }
                                {
                                    hasPermission(PermissionKey.INVOICE_CREATE) && !invoiceDetails.return_code && (
                                        <ActionButton
                                            type='primary'
                                            label='Sao chép'
                                            color='green'
                                            variant='solid'
                                            icon={<CopyOutlined />}
                                            onClick={handleCopyClick}
                                        />
                                    )
                                }
                                {
                                    hasPermission(PermissionKey.INVOICE_PRINT) && !invoiceDetails.return_code && (
                                        <PrintInvoiceWrapper data={data} invoiceDetails={invoiceDetails} invoiceSummary={invoiceSummary} />
                                    )
                                }
                                {
                                    hasPermission(PermissionKey.INVOICE_EXPORT) && !invoiceDetails.return_code && (
                                        <GenericExportButton
                                            exportService={exportInvoices}
                                            serviceParams={[[invoiceDetails.invoice_id], warehouseId]}
                                            fileNamePrefix={`hoa_don_${invoiceDetails.invoice_code}`}
                                            buttonProps={{
                                                color: 'orange',
                                                variant: 'solid',
                                            }}
                                        />
                                    )
                                }
                                {
                                    hasPermission(PermissionKey.INVOICE_VOID) && !invoiceDetails.return_code && (
                                        <ConfirmButton
                                            label="Huỷ bỏ"
                                            customColor="red"
                                            icon={<CloseCircleFilled />}
                                            onConfirm={() => handleConfirmOk()}
                                            confirmMessage="Bạn có chắc chắn muốn huỷ hoá đơn này? Hành động này sẽ không thể hoàn tác."
                                            messageWhenSuccess="Huỷ phiếu thành công"
                                            messageWhenError="Có lỗi xảy ra khi huỷ phiếu"
                                            setShouldReload={setShouldReload}
                                        />
                                    )
                                }
                            </Space>
                        </Col>
                    </Row>
                )
            }
        </div>
    );
};

export default TableWithActions;
