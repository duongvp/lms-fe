import React, { useEffect, useRef, useState } from 'react';
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
    const [listIdProducts, setListIdProducts] = useState<number[]>([]);
    const checkIsSet = useRef(false);
    const [intialDataSource, setInitialDataSource] = useState<Map<any, any>>();

    const dataHook = type === 'edit'
        ? useReturnTableData(slug ?? 0)
        : useInvoiceTableData(slug ?? 0);

    let returnOrderDetails;
    let returnOrderSummary;
    let invoiceDetails = [];

    if (type === 'edit') {
        // @ts-expect-error: returnOrderDetails and returnOrderSummary only exist in edit mode
        returnOrderDetails = dataHook.returnOrderDetails;
        // @ts-expect-error: returnOrderSummary only exists in edit mode
        returnOrderSummary = dataHook.returnOrderSummary;
        invoiceDetails = dataHook.invoiceDetails || [];
    } else {
        returnOrderDetails = dataHook.invoiceDetails;
        // @ts-expect-error: invoiceSummary only exists in non-edit mode
        returnOrderSummary = dataHook.invoiceSummary;
        invoiceDetails = dataHook.tableData || [];
    }

    const {
        tableData,
    } = dataHook;

    useEffect(() => {
        if (invoiceDetails.length > 0 && !checkIsSet.current) {
            let initialData = new Map();
            const ids = invoiceDetails.map((item: any) => {
                initialData.set(item.product_id, item.quantity || 0);
                return item.product_id
            });
            setInitialDataSource(initialData)
            setListIdProducts(ids);
            checkIsSet.current = true;
        }
    }, [invoiceDetails])

    return (
        <Row gutter={[24, 16]} style={{ height: "100%" }}>
            {/* Left side */}
            <Col xs={24} xl={16} style={{ minHeight: "300px" }}>
                <ProductGridTemplate
                    setTotalAmount={setSubtotal}
                    tableData={tableData}
                    dataSource={dataSource}
                    setDataSource={setDataSource}
                    isViewMaxQuantity={true}
                    listIdProducts={listIdProducts}
                    intialDataSource={intialDataSource}
                />
            </Col>

            {/* Right side */}
            <Col xs={24} xl={8}>
                <Card
                    title={`Thông tin hoá đơn ${returnOrderDetails?.invoice_code} (${type === 'edit' ? 'cập nhật ' : ''}trả hàng)`}
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
