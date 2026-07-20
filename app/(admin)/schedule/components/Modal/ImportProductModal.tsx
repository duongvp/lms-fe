import ImportButton from '@/components/shared/ImportButton';
import { importProductsFromExcel } from '@/services/productService';
import useProductStore from '@/stores/productStore';
import { Modal, Radio, Typography } from 'antd';
import { useEffect, useState } from 'react';

const { Text, Link } = Typography;

interface Props {
    open: boolean;
    onClose: () => void;
}

const ImportProductModal: React.FC<Props> = ({ open, onClose }) => {
    const setShouldReload = useProductStore(state => state.setShouldReload);
    const [conditionImport, setConditionImport] = useState({
        duplicateOption: false, // false = error, true = replace
        updateStock: false,
        updatePrice: true,
    });

    useEffect(() => {
        console.log('conditionImport', conditionImport);
    }, [conditionImport])

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            title={
                <>
                    Nhập hàng hóa từ file dữ liệu (
                    <Link href="/files/danh_sach_san_pham_mau.xlsx" download>Tải về file mẫu: Excel file</Link>)
                </>
            }
        >
            <div style={{ marginBottom: 20 }}>
                <Text strong>Xử lý trùng mã hàng, khác tên hàng?</Text>
                <Radio.Group
                    onChange={(e) =>
                        setConditionImport(prev => ({ ...prev, duplicateOption: e.target.value }))
                    }
                    value={conditionImport.duplicateOption}
                    style={{ display: 'flex', flexDirection: 'column', marginTop: 8 }}
                >
                    <Radio value={false}>Báo lỗi và không cập nhật</Radio>
                    <Radio value={true}>Thay thế tên hàng cũ bằng tên hàng mới</Radio>
                </Radio.Group>
            </div>

            <div style={{ marginBottom: 20 }}>
                <Text strong>Cập nhật tồn kho?</Text>
                <Radio.Group
                    onChange={(e) =>
                        setConditionImport(prev => ({ ...prev, updateStock: e.target.value }))
                    }
                    value={conditionImport.updateStock}
                    style={{ display: 'flex', flexDirection: 'column', marginTop: 8 }}
                >
                    <Radio value={false}>Không</Radio>
                    <Radio value={true}>Có</Radio>
                </Radio.Group>
            </div>

            <div style={{ marginBottom: 30 }}>
                <Text strong>Cập nhật giá vốn?</Text>
                <Radio.Group
                    onChange={(e) =>
                        setConditionImport(prev => ({ ...prev, updatePrice: e.target.value }))
                    }
                    value={conditionImport.updatePrice}
                    style={{ display: 'flex', flexDirection: 'column', marginTop: 8 }}
                >
                    <Radio value={false}>Không</Radio>
                    <Radio value={true}>Có</Radio>
                </Radio.Group>
            </div>

            <div style={{ textAlign: 'right' }}>
                <ImportButton setShouldReload={setShouldReload} importApiFn={importProductsFromExcel} onFileImport={(data) => console.log(data)} onCloseImportModal={onClose} conditionImport={conditionImport} />
            </div>
        </Modal>
    );
};

export default ImportProductModal;

