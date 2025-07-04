import React, { useState } from 'react';
import { Card, Row, Col } from 'antd';
import ImportInventoriesForm from './ImportInventoriesForm';
import InventoryCheckSelect from '@/components/templates/InventoryCheckTemplate';
import { useInventoryCheckTableData } from '@/hooks/useInventoryCheckTableData';
import { ITypeImportInvoice } from '@/types/invoice';

interface IImportInventoriesProps {
    slug?: number;
    type?: ITypeImportInvoice;
}

const ImportInventories: React.FC<IImportInventoriesProps> = ({ slug, type }) => {
    const [totalActualQuantity, setTotalActualQuantity] = useState<number>(0);
    const [dataSource, setDataSource] = useState<any[]>([]);

    const {
        tableData,
    } = useInventoryCheckTableData(slug ?? 0);

    const resetForm = () => {
        setDataSource([]);
        setTotalActualQuantity(0);
    }

    return (
        <Row gutter={16} style={{ height: "100%" }}>
            {/* Left side */}
            <Col span={16}>
                <InventoryCheckSelect setTotalActualQuantity={setTotalActualQuantity} tableData={tableData} dataSource={dataSource} setDataSource={setDataSource} />
            </Col>

            {/* Right side */}
            <Col span={8}>
                <Card
                    title="Thông tin kiểm kho"
                    style={{ height: "100%", display: "flex", flexDirection: "column", boxShadow: "0 0 10px rgba(0,0,0,0.1)" }}
                    styles={{
                        body: {
                            flex: 1,
                        },
                    }}
                >
                    <ImportInventoriesForm totalActualQuantity={totalActualQuantity} data={dataSource} type={type} slug={slug} resetForm={resetForm} />
                </Card>
            </Col>
        </Row>
    );
};

export default ImportInventories;
