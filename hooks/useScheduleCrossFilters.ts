'use client';

import { useEffect, useRef, useState } from 'react';
import { Form, type FormInstance } from 'antd';
import useSWR from 'swr';
import { useAuthStore } from '@/stores/authStore';
import { buildScheduleApiParams, type ScheduleFilterValues } from '@/helper/scheduleFilters';
import { getCalendarCrossFilterOptions, type CalendarCrossFilterOptions } from '@/services/livestreamService';
import { useTeachingStaffQuery } from '@/hooks/useLmsQueries';

export const useScheduleCrossFilters = (form: FormInstance, initial: ScheduleFilterValues, enabled = true) => {
    const draft = Form.useWatch([], form) as ScheduleFilterValues | undefined;
    const values = draft ?? initial;
    const serialized = JSON.stringify(buildScheduleApiParams(values));
    const [debounced, setDebounced] = useState(serialized);
    useEffect(() => {
        const timer = window.setTimeout(() => setDebounced(serialized), 250);
        return () => window.clearTimeout(timer);
    }, [serialized]);
    const authScope = useAuthStore(state => `${state.user.userId}:${state.authSessionVersion}`);
    const query = useSWR(enabled ? ['schedule-cross-filters', authScope, debounced] : null,
        () => getCalendarCrossFilterOptions(JSON.parse(debounced)), { dedupingInterval: 30_000, revalidateOnFocus: false });
    const optionScope = `${authScope}:${values.calendar_source ?? 'livestream'}`;
    const previous = useRef<{scope: string; data: CalendarCrossFilterOptions; labels: Map<string, string>} | null>(null);
    const currentData = serialized === debounced ? query.data : undefined;
    useEffect(() => {
        if (!currentData) return;
        const labels = previous.current?.scope === optionScope ? previous.current.labels : new Map<string, string>();
        currentData.teachers.forEach(option => labels.set(option.value, option.label));
        previous.current = {scope: optionScope, data: currentData, labels};
    }, [currentData, optionScope]);
    // Keep the displayed choices and labels during debounce/revalidation. Only
    // replace them when a complete response arrives, within the same login/source.
    const retained = previous.current?.scope === optionScope ? previous.current : null;
    const data = currentData ?? retained?.data;
    const staff = useTeachingStaffQuery(1);
    const teachers = [...(data?.teachers ?? [])];
    for (const value of values.teacher ?? []) {
        if (!teachers.some(option => option.value === value)) {
            const profile = staff.data?.find(option => option.username === value || option.displayName === value);
            teachers.push({value, label: retained?.labels.get(value) ?? profile?.label ?? value});
        }
    }
    return { ...query, data, teachers, values, loading: enabled && (serialized !== debounced || query.isLoading || query.isValidating) };
};
