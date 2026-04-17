'use client';
import React, { useEffect } from 'react';
import { Modal, Input, Button } from 'antd';
import { SaveOutlined, CloseCircleOutlined } from '@ant-design/icons';

const { TextArea } = Input;

interface OrderNoteModalProps {
    open: boolean;
    note: string;
    onSave: (note: string) => void;
    onCancel: () => void;
}

const OrderNoteModal: React.FC<OrderNoteModalProps> = ({ open, note, onSave, onCancel }) => {
    const [tempNote, setTempNote] = React.useState(note);

    useEffect(() => {
        setTempNote(note);
    }, [note, open]);

    return (
        <Modal
            title={<span style={{ fontWeight: 600 }}>Ghi chú đơn hàng</span>}
            open={open}
            onCancel={onCancel}
            footer={[
                <Button key="back" onClick={onCancel} icon={<CloseCircleOutlined />}>
                    Hủy
                </Button>,
                <Button key="submit" type="primary" onClick={() => onSave(tempNote)} icon={<SaveOutlined />}>
                    Lưu ghi chú
                </Button>,
            ]}
        >
            <TextArea
                rows={6}
                value={tempNote}
                onChange={(e) => setTempNote(e.target.value)}
                placeholder="Nhập ghi chú cho đơn hàng này (ví dụ: Không hành, ít cay, khách quen...)"
                style={{ borderRadius: 8, marginTop: 8 }}
            />
        </Modal>
    );
};

export default OrderNoteModal;
