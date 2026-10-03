'use client';

import type { ReactNode } from 'react';
import { Button } from 'antd';

interface Props {
    title: ReactNode;
    meta?: ReactNode;
    status?: ReactNode;
    actions?: ReactNode;
    children?: ReactNode;
    details?: ReactNode;
    expanded?: boolean;
    onToggle?: () => void;
}

export default function MobileRecordCard({ title, meta, status, actions, children, details, expanded, onToggle }: Props) {
    return <div className="admin-mobile-record">
        <div className="admin-mobile-record-heading"><strong>{title}</strong>{status}</div>
        {meta && <div className="admin-mobile-record-meta">{meta}</div>}
        {children}
        {(onToggle || actions) && <div className="admin-mobile-record-footer">
            {onToggle && <Button type="link" aria-expanded={!!expanded} onClick={event => { event.stopPropagation(); onToggle(); }}>{expanded ? 'Ẩn chi tiết' : 'Xem chi tiết'}</Button>}
            <div onClick={event => event.stopPropagation()}>{actions}</div>
        </div>}
        {expanded && details && <div className="admin-mobile-record-detail" onClick={event => event.stopPropagation()}>{details}</div>}
    </div>;
}
