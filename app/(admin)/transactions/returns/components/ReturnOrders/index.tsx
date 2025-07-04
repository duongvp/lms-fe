import React, { useState } from 'react';
import { Card, Row, Col } from 'antd';
import ProductGridTemplate from '@/components/templates/ProductGridTemplate';
import { useInvoiceTableData } from '@/hooks/useInvoiceTableData';
import { ITypeImportInvoice } from '@/types/invoice';
import ReturnOrdersForm from './ReturnOrdersForm';
import { IDataTypeProductSelect } from '@/types/productSelect';
import { useReturnTableData } from '@/hooks/useReturnTableData';

const ReturnOrders: React.FC<{ slug?: number, type?: ITypeImportInvoice }> = ({ slug, type }) => {
    const [subtotal, setSubtotal] = useState<number>(0);
    const [dataSource, setDataSource] = useState<IDataTypeProductSelect[]>([]);

    const dataHook = type === 'edit'
        ? useReturnTableData(slug ?? 0)
        : useInvoiceTableData(slug ?? 0);

    let returnOrderDetails;
    let returnOrderSummary;

    if (type === 'edit') {
        // @ts-expect-error: returnOrderDetails and returnOrderSummary only exist in edit mode
        returnOrderDetails = dataHook.returnOrderDetails;
        // @ts-expect-error: returnOrderSummary only exists in edit mode
        returnOrderSummary = dataHook.returnOrderSummary;
    } else {
        // @ts-expect-error: invoiceDetails and invoiceSummary only exist in non-edit mode
        returnOrderDetails = dataHook.invoiceDetails;
        // @ts-expect-error: invoiceSummary only exists in non-edit mode
        returnOrderSummary = dataHook.invoiceSummary;
    }

    const {
        tableData,
    } = dataHook;

    return (
        <Row gutter={16} style={{ height: "100%" }}>
            {/* Left side */}
            <Col span={16}>
                <ProductGridTemplate
                    setTotalAmount={setSubtotal}
                    tableData={tableData}
                    dataSource={dataSource}
                    setDataSource={setDataSource}
                    isViewMaxQuantity={true}
                />
            </Col>

            {/* Right side */}
            <Col span={8}>
                <Card
                    title={`Thông tin hoá đơn ${returnOrderDetails?.invoice_code} (trả hàng)`}
                    style={{ height: "100%", display: "flex", flexDirection: "column", boxShadow: "0 0 10px rgba(0,0,0,0.1)" }}
                    styles={{
                        body: {
                            flex: 1,
                        },
                    }}
                >
                    <ReturnOrdersForm subtotal={subtotal} type={type} returnOrderDetails={returnOrderDetails} returnOrderSummary={returnOrderSummary} dataSource={dataSource} />
                </Card>
            </Col>
        </Row>
    );
};

export default ReturnOrders;
