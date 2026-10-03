'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Badge, Button, FloatButton, Input } from 'antd';
import { CloseOutlined, FilterOutlined, MoreOutlined, PlusOutlined } from '@ant-design/icons';
import { Popup } from 'antd-mobile';

interface Props {
    search: string;
    placeholder: string;
    onSearchChange: (value: string) => void;
    onSearch?: (value: string) => void;
    onCreate?: () => void;
    createLabel?: string;
    filters?: ReactNode;
    filterCount?: number;
    actions?: ReactNode;
}

export default function MobileAdminToolbar({ search, placeholder, onSearchChange, onSearch, onCreate, createLabel = 'Thêm mới', filters, filterCount = 0, actions }: Props) {
    const [sheet, setSheet] = useState<'filters' | 'actions'>();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    return <>
        <div className="admin-mobile-toolbar" data-can-create={Boolean(onCreate)}>
            <Input.Search allowClear value={search} placeholder={placeholder} onChange={event => onSearchChange(event.target.value)} onSearch={onSearch ?? onSearchChange} />
            {filters && <Badge count={filterCount} size="small"><Button aria-label="Mở bộ lọc" icon={<FilterOutlined />} onClick={() => setSheet('filters')} /></Badge>}
            {actions && <Button aria-label="Thao tác khác" icon={<MoreOutlined />} onClick={() => setSheet('actions')} />}
        </div>
        {mounted && onCreate && createPortal(
            <FloatButton
                className="admin-add-fab"
                type="primary"
                aria-label={createLabel}
                tooltip={createLabel}
                icon={<PlusOutlined />}
                onClick={onCreate}
                style={{ position: 'fixed', insetInlineEnd: 'calc(16px + env(safe-area-inset-right, 0px))', bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))', width: 56, height: 56, zIndex: 999 }}
            />,
            document.body
        )}
        <Popup visible={!!sheet} onMaskClick={() => setSheet(undefined)} onClose={() => setSheet(undefined)} bodyStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
            <div className="admin-mobile-sheet">
                <div className="admin-mobile-sheet-header"><strong>{sheet === 'filters' ? 'Bộ lọc' : 'Thao tác khác'}</strong><Button type="text" aria-label="Đóng" icon={<CloseOutlined />} onClick={() => setSheet(undefined)} /></div>
                <div className="admin-mobile-sheet-body" onClick={event => { if (sheet === "actions" && (event.target as HTMLElement).closest("button:not(:disabled)")) setSheet(undefined); }}>{sheet === 'filters' ? filters : actions}</div>
                <Button block type="primary" onClick={() => setSheet(undefined)}>Xong</Button>
            </div>
        </Popup>
    </>;
}
