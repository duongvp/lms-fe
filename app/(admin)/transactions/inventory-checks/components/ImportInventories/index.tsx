import React, { useState } from 'react';
import { Card, Row, Col } from 'antd';
import ImportInventoriesForm from './ImportInventoriesForm';
import InventoryCheckSelect from '@/components/templates/InventoryCheckTemplate';
import { useInventoryCheckTableData } from '@/hooks/useInventoryCheckTableData';
import { ITypeImportInvoice } from '@/types/invoice';
import { BarcodeScannerControl } from '@/components/ui/BarcodeScannerControl';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';

interface IImportInventoriesProps {
    slug?: number;
    type?: ITypeImportInvoice;
}

const ImportInventories: React.FC<IImportInventoriesProps> = ({ slug, type }) => {
    const [totalActualQuantity, setTotalActualQuantity] = useState<number>(0);
    const [dataSource, setDataSource] = useState<any[]>([]);
    const [barcodeEnabled, setBarcodeEnabled] = useState<boolean>(false);

    const {
        tableData,
    } = useInventoryCheckTableData(slug ?? 0);

    const handleBarcodeScanned = (scannedBarcode: string) => {
        // This callback will be triggered when barcode is scanned
        // The actual product search and selection happens in InventoryCheckSelect
        console.log('Barcode scanned:', scannedBarcode);
    };

    const { barcode } = useBarcodeScanner(handleBarcodeScanned, barcodeEnabled);

    const resetForm = () => {
        setDataSource([]);
        setTotalActualQuantity(0);
    }

    return (
        <Row gutter={[24, 16]} style={{ height: "100%" }}>
            {/* Left side */}
            <Col xs={24} xl={16} style={{ minHeight: "300px" }}>

                <InventoryCheckSelect
                    setTotalActualQuantity={setTotalActualQuantity}
                    tableData={tableData}
                    dataSource={dataSource}
                    setDataSource={setDataSource}
                    barcodeEnabled={barcodeEnabled}
                    scannedBarcode={barcode}
                />
            </Col>

            {/* Right side */}
            <Col xs={24} xl={8}>
                <Card
                    title="Thông tin kiểm kho"
                    style={{ height: "100%", display: "flex", flexDirection: "column", boxShadow: "0 0 10px rgba(0,0,0,0.1)" }}
                    styles={{
                        body: {
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            flex: 1,
                        },
                    }}
                >
                    <div style={{ flexShrink: 0 }}>
                        <BarcodeScannerControl
                            enabled={barcodeEnabled}
                            setEnabled={setBarcodeEnabled}
                            barcode={barcode}
                        />
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        <ImportInventoriesForm totalActualQuantity={totalActualQuantity} data={dataSource} type={type} slug={slug} resetForm={resetForm} />
                    </div>
                </Card>
            </Col>
        </Row>
    );
};

export default ImportInventories;
