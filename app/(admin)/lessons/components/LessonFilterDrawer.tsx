"use client";

import { useEffect } from "react";
import { Button, Drawer, Form, InputNumber, Select, Space } from "antd";
import { useLessonProgramOptions } from "@/hooks/useLessonSubjectOptions";
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
    const lessonPrograms = useLessonProgramOptions();
    const programOptions = lessonPrograms.map((program) => ({
        value: program.subject_code,
        label: program.subject_name
            ? `${program.subject_code} — ${program.subject_name}`
            : program.subject_code,
        grade: program.grade,
        subject_name: program.subject_name,
    }));

    useEffect(() => {
        filterForm.setFieldsValue(value);
    }, [filterForm, value]);

    return (
        <Drawer
            title="Bộ lọc đề cương"
            placement="right"
            open={open}
            onClose={onClose}
            width="min(92vw, 400px)"
            footer={
                <Space className="responsive-modal-footer" style={{ width: "100%", justifyContent: "flex-end" }}>
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
                <Form.Item
                    name="subject_code"
                    label="Chương trình"
                    rules={[{ required: true, message: "Vui lòng chọn Chương trình" }]}
                >
                    <Select
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        options={programOptions}
                        placeholder="Chọn Chương trình"
                        onChange={(_, option: any) => {
                            filterForm.setFieldsValue({
                                grade: option?.grade,
                                subject: option?.subject_name,
                            });
                        }}
                    />
                </Form.Item>
                <Form.Item name="grade" hidden><InputNumber /></Form.Item>
                <Form.Item name="subject" hidden><Select /></Form.Item>
                <Form.Item name="learn_number" label="Số thứ tự bài">
                    <InputNumber min={1} style={{ width: "100%" }} placeholder="VD: 1" />
                </Form.Item>
            </Form>
        </Drawer>
    );
};

export default LessonFilterDrawer;
