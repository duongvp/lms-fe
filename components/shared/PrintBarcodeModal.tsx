import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Modal, Table, Button, Typography, Row, Col, Select, Card, Space, message } from "antd";
import {
    DeleteOutlined,
    BarcodeOutlined,
    FileExcelOutlined,
    PrinterOutlined,
    ReloadOutlined,
} from "@ant-design/icons";
import Barcode from 'react-barcode';
import CustomInput from "../ui/Inputs";
import { formatNumber } from "../../ultils/customText";
import { useAuthStore } from "@/stores/authStore";

const { Text } = Typography;

const renderBarcodeHelper = (value: string, config: { width: number, height: number, fontSize: number }) => {
    if (!value) return null;
    return (
        <Barcode
            value={value}
            width={config.width}
            height={config.height}
            fontSize={config.fontSize}
            margin={0}
            displayValue={false}
        />
    );
};

interface ProductItem {
    id: string | number;
    code: string;
    name: string;
    quantity: number;
    price?: number;
}

interface PrintConfig {
    typeCode: string;
    priceType: string;
    showVnd: string;
    showUnit: string;
    showStoreName: string;
    selectedPaper: string;
}

const PrintBarcodeModal: React.FC<{ open: boolean; onClose: () => void; initialData: ProductItem[] }> = ({ open, onClose, initialData }) => {
    const warehouseName = useAuthStore(state => state.user.warehouseName);
    // Chỉ lưu danh sách sản phẩm (không có dòng total)
    const [products, setProducts] = useState<ProductItem[]>([]);
    const [isLayer2Open, setIsLayer2Open] = useState(false);
    const [subStep, setSubStep] = useState<2 | 3>(2);
    const [config, setConfig] = useState<PrintConfig>({
        typeCode: 'code',
        priceType: 'price',
        showVnd: 'vnd',
        showUnit: 'no-unit',
        showStoreName: 'no-store',
        selectedPaper: '3-label'
    });

    // Tính tổng số lượng từ products
    const totalQuantity = useMemo(() =>
        products.reduce((sum, item) => sum + (item.quantity || 0), 0),
        [products]
    );

    // Tạo dataSource cho Table (thêm dòng total ở đầu) - dùng useMemo tránh tạo lại mỗi lần render
    const dataSource = useMemo(() =>
        [{ id: 'total-row', code: '', name: '', quantity: totalQuantity }, ...products],
        [products, totalQuantity]
    );

    useEffect(() => {
        if (open) {
            setProducts(initialData);
            setIsLayer2Open(false);
            setSubStep(2);
        }
    }, [open, initialData]);

    // Tạo mảng tem để in - có giới hạn số lượng để tránh crash
    const stickers = useMemo(() => {
        const total = products.reduce((sum, item) => sum + (item.quantity || 0), 0);
        console.log("🚀 ~ PrintBarcodeModal ~ total:", total)
        if (total > 500) {
            message.warning('Số lượng tem quá lớn (>500), vui lòng giảm số lượng hoặc in theo đợt nhỏ hơn');
            return [];
        }
        const stickers: ProductItem[] = [];
        products.forEach(item => {
            for (let i = 0; i < (item.quantity || 0); i++) {
                stickers.push(item);
            }
        });
        return stickers;
    }, [products]);

    const handleGoToStep2 = () => {
        const total = products.reduce((sum, item) => sum + (item.quantity || 0), 0);
        if (total > 500) {
            message.warning('Số lượng tem quá lớn (>500), vui lòng giảm số lượng hoặc in theo đợt nhỏ hơn');
            return; // Dừng lại không cho mở modal tiếp theo
        }
        setIsLayer2Open(true);
    };

    const handleQuantityChange = useCallback((id: string | number, value: number | null) => {
        setProducts(prev =>
            prev.map(item =>
                item.id === id ? { ...item, quantity: value || 0 } : item
            )
        );
    }, []);

    const handleDelete = useCallback((id: string | number) => {
        setProducts(prev => prev.filter(item => item.id !== id));
    }, []);

    const handleCloseLayer2 = () => {
        setIsLayer2Open(false);
        setTimeout(() => setSubStep(2), 300);
    };

    const columns = useMemo(() => [
        {
            title: "",
            key: "action",
            width: 50,
            render: (_: any, record: ProductItem) => {
                if (record.id === 'total-row') return null;
                return <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />;
            },
        },
        { title: "Mã hàng", dataIndex: "code" },
        { title: "Tên hàng", dataIndex: "name" },
        {
            title: "Số lượng",
            dataIndex: "quantity",
            align: 'right' as const,
            render: (value: number, record: ProductItem) => {
                if (record.id === 'total-row') return <Text strong style={{ fontSize: 16 }}>{value}</Text>;
                return (
                    <div style={{ width: "40px", marginLeft: 'auto' }}>
                        <CustomInput
                            isNumber
                            value={value}
                            inputNumberProps={{
                                min: 1,
                                value: value,
                                onChange: (val) => handleQuantityChange(record.id, Number(val) || 1)
                            }}
                        />
                    </div>
                );
            },
        },
    ], [handleDelete, handleQuantityChange]);

    const renderPaperSelection = () => (
        <Row gutter={24}>
            <Col span={7}>
                <Space direction="vertical" style={{ width: '100%' }} size={12}>
                    <Select value={config.typeCode} style={{ width: '100%' }} onChange={(val) => setConfig({ ...config, typeCode: val })} options={[{ value: 'code', label: 'Mã hàng' }, { value: 'barCode', label: 'Mã vạch' }]} />
                    <Select value={config.priceType} style={{ width: '100%' }} onChange={(val) => setConfig({ ...config, priceType: val })} options={[{ value: 'price', label: 'Bảng giá chung' }, { value: 'no-price', label: 'Không in giá' }]} />
                    <Select value={config.showVnd} style={{ width: '100%' }} onChange={(val) => setConfig({ ...config, showVnd: val })} options={[{ value: 'vnd', label: 'Giá kèm VNĐ' }, { value: 'no-vnd', label: 'Giá không kèm VNĐ' }]} />
                    <Select value={config.showUnit} style={{ width: '100%' }} onChange={(val) => setConfig({ ...config, showUnit: val })} options={[{ value: 'no-unit', label: 'Giá không kèm đơn vị tính' }, { value: 'unit', label: 'Giá kèm đơn vị tính' }]} />
                    <Select value={config.showStoreName} style={{ width: '100%' }} onChange={(val) => setConfig({ ...config, showStoreName: val })} options={[{ value: 'no-store', label: 'Không in tên cửa hàng' }, { value: 'store', label: 'In tên cửa hàng' }]} />
                    <Button type="primary" icon={<FileExcelOutlined />} block style={{ backgroundColor: '#008dcd', borderColor: '#008dcd' }}>Xuất file Excel</Button>
                    <div style={{ fontSize: 11, color: '#888', fontStyle: 'italic', marginTop: 4 }}>
                        Lưu ý: File Excel xuất ra để sử dụng thiết kế mẫu in mã vạch trên các phần mềm chuyên nghiệp khác.
                    </div>
                </Space>
            </Col>
            <Col span={17}>
                <Row gutter={[12, 12]}>
                    {[
                        { id: '3-label', name: "Mẫu giấy cuộn 3 nhãn", size: "104x22mm" },
                        { id: '12-label', name: "Mẫu giấy 12 nhãn", size: "Tomy 103" },
                        { id: '2-label', name: "Mẫu giấy cuộn 2 nhãn", size: "72x22mm" },
                        { id: '65-label', name: "Mẫu giấy 65 nhãn", size: "Tomy 145" }
                    ].map((item, idx) => (
                        <Col span={12} key={idx}>
                            <Card size="small" hoverable styles={{ body: { display: 'flex', gap: 10, padding: 10 } }}>
                                <div style={{ width: 70, height: 60, backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: 10, flexDirection: 'column' }}>
                                    <BarcodeOutlined style={{ fontSize: 24, marginBottom: 4 }} />
                                    <span>{item.size}</span>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 'bold', fontSize: 13 }}>{item.name}</div>
                                    <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>Khổ giấy: {item.size}</div>
                                    <Button size="small" type="primary" icon={<BarcodeOutlined />} style={{ backgroundColor: '#00a65a', borderColor: '#00a65a' }}
                                        onClick={() => {
                                            setConfig({ ...config, selectedPaper: item.id });
                                            setSubStep(3);
                                        }}>
                                        Xem bản in
                                    </Button>
                                </div>
                            </Card>
                        </Col>
                    ))}
                </Row>
            </Col>
        </Row>
    );

    const renderPrintPreview = () => {
        const previewProduct = products[0]; // lấy sản phẩm đầu tiên để xem trước
        return (
            <div style={{ backgroundColor: '#525659', borderRadius: '4px' }}>
                <div style={{ padding: '10px', display: 'flex', justifyContent: 'center', gap: '30px', color: '#fff' }}>
                    <ReloadOutlined style={{ cursor: 'pointer' }} onClick={() => setSubStep(2)} />
                    <PrinterOutlined style={{ cursor: 'pointer', fontSize: 22 }} onClick={() => window.print()} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                    {previewProduct && (
                        <div style={{ backgroundColor: '#fff', padding: '20px', width: '260px', textAlign: 'center', boxShadow: '0 0 10px rgba(0,0,0,0.5)' }}>
                            <Text strong>{previewProduct.name}</Text>
                            <div style={{ margin: '10px 0' }}>{renderBarcodeHelper(previewProduct.code, { width: 1.5, height: 45, fontSize: 12 })}</div>
                            <div style={{ fontWeight: 'bold' }}>{previewProduct.code}</div>
                            {config.priceType === 'price' && <div style={{ fontSize: 18, fontWeight: 'bold' }}>{formatNumber(previewProduct.price)} VNĐ</div>}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <>
            {/* MODAL 1: BẢNG CHỌN SẢN PHẨM - ĐÃ BẬT VIRTUAL SCROLL */}
            <Modal title="In tem mã" open={open} onCancel={onClose} width={800} footer={[
                <Button key="next" type="primary" icon={<BarcodeOutlined />} style={{ backgroundColor: '#00a65a' }} onClick={handleGoToStep2}>Tiếp theo</Button>,
                <Button key="close" onClick={onClose}>Bỏ qua</Button>
            ]}>
                <Table
                    dataSource={dataSource}
                    columns={columns}
                    rowKey="id"
                    pagination={false}
                    scroll={{ y: 400 }}
                    virtual // BẬT VIRTUAL SCROLL - CHỈ RENDER DÒNG NHÌN THẤY
                />
            </Modal>

            {/* MODAL 2 & 3: CHỌN GIẤY & PREVIEW */}
            <Modal
                title={subStep === 2 ? "Chọn loại giấy in tem mã" : "In tem mã"}
                open={isLayer2Open}
                onCancel={handleCloseLayer2}
                width={subStep === 2 ? 950 : 550}
                destroyOnClose
                footer={subStep === 2 ? [<Button key="back" onClick={() => setIsLayer2Open(false)}>Quay lại</Button>] : null}
            >
                {subStep === 2 ? renderPaperSelection() : renderPrintPreview()}
            </Modal>

            {/* VÙNG IN THỰC TẾ (ẨN TRÊN WEB, CHỈ HIỂN THỊ KHI IN) */}
            {stickers.length > 0 && (
                <div className="print-only-layout">
                    {stickers.map((item, index) => (
                        <div key={index} className="print-sticker-item">
                            <div className="sticker-content">
                                <div className="store-title-vertical">{config.showStoreName === 'store' ? warehouseName : ''}</div>
                                <div className="main-content">
                                    <div className="item-name">{item.name}</div>
                                    <div className="barcode-wrapper">
                                        {renderBarcodeHelper(item.code, { width: 1, height: 25, fontSize: 10 })}
                                    </div>
                                    <div className="item-code">{item.code}</div>
                                    {config.priceType === 'price' && <div className="item-price">{formatNumber(item.price)} {config.showVnd === 'vnd' ? 'VNĐ' : ''}</div>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <style jsx global>{`
                .print-only-layout { display: none; }

                @media print {
                    /* Hủy diệt chiều cao của tất cả các lớp Modal Ant Design */
                    html, body, #root, .ant-modal-root, .ant-modal-wrap, .ant-modal, .ant-modal-content, .ant-modal-body {
                        height: 0 !important;
                        min-height: 0 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: visible !important;
                        visibility: hidden !important;
                    }

                    @page {
                        size: ${config.selectedPaper === '2-label' ? '72mm 22mm' : '104mm 22mm'};
                        margin: 0 !important;
                    }

                    .print-only-layout {
                        display: block !important;
                        visibility: visible !important;
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: ${config.selectedPaper === '2-label' ? '72mm' : '104mm'} !important;
                        height: auto !important;
                        background: white !important;
                    }

                    .print-only-layout * { visibility: visible !important; }

                    .print-sticker-item {
                        display: inline-flex !important;
                        vertical-align: top;
                        width: ${config.selectedPaper === '2-label' ? '36mm' : '34.6mm'} !important;
                        height: 22mm !important;
                        box-sizing: border-box !important;
                        padding: 1mm !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }

                    .sticker-content { display: flex !important; width: 100%; height: 100%; align-items: center; }
                    .store-title-vertical { writing-mode: vertical-rl; transform: rotate(180deg); font-size: 6pt; font-weight: bold; padding-left: 1px; border-left: 0.1mm solid #eee; }
                    .main-content { flex: 1; display: flex; flex-direction: column; justify-content: space-between; align-items: center; height: 100%; }
                    .item-name { font-size: 7pt; font-weight: bold; text-align: center; line-height: 1; max-height: 2em; overflow: hidden; }
                    .barcode-wrapper svg { max-width: 100% !important; height: 25px !important; }
                    .item-code { font-size: 6pt; line-height: 1; }
                    .item-price { font-size: 9pt; font-weight: bold; line-height: 1; }
                }
            `}</style>
        </>
    );
};

export default PrintBarcodeModal;