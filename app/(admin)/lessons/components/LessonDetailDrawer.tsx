"use client";

import dayjs from "dayjs";
import { Descriptions, Drawer } from "antd";
import { FORM_FIELDS } from "./Modal/LessonFormModal";
import type { LessonDataType } from "../lesson.types";

interface LessonDetailDrawerProps {
    open: boolean;
    record: LessonDataType | null;
    visibleFieldCodes: string[];
    onClose: () => void;
}

const LessonDetailDrawer = ({
    open,
    record,
    visibleFieldCodes,
    onClose,
}: LessonDetailDrawerProps) => {
    const detailFields = FORM_FIELDS.filter((field) => visibleFieldCodes.includes(field.fieldCode));

    return (
        <Drawer title="Chi tiết bài học" placement="right" open={open} onClose={onClose} width={640}>
            {record && (
                <Descriptions column={1} bordered size="small">
                    {detailFields.map((field) => (
                        <Descriptions.Item key={field.fieldCode} label={field.fieldLabel}>
                            {String((record as unknown as Record<string, unknown>)[field.fieldCode] ?? "-") || "-"}
                        </Descriptions.Item>
                    ))}
                    {visibleFieldCodes.includes("updated_at") && (
                        <Descriptions.Item label="Cập nhật">
                            {dayjs(record.updated_at).format("DD/MM/YYYY HH:mm")}
                        </Descriptions.Item>
                    )}
                </Descriptions>
            )}
        </Drawer>
    );
};

export default LessonDetailDrawer;
