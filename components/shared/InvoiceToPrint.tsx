import React from 'react';
import { Row, Col, Typography, Divider } from 'antd';
import dayjs from 'dayjs';
import { IInvoiceDetail, IInvoiceTableData } from '@/types/invoice';

const { Text, Title } = Typography;

type printMode = 'full' | 'simple' | 'shortening';

// Sửa lại prop nhận vào cho InvoiceToPrint
interface TableWithActionsProps {
    data: Partial<IInvoiceTableData>[]; // Dữ liệu bảng
    invoiceDetails: Partial<IInvoiceDetail>;
    invoiceSummary: any;
    printMode: printMode;
    sizePrint: string
}

const InvoiceToPrint: React.FC<TableWithActionsProps> = ({ data, invoiceDetails, invoiceSummary, printMode, sizePrint }) => {
    console.log("🚀 ~ InvoiceToPrint ~ data:", data)
    console.log("🚀 ~ invoiceDetails:", invoiceDetails)
    const numberToWords = (num: number): string => {
        if (num === 0) return 'không đồng';

        const units = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
        const tens = ['', 'mười', 'hai mươi', 'ba mươi', 'bốn mươi', 'năm mươi',
            'sáu mươi', 'bảy mươi', 'tám mươi', 'chín mươi'];
        const scales = ['', 'nghìn', 'triệu', 'tỷ'];

        const convertLessThanOneThousand = (n: number): string => {
            if (n === 0) return '';
            if (n < 10) return units[n];
            if (n < 20) return 'mười ' + (n % 10 !== 1 ? units[n % 10] : 'mốt');
            if (n < 100) {
                const ten = Math.floor(n / 10);
                const unit = n % 10;
                return tens[ten] + (unit !== 0 ? ' ' + (unit === 1 ? 'mốt' : units[unit]) : '');
            }

            const hundred = Math.floor(n / 100);
            const remainder = n % 100;
            return units[hundred] + ' trăm' + (remainder !== 0 ? ' ' + convertLessThanOneThousand(remainder) : '');
        };

        if (num < 0) return 'âm ' + numberToWords(Math.abs(num));

        let result = '';
        let scaleIndex = 0;

        while (num > 0) {
            const chunk = num % 1000;
            if (chunk !== 0) {
                let chunkStr = convertLessThanOneThousand(chunk);
                if (scaleIndex > 0) {
                    chunkStr += ' ' + scales[scaleIndex];
                }
                result = chunkStr + ' ' + result;
            }
            num = Math.floor(num / 1000);
            scaleIndex++;
        }

        return result.trim() + ' đồng';
    };

    const changeNameInvoice = (printMode: printMode) => {
        switch (printMode) {
            case 'full':
                return 'Hoá đơn tính tiền';
            case 'simple':
                return 'Phiếu giao hàng';
            case 'shortening':
                return 'Phiếu giao hàng';
            default:
                return 'Hoá đơn tính tiền';
        }
    }

    return (
        // <div style={{ padding: 16, maxWidth: 400, margin: '0 auto' }}>
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
            {
                printMode !== 'shortening' && (
                    <>
                        <Title level={4} style={{ textAlign: 'center', marginBottom: 8, textTransform: 'uppercase' }}>
                            {invoiceDetails.warehouse_name}
                        </Title>
                        <Text style={{ display: 'block', textAlign: 'center', marginBottom: 8 }}>
                            Địa chỉ: {invoiceDetails.warehouse_address}
                        </Text>
                        <Text style={{ display: 'block', textAlign: 'center', marginBottom: 16 }}>
                            Điện thoại: {invoiceDetails.warehouse_phone}
                        </Text>
                    </>
                )
            }
            <Title level={3} style={{ textAlign: 'center', marginBottom: 4, textTransform: 'uppercase' }}>
                {changeNameInvoice(printMode)}
            </Title>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 4, marginBottom: 16 }}>
                <Text>Số HD: {invoiceDetails?.invoice_code}</Text>
                <Text>Ngày: {dayjs(invoiceDetails.invoice_date).format('DD/MM/YYYY HH:mm:ss')}</Text>
            </div>
            <div style={{ marginBottom: 16 }}>
                <Text strong>Khách hàng:</Text> {invoiceDetails.customer_name}
                <br />
                <Text strong>SĐT: </Text> {invoiceDetails.customer_phone}
                <br />
                <Text strong>Địa chỉ: </Text> {invoiceDetails.customer_address}
                <br />
                <Text strong>Người tạo:</Text> {invoiceDetails.created_by}
            </div>

            <Divider style={{ margin: '12px 0', borderTop: '1px dashed #000' }} />


            {
                printMode === 'full' ? (
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
                                        <td style={{ textAlign: 'right', padding: '4px 0' }}>{((Number(item.unit_price) - Number(item.discount)) * (item.quantity ?? 0)).toLocaleString()}</td>
                                    </tr>
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <table style={{ width: '100%', marginBottom: 16, borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th colSpan={3} style={{ textAlign: 'left', borderBottom: '1px dashed #000', padding: '4px 0' }}>Tên sản phẩm</th>
                                <th style={{ borderBottom: '1px dashed #000', padding: '4px 0', textAlign: 'right' }}>Số lượng</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((item, index) => (
                                <React.Fragment key={index}>
                                    <tr>
                                        <td colSpan={3} style={{ padding: '4px 0' }}>{item.product_name}</td>
                                        <td style={{ padding: '4px 0', textAlign: 'right' }}>{item.quantity}</td>
                                    </tr>
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                )
            }
            <Divider style={{ margin: '12px 0', borderTop: '1px dashed #000' }} />
            {
                printMode === 'full' && (
                    <div>
                        <Row justify="space-between" style={{ marginBottom: 8, paddingLeft: 130 }}>
                            <Col>
                                <Text strong>Tổng tiền hàng:</Text>
                            </Col>
                            <Col>
                                <Text strong>{Number(invoiceSummary?.subtotal)?.toLocaleString()}</Text>
                            </Col>
                        </Row>

                        <Row justify="space-between" style={{ marginBottom: 8, paddingLeft: 130 }}>
                            <Col>
                                <Text strong>Chiết khấu:</Text>
                            </Col>
                            <Col>
                                <Text strong>{Number(invoiceSummary?.discount_amount)?.toLocaleString()}</Text>
                            </Col>
                        </Row>
                        <Row justify="space-between" style={{ marginBottom: 8, paddingLeft: 130 }}>
                            <Col>
                                <Text strong>VAT:</Text>
                            </Col>
                            <Col>
                                <Text strong>{((Number(invoiceSummary?.VAT) / 100) * (Number(invoiceSummary?.subtotal) - Number(invoiceSummary?.discount_amount)))?.toLocaleString()}</Text>
                            </Col>
                        </Row>

                        <Row justify="space-between" style={{ marginBottom: 16, paddingLeft: 130 }}>
                            <Col>
                                <Text strong>Tổng thanh toán:</Text>
                            </Col>
                            <Col>
                                <Text strong>{Number(invoiceSummary?.total_amount)?.toLocaleString()}</Text>
                            </Col>
                        </Row>
                        <Text style={{ fontStyle: 'italic', display: 'block', textAlign: 'right' }}>
                            ({numberToWords(invoiceSummary?.total_amount ?? 0)})
                        </Text>
                    </div>
                )
            }
            <Text style={{ display: 'block', textAlign: 'center', fontWeight: '500', marginTop: 24, fontStyle: 'italic' }}>
                QUÝ KHÁCH VUI LÒNG KIỂM TRA HÀNG NGAY SAU KHI NHẬN ĐƯỢC HÀNG <br />
                KHÔNG GIẢI QUYẾT BẤT KỲ KHIẾU NẠI ĐƠN HÀNG SAU 48H NHẬN HÀNG <br />
                CẢM ƠN VÀ HẸN GẶP LẠI QUÝ KHÁCH
            </Text>
        </div >
    );
};

export default InvoiceToPrint;

