import React from 'react';
import { Tabs, Alert } from 'antd';
import TableWithActions from './TableWithActions';
import { InvoiceApiResponse } from '@/services/invoiceService';
import { useInvoiceTableData } from '@/hooks/useInvoiceTableData';
import useInvoiceStore from '@/stores/invoiceStore';

interface DecriptionTableProps {
    data: InvoiceApiResponse;
}

const InvoiceDescriptionTable: React.FC<DecriptionTableProps> = ({ data }) => {
    const shouldReload = useInvoiceStore(state => state.shouldReload);
    const {
        tableData,
        invoiceDetails,
        invoiceSummary,
        loading,
        error,
    } = useInvoiceTableData(data.invoice_id, [shouldReload]);

    if (loading) return <></>
    if (error) return <Alert type="error" message={error} />;

    const tabItems = [
        {
            key: '1',
            label: 'Thông tin',
            children: (
                <TableWithActions
                    data={tableData}
                    invoiceDetails={invoiceDetails}
                    invoiceSummary={invoiceSummary}
                />
            ),
        },
    ];

    return <Tabs defaultActiveKey="1" items={tabItems} />;
};

export default InvoiceDescriptionTable;