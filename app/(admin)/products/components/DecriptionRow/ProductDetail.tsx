'use client';

import React from 'react';
import { Row, Col, Typography, Image, Space } from 'antd';
import { CheckCircleOutlined, CopyFilled } from '@ant-design/icons';
import { deleteProduct, ProductApiResponse, toggleProductStatus } from '@/services/productService';
import BtnDeActiveDetete from '@/components/shared/BtnDeActiveDetete';
import useProductStore from '@/stores/productStore';
import { ActionType } from '@/enums/action';
import ActionButton from '@/components/ui/ActionButton';
import { useAuthStore } from '@/stores/authStore';
import { PermissionKey } from '@/types/permissions';

const { Title, Text } = Typography;

interface ProductDetailProps {
    record: ProductApiResponse;
}

const ProductDetail: React.FC<ProductDetailProps> = ({ record }) => {
    const { setModal, setShouldReload } = useProductStore();
    const hasPermission = useAuthStore(state => state.hasPermission);

    const handleUpdate = () => {
        setModal({
            open: true,
            type: ActionType.UPDATE,
            product: record,
        });
    };

    const handleCopy = () => {
        setModal({
            open: true,
            title: "Thêm sản phẩm (Copy " + record.product_code + ")",
            type: ActionType.COPY,
            product: { ...record, product_code: '', barcode: '' },
        });
    }

    const productDetails = [
        { label: 'Mã hàng', value: record.product_code },
        { label: 'Mã vạch', value: record.barcode },
        { label: 'Nhóm hàng', value: record.category_name },
        { label: 'Đơn vị tính', value: '' },
        { label: 'Tồn kho', value: Number(record.total_stock).toLocaleString() },
        { label: 'Giá bán', value: Number(record.selling_price).toLocaleString() },
        { label: 'Giá vốn', value: Number(record.purchase_price).toLocaleString() },
        { label: 'Nhà cung cấp', value: '' },
    ];

    return (
        <div>
            <div style={{ overflow: 'hidden', padding: 16 }}>
                <Space direction="horizontal" size="large" align="center">
                    <div>
                        <Title level={4} style={{ marginBottom: 0 }}>{record.product_name} (Cái)</Title>
                        <Space>
                            <Text type="success"><CheckCircleOutlined /> Bán trực tiếp</Text>
                        </Space>
                    </div>
                </Space>

                <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
                    <Col xs={24} md={24} lg={6}>
                        <Image
                            width={200}
                            height={200}
                            src="error"
                            fallback="data:image/png;base64,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"
                            alt="product image"
                            preview={true}

                        />
                    </Col>

                    <Col xs={24} md={24} lg={18}>
                        <Row gutter={[16, 16]} style={{ width: '100%', maxWidth: '100%' }}>
                            {productDetails.map((item, index) => (
                                <Col span={24} key={index} style={{ width: '100%', maxWidth: '100%' }}>
                                    <Row style={{ maxWidth: '100%' }}>
                                        <Col xs={8} xxl={4}>
                                            <Text strong>{item.label}:</Text>
                                        </Col>
                                        <Col xs={8} xxl={20}>
                                            <Text>{item.value}</Text>
                                        </Col>
                                    </Row>
                                </Col>
                            ))}
                        </Row>
                    </Col>
                </Row>


            </div>
            <Row justify="end" align="middle" style={{ marginTop: 16 }}>
                <Col>
                    <Space>
                        {
                            hasPermission(PermissionKey.PRODUCT_EDIT) && (
                                <ActionButton
                                    type='primary'
                                    label='Cập nhật'
                                    color='green'
                                    variant='solid'
                                    icon={<CheckCircleOutlined />}
                                    onClick={handleUpdate}
                                />
                            )
                        }
                        {
                            hasPermission(PermissionKey.PRODUCT_CREATE) && (
                                <ActionButton
                                    type='primary'
                                    label='Sao chép'
                                    color='green'
                                    variant='solid'
                                    icon={<CopyFilled />}
                                    onClick={handleCopy}
                                />
                            )
                        }
                        {
                            hasPermission(PermissionKey.PRODUCT_DELETE) && (
                                <BtnDeActiveDetete
                                    record={{ id: record.product_id, ...record }}
                                    contextActive='Ban có chắc muốn hoạt động lại sản phẩm này không?'
                                    contextDeactive='Bạn có chắc chắn muốn ngừng hoạt động sản phẩm này?'
                                    contextDelete='Bạn có chắc chắn muốn xoá sản phẩm này? Hành động này sẽ không thể hoàn tác.'
                                    toggleStatus={toggleProductStatus}
                                    onDelete={deleteProduct}
                                    setShouldReload={setShouldReload}
                                />
                            )
                        }
                    </Space>
                </Col>
            </Row>
        </div>

    );
};

export default ProductDetail;
