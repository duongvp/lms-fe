import { Space, Typography } from 'antd';
import type { ScheduleConflictLink } from '@/helper/scheduleConflictLinks';

export const ScheduleConflictDetails = ({ detail, links = [] }: { detail: string; links?: ScheduleConflictLink[] }) => {
    const groups = new Map<number, ScheduleConflictLink[]>();
    links.forEach(link => groups.set(link.id, [...(groups.get(link.id) || []), link]));
    const hasReasons = links.some(link => link.reasons.length > 0);
    return <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div data-conflict-message style={{ whiteSpace: 'pre-wrap' }}>{hasReasons ? detail.split('\n')[0] : detail}</div>
        {[...groups.entries()].map(([id, actions]) => <div key={id} style={{ padding: 16, border: '1px solid #ffccc7', borderRadius: 8, background: '#fff', whiteSpace: 'normal' }}>
            <Typography.Text strong>{actions[0].summary}</Typography.Text>
            {!!actions[0].reasons.length && <ul style={{ margin: '12px 0 16px', paddingLeft: 20, display: 'grid', gap: 8 }}>
                {actions[0].reasons.map((reason, index) => <li key={index}>{reason}</li>)}
            </ul>}
            <Space wrap size={[24, 12]} style={{ display: 'flex', marginTop: actions[0].reasons.length ? 0 : 12 }}>
                {actions.map(link => <Typography.Link key={link.kind} href={link.href} target="_blank" rel="noopener noreferrer" style={{ overflowWrap: 'anywhere' }}>
                    {link.label} ↗
                </Typography.Link>)}
            </Space>
        </div>)}
    </Space>;
};
