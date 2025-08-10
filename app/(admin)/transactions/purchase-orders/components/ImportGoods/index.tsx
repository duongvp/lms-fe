import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Skeleton } from 'antd';
import ProductGridTemplate from '@/components/templates/ProductGridTemplate';
import ImportGoodsForm from './ImportGoodsForm';
import { usePurchaseOrderTableData } from '@/hooks/usePurchaseOrderTableData';
import { ITypeImportInvoice } from '@/types/invoice';
import { IDataTypeProductSelect } from '@/types/productSelect';

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

    const {
        tableData,
        poInfos,
        poSummary,
        loading,
        error,
    } = usePurchaseOrderTableData(slug ?? 0);

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
                            flex: 1,
                        },
                    }}
                >
                    <ImportGoodsForm
                        subtotal={totalAmount}
                        type={type}
                        poInfos={poInfos}
                        poSummary={poSummary}
                        dataSource={dataSource}
                        setDataSource={setDataSource} />
                </Card>
            </Col>
        </Row>
    );
};

export default ImportGoods;
