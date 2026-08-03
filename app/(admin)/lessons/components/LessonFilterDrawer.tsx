"use client";

import { useEffect } from "react";
import { Button, Drawer, Form, InputNumber, Select, Space } from "antd";
import { GRADE_OPTIONS } from "@/constants/subjects";
import { useLessonSubjectOptions } from "@/hooks/useLessonSubjectOptions";
import type { LessonFilterValues } from "../lesson.types";
import { cleanFilterValues } from "../lesson.utils";

interface LessonFilterDrawerProps {
    open: boolean;
    value: LessonFilterValues;
    loading: boolean;
    onClose: () => void;
    onSearch: (values: LessonFilterValues) => void;
    onReset: () => void;
}

const LessonFilterDrawer = ({
    open,
    value,
    loading,
    onClose,
    onSearch,
    onReset,
}: LessonFilterDrawerProps) => {
    const [filterForm] = Form.useForm();
    const subjectOptions = useLessonSubjectOptions();

    useEffect(() => {
        filterForm.setFieldsValue(value);
    }, [filterForm, value]);

    return (
        <Drawer
            title="Bộ lọc bài học"
            placement="right"
            open={open}
            onClose={onClose}
            width={360}
            footer={
                <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                    <Button
                        onClick={() => {
                            filterForm.resetFields();
                            onReset();
                        }}
                    >
                        Xóa lọc
                    </Button>
                    <Button type="primary" onClick={() => filterForm.submit()} loading={loading}>
                        Tìm kiếm
                    </Button>
                </Space>
            }
        >
            <Form
                form={filterForm}
                layout="vertical"
                onFinish={(values) => onSearch(cleanFilterValues(values))}
            >
                <Form.Item name="grade" label="Khối">
                    <Select allowClear options={GRADE_OPTIONS} placeholder="Chọn khối" />
                </Form.Item>
                <Form.Item name="subject" label="Môn học">
                    <Select
                        allowClear
                        options={subjectOptions}
                        placeholder="Chọn môn học"
                        showSearch
                        optionFilterProp="label"
                    />
                </Form.Item>
                <Form.Item name="learn_number" label="Số thứ tự bài">
                    <InputNumber min={1} style={{ width: "100%" }} placeholder="VD: 1" />
                </Form.Item>
            </Form>
        </Drawer>
    );
};

export default LessonFilterDrawer;
