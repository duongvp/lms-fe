"use client";

import React, { useMemo } from "react";
import { Select, type SelectProps } from "antd";
import { hmoLessonIdFromMappingKey } from "@/helper/hmoOptions";

type HmoMappingSelectProps = Omit<
    SelectProps<string[]>,
    "mode" | "tagRender" | "maxTagCount" | "maxTagPlaceholder"
>;

/**
 * Select vẫn giữ từng mapping Package/Course/Lesson làm value riêng biệt để
 * payload không mất dữ liệu. Chỉ phần tag đang đóng được gom theo Lesson ID.
 */
export default function HmoMappingSelect({
    value,
    onChange,
    ...props
}: HmoMappingSelectProps) {
    const selectedKeys = useMemo(
        () => Array.isArray(value)
            ? Array.from(new Set(value.map((item) => String(item)).filter(Boolean)))
            : [],
        [value]
    );

    const { orderedKeys, firstKeyByLessonId } = useMemo(() => {
        const firstKeys: string[] = [];
        const duplicateKeys: string[] = [];
        const firstByLessonId = new Map<string, string>();

        selectedKeys.forEach((key) => {
            const lessonId = hmoLessonIdFromMappingKey(key);
            if (firstByLessonId.has(lessonId)) {
                duplicateKeys.push(key);
                return;
            }
            firstByLessonId.set(lessonId, key);
            firstKeys.push(key);
        });

        return {
            orderedKeys: [...firstKeys, ...duplicateKeys],
            firstKeyByLessonId: firstByLessonId,
        };
    }, [selectedKeys]);

    const renderSelectedTag: SelectProps<string[]>["tagRender"] = ({ value: tagValue, closable }) => {
        const key = String(tagValue || "");
        const lessonId = hmoLessonIdFromMappingKey(key);
        if (firstKeyByLessonId.get(lessonId) !== key) return <span style={{ display: "none" }} />;

        const removeLessonMappings = (event: React.MouseEvent<HTMLElement>) => {
            event.preventDefault();
            event.stopPropagation();
            const nextKeys = selectedKeys.filter(
                (selectedKey) => hmoLessonIdFromMappingKey(selectedKey) !== lessonId
            );
            onChange?.(nextKeys, []);
        };

        return (
            <span className="ant-select-selection-item" style={{ marginInlineEnd: 4 }}>
                <span className="ant-select-selection-item-content">{lessonId}</span>
                {closable && (
                    <span
                        className="ant-select-selection-item-remove"
                        onMouseDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                        }}
                        onClick={removeLessonMappings}
                    >
                        ×
                    </span>
                )}
            </span>
        );
    };

    return (
        <Select<string[]>
            {...props}
            mode="multiple"
            value={Array.isArray(value) ? orderedKeys : value}
            onChange={onChange}
            tagRender={renderSelectedTag}
            // Các value trùng Lesson ID đã được đưa xuống cuối. Chỉ render số
            // tag bằng số Lesson ID duy nhất và ẩn placeholder của mapping dư.
            maxTagCount={firstKeyByLessonId.size}
            maxTagPlaceholder={() => null}
        />
    );
}
