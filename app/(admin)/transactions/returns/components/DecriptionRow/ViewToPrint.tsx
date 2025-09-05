import React from 'react';
import { Row, Col, Typography, Divider } from 'antd';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

// Sửa lại prop nhận vào cho ViewToPrint
interface TableWithActionsProps {
    data: Partial<any>[]; // Dữ liệu bảng
    details: Partial<any>;
    summary: Partial<any>;
    sizePrint: string | number
}

const ViewToPrint: React.FC<TableWithActionsProps> = ({ data, details, summary, sizePrint }) => {
    console.log("🚀 ~ details:", details)
    return (
        <div
            style={{
                width: sizePrint, // ~ tương đương khổ K80
                padding: 8,
                fontSize: 12,
                fontFamily: 'Arial, sans-serif',
                margin: '0 auto',
                lineHeight: 1.4,
            }}
        >
            <Title level={4} style={{ textAlign: 'center', marginBottom: 8, textTransform: 'uppercase' }}>
                {details.warehouse_name}
            </Title>
            <Text style={{ display: 'block', textAlign: 'center', marginBottom: 8 }}>
                Địa chỉ: {details.warehouse_address}
            </Text>
            <Text style={{ display: 'block', textAlign: 'center', marginBottom: 16 }}>
                Điện thoại: {details.warehouse_phone}
            </Text>
            <Title level={3} style={{ textAlign: 'center', marginBottom: 4, textTransform: 'uppercase' }}>
                Hoá đơn trả hàng
            </Title>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 4, marginBottom: 16 }}>
                <Text>Số HD: {details?.return_code}</Text>
                <Text>Ngày: {dayjs(details.return_date).format('DD/MM/YYYY HH:mm:ss')}</Text>
            </div>
            <div style={{ marginBottom: 16, fontSize: 14 }}>
                <Text strong>Khách hàng:</Text> {details.customer_name}
                <br />
                <Text strong>SĐT:</Text> {details.customer_phone}
                <br />
                <Text strong>Địa chỉ:</Text> {details.customer_address}
                <br />
                <Text strong>Người tạo:</Text> {details.created_by}
            </div>

            <Divider style={{ margin: '12px 0', borderTop: '1px dashed #000' }} />


            <table style={{ width: '100%', marginBottom: 16, borderCollapse: 'collapse' }}>
                <thead>
                    <tr>
                        <th style={{ textAlign: 'left', borderBottom: '1px dashed #000', padding: '4px 0' }}>Đơn giá</th>
                        <th style={{ textAlign: 'center', borderBottom: '1px dashed #000', padding: '4px 0' }}>SL</th>
                        <th style={{ textAlign: 'right', borderBottom: '1px dashed #000', padding: '4px 0' }}>Thành tiền</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((item, index) => (
                        <React.Fragment key={index}>
                            <tr>
                                <td colSpan={3} style={{ padding: '4px 0', fontSize: 14 }}>{item.product_name}</td>
                            </tr>
                            <tr>
                                <td style={{ textAlign: 'left', padding: '4px 0' }}>{(Number(item.unit_price) - Number(item.discount)).toLocaleString()}</td>
                                <td style={{ textAlign: 'center', padding: '4px 0' }}>{item.quantity}</td>
                                <td style={{ textAlign: 'right', padding: '4px 0' }}>{(Number(item.total_price)).toLocaleString()}</td>
                            </tr>
                        </React.Fragment>
                    ))}
                </tbody>
            </table>

            <Divider style={{ margin: '12px 0', borderTop: '1px dashed #000' }} />
            <div>
                <Row justify="space-between" style={{ marginBottom: 8, paddingLeft: 40 }}>
                    <Col>
                        <Text strong>Tổng tiền hoá đơn trả:</Text>
                    </Col>
                    <Col>
                        <Text strong>{Number(summary?.total_amount)?.toLocaleString()}</Text>
                    </Col>
                </Row>

                <Row justify="space-between" style={{ marginBottom: 8, paddingLeft: 40 }}>
                    <Col>
                        <Text strong>Phí trả hàng:</Text>
                    </Col>
                    <Col>
                        <Text strong>{Number(summary?.return_fee)?.toLocaleString()}</Text>
                    </Col>
                </Row>
                <Row justify="space-between" style={{ marginBottom: 16, paddingLeft: 40 }}>
                    <Col>
                        <Text strong>Cần trả khách hàng:</Text>
                    </Col>
                    <Col>
                        <Text strong>{Number(summary?.refund_amount)?.toLocaleString()}</Text>
                    </Col>
                </Row>
            </div>
        </div>
    );
};

export default ViewToPrint;

