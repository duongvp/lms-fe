import React from 'react';
import { Row, Col, Typography, Space } from 'antd';
import { CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons';
import CustomTable from '@/components/ui/Table';
import dayjs from 'dayjs';
import { getReturnOrderStatusLabel, Status } from '@/enums/status';
import ConfirmButton from '@/components/ui/ConfirmButton';
import ActionButton from '@/components/ui/ActionButton';
import { useRouter } from 'next/navigation';
import PrintReturnWrapper from './PrintReturnWrapper';
import { useAuthStore } from '@/stores/authStore';
import { PermissionKey } from '@/types/permissions';
import { cancelReturnOrder, exportReturnOrders } from '@/services/returnService';
import useReturnStore from '@/stores/returnStore';
import GenericExportButton from '@/components/shared/GenericExportButton';
import Link from 'next/link';

const { Text } = Typography;

const TableWithActions: React.FC<any> = ({ data, returnOrderDetails, returnOrderSummary }) => {
    const router = useRouter();
    const hasPermission = useAuthStore(state => state.hasPermission);
    const setShouldReload = useReturnStore(state => state.setShouldReload);
    const { warehouseId } = useAuthStore(state => state.user);

    const columns = [
        { title: 'Mã hàng', dataIndex: 'product_code', key: 'product_code' },
        { title: 'Tên hàng', dataIndex: 'product_name', key: 'product_name' },
        { title: 'Số lượng', dataIndex: 'quantity', key: 'quantity' },
        { title: 'Giá bán', dataIndex: 'unit_price', key: 'unit_price', render: (value: string) => Number(value).toLocaleString() },
        { title: 'Giá nhập lại', dataIndex: 'unit_price', key: 'unit_price', render: (value: string) => Number(value).toLocaleString() },
        {
            title: 'Thành tiền',
            dataIndex: 'total_price',
            key: 'total_price',
            render: (value: string) => Number(value).toLocaleString(),
        },
    ];

    return (
        <div>
            <Row gutter={24} style={{ marginBottom: 12 }}>
                <Col xs={24} md={12} xl={10} xxl={6}>
                    <Row style={{ marginBottom: 8 }}>
                        <Col span={8}><Text strong>Mã trả hàng:</Text></Col>
                        <Col><Text>{returnOrderDetails.return_code}</Text></Col>
                    </Row>
                    <Row style={{ marginBottom: 8 }}>
                        <Col span={8}><Text strong>Thời gian:</Text></Col>
                        <Col><Text>{dayjs(returnOrderDetails.return_date).format('DD/MM/YYYY HH:mm')}</Text></Col>
                    </Row>
                    <Row style={{ marginBottom: 8 }}>
                        <Col span={8}><Text strong>Khách hàng:</Text></Col>
                        <Col><Link href="#">{returnOrderDetails.customer_name}</Link></Col>
                    </Row>
                    <Row style={{ marginBottom: 8 }}>
                        <Col span={8}><Text strong>SĐT:</Text></Col>
                        <Col><Text>{returnOrderDetails.customer_phone}</Text></Col>
                    </Row>
                    <Row style={{ marginBottom: 8 }}>
                        <Col span={8}><Text strong>Địa chỉ:</Text></Col>
                        <Col><Text>{returnOrderDetails.customer_address}</Text></Col>
                    </Row>
                </Col>

                <Col xs={24} md={12} xl={8} xxl={6}>
                    <Row style={{ marginBottom: 8 }}>
                        <Col span={8}><Text strong>Trạng thái:</Text></Col>
                        <Col><Text>{getReturnOrderStatusLabel(returnOrderDetails.status)}</Text></Col>
                    </Row>
                    <Row style={{ marginBottom: 8 }}>
                        <Col span={8}><Text strong>Chi nhánh:</Text></Col>
                        <Col><Text>{returnOrderDetails.warehouse_name}</Text></Col>
                    </Row>
                    <Row style={{ marginBottom: 8 }}>
                        <Col span={8}><Text strong>Người tạo:</Text></Col>
                        <Col><Text>{returnOrderDetails.created_by}</Text></Col>
                    </Row>
                    <Row style={{ marginBottom: 8 }}>
                        <Col span={8}><Text strong>Mã hoá đơn:</Text></Col>
                        <Col><Text copyable>{returnOrderDetails.invoice_code}</Text></Col>
                    </Row>
                </Col>

                <Col xs={24} md={24} xl={6} xxl={8}>
                    <Text italic style={{ paddingRight: 12 }}> Ghi chú:</Text>
                    <Text italic>{returnOrderDetails.notes}</Text>
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
                        <Col span={16} style={{ textAlign: "end" }}><Text>{returnOrderSummary?.total_quantity}</Text></Col>
                    </Row>
                    <Row style={{ marginBottom: 8 }}>
                        <Col span={8}><Text strong>Tổng số mặt hàng</Text></Col>
                        <Col span={16} style={{ textAlign: "end" }}><Text>{returnOrderSummary?.total_items}</Text></Col>
                    </Row>
                    <Row style={{ marginBottom: 8 }}>
                        <Col span={8}><Text strong>Tổng tiền hàng trả</Text></Col>
                        <Col span={16} style={{ textAlign: "end" }}><Text>{Number(returnOrderSummary?.total_amount)?.toLocaleString()}</Text></Col>
                    </Row>
                    <Row style={{ marginBottom: 8 }}>
                        <Col span={8}><Text strong>Khách đã trả</Text></Col>
                        <Col span={16} style={{ textAlign: "end" }}><Text>{Number(returnOrderSummary?.amount_paid)?.toLocaleString()}</Text></Col>
                    </Row>
                    <Row style={{ marginBottom: 8 }}>
                        <Col span={8}><Text strong>Phí trả hàng </Text></Col>
                        <Col span={16} style={{ textAlign: "end" }}><Text>{Number(returnOrderSummary?.return_fee)?.toLocaleString()}</Text></Col>
                    </Row>
                    <Row style={{ marginBottom: 8 }}>
                        <Col span={8}><Text strong>Cần trả khách</Text></Col>
                        <Col span={16} style={{ textAlign: "end" }}>{Number(returnOrderSummary?.refund_amount)?.toLocaleString()}</Col>
                    </Row>
                </Col>
            </Row>

            {
                returnOrderDetails.status !== Status.CANCELLED && (
                    <Row justify="end" align="middle" style={{ marginTop: 16 }}>
                        <Col>
                            <Space>
                                {
                                    hasPermission(PermissionKey.RETURN_EDIT) && (
                                        <ActionButton
                                            type='primary'
                                            label='Cập nhật'
                                            color='green'
                                            variant='solid'
                                            icon={<CheckCircleFilled />}
                                            onClick={() => {
                                                router.push(`/transactions/returns/edit/${returnOrderDetails.return_id}`)
                                            }}
                                        />
                                    )
                                }
                                {
                                    hasPermission(PermissionKey.RETURN_PRINT) && (
                                        <PrintReturnWrapper data={data} details={returnOrderDetails} summary={returnOrderSummary} />
                                    )
                                }
                                {
                                    hasPermission(PermissionKey.RETURN_EXPORT) && (
                                        <GenericExportButton
                                            exportService={exportReturnOrders}
                                            serviceParams={[[returnOrderDetails.return_id], warehouseId]}
                                            fileNamePrefix={`phiếu trả hàng ${returnOrderDetails.return_code}`}
                                            buttonProps={{
                                                color: 'orange',
                                                variant: 'solid',
                                            }}
                                        />
                                    )
                                }
                                {
                                    hasPermission(PermissionKey.RETURN_VOID) && (
                                        <ConfirmButton
                                            label="Huỷ bỏ"
                                            customColor="red"
                                            icon={<CloseCircleFilled />}
                                            onConfirm={async () => await cancelReturnOrder(returnOrderDetails.return_id)}
                                            confirmMessage="Bạn có chắc chắn muốn huỷ thao tác này?"
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
