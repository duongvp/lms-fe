"use client";

import { memo, startTransition, useCallback, useState, useSyncExternalStore, type Key, type SetStateAction } from "react";

function createSelectionStore() {
    let keys: Key[] = [];
    let selected = new Set<string>();
    const listeners = new Set<() => void>();
    let anchor: string | undefined;
    return {
        getKeys: () => keys,
        has: (key: string) => selected.has(key),
        subscribe: (listener: () => void) => {
            listeners.add(listener);
            return () => { listeners.delete(listener); };
        },
        toggle: (key: string, checked: boolean, order: string[], shift: boolean) => {
            const start = anchor === undefined ? -1 : order.indexOf(anchor);
            const end = order.indexOf(key);
            const changed = shift && start >= 0 && end >= 0
                ? order.slice(Math.min(start, end), Math.max(start, end) + 1)
                : [key];
            anchor = key;
            const next = new Set(keys.map(String));
            changed.forEach(value => checked ? next.add(value) : next.delete(value));
            return Array.from(next);
        },
        setKeys: (next: Key[]) => {
            keys = next;
            selected = new Set(next.map(String));
            listeners.forEach(listener => listener());
        },
    };
}

export type ScheduleSelectionStore = ReturnType<typeof createSelectionStore>;

export function useSelectionKeys(store: ScheduleSelectionStore) {
    return useSyncExternalStore(store.subscribe, store.getKeys, store.getKeys);
}

export function useScheduleSelection() {
    const [selectionStore] = useState(createSelectionStore);
    const [selectedRowKeys, setKeys] = useState<Key[]>([]);
    const setSelectedRowKeys = useCallback((update: SetStateAction<Key[]>) => {
        const next = typeof update === "function" ? update(selectionStore.getKeys()) : update;
        // Checkbox subscribers commit first. Rendering the table, toolbar and
        // permission summaries can then yield without delaying the visible tick.
        selectionStore.setKeys(next);
        startTransition(() => setKeys(next));
    }, [selectionStore]);
    return { selectedRowKeys, setSelectedRowKeys, selectionStore };
}

const ScheduleSelectionCheckbox = memo(function ScheduleSelectionCheckbox({ store, rowKey, disabled, order, onChange }: {
    store: ScheduleSelectionStore;
    rowKey: string;
    disabled: boolean;
    order: Set<string>;
    onChange: (keys: Key[]) => void;
}) {
    const getChecked = useCallback(() => store.has(rowKey), [store, rowKey]);
    const checked = useSyncExternalStore(store.subscribe, getChecked, getChecked);
    // Native input keeps bulk changes light; the surrounding CSS provides the
    // same 16px checkbox appearance without rebuilding an AntD tree per row.
    return <span className="schedule-selection-checkbox" onClick={event => event.stopPropagation()}>
        <input
            type="checkbox"
            className="schedule-row-checkbox"
            aria-label={`Chọn lịch học ${rowKey}`}
            checked={checked}
            disabled={disabled}
            onChange={event => onChange(store.toggle(
                rowKey, event.target.checked, Array.from(order), Boolean((event.nativeEvent as MouseEvent).shiftKey),
            ))}
        />
        <span className="schedule-row-checkmark" aria-hidden="true" />
    </span>;
});

export default ScheduleSelectionCheckbox;
