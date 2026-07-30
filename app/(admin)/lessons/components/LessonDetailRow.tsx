"use client";

import dayjs from "dayjs";
import { Descriptions, Space, Tabs, Typography } from "antd";
import type { TabsProps } from 'antd';
import { FORM_FIELDS } from "./Modal/LessonFormModal";
import type { LessonDataType } from "../lesson.types";

interface LessonDetailRowProps {
    record: LessonDataType;
    visibleFieldCodes: string[];
}

const LessonDetailRow = ({
    record,
    visibleFieldCodes,
}: LessonDetailRowProps) => {
    const detailFields = FORM_FIELDS.filter((field) => visibleFieldCodes.includes(field.fieldCode));

    const renderFieldValue = (fieldCode: string, value: unknown) => {
        if (value == null || value === "") return "-";
        if (fieldCode === "lesson_document") {
            try {
                const documents = JSON.parse(String(value));
                if (Array.isArray(documents)) {
                    return (
                        <Space direction="vertical" size={2}>
                            {documents.map((document, index) => (
                                <Typography.Link
                                    key={`${document.link}-${index}`}
                                    href={String(document.link || "")}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    {String(document.title || document.link || `Tài liệu ${index + 1}`)}
                                    {document.type ? ` (${String(document.type).toUpperCase()})` : ""}
                                </Typography.Link>
                            ))}
                        </Space>
                    );
                }
            } catch {
                return String(value);
            }
        }
        if (["evg_banner", "evg_stream", "lesson_link"].includes(fieldCode)) {
            return (
                <Typography.Link href={String(value)} target="_blank" rel="noreferrer">
                    {String(value)}
                </Typography.Link>
            );
        }
        return String(value);
    };

    const dataRow = detailFields.map((field) => ({
        label: field.fieldLabel,
        value: renderFieldValue(
            field.fieldCode,
            (record as unknown as Record<string, unknown>)[field.fieldCode]
        ),
    }));

    if (visibleFieldCodes.includes("updated_at")) {
        dataRow.push({
            label: "Ngày cập nhật",
            value: record.updated_at ? dayjs(record.updated_at).format("DD/MM/YYYY HH:mm") : "-",
        });
    }

    // Split data into two columns for better layout
    const tabItems: TabsProps['items'] = [
        {
            key: '1',
            label: 'Thông tin chi tiết',
            children: (
                <div style={{ padding: '8px 24px 24px', backgroundColor: '#fafafa' }}>
                    <Descriptions
                        bordered
                        size="small"
                        column={{ xxl: 3, xl: 3, lg: 2, md: 2, sm: 1, xs: 1 }}
                    >
                        {dataRow.map((item, index) => (
                            <Descriptions.Item key={index} label={item.label}>
                                {item.value}
                            </Descriptions.Item>
                        ))}
                    </Descriptions>
                </div>
            )
        }
    ];

    return <Tabs defaultActiveKey="1" items={tabItems} />;
};

export default LessonDetailRow;
