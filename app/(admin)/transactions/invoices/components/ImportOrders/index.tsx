import BillTabs from '@/components/shared/BillTabs';
import React, { useEffect } from 'react';
import ImportOrders from './ImportOrders';
import { ITypeImportInvoice } from '@/types/invoice';

const Index: React.FC<{ slug?: number, type: ITypeImportInvoice, code?: string }> = ({ slug, type, code = "" }) => {
    const [initialTabs, setInitialTabs] = React.useState([{
        title: "Hoá đơn 1",
        key: "1",
        component: <ImportOrders type="create" />,
    }]);

    useEffect(() => {
        console.log("type", type);
        if (type == 'copy') {
            setInitialTabs([...initialTabs, {
                title: `Sao chép_${code}`,
                key: "copy",
                component: <ImportOrders slug={slug} type={type} />,
            }]);
        } else if (type == 'edit') {
            setInitialTabs([...initialTabs, {
                title: `Cập nhật_${code}`,
                key: "update",
                component: <ImportOrders slug={slug} type={type} />,
            }]);
        }
    }, [type, slug]);

    return (
        <BillTabs
            initialTabs={initialTabs}
            defaultComponent={() => <ImportOrders type="create" />}
        />
    );
};

export default Index;
