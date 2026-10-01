"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import { DatePicker as AntDatePicker, TimePicker as AntTimePicker } from "antd";
import { ConfigProvider, DatePicker as MobileDatePicker, Picker as MobilePicker } from "antd-mobile";
import viVN from "antd-mobile/es/locales/vi-VN";
import dayjs, { type Dayjs } from "dayjs";

const mobileQuery = "(max-width: 991px)";
const subscribe = (notify: () => void) => {
    const media = window.matchMedia(mobileQuery);
    media.addEventListener("change", notify);
    return () => media.removeEventListener("change", notify);
};
const mobileSnapshot = () => window.matchMedia(mobileQuery).matches;
const desktopSnapshot = () => false;
const useMobile = () => useSyncExternalStore(subscribe, mobileSnapshot, desktopSnapshot);

type DateProps = Omit<React.ComponentProps<typeof AntDatePicker>, "value" | "onChange"> & { value?: Dayjs | null; onChange?: (date: Dayjs | null, dateString: string) => void };
type DateRangeProps = Omit<React.ComponentProps<typeof AntDatePicker.RangePicker>, "value" | "onChange"> & { value?: [Dayjs | null, Dayjs | null] | null; onChange?: (dates: [Dayjs, Dayjs] | null, dateStrings: [string, string]) => void };
type TimeProps = Omit<React.ComponentProps<typeof AntTimePicker>, "value" | "onChange"> & { value?: Dayjs | null; onChange?: (time: Dayjs | null, timeString: string) => void };
type TimeRangeProps = Omit<React.ComponentProps<typeof AntTimePicker.RangePicker>, "value" | "onChange"> & { value?: [Dayjs | null, Dayjs | null] | null; onChange?: (times: [Dayjs, Dayjs] | null, timeStrings: [string, string]) => void };

const toDayjs = (value: unknown): Dayjs | undefined => dayjs.isDayjs(value) && value.isValid() ? value : undefined;
const display = (value: Dayjs | undefined, format: string) => value?.format(format) || "Chọn";

function DateField(props: DateProps) {
    const mobile = useMobile();
    const [visible, setVisible] = useState(false);
    if (!mobile) return <AntDatePicker {...props as React.ComponentProps<typeof AntDatePicker>}/>;
    const selected = toDayjs(props.value);
    const hasTime = Boolean(props.showTime);
    const format = typeof props.format === "string" ? props.format : hasTime ? "DD/MM/YYYY HH:mm" : "DD/MM/YYYY";
    const min = toDayjs(props.minDate);
    const max = toDayjs(props.maxDate);
    const selectedOrNow = selected || dayjs();
    const minDate = min?.startOf("day").toDate() || selectedOrNow.subtract(50, "year").toDate();
    const maxDate = max?.endOf("day").toDate() || selectedOrNow.add(50, "year").toDate();
    return <ConfigProvider locale={viVN}>
        <div className="schedule-mobile-picker-input" style={props.style}>
            <button type="button" className="schedule-mobile-picker-field" disabled={props.disabled} onClick={() => setVisible(true)}>
                {selected ? display(selected, format) : (props.placeholder || "Chọn ngày")}
            </button>
            {selected && !props.disabled && props.allowClear !== false && <button type="button" className="schedule-mobile-picker-clear" aria-label="Xóa ngày đã chọn" onClick={() => props.onChange?.(null, "")}>×</button>}
        </div>
        <MobileDatePicker
            visible={visible}
            value={selected?.toDate()}
            min={minDate}
            max={maxDate}
            precision={hasTime ? "minute" : "day"}
            filter={props.disabledDate ? { day: (_day, { date }) => !(props.disabledDate as (date: Dayjs) => boolean)(dayjs(date)) } : undefined}
            title={hasTime ? "Chọn ngày và giờ" : "Chọn ngày"}
            cancelText="Hủy"
            confirmText="Xác nhận"
            onClose={() => setVisible(false)}
            onConfirm={(date) => {
                const next = dayjs(date);
                props.onChange?.(next, next.format(format));
                setVisible(false);
            }}
        />
    </ConfigProvider>;
}

function TimeField(props: TimeProps) {
    const mobile = useMobile();
    const [visible, setVisible] = useState(false);
    if (!mobile) return <AntTimePicker {...props as React.ComponentProps<typeof AntTimePicker>}/>;
    const selected = toDayjs(props.value);
    const seed = selected || toDayjs(props.defaultOpenValue) || dayjs().startOf("hour");
    const blocked = props.disabledTime?.(seed) || {};
    const blockedHours = new Set(blocked.disabledHours?.() || []);
    const hours = Array.from({ length: 24 }, (_, hour) => hour).filter((hour) => !blockedHours.has(hour));
    const step = props.minuteStep || 1;
    const columns = (value: Array<string | number | null>) => {
        const hour = Number(value[0] ?? seed.hour());
        const blockedMinutes = new Set(blocked.disabledMinutes?.(hour) || []);
        return [
            hours.map((item) => ({ label: String(item).padStart(2, "0"), value: item })),
            Array.from({ length: 60 / step }, (_, index) => index * step)
                .filter((minute) => !blockedMinutes.has(minute))
                .map((minute) => ({ label: String(minute).padStart(2, "0"), value: minute })),
        ];
    };
    return <ConfigProvider locale={viVN}>
        <div className="schedule-mobile-picker-input" style={props.style}>
            <button type="button" className="schedule-mobile-picker-field" disabled={props.disabled} onClick={() => setVisible(true)}>
                {selected ? selected.format("HH:mm") : (props.placeholder || "Chọn giờ")}
            </button>
            {selected && !props.disabled && props.allowClear !== false && <button type="button" className="schedule-mobile-picker-clear" aria-label="Xóa giờ đã chọn" onClick={() => props.onChange?.(null, "")}>×</button>}
        </div>
        <MobilePicker
            visible={visible}
            columns={columns}
            value={[seed.hour(), seed.minute()]}
            title="Chọn giờ"
            cancelText="Hủy"
            confirmText="Xác nhận"
            onClose={() => setVisible(false)}
            onConfirm={(value) => {
                const next = seed.hour(Number(value[0])).minute(Number(value[1])).second(0);
                props.onChange?.(next, next.format("HH:mm"));
                setVisible(false);
            }}
        />
    </ConfigProvider>;
}

function RangeField({ kind, ...props }: { kind: "date" | "time" } & (DateRangeProps | TimeRangeProps)) {
    const mobile = useMobile();
    const [active, setActive] = useState<0 | 1 | null>(null);
    const [draft, setDraft] = useState<[Dayjs | undefined, Dayjs | undefined]>([undefined, undefined]);
    useEffect(() => {
        const value = props.value as [Dayjs | null, Dayjs | null] | null | undefined;
        setDraft([toDayjs(value?.[0]), toDayjs(value?.[1])]);
    }, [props.value]);
    if (!mobile) return kind === "date" ? <AntDatePicker.RangePicker {...props as React.ComponentProps<typeof AntDatePicker.RangePicker>}/> : <AntTimePicker.RangePicker {...props as React.ComponentProps<typeof AntTimePicker.RangePicker>}/>;
    const current: [Dayjs | undefined, Dayjs | undefined] = draft;
    const showTime = kind === "date" && Boolean((props as DateRangeProps).showTime);
    const timeOnly = kind === "time";
    const format = timeOnly ? "HH:mm" : showTime ? "DD/MM/YYYY HH:mm" : "DD/MM/YYYY";
    const placeholders = Array.isArray(props.placeholder) ? props.placeholder : [];
    const begin = (index: 0 | 1) => {
        setActive(index);
    };
    const update = (date: Dayjs) => {
        if (active === null) return;
        const next: [Dayjs | undefined, Dayjs | undefined] = [...draft];
        next[active] = date;
        if (next[0] && next[1]) {
            const valid = kind === "time"
                ? next[0].hour() * 60 + next[0].minute() < next[1].hour() * 60 + next[1].minute()
                : showTime ? next[0].isBefore(next[1]) : !next[0].isAfter(next[1], "day");
            if (!valid) {
                next[active === 0 ? 1 : 0] = undefined;
                if (kind === "date") (props as DateRangeProps).onChange?.(null, ["", ""]);
                else (props as TimeRangeProps).onChange?.(null, ["", ""]);
            }
        }
        setDraft(next);
        if (next[0] && next[1]) {
            if (kind === "date") (props as DateRangeProps).onChange?.([next[0], next[1]], [next[0].format(format), next[1].format(format)]);
            else (props as TimeRangeProps).onChange?.([next[0], next[1]], [next[0].format(format), next[1].format(format)]);
        }
        setActive(null);
    };
    return <ConfigProvider locale={viVN}>
        <div className="schedule-mobile-picker-range" style={props.style}>
            <button type="button" className="schedule-mobile-picker-field" disabled={props.disabled === true} onClick={() => begin(0)}>{current[0]?.format(format) || placeholders[0] || (timeOnly ? "Giờ bắt đầu" : "Từ ngày")}</button>
            <span>đến</span>
            <button type="button" className="schedule-mobile-picker-field" disabled={props.disabled === true} onClick={() => begin(1)}>{current[1]?.format(format) || placeholders[1] || (timeOnly ? "Giờ kết thúc" : "Đến ngày")}</button>
        </div>
        {(current[0] || current[1]) && props.allowClear !== false && <button type="button" className="schedule-mobile-picker-range-clear" onClick={() => {
            setDraft([undefined, undefined]);
            if (kind === "date") (props as DateRangeProps).onChange?.(null, ["", ""]);
            else (props as TimeRangeProps).onChange?.(null, ["", ""]);
        }}>Xóa khoảng đã chọn</button>}
        {timeOnly ? <MobilePicker
            visible={active !== null}
            columns={[Array.from({ length: 24 }, (_, hour) => ({ label: String(hour).padStart(2, "0"), value: hour })), Array.from({ length: 60 / ((props as TimeRangeProps).minuteStep || 1) }, (_, index) => {
                const minute = index * ((props as TimeRangeProps).minuteStep || 1);
                return { label: String(minute).padStart(2, "0"), value: minute };
            })]}
            value={[current[active ?? 0]?.hour() ?? 0, current[active ?? 0]?.minute() ?? 0]}
            title={active === 0 ? "Giờ bắt đầu" : "Giờ kết thúc"}
            cancelText="Hủy" confirmText="Xác nhận"
            onClose={() => setActive(null)}
            onConfirm={(value) => update(dayjs().hour(Number(value[0])).minute(Number(value[1])).second(0))}
        /> : <MobileDatePicker
            visible={active !== null}
            value={current[active ?? 0]?.toDate()}
            min={(active === 1 && current[0] ? (showTime ? current[0] : current[0].startOf("day")) : dayjs().subtract(50, "year")).toDate()}
            max={(active === 0 && current[1] ? (showTime ? current[1] : current[1].endOf("day")) : dayjs().add(50, "year")).toDate()}
            filter={kind === "date" && (props as DateRangeProps).disabledDate ? { day: (_day, { date }) => !((props as DateRangeProps).disabledDate as (date: Dayjs) => boolean)(dayjs(date)) } : undefined}
            precision={showTime ? "minute" : "day"}
            title={active === 0 ? "Chọn ngày bắt đầu" : "Chọn ngày kết thúc"}
            cancelText="Hủy" confirmText="Xác nhận"
            onClose={() => setActive(null)}
            onConfirm={(date) => update(dayjs(date))}
        />}
    </ConfigProvider>;
}

export const DatePicker = Object.assign(DateField, { RangePicker: (props: DateRangeProps) => <RangeField kind="date" {...props} /> });
export const TimePicker = Object.assign(TimeField, { RangePicker: (props: TimeRangeProps) => <RangeField kind="time" {...props} /> });
