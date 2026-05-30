"use client";
import React, { useMemo, useState } from "react";
import {
    Drawer,
    Button,
    Row,
    Col,
    Typography,
    Divider,
    Space,
    Table,
    Input,
    Radio,
    InputNumber,
    Badge,
    Tag,
} from "antd";
import OtherFeesModal, { OtherFee } from "./OtherFeesModal";
import VoucherModal, { Voucher } from "./VoucherModal";
import {
    CloseOutlined,
    InfoCircleOutlined,
    PrinterOutlined,
    WalletOutlined,
    CreditCardOutlined,
    SwapOutlined,
    EllipsisOutlined,
    CalendarOutlined,
    ClockCircleOutlined,
    UserOutlined,
    PrinterFilled,
} from "@ant-design/icons";
import { useReactToPrint } from "react-to-print";
import InvoiceToPrint from "@/components/shared/InvoiceToPrint";
import { useAuthStore } from "@/stores/authStore";

const { Text, Title } = Typography;

type Product = {
    id: number;
    name: string;
    price: number;
    category_id?: number;
    category_name?: string;
};

type OrderItem = {
    uniqueId: string;
    product: Product;
    quantity: number;
};

interface PaymentDrawerProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (payload: {
        paymentMethod: 'cash' | 'transfer' | 'card' | 'prepaid';
        finalAmount: number;
        discount: number;
        otherFeesTotal: number;
        voucherDiscountAmount: number;
        voucherCode?: string;
        customerPaid: number;
    }) => void;
    roomLabel: string;
    floor?: string;
    items: OrderItem[];
    totalAmount: number;
    customerName?: string;
    loading?: boolean;
    // Props for proforma print
    warehouseData?: any;
}

const COLORS = {
    primary: "#3467cc",
    success: "#52c41a",
    warning: "#faad14",
    danger: "#f5222d",
    border: "#f0f0f0",
    bgRight: "#f5f7fa",
    bgCategory: "#f2f7ff"
};

const PaymentDrawer: React.FC<PaymentDrawerProps> = ({
    open,
    onClose,
    onConfirm,
    roomLabel,
    floor,
    items,
    totalAmount,
    customerName = "Khách lẻ",
    loading = false,
    warehouseData,
}) => {
    const componentRef = React.useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({ contentRef: componentRef });
    const { user } = useAuthStore();

    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [customerPaid, setCustomerPaid] = useState<number>(totalAmount);
    const [discount, setDiscount] = useState(0);
    const [isOtherFeesModalOpen, setIsOtherFeesModalOpen] = useState(false);
    const [selectedFees, setSelectedFees] = useState<OtherFee[]>([]);
    const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
    const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);

    const voucherDiscountAmount = useMemo(() => {
        if (!appliedVoucher) return 0;
        if (appliedVoucher.discountType === 'percentage') {
            return (totalAmount * appliedVoucher.discountValue) / 100;
        }
        return appliedVoucher.discountValue;
    }, [appliedVoucher, totalAmount]);

    const otherFeesTotal = useMemo(() => {
        return selectedFees.reduce((sum, fee) => {
            const amount = fee.isPercentage ? (totalAmount * fee.rate) / 100 : fee.rate;
            return sum + Math.round(amount);
        }, 0);
    }, [selectedFees, totalAmount]);

    const groupedItems = useMemo(() => {
        const groups: Record<string, OrderItem[]> = {};
        items.forEach(item => {
            const cat = item.product.category_name || "MÓN KHÁC";
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(item);
        });
        return groups;
    }, [items]);

    const changeDue = Math.max(0, customerPaid - (totalAmount - discount));

    const quickCashOptions = [15000, 16000, 20000, 50000, 100000, 200000, 500000];

    const currentDate = new Date().toLocaleDateString('vi-VN');
    const currentTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    const tableColumns = [
        {
            title: <Text strong style={{ fontSize: 12, color: '#8c8c8c' }}>ĐỒ UỐNG</Text>,
            key: 'name',
            render: (_: any, record: OrderItem, index: number) => (
                <Text style={{ fontSize: 13, color: '#262626' }}>{index + 1}. {record.product.name}</Text>
            )
        },
        {
            title: <Text strong style={{ fontSize: 12, color: '#8c8c8c' }}>SL</Text>,
            dataIndex: 'quantity',
            align: 'center' as const,
            width: 100,
            render: (val: number) => <Text style={{ fontSize: 13 }}>{val}</Text>
        },
        {
            title: <Text strong style={{ fontSize: 12, color: '#8c8c8c' }}>ĐƠN GIÁ</Text>,
            dataIndex: ['product', 'price'],
            align: 'right' as const,
            width: 100,
            render: (price: number) => <Text style={{ fontSize: 13 }}>{price.toLocaleString()}</Text>
        },
        {
            title: <Text strong style={{ fontSize: 12, color: '#8c8c8c' }}>THÀNH TIỀN</Text>,
            align: 'right' as const,
            width: 120,
            render: (_: any, record: OrderItem) => <Text strong style={{ fontSize: 13 }}>{(record.product.price * record.quantity).toLocaleString()}</Text>
        }
    ];

    return (
        <>
            <Drawer
                open={open}
                onClose={onClose}
                width={"70%"}
                closable={false}
                styles={{ body: { padding: 0, overflow: 'hidden' } }}
            >
                <div style={{ display: 'flex', height: '100vh', background: '#fff' }}>
                    {/* Left Panel - Order Details */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${COLORS.border}` }}>
                        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${COLORS.border}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                <div>
                                    <Title level={4} style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                                        Thanh toán #202-67 • {roomLabel} {floor ? `/ Tầng ${floor}` : ""}
                                    </Title>
                                    <Space style={{ marginTop: 8 }} size={16}>
                                        <Space size={4}>
                                            <div style={{ width: 18, height: 18, borderRadius: '50%', border: '1px solid #bfbfbf', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <UserOutlined style={{ fontSize: 10, color: '#8c8c8c' }} />
                                            </div>
                                            <Text strong style={{ fontSize: 14 }}>{customerName}</Text>
                                        </Space>
                                        <Divider type="vertical" />
                                        <Button type="link" size="small" style={{ padding: 0, height: 'auto', fontSize: 14 }}>Thanh toán từng phần</Button>
                                    </Space>
                                </div>
                                <Space size={12}>
                                    <Text type="secondary" style={{ fontSize: 13 }}>{currentDate} {currentTime}</Text>
                                    <CalendarOutlined style={{ color: '#8c8c8c' }} />
                                    <ClockCircleOutlined style={{ color: '#8c8c8c' }} />
                                </Space>
                            </div>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {Object.entries(groupedItems).map(([category, catItems]) => (
                                <div key={category}>
                                    <div style={{ background: COLORS.bgCategory, padding: '6px 24px' }}>
                                        <Text strong style={{ fontSize: 12, color: COLORS.primary }}>{category.toUpperCase()}</Text>
                                    </div>
                                    <Table
                                        dataSource={catItems}
                                        pagination={false}
                                        size="small"
                                        columns={tableColumns}
                                        rowKey="uniqueId"
                                        className="payment-items-table"
                                    />
                                </div>
                            ))}
                        </div>

                        <div style={{ padding: '16px 24px', borderTop: `1px solid ${COLORS.border}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Space>
                                    <Text strong style={{ fontSize: 14 }}>Tổng tiền hàng</Text>
                                    <div style={{ background: '#e6f4ff', color: COLORS.primary, padding: '0 6px', borderRadius: 4, fontSize: 12, fontWeight: 700 }}>{items.length}</div>
                                </Space>
                                <Text strong style={{ fontSize: 16 }}>{totalAmount.toLocaleString()}</Text>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel - Transaction Details */}
                    <div style={{ width: 420, display: 'flex', flexDirection: 'column', background: COLORS.bgRight }}>
                        <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                <Title level={5} style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Chi tiết giao dịch</Title>
                                <CloseOutlined onClick={onClose} style={{ color: '#bfbfbf', cursor: 'pointer' }} />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Space>
                                        <Text style={{ color: '#595959' }}>Tổng tiền hàng</Text>
                                        <div style={{ background: '#e6f7ff', color: COLORS.primary, padding: '0 6px', borderRadius: 4, fontSize: 12, fontWeight: 700 }}>{items.length}</div>
                                    </Space>
                                    <Text strong style={{ fontSize: 15 }}>{totalAmount.toLocaleString()}</Text>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={{ color: '#595959' }}>Giảm giá</Text>
                                    <Text strong style={{ fontSize: 15 }}>{discount.toLocaleString()}</Text>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setIsVoucherModalOpen(true)}>
                                    <Text style={{ color: '#595959' }}>Voucher</Text>
                                    <Space>
                                        {appliedVoucher ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <Tag color="green" closable onClose={(e) => { e.stopPropagation(); setAppliedVoucher(null); }} style={{ borderRadius: 6, margin: 0 }}>
                                                    {appliedVoucher.code} (-{voucherDiscountAmount.toLocaleString()}đ)
                                                </Tag>
                                            </div>
                                        ) : (
                                            <Text type="secondary" style={{ fontSize: 13, borderBottom: '1px dashed #d9d9d9' }}>Thêm mã voucher</Text>
                                        )}
                                    </Space>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setIsOtherFeesModalOpen(true)}>
                                    <Space>
                                        <Text style={{ color: '#595959' }}>Thu khác</Text>
                                        <InfoCircleOutlined style={{ color: '#bfbfbf', fontSize: 14 }} />
                                    </Space>
                                    <Text strong style={{ fontSize: 15, borderBottom: '1px dashed #d9d9d9' }}>{otherFeesTotal.toLocaleString()}</Text>
                                </div>

                                {/* <div style={{ margin: '8px 0', borderTop: '2px solid #3467cc33' }}></div> */}

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid #d9d9d9' }}>
                                    <Text strong style={{ fontSize: 15 }}>Khách cần trả</Text>
                                    <Text strong style={{ fontSize: 18, color: COLORS.primary }}>
                                        {(totalAmount - discount - voucherDiscountAmount + otherFeesTotal).toLocaleString()}
                                    </Text>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text strong style={{ fontSize: 14 }}>Khách thanh toán (F8)</Text>
                                    <InputNumber
                                        value={customerPaid}
                                        onChange={(val) => setCustomerPaid(val || 0)}
                                        variant="borderless"
                                        style={{
                                            textAlign: 'right',
                                            width: 150,
                                            fontSize: 20,
                                            fontWeight: 700,
                                            color: COLORS.primary,
                                            borderBottom: `2.5px solid ${COLORS.primary}`,
                                            padding: 0
                                        }}
                                        formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                    />
                                </div>

                                {/* Payment Methods */}
                                <div style={{ marginTop: 8 }}>
                                    <Radio.Group value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} style={{ width: '100%' }}>
                                        <Row gutter={8}>
                                            <Col span={6}>
                                                <Radio.Button value="cash" className="custom-payment-radio">
                                                    <Space size={4}><WalletOutlined /> Tiền mặt</Space>
                                                </Radio.Button>
                                            </Col>
                                            <Col span={6}>
                                                <Radio.Button value="transfer" className="custom-payment-radio">
                                                    <Space size={4}><SwapOutlined /> C.Khoản</Space>
                                                </Radio.Button>
                                            </Col>
                                            <Col span={6}>
                                                <Radio.Button value="card" className="custom-payment-radio">
                                                    <Space size={4}><CreditCardOutlined /> Thẻ</Space>
                                                </Radio.Button>
                                            </Col>
                                            <Col span={6}>
                                                <Radio.Button value="prepaid" className="custom-payment-radio">
                                                    <Space size={4}><UserOutlined /> Trả trước</Space>
                                                </Radio.Button>
                                            </Col>
                                        </Row>
                                    </Radio.Group>

                                    {/* Quick Cash Buttons */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 16 }}>
                                        {quickCashOptions.map(amount => (
                                            <Button
                                                key={amount}
                                                onClick={() => setCustomerPaid(amount)}
                                                style={{ borderRadius: 18, height: 32, fontSize: 13, background: '#fff', border: '1px solid #d9d9d9' }}
                                            >
                                                {amount >= 1000 ? `${amount / 1000}k` : amount}
                                            </Button>
                                        ))}
                                        <Button shape="circle" icon={<EllipsisOutlined />} style={{ alignSelf: 'center', justifySelf: 'center' }} />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                                    <Text style={{ color: '#595959' }}>Tiền thừa trả khách</Text>
                                    <Text strong style={{ fontSize: 16 }}>{changeDue.toLocaleString()}</Text>
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '20px 24px', background: '#fff', borderTop: `1px solid ${COLORS.border}` }}>
                            <Row gutter={12}>
                                <Col span={8}>
                                    <Button
                                        block
                                        size="large"
                                        icon={<PrinterOutlined />}
                                        onClick={() => handlePrint()}
                                        style={{ height: 48, borderRadius: 10, fontSize: 15 }}
                                    >
                                        In tạm tính
                                    </Button>
                                </Col>
                                <Col span={16}>
                                    <Button
                                        type="primary"
                                        block
                                        size="large"
                                        loading={loading}
                                        disabled={loading}
                                        onClick={() => onConfirm({
                                            paymentMethod: paymentMethod as 'cash' | 'transfer' | 'card' | 'prepaid',
                                            finalAmount: totalAmount - discount - voucherDiscountAmount + otherFeesTotal,
                                            discount,
                                            otherFeesTotal,
                                            voucherDiscountAmount,
                                            voucherCode: appliedVoucher?.code,
                                            customerPaid,
                                        })}
                                        style={{ height: 48, borderRadius: 10, background: loading ? undefined : COLORS.primary, fontWeight: 700, fontSize: 16 }}
                                    >
                                        {loading ? 'Đang xử lý...' : 'Thanh toán'}
                                    </Button>
                                </Col>
                            </Row>
                        </div>
                    </div>
                </div>

                <style jsx global>{`
                .payment-items-table .ant-table-thead > tr > th {
                    background: transparent !important;
                    border-bottom: 2px solid #f0f0f0 !important;
                    padding: 12px 24px !important;
                }
                .payment-items-table .ant-table-tbody > tr > td {
                    padding: 12px 24px !important;
                    border-bottom: 1px solid #f0f0f0 !important;
                }
                .custom-payment-radio {
                    width: 100% !important;
                    height: 42px !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    border-radius: 20px !important;
                    margin-bottom: 8px !important;
                    border: 1px solid #d9d9d9 !important;
                    background: #fff !important;
                    font-size: 13px !important;
                    white-space: nowrap !important;
                }
                .custom-payment-radio::before {
                    display: none !important;
                }
                .ant-radio-button-wrapper-checked.custom-payment-radio {
                    border-color: #3467cc !important;
                    background: #e6f4ff !important;
                    color: #3467cc !important;
                    z-index: 2;
                }
            `}</style>
            </Drawer>
            <OtherFeesModal
                open={isOtherFeesModalOpen}
                onClose={() => setIsOtherFeesModalOpen(false)}
                onSave={setSelectedFees}
                totalAmount={totalAmount}
                initialSelectedFees={selectedFees}
            />
            <VoucherModal
                open={isVoucherModalOpen}
                onClose={() => setIsVoucherModalOpen(false)}
                onApply={setAppliedVoucher}
                currentTotal={totalAmount}
            />

            {/* Hidden Print Content */}
            <div style={{ display: 'none' }}>
                <div ref={componentRef}>
                    <InvoiceToPrint
                        sizePrint="300px"
                        data={items.map(item => ({
                            product_code: '',
                            product_name: item.product.name,
                            quantity: item.quantity,
                            unit_price: item.product.price.toString(),
                            discount: 0,
                            total_price: (item.product.price * item.quantity).toString()
                        }))}
                        invoiceDetails={{
                            invoice_code: 'TẠM TÍNH',
                            invoice_date: new Date().toISOString(),
                            customer_name: customerName,
                            warehouse_name: warehouseData?.warehouse_name || 'NQY Golf',
                            warehouse_address: warehouseData?.address,
                            warehouse_phone: warehouseData?.phone,
                            created_by: user?.username || 'Admin'
                        }}
                        invoiceSummary={{
                            subtotal: totalAmount,
                            discount_amount: discount + voucherDiscountAmount,
                            total_amount: totalAmount - discount - voucherDiscountAmount + otherFeesTotal,
                            VAT: 0
                        }}
                        printMode="full"
                    />
                </div>
            </div>
        </>
    );
};

export default PaymentDrawer;
