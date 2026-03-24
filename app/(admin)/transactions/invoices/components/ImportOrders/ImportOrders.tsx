import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Card, Row, Col, message } from 'antd';
import ProductGridTemplate from '@/components/templates/ProductGridTemplate';
import ImportOrdersForm from './ImportOrdersForm';
import { useInvoiceTableData } from '@/hooks/useInvoiceTableData';
import { ITypeImportInvoice } from '@/types/invoice';
import { InvoiceStatus } from '@/enums/invoice';
import { IDataTypeProductSelect } from '@/types/productSelect';
import { getProductsByPage } from '@/services/productService';
import { useAuthStore } from '@/stores/authStore';

const ImportOrders: React.FC<{ slug?: number, type: ITypeImportInvoice }> = ({ slug, type }) => {
    const [totalAmount, setTotalAmount] = useState<number>(0);
    const [dataSource, setDataSource] = useState<IDataTypeProductSelect[]>([]);
    const [barcode, setBarcode] = useState<string>('');
    const [scannerEnabled, setScannerEnabled] = useState<boolean>(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const { warehouseId } = useAuthStore((state) => state.user)

    const {
        tableData,
        invoiceDetails,
        invoiceSummary,
    } = useInvoiceTableData(slug ?? 0);

    console.log("tableData", tableData);

    useMemo(() => {
        if (type == 'copy') {
            invoiceDetails.status = InvoiceStatus.DRAFT
        }
    }, [type, invoiceDetails])

    // Barcode scanner logic
    useEffect(() => {
        if (!scannerEnabled) {
            return;
        }
        console.log("barcode", barcode);
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();

                if (barcode) {
                    searchProductByCode(barcode);
                    setBarcode('');
                }
            } else if (e.key.length === 1) { // only add printable characters
                setBarcode(prev => prev + e.key);
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                timeoutRef.current = setTimeout(() => setBarcode(''), 150); // reset nếu quá chậm
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [barcode, scannerEnabled]);

    const searchProductByCode = async (code: string) => {
        // 1. Kiểm tra nhanh trong danh sách hiện tại (để tránh call API thừa)
        const existingIndex = dataSource.findIndex(item => item.itemCode === code);

        if (existingIndex !== -1) {
            setDataSource(prev => {
                const newDS = [...prev];
                newDS[existingIndex].quantity += 1;
                newDS[existingIndex].totalPrice = newDS[existingIndex].quantity * newDS[existingIndex].unitPrice;
                return newDS;
            });
            return;
        }

        try {
            const response = await getProductsByPage(1, 0, { search: code, warehouse_id: warehouseId, is_active: 1, listIdProducts: [] });

            if (response.data && response.data.length > 0) {
                const product = response.data[0];

                setDataSource(prev => {
                    // KIỂM TRA LẠI: Trong lúc đợi API, sản phẩm này có thể đã được thêm vào rồi
                    const doubleCheckIndex = prev.findIndex(item => item.itemCode === product.product_code);

                    if (doubleCheckIndex !== -1) {
                        const updatedDS = [...prev];
                        updatedDS[doubleCheckIndex].quantity += 1;
                        updatedDS[doubleCheckIndex].totalPrice = updatedDS[doubleCheckIndex].quantity * updatedDS[doubleCheckIndex].unitPrice;
                        return updatedDS;
                    }

                    // Nếu thực sự chưa có thì mới tạo dòng mới
                    const newProduct: IDataTypeProductSelect = {
                        key: product.product_id.toString() + Date.now(), // Dùng thêm timestamp để key không bị trùng
                        no: prev.length + 1, // Dựa trên độ dài mới nhất của danh sách
                        itemCode: product.product_code,
                        id: product.product_id,
                        itemName: product.product_name,
                        unit: 'Cái',
                        quantity: 1,
                        unitPrice: Number(product.selling_price),
                        discount: 0,
                        totalPrice: Number(product.selling_price),
                    };
                    return [...prev, newProduct];
                });
            } else {
                message.warning(`Không tìm thấy sản phẩm có mã: ${code}`);
            }
        } catch (error) {
            console.error('Lỗi khi tìm sản phẩm:', error);
        }
    };

    return (
        <Row gutter={[24, 16]} style={{ height: "100%" }}>
            {/* Left side */}
            <Col xs={24} xl={16} style={{ minHeight: "300px" }}>
                <ProductGridTemplate
                    setTotalAmount={setTotalAmount}
                    tableData={tableData}
                    dataSource={dataSource}
                    setDataSource={setDataSource}
                    isSelectOption={false}
                />
            </Col>

            {/* Right side */}
            <Col xs={24} xl={8}>
                <Card
                    title="Thông tin hoá đơn"
                    style={{ height: "100%", display: "flex", flexDirection: "column", boxShadow: "0 0 10px rgba(0,0,0,0.1)" }}
                    styles={{
                        body: {
                            flex: 1,
                        },
                    }}
                >
                    <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                            type="button"
                            onClick={(e) => {
                                setScannerEnabled(!scannerEnabled)
                                e.currentTarget.blur();
                            }}
                            style={{
                                border: '1px solid #1890ff',
                                background: scannerEnabled ? '#e6f7ff' : '#fff',
                                color: '#1890ff',
                                borderRadius: 4,
                                padding: '4px 10px',
                                cursor: 'pointer'
                            }}
                        >
                            {scannerEnabled ? 'Tạm dừng quét mã' : 'Bắt đầu quét mã'}
                        </button>
                        <span style={{ fontSize: 12, color: '#666' }}>
                            {(scannerEnabled ? 'Đang quét' : 'Chưa quét') + (barcode ? ` — mã: ${barcode}` : '')}
                        </span>
                    </div>
                    <ImportOrdersForm
                        subtotal={totalAmount}
                        setSubtotal={setTotalAmount}
                        type={type}
                        invoiceDetails={invoiceDetails}
                        invoiceSummary={invoiceSummary}
                        dataSource={dataSource}
                        setDataSource={setDataSource}
                    />
                </Card>
            </Col>
        </Row>
    );
};

export default ImportOrders;
