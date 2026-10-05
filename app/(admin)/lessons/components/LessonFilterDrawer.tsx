"use client";

import Select from "@/components/ui/MobileSelect";
import { useEffect } from "react";
import { Button, Drawer, Form, Grid, InputNumber, Space, Typography } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import { Popup as MobilePopup } from "antd-mobile";
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
    const screens = Grid.useBreakpoint();
    const compact = !screens.md;
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
        filterForm.resetFields();
        filterForm.setFieldsValue(value);
    }, [filterForm, value]);

    const resetFilters = () => {
        filterForm.resetFields();
        onReset();
    };
    const filterFormContent = (
        <Form
            className={compact ? "schedule-filter-sheet-body" : undefined}
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
                <Form.Item label="Khoảng bài">
                    <Space.Compact block>
                        <Form.Item name="from_learn_number" noStyle>
                            <InputNumber
                                min={1}
                                precision={0}
                                style={{ width: "50%" }}
                                placeholder="Từ bài"
                            />
                        </Form.Item>
                        <Form.Item name="to_learn_number" noStyle>
                            <InputNumber
                                min={1}
                                precision={0}
                                style={{ width: "50%" }}
                                placeholder="Đến bài"
                            />
                        </Form.Item>
                    </Space.Compact>
                </Form.Item>
        </Form>
    );

    if (compact) {
        return (
            <MobilePopup
                position="bottom"
                visible={open}
                onClose={onClose}
                closeOnMaskClick
                bodyClassName="schedule-filter-sheet"
                bodyStyle={{ height: "min(430px, calc(100dvh - 48px))" }}
            >
                <div className="schedule-filter-sheet-header">
                    <div>
                        <Typography.Text strong>Bộ lọc đề cương</Typography.Text>
                        <Typography.Text type="secondary">Lọc theo chương trình và khoảng bài</Typography.Text>
                    </div>
                    <Button type="text" aria-label="Đóng bộ lọc" icon={<CloseOutlined />} onClick={onClose} />
                </div>
                {filterFormContent}
                <div className="schedule-filter-sheet-actions">
                    <Button onClick={resetFilters}>Xóa lọc</Button>
                    <Button type="primary" onClick={() => filterForm.submit()} loading={loading}>Tìm kiếm</Button>
                </div>
            </MobilePopup>
        );
    }

    return (
        <Drawer
            title="Bộ lọc đề cương"
            placement="right"
            open={open}
            onClose={onClose}
            width="min(92vw, 400px)"
            footer={
                <Space className="responsive-modal-footer" style={{ width: "100%", justifyContent: "flex-end" }}>
                    <Button onClick={resetFilters}>Xóa lọc</Button>
                    <Button type="primary" onClick={() => filterForm.submit()} loading={loading}>Tìm kiếm</Button>
                </Space>
            }
        >
            {filterFormContent}
        </Drawer>
    );
};

export default LessonFilterDrawer;
