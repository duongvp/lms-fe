import type { Dayjs } from "dayjs";

/** A time picker edits the clock only; its incidental calendar date is ignored. */
export const mergeScheduleClock = (date: Dayjs, time: Dayjs | null): Dayjs | null => (
    time ? date.hour(time.hour()).minute(time.minute()).second(0).millisecond(0) : null
);
