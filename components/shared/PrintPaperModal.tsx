import React from "react";
import { Modal, Select, Button, Row, Col, Card, Typography, Space } from "antd";
import { FileExcelOutlined, EyeOutlined } from "@ant-design/icons";

const { Text } = Typography;

interface PrintPaperModalProps {
    open: boolean;
    onClose: () => void;
    onExportExcel: () => void;
}

const PrintPaperModal: React.FC<PrintPaperModalProps> = ({ open, onClose, onExportExcel }) => {
    const paperTemplates = [
        { title: "Mẫu giấy cuộn 3 nhãn", desc: "Khổ giấy in nhãn 104x22mm/4.2x0.9 Inch", img: "https://via.placeholder.com/80" },
        { title: "Mẫu giấy 12 nhãn", desc: "Khổ giấy in nhãn Tomy 103 (202x162mm)", img: "https://via.placeholder.com/80" },
        { title: "Mẫu giấy cuộn 2 nhãn", desc: "Khổ giấy in nhãn 72x22mm", img: "https://via.placeholder.com/80" },
        { title: "Mẫu giấy 65 nhãn", desc: "Khổ giấy in nhãn A4 - Tomy 145", img: "https://via.placeholder.com/80" },
    ];

    return (
        <Modal
            title="Chọn loại giấy in tem mã"
            open={open}
            onCancel={onClose}
            width={1000}
            footer={null}
        >
            <Row gutter={24}>
                {/* Cột trái: Cấu hình */}
                <Col span={6}>
                    <Space direction="vertical" style={{ width: '100%' }} size={12}>
                        <Select defaultValue="barcode" style={{ width: '100%' }} options={[{ value: 'barcode', label: 'Mã hàng' }]} />
                        <Select defaultValue="price" style={{ width: '100%' }} options={[{ value: 'price', label: 'Bảng giá chung' }]} />
                        <Select defaultValue="vnd" style={{ width: '100%' }} options={[{ value: 'vnd', label: 'Giá kèm VNĐ' }]} />
                        <Select defaultValue="no-unit" style={{ width: '100%' }} options={[{ value: 'no-unit', label: 'Giá không kèm đơn vị tính' }]} />
                        <Select defaultValue="no-store" style={{ width: '100%' }} options={[{ value: 'no-store', label: 'Không in tên cửa hàng' }]} />

                        <Button
                            type="primary"
                            icon={<FileExcelOutlined />}
                            block
                            style={{ backgroundColor: '#008dcd', height: 40 }}
                            onClick={onExportExcel}
                        >
                            Xuất file Excel
                        </Button>

                        <div style={{ marginTop: 10, fontSize: 12, color: '#666', fontStyle: 'italic' }}>
                            Lưu ý: File Excel xuất ra để sử dụng thiết kế mẫu in mã vạch trên các phần mềm chuyên nghiệp khác.
                        </div>
                    </Space>
                </Col>

                {/* Cột phải: Danh sách mẫu giấy */}
                <Col span={18}>
                    <Row gutter={[16, 16]}>
                        {paperTemplates.map((item, index) => (
                            <Col span={12} key={index}>
                                <Card size="small" styles={{ body: { display: 'flex', gap: 12, alignItems: 'center' } }}>
                                    <img src={item.img} alt="thumb" style={{ width: 80, height: 60, objectFit: 'cover', border: '1px solid #eee' }} />
                                    <div>
                                        <div style={{ fontWeight: 'bold', fontSize: 13 }}>{item.title}</div>
                                        <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>{item.desc}</div>
                                        <Button
                                            size="small"
                                            type="primary"
                                            icon={<EyeOutlined />}
                                            style={{ backgroundColor: '#00a65a', borderColor: '#00a65a' }}
                                        >
                                            Xem bản in
                                        </Button>
                                    </div>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </Col>
            </Row>
        </Modal>
    );
};

export default PrintPaperModal;