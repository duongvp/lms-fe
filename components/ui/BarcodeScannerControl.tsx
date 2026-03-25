import { Button, Space } from 'antd';
import { ScanOutlined, PauseCircleOutlined } from '@ant-design/icons';
import { useRef } from 'react';

interface Props {
    enabled: boolean;
    setEnabled: (val: boolean) => void;
    barcode: string;
}

export const BarcodeScannerControl = ({ enabled, setEnabled, barcode }: Props) => {
    const buttonRef = useRef<HTMLElement>(null);

    return (
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button
                ref={buttonRef as any}
                type={enabled ? "primary" : "default"}
                ghost={enabled}
                icon={enabled ? <PauseCircleOutlined /> : <ScanOutlined />}
                onClick={() => {
                    setEnabled(!enabled);
                    buttonRef.current?.blur();
                }}
            >
                {enabled ? 'Tạm dừng quét mã' : 'Bắt đầu quét mã'}
            </Button>
            <span style={{ fontSize: 12, color: '#666' }}>
                {(enabled ? 'Đang quét' : 'Chưa quét') + (barcode ? ` — mã: ${barcode}` : '')}
            </span>
        </div>
    );
};