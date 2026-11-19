import type { EvgProvisionMode } from '@/services/livestreamService';

export type EvgProvisionItem = {
    calendar_id: number;
    code?: string;
    learn_number?: number;
    lesson_name?: string;
    teacher?: string;
    start_time?: string;
    status: 'pending' | 'running' | 'created' | 'skipped' | 'error';
    message?: string;
};

export const summarizeEvgProvision = (items: EvgProvisionItem[]) => ({
    current: items.filter(item => ['created', 'skipped', 'error'].includes(item.status)).length,
    total: items.length,
    created: items.filter(item => item.status === 'created').length,
    skipped: items.filter(item => item.status === 'skipped').length,
    failed: items.filter(item => item.status === 'error').length,
    errors: items.filter(item => item.status === 'error'),
});

// Retry against the original selection; successful calendars never run again.
export const runEvgProvisionItems = async (
    targets: EvgProvisionItem[],
    mode: EvgProvisionMode,
    bannerUrl: string | undefined,
    options: {
        previousItems?: EvgProvisionItem[];
        apply: (id: number, mode: EvgProvisionMode, bannerUrl?: string) => Promise<any>;
        onChange: (items: EvgProvisionItem[]) => void;
    },
) => {
    const ids = new Set(targets.map(item => item.calendar_id));
    let items = (options.previousItems ?? targets).map(item => ids.has(item.calendar_id)
        ? { ...item, status: 'pending' as const, message: undefined } : item);
    const update = (id: number, patch: Partial<EvgProvisionItem>) => {
        items = items.map(item => item.calendar_id === id ? { ...item, ...patch } : item);
        options.onChange(items);
    };
    options.onChange(items);
    // Keep requests sequential to avoid EVG rate limits.
    for (const target of targets) {
        update(target.calendar_id, { status: 'running' });
        try {
            const response = await options.apply(target.calendar_id, mode, bannerUrl);
            const result = response?.data ?? response;
            update(target.calendar_id, { status: result?.skipped ? 'skipped' : 'created' });
        } catch (error: any) {
            update(target.calendar_id, { status: 'error', message: error?.message || 'Không thể tạo/đồng bộ EVG.' });
        }
    }
    return items;
};
