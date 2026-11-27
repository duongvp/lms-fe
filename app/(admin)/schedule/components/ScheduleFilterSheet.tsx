"use client";
import React, {useState} from 'react';
import {Button, Typography} from 'antd';
import {CloseOutlined} from '@ant-design/icons';
import {ConfigProvider as MobileConfigProvider, DatePicker as MobileDatePicker, Popup as MobilePopup} from 'antd-mobile';
import viVN from 'antd-mobile/es/locales/vi-VN';
import dayjs, {type Dayjs} from 'dayjs';
import ScheduleFilterPanel from './ScheduleFilterPanel';

const MobileDateRangePicker = ({
    value,
    onChange,
}: {
    value?: [Dayjs, Dayjs];
    onChange?: (value?: [Dayjs, Dayjs]) => void;
}) => {
    const [target, setTarget] = useState<"start" | "end" | null>(null);
    const selectedDate = target === "start" ? value?.[0] : value?.[1];
    const updateDate = (date: Date) => {
        const nextDate = dayjs(date).startOf("day");
        const currentStart = value?.[0];
        const currentEnd = value?.[1];
        const nextRange: [Dayjs, Dayjs] = target === "end"
            ? currentStart && nextDate.isBefore(currentStart)
                ? [nextDate, nextDate]
                : [currentStart || nextDate, nextDate]
            : currentEnd && nextDate.isAfter(currentEnd)
                ? [nextDate, nextDate]
                : [nextDate, currentEnd || nextDate];
        onChange?.(nextRange);
        setTarget(null);
    };
    const displayDate = (date: Dayjs | undefined, placeholder: string) => date?.isValid() ? date.format("DD/MM/YYYY") : placeholder;

    return (
        <>
            <div className="schedule-mobile-date-range">
                <button type="button" aria-label="Chọn ngày bắt đầu" onClick={() => setTarget("start")}>
                    <strong>{displayDate(value?.[0], "Từ ngày")}</strong>
                </button>
                <span className="schedule-mobile-date-range-divider">đến</span>
                <button type="button" aria-label="Chọn ngày kết thúc" onClick={() => setTarget("end")}>
                    <strong>{displayDate(value?.[1], "Đến ngày")}</strong>
                </button>
            </div>
            {value?.[0] && value?.[1] && (
                <Button type="link" size="small" onClick={() => onChange?.(undefined)} style={{ paddingInline: 0, marginTop: 4 }}>
                    Xóa khoảng ngày
                </Button>
            )}
            <MobileConfigProvider locale={viVN}>
                <MobileDatePicker
                visible={Boolean(target)}
                value={selectedDate?.toDate()}
                precision="day"
                title={target === "start" ? "Chọn ngày bắt đầu" : "Chọn ngày kết thúc"}
                onClose={() => setTarget(null)}
                onConfirm={updateDate}
                cancelText="Hủy"
                confirmText="Xác nhận"
                style={{ "--z-index": 1200 } as React.CSSProperties}
                />
            </MobileConfigProvider>
        </>
    );
};

type ScheduleFiltersProps=React.ComponentProps<typeof ScheduleFilterPanel>;
const ScheduleFilterSheet=({open,onClose,...props}:ScheduleFiltersProps&{open:boolean;onClose:()=>void})=>(
 <MobilePopup position="bottom" visible={open} onClose={onClose} closeOnMaskClick bodyClassName={`schedule-filter-sheet${open?' schedule-filter-sheet-open':''}`} bodyStyle={{height:'calc(100dvh - 48px)'}}>
  <div className="schedule-filter-sheet-header"><div><Typography.Text strong className="schedule-filter-sheet-title">Bộ lọc lịch học</Typography.Text><Typography.Text type="secondary">Chọn phân loại và điều kiện để tìm lịch</Typography.Text></div><Button type="text" aria-label="Đóng bộ lọc" icon={<CloseOutlined/>} onClick={onClose}/></div>
  <div className="schedule-filter-sheet-body"><ScheduleFilterPanel {...props} sheet dateRangeInput={<MobileDateRangePicker/>}/></div>
 </MobilePopup>
);


export default ScheduleFilterSheet;
