import React, { useMemo, useState } from 'react';
import { Card, Row, Col } from 'antd';
import ProductGridTemplate from '@/components/templates/ProductGridTemplate';
import ImportOrdersForm from './ImportOrdersForm';
import { useInvoiceTableData } from '@/hooks/useInvoiceTableData';
import { ITypeImportInvoice } from '@/types/invoice';
import { InvoiceStatus } from '@/enums/invoice';
import { IDataTypeProductSelect } from '@/types/productSelect';

const ImportOrders: React.FC<{ slug?: number, type: ITypeImportInvoice }> = ({ slug, type }) => {
    const [totalAmount, setTotalAmount] = useState<number>(0);
    const [dataSource, setDataSource] = useState<IDataTypeProductSelect[]>([]);

    const {
        tableData,
        invoiceDetails,
        invoiceSummary,
    } = useInvoiceTableData(slug ?? 0);

    useMemo(() => {
        if (type == 'copy') {
            invoiceDetails.status = InvoiceStatus.DRAFT
        }
    }, [type, invoiceDetails])

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
