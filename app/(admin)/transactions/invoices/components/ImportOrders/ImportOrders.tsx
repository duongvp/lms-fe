import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Card, Row, Col } from 'antd';
import ProductGridTemplate from '@/components/templates/ProductGridTemplate';
import ImportOrdersForm from './ImportOrdersForm';
import { useInvoiceTableData } from '@/hooks/useInvoiceTableData';
import { ITypeImportInvoice } from '@/types/invoice';
import { InvoiceStatus } from '@/enums/invoice';
import { IDataTypeProductSelect } from '@/types/productSelect';
import { getProductsByPage } from '@/services/productService';

const ImportOrders: React.FC<{ slug?: number, type: ITypeImportInvoice }> = ({ slug, type }) => {
    const [totalAmount, setTotalAmount] = useState<number>(0);
    const [dataSource, setDataSource] = useState<IDataTypeProductSelect[]>([]);
    const [barcode, setBarcode] = useState<string>('');
    const [scannerEnabled, setScannerEnabled] = useState<boolean>(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        try {
            const response = await getProductsByPage(1, 0, { product_code: code });
            if (response.data.length > 0) {
                const product = response.data[0];
                const newProduct: IDataTypeProductSelect = {
                    key: product.product_id.toString(),
                    no: dataSource.length + 1,
                    itemCode: product.product_code,
                    id: product.product_id,
                    itemName: product.product_name,
                    unit: 'Cái', // giả sử
                    quantity: 1,
                    unitPrice: Number(product.selling_price),
                    discount: 0,
                    totalPrice: Number(product.selling_price),
                };
                setDataSource(prev => [...prev, newProduct]);
            }
        } catch (error) {
            console.error('Product not found or error:', error);
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
                            onClick={() => setScannerEnabled(!scannerEnabled)}
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
