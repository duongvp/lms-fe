import React, { useEffect } from 'react';
import { Row, Col, Typography, Space, Spin, } from 'antd';
import { CheckCircleFilled, CloseCircleFilled, CopyOutlined } from '@ant-design/icons';
import CustomTable from '@/components/ui/Table';
import { getPOStatusLabel, POStatus } from '@/enums/purchaseOrder';
import ActionButton from '@/components/ui/ActionButton';
import { useRouter } from 'next/navigation';
import ConfirmButton from '@/components/ui/ConfirmButton';
import { cancelPurchaseOrder, exportPurchaseOrders, IPurchaseOrderBase, IPurchaseOrderDetail, IPurchaseOrderSummary, updatePurchaseOrder } from '@/services/purchaseOrderService';
import dayjs from 'dayjs';
import usePurchaseOrderStore from '@/stores/purchaseOrderStore';
import PrintPurchaseWrapper from './PrintPurchaseWrapper';
import { useAuthStore } from '@/stores/authStore';
import { PermissionKey } from '@/types/permissions';
import GenericExportButton from '@/components/shared/GenericExportButton';

const { Text, Link } = Typography;

// Sửa lại prop nhận vào cho TableWithActions
interface TableWithActionsProps {
    poDetail: Partial<IPurchaseOrderDetail>[]; // Dữ liệu bảng
    poInfos: Partial<IPurchaseOrderBase>;
    poSummary: Partial<IPurchaseOrderSummary>
}

const TableWithActions: React.FC<TableWithActionsProps> = ({ poDetail, poInfos, poSummary }) => {
    const router = useRouter();
    const setShouldReload = usePurchaseOrderStore(state => state.setShouldReload);
    const hasPermission = useAuthStore(state => state.hasPermission);
    const { warehouseId } = useAuthStore((state) => state.user)

    const columns = [
        { title: 'Mã hàng', dataIndex: 'product_code', key: 'product_code' },
        { title: 'Tên hàng', dataIndex: 'product_name', key: 'product_name' },
        { title: 'Số lượng', dataIndex: 'quantity', key: 'quantity' },
        { title: 'Đơn giá', dataIndex: 'unit_price', key: 'unit_price', render: (value: any) => { return <span>{Number(value).toLocaleString()}</span> } },
        { title: 'Giảm giá', dataIndex: 'discount', key: 'discount', render: (value: any) => { return <span>{Number(value).toLocaleString()}</span> } },
        { title: 'Thành tiền', dataIndex: 'total_price', key: 'total_price', render: (value: any) => { return <span>{Number(value).toLocaleString()}</span> } },
    ];

    const handleConfirmOk = async () => {
        await cancelPurchaseOrder(poInfos.po_id as number);
        setShouldReload(true);
    }

    return (
        <div>
            <Row gutter={24} style={{ marginBottom: 12 }}>
                <Col xs={24} md={12} xl={10} xxl={6} >
                    <Row style={{ marginBottom: 8 }}>
                        <Col span={8}><Text strong>Mã nhập hàng:</Text></Col>
                        <Col><Text>{poInfos.po_code}</Text></Col>
                    </Row>
                    <Row style={{ marginBottom: 8 }}>
                        <Col span={8}><Text strong>Thời gian:</Text></Col>
                        <Col><Text>{dayjs(poInfos.order_date).format('DD/MM/YYYY HH:mm')}</Text></Col>
                    </Row>
                    <Row style={{ marginBottom: 8 }}>
                        <Col span={8}><Text strong>Nhà cung cấp:</Text></Col>
                        <Col><Link href="#">{poInfos.supplier_name}</Link></Col>
                    </Row>
                    <Row style={{ marginBottom: 8 }}>
                        <Col span={8}><Text strong>Người tạo:</Text></Col>
                        <Col><Text>{poInfos.created_by}</Text></Col>
                    </Row>
                </Col>

                <Col xs={24} md={12} xl={8} xxl={6}>
                    <Row style={{ marginBottom: 8 }}>
                        <Col span={8}><Text strong>Trạng thái:</Text></Col>
                        <Col><Text>{getPOStatusLabel(poInfos.status as POStatus)}</Text></Col>
                    </Row>
                    <Row style={{ marginBottom: 8 }}>
                        <Col span={8}><Text strong>Chi nhánh:</Text></Col>
                        <Col><Text>{poInfos.warehouse_name}</Text></Col>
                    </Row>
                </Col>
                <Col xs={24} md={24} xl={6} xxl={8} style={{ height: '100%' }}>
                    <Text strong italic style={{ paddingRight: 8 }}>Ghi chú:</Text>
                    <Text>{poInfos.notes}</Text>
                </Col>
            </Row>

            <CustomTable
                bordered={true}
                dataSource={poDetail}
                columns={columns}
                pagination={false}
                size='small'
            />

            <Row gutter={24} justify={"end"} align={"top"} style={{ marginTop: 12 }}>
                <Col xs={12} xl={8} xxl={6}>
                    <Row style={{ marginBottom: 8 }}>
                        <Col span={8}><Text strong>Tổng số lượng</Text></Col>
                        <Col span={16} style={{ textAlign: "end" }}><Text>{poSummary?.total_quantity}</Text></Col>
                    </Row>
                    <Row style={{ marginBottom: 8 }}>
                        <Col span={8}><Text strong>Tổng số mặt hàng</Text></Col>
                        <Col span={16} style={{ textAlign: "end" }}><Text>{poSummary?.total_items}</Text></Col>
                    </Row>
                    <Row style={{ marginBottom: 8 }}>
                        <Col span={8}><Text strong>Tổng thành tiền</Text></Col>
                        <Col span={16} style={{ textAlign: "end" }}><Text>{Number(poSummary?.subtotal)?.toLocaleString()}</Text></Col>
                    </Row>
                    <Row style={{ marginBottom: 8 }}>
                        <Col span={8}><Text strong>Giảm giá</Text></Col>
                        <Col span={16} style={{ textAlign: "end" }}><Text>{Number(poSummary?.discount_amount)?.toLocaleString()}</Text></Col>
                    </Row>
                    <Row style={{ marginBottom: 8 }}>
                        <Col span={8}><Text strong>Tổng cộng</Text></Col>
                        <Col span={16} style={{ textAlign: "end" }}>{Number(poSummary?.total_amount)?.toLocaleString()}</Col>
                    </Row>
                </Col>
            </Row>

            {
                poInfos.status !== POStatus.CANCELLED && (
                    <Row justify="end" align="middle" style={{ marginTop: 16 }}>
                        <Col>
                            <Space>
                                {
                                    hasPermission(PermissionKey.IMPORT_EDIT) && (
                                        <ActionButton
                                            type='primary'
                                            label='Cập nhật'
                                            color='green'
                                            variant='solid'
                                            icon={<CheckCircleFilled />}
                                            onClick={() => {
                                                router.push(`/transactions/purchase-orders/edit/${poInfos.po_id}`)
                                            }}
                                        />
                                    )
                                }
                                {
                                    hasPermission(PermissionKey.IMPORT_CREATE) && (
                                        <ActionButton
                                            type='primary'
                                            label='Sao chép'
                                            color='green'
                                            variant='solid'
                                            icon={<CopyOutlined />}
                                            onClick={() => {
                                                router.push(`/transactions/purchase-orders/copy-purchase-order/${poInfos.po_id}`)
                                            }}
                                        />
                                    )
                                }
                                {
                                    hasPermission(PermissionKey.IMPORT_PRINT) && (
                                        <PrintPurchaseWrapper data={poDetail} details={poInfos} summary={poSummary} />
                                    )
                                }
                                {
                                    hasPermission(PermissionKey.IMPORT_EXPORT) && (
                                        <GenericExportButton
                                            exportService={exportPurchaseOrders}
                                            serviceParams={[[poInfos.po_id], warehouseId]}
                                            fileNamePrefix={`phieu_nhap_hang_${poInfos.po_code}`}
                                            buttonProps={{
                                                color: 'orange',
                                                variant: 'solid',
                                            }}
                                        />
                                    )
                                }
                                {
                                    hasPermission(PermissionKey.IMPORT_VOID) && (
                                        <ConfirmButton
                                            label="Huỷ bỏ"
                                            customColor="red"
                                            icon={<CloseCircleFilled />}
                                            onConfirm={handleConfirmOk}
                                            confirmMessage={`Bạn có chắc chắn muốn huỷ phiếu ${poInfos.po_code}? Hành động này sẽ không thể hoàn tác.`}
                                            messageWhenSuccess="Huỷ phiếu thành công"
                                            messageWhenError="Có lỗi xảy ra khi huỷ phiếu"
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
