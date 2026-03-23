import React, { useState, useEffect } from "react";
import { Modal, Table, Button, Typography, Row, Col, Select, Card, Space } from "antd";
import {
    DeleteOutlined,
    BarcodeOutlined,
    CloseCircleOutlined,
    FileExcelOutlined,
    EyeOutlined,
    LeftOutlined,
    PrinterOutlined,
    ReloadOutlined,
    DownloadOutlined
} from "@ant-design/icons";
import Barcode from 'react-barcode'; // npm install react-barcode
import CustomInput from "../ui/Inputs";

const { Text } = Typography;

// --- HELPER FUNCTION TẠO MÃ VẠCH ---
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

interface PrintBarcodeModalProps {
    open: boolean;
    onClose: () => void;
    initialData: ProductItem[];
}

const PrintBarcodeModal: React.FC<PrintBarcodeModalProps> = ({ open, onClose, initialData }) => {
    const [dataSource, setDataSource] = useState<ProductItem[]>([]);
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

    useEffect(() => {
        if (open) {
            const total = initialData.reduce((sum, item) => sum + (item.quantity || 0), 0);
            setDataSource([{ id: 'total-row', code: '', name: '', quantity: total }, ...initialData]);
            setIsLayer2Open(false);
            setSubStep(2);
        }
    }, [open, initialData]);

    // --- LOGIC NGHIỆP VỤ ---
    // 1. Lấy sản phẩm thực tế đầu tiên (bỏ qua dòng total) để làm mẫu Preview
    const previewProduct = dataSource.find(item => item.id !== 'total-row');

    // 2. Tạo danh sách tất cả tem dựa trên số lượng để in thực tế
    const getAllStickers = () => {
        const stickers: ProductItem[] = [];
        dataSource.filter(item => item.id !== 'total-row').forEach(item => {
            for (let i = 0; i < item.quantity; i++) {
                stickers.push(item);
            }
        });
        return stickers;
    };

    const handleQuantityChange = (id: string | number, value: number | null) => {
        const newData = dataSource.map((item) =>
            item.id === id ? { ...item, quantity: value || 0 } : item
        );
        const onlyProducts = newData.filter(item => item.id !== 'total-row');
        const newTotal = onlyProducts.reduce((sum, item) => sum + item.quantity, 0);
        setDataSource([{ id: 'total-row', code: '', name: '', quantity: newTotal }, ...onlyProducts]);
    };

    const handleDelete = (id: string | number) => {
        const newData = dataSource.filter((item) => item.id !== id);
        const onlyProducts = newData.filter(item => item.id !== 'total-row');
        const newTotal = onlyProducts.reduce((sum, item) => sum + item.quantity, 0);
        setDataSource([{ id: 'total-row', code: '', name: '', quantity: newTotal }, ...onlyProducts]);
    };

    const handleCloseLayer2 = () => {
        setIsLayer2Open(false);
        setTimeout(() => setSubStep(2), 300);
    };

    const columns = [
        {
            title: "",
            key: "action",
            width: 50,
            render: (_: any, record: ProductItem) => {
                if (record.id === 'total-row') return null;
                return <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />;
            },
        },
        { title: "Mã hàng", dataIndex: "code", key: "code" },
        { title: "Tên hàng", dataIndex: "name", key: "name" },
        {
            title: "Số lượng",
            dataIndex: "quantity",
            key: "quantity",
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
    ];

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
                                <div style={{ width: 70, height: 60, backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: 10 }}>IMAGE</div>
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

    const renderPrintPreview = () => (
        <div style={{ backgroundColor: '#525659', borderRadius: '4px' }}>
            <div style={{ padding: '10px', display: 'flex', justifyContent: 'center', gap: '30px', color: '#fff', borderBottom: '1px solid #333' }}>
                <ReloadOutlined style={{ cursor: 'pointer', fontSize: 18 }} onClick={() => setSubStep(2)} />
                <DownloadOutlined style={{ cursor: 'pointer', fontSize: 18 }} />
                <PrinterOutlined style={{ cursor: 'pointer', fontSize: 22 }} onClick={() => window.print()} />
            </div>

            {/* TRÊN WEB: CHỈ HIỂN THỊ 1 MẪU ĐẦU TIÊN */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                {previewProduct ? (
                    <div className="preview-sticker-box" style={{ backgroundColor: '#fff', padding: '20px', width: '260px', textAlign: 'center', boxShadow: '0 0 10px rgba(0,0,0,0.5)' }}>
                        <div style={{ fontSize: 10 }}>{config.showStoreName === 'store' ? 'CỬA HÀNG ABC' : 'Đầu in cho máy in nhiệt'}</div>
                        <div style={{ margin: '10px 0', display: 'flex', justifyContent: 'center' }}>
                            {renderBarcodeHelper(previewProduct.code, { width: 1.5, height: 45, fontSize: 12 })}
                        </div>
                        <div style={{ fontWeight: 'bold', fontSize: 14 }}>{previewProduct.code}</div>
                        {config.priceType === 'price' && (
                            <div style={{ fontSize: 18, fontWeight: 'bold' }}>
                                {previewProduct.price?.toLocaleString() || "650.000"} {config.showVnd === 'vnd' ? 'VNĐ' : ''}
                            </div>
                        )}
                    </div>
                ) : <Text style={{ color: '#fff' }}>Chưa có dữ liệu</Text>}
            </div>

            {/* KHI IN: HIỂN THỊ TOÀN BỘ DANH SÁCH (ẨN TRÊN WEB) */}
            <div className="print-only-layout">
                {getAllStickers().map((item, index) => (
                    <div key={index} className={`print-sticker-item paper-${config.selectedPaper}`}>
                        <div className="store-title">{config.showStoreName === 'store' ? 'CỬA HÀNG ABC' : ''}</div>
                        <div className="barcode-wrapper">
                            {renderBarcodeHelper(item.code, { width: 1.2, height: 35, fontSize: 10 })}
                        </div>
                        <div className="item-code">{item.code}</div>
                        {config.priceType === 'price' && <div className="item-price">{item.price?.toLocaleString()} VNĐ</div>}
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <>
            <Modal
                title="In tem mã"
                open={open}
                onCancel={onClose}
                width={800}
                maskClosable={false}
                footer={[
                    <Button key="next" type="primary" icon={<BarcodeOutlined />} style={{ backgroundColor: '#00a65a', borderColor: '#00a65a' }} onClick={() => setIsLayer2Open(true)}>
                        Tiếp theo
                    </Button>,
                    <Button key="close" icon={<CloseCircleOutlined />} onClick={onClose} style={{ backgroundColor: '#808080', color: '#fff' }}>
                        Bỏ qua
                    </Button>
                ]}
            >
                <div className="print-barcode-container">
                    <Table dataSource={dataSource} columns={columns} rowKey="id" pagination={false} scroll={{ y: 400 }} size="middle" bordered={false} />
                </div>
            </Modal>

            <Modal
                title={subStep === 2 ? "Chọn loại giấy in tem mã" : "In tem mã"}
                open={isLayer2Open}
                onCancel={handleCloseLayer2}
                width={subStep === 2 ? 950 : 550}
                destroyOnClose
                styles={{ body: subStep === 3 ? { padding: 0 } : { paddingTop: 24, paddingBottom: 24 } }}
                footer={subStep === 2 ? [
                    <Button key="back" icon={<LeftOutlined />} onClick={() => setIsLayer2Open(false)} style={{ float: 'left' }}> Quay lại </Button>,
                    <Button key="close" icon={<CloseCircleOutlined />} onClick={handleCloseLayer2} style={{ backgroundColor: '#808080', color: '#fff' }}> Bỏ qua </Button>
                ] : null}
            >
                {subStep === 2 ? renderPaperSelection() : renderPrintPreview()}
            </Modal>

            <style jsx global>{`
                .print-barcode-container .ant-table-thead > tr > th { background-color: #e6f7ff !important; }
                .print-only-layout { display: none; }
                
                @media print {
                    body * { visibility: hidden; }
                    .print-only-layout, .print-only-layout * { visibility: visible; }
                    .print-only-layout { 
                        display: flex !important; 
                        flex-wrap: wrap; 
                        position: absolute; left: 0; top: 0; width: 100%; 
                    }
                    .print-sticker-item { 
                        text-align: center; 
                        box-sizing: border-box; 
                        padding: 5px;
                        border: 0.1mm solid #eee;
                    }
                    /* Khổ giấy */
                    .paper-3-label { width: 33.33%; height: 22mm; }
                    .paper-2-label { width: 50%; height: 22mm; }
                    .paper-12-label { width: 33.33%; height: 48mm; }

                    .store-title { font-size: 8pt; }
                    .item-code { font-size: 10pt; font-weight: bold; }
                    .item-price { font-size: 11pt; font-weight: bold; }
                }
            `}</style>
        </>
    );
};

export default PrintBarcodeModal;