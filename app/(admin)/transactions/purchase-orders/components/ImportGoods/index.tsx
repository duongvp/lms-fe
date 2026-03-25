import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Skeleton, message } from 'antd';
import ProductGridTemplate from '@/components/templates/ProductGridTemplate';
import ImportGoodsForm from './ImportGoodsForm';
import { usePurchaseOrderTableData } from '@/hooks/usePurchaseOrderTableData';
import { ITypeImportInvoice } from '@/types/invoice';
import { IDataTypeProductSelect } from '@/types/productSelect';
import { BarcodeScannerControl } from '@/components/ui/BarcodeScannerControl';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { getProductsByPage } from '@/services/productService';
import { useAuthStore } from '@/stores/authStore';

interface IImportGoodsProps {
    slug?: number;
    type?: ITypeImportInvoice
}

const ImportGoodsSkeleton = () => (
    <Row gutter={16} style={{ height: "100%" }}>
        <Col span={16}>
            <div>
                <Skeleton active paragraph={{ rows: 8 }} />
            </div>
        </Col>
        <Col span={8}>
            <Card
                title={<Skeleton.Input active size="small" style={{ width: 200 }} />}
                style={{ height: "100%", display: "flex", flexDirection: "column", boxShadow: "0 0 10px rgba(0,0,0,0.1)" }}
                styles={{
                    body: {
                        flex: 1,
                    },
                }}
            >
                <Skeleton active paragraph={{ rows: 10 }} />
            </Card>
        </Col>
    </Row>
);

const ImportGoods: React.FC<IImportGoodsProps> = ({ slug, type }) => {
    const [totalAmount, setTotalAmount] = useState<number>(0);
    const [dataSource, setDataSource] = useState<IDataTypeProductSelect[]>([]);
    const [title, setTitle] = useState<string>('Thông tin phiếu nhập');
    const [scannerEnabled, setScannerEnabled] = useState(false);
    const { warehouseId } = useAuthStore((state) => state.user)

    const {
        tableData,
        poInfos,
        poSummary,
        loading,
        error,
    } = usePurchaseOrderTableData(slug ?? 0);
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
                    console.log("productđaa", product);
                    // Nếu thực sự chưa có thì mới tạo dòng mới
                    const newProduct: IDataTypeProductSelect = {
                        key: product.product_id.toString() + Date.now(), // Dùng thêm timestamp để key không bị trùng
                        no: prev.length + 1, // Dựa trên độ dài mới nhất của danh sách
                        itemCode: product.product_code,
                        id: product.product_id,
                        itemName: product.product_name,
                        unit: product.unit_name,
                        quantity: 1,
                        unitPrice: Number(product.purchase_price),
                        discount: 0,
                        totalPrice: Number(product.purchase_price),
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

    const { barcode } = useBarcodeScanner((code) => {
        searchProductByCode(code); // Hàm tìm kiếm sản phẩm của bạn
    }, scannerEnabled);

    useEffect(() => {
        switch (type) {
            case 'edit':
                setTitle('Thông tin cập nhật phiếu nhập')
                break;
            case 'copy':
                setTitle('Thông tin sao chép phiếu nhập')
                break;
            case 'create':
                setTitle('Thông tin tạo phiếu nhập')
                break
            default:
                break;
        }
    }, [type])

    if (loading) return <ImportGoodsSkeleton />;
    if (error) return <div>Error: {error}</div>;

    return (
        <Row gutter={[24, 16]} style={{ height: "100%" }}>
            {/* Left side */}
            <Col xs={24} xl={16} style={{ minHeight: "300px" }}>
                <ProductGridTemplate
                    setTotalAmount={setTotalAmount}
                    tableData={tableData}
                    isViewPurchasePrice={true}
                    dataSource={dataSource}
                    setDataSource={setDataSource}
                />
            </Col>

            {/* Right side */}
            <Col xs={24} xl={8}>
                <Card
                    title={title}
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
                            enabled={scannerEnabled}
                            setEnabled={setScannerEnabled}
                            barcode={barcode}
                        />
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        <ImportGoodsForm
                            subtotal={totalAmount}
                            type={type}
                            poInfos={poInfos}
                            poSummary={poSummary}
                            dataSource={dataSource}
                            setDataSource={setDataSource} />
                    </div>
                </Card>
            </Col>
        </Row>
    );
};

export default ImportGoods;
