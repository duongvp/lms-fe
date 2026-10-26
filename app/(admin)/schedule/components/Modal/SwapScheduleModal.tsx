"use client";

import Select from "@/components/ui/MobileSelect";
import React, { useEffect, useState } from "react";
import { Alert, Button, Card, Col, Divider, Form, Input, Modal, notification, Row, Space, Tag, Typography } from "antd";
import { DatePicker } from "../MobileSchedulePickers";
import dayjs, { Dayjs } from "dayjs";
import { getLivestreams, swapLivestreamTimes } from "@/services/livestreamService";
import { combineDateTime, formatVietnamDateTime } from "@/helper/convertDate";

type Schedule = {
    id?: string | number;
    code?: string;
    learn_number?: number;
    lesson_name?: string;
    teacher?: string;
    assistant_teacher?: string;
    start_time?: string;
    end_time?: string;
    can_modify?: boolean;
};

const scheduleTime = (item: Schedule) => {
    if (!item.start_time) return "Chưa có thời gian dạy";
    const start = dayjs(item.start_time);
    const end = item.end_time ? dayjs(item.end_time) : null;
    return `${start.format("DD/MM/YYYY · HH:mm")}${end ? ` – ${end.format(start.isSame(end, "day") ? "HH:mm" : "DD/MM/YYYY HH:mm")}` : ""}`;
};

const lessonLabel = (item: Schedule) => [
    item.learn_number ? `Bài ${item.learn_number}` : "",
    item.lesson_name,
].filter(Boolean).join(" · ");

type ScheduleConflict = Schedule & {
    staff_type: "teacher" | "assistant" | "course";
    username: string;
    swap_target?: { label: "A" | "B"; id: number; start_time: string; end_time: string };
};

const conflictTime = (item: { start_time?: string; end_time?: string }) => {
    const sameDay = formatVietnamDateTime(item.start_time, "YYYY-MM-DD") === formatVietnamDateTime(item.end_time, "YYYY-MM-DD");
    return `${formatVietnamDateTime(item.start_time, "DD/MM/YYYY · HH:mm")} – ${formatVietnamDateTime(item.end_time, sameDay ? "HH:mm" : "DD/MM/YYYY · HH:mm")}`;
};

const ConflictDetails = ({ conflicts, onEdit }: { conflicts: ScheduleConflict[]; onEdit: (label: "A" | "B") => void }) => {
    const groups = (["A", "B", undefined] as const).map(label => ({
        label, items: conflicts.filter(item => item.swap_target?.label === label),
    })).filter(group => group.items.length);
    return <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <Typography.Text>Chưa có lịch nào được thay đổi. Hãy chỉnh giờ của lịch bị trùng hoặc chọn lịch B khác.</Typography.Text>
        {groups.map(({ label, items }) => <Card key={label || "unknown"} size="small" styles={{ body: { padding: 12 } }}>
            <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <Space wrap size={8}>
                    <Tag color={label === "A" ? "blue" : label === "B" ? "purple" : "red"}>{label ? `Lịch ${label}` : "Lịch trùng"}</Tag>
                    <Typography.Text strong>{label ? `Lịch ${label} bị trùng sau hoán đổi` : "Chi tiết lịch trùng"}</Typography.Text>
                    {label && <Button type="link" size="small" onClick={() => onEdit(label)}>Chỉnh giờ lịch {label}</Button>}
                </Space>
                {items[0].swap_target && <Typography.Text>Giờ dự kiến: {conflictTime(items[0].swap_target)}</Typography.Text>}
                <Typography.Text type="secondary">Trùng với {items.length} lịch sau:</Typography.Text>
                {items.map((item, index) => <div key={`${item.id}-${index}`} style={{ borderTop: "1px solid var(--ant-color-border-secondary, #f0f0f0)", paddingTop: 8 }}>
                    <Space direction="vertical" size={4} style={{ width: "100%" }}>
                        <Typography.Text type="danger">{item.staff_type === "course" ? "Cùng chương trình" : `${item.staff_type === "teacher" ? "Cùng giáo viên" : "Cùng trợ giảng"}: ${item.username}`}</Typography.Text>
                        <Typography.Text strong>{lessonLabel(item) || "Chưa có tên bài học"}</Typography.Text>
                        <Typography.Text>{conflictTime(item)}</Typography.Text>
                        <Typography.Text type="secondary">{item.code || "-"} · ID lịch: {item.id}</Typography.Text>
                    </Space>
                </div>)}
            </Space>
        </Card>)}
    </Space>;
};

const ScheduleSummary = ({ item, tag }: { item: Schedule; tag: string }) => (
    <Space direction="vertical" size={3} style={{ width: "100%" }}>
        <Space size={8} wrap>
            <Tag color={tag === "A" ? "blue" : "purple"}>Lịch {tag}</Tag>
            <Typography.Text strong>{scheduleTime(item)}</Typography.Text>
        </Space>
        <Typography.Text style={{ overflowWrap: "anywhere" }}>
            {lessonLabel(item) || "Chưa có tên bài học"}
        </Typography.Text>
        <Typography.Text type="secondary" style={{ overflowWrap: "anywhere" }}>
            Chương trình: {item.code || "-"}
        </Typography.Text>
        <Typography.Text type="secondary">
            GV: {item.teacher || "-"} · TG: {item.assistant_teacher || "-"}
        </Typography.Text>
    </Space>
);

const SwapScheduleModal = ({ open, source, programs, onClose, onSuccess }: {
    open: boolean;
    source: Schedule | null;
    programs: Array<{ value: string; label: string }>;
    onClose: () => void;
    onSuccess: () => void;
}) => {
    const [form] = Form.useForm();
    const [api, contextHolder] = notification.useNotification();
    const [candidates, setCandidates] = useState<Schedule[]>([]);
    const [loadingCandidates, setLoadingCandidates] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errorNotice, setErrorNotice] = useState<{ title: string; detail: string; conflicts?: ScheduleConflict[] } | null>(null);
    const selectedId = Form.useWatch("second_id", form);
    const selected = candidates.find((item) => String(item.id) === String(selectedId));
    const hasConflict = (label: "A" | "B") => errorNotice?.conflicts?.some(item => item.swap_target?.label === label);

    useEffect(() => {
        if (!open) return;
        setErrorNotice(null);
        form.resetFields();
        form.setFieldValue("program", source?.code);
        setCandidates([]);
    }, [open, source, form]);

    const loadCandidates = async (program: string, keyword = "") => {
        if (!program) return setCandidates([]);
        setErrorNotice(null);
        setLoadingCandidates(true);
        try {
            const response: any = await getLivestreams({
                page: 1, limit: 100, code_exact: program, keyword, time_status: "upcoming",
                sort_by: "start_time", sort_order: "asc",
            });
            setCandidates((response?.data?.data || []).filter((item: Schedule) => (
                String(item.id) !== String(source?.id) && item.can_modify !== false
            )));
        } catch (error: any) {
            setCandidates([]);
            setErrorNotice({ title: "Không tải được lịch", detail: error?.message || "Vui lòng thử chọn lại chương trình." });
            api.error({ message: "Không tải được lịch" });
        } finally {
            setLoadingCandidates(false);
        }
    };

    useEffect(() => {
        if (open && source?.code) void loadCandidates(source.code);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, source?.id]);

    const selectCandidate = (id: string | number) => {
        const target = candidates.find((item) => String(item.id) === String(id));
        if (!target) {
            form.setFieldsValue({ first_range: undefined, second_range: undefined });
        }
        if (!target || !source) return;
        form.setFieldsValue({
            first_range: [dayjs(target.start_time), dayjs(target.end_time)],
            second_range: [dayjs(source.start_time), dayjs(source.end_time)],
        });
    };

    const submit = async () => {
        setErrorNotice(null);
        const values = await form.validateFields();
        setSaving(true);
        try {
            const firstRange = values.first_range as [Dayjs, Dayjs];
            const secondRange = values.second_range as [Dayjs, Dayjs];
            await swapLivestreamTimes({
                first_id: source!.id!, second_id: values.second_id,
                first_start_time: combineDateTime(firstRange[0], firstRange[0]),
                first_end_time: combineDateTime(firstRange[1], firstRange[1]),
                second_start_time: combineDateTime(secondRange[0], secondRange[0]),
                second_end_time: combineDateTime(secondRange[1], secondRange[1]),
                reason: values.reason,
            });
            onSuccess();
        } catch (error: any) {
            setErrorNotice({
                title: "Hoán đổi lịch thất bại",
                detail: error?.message || "Không thể hoán đổi hai lịch học.",
                conflicts: Array.isArray(error?.detail?.conflicts) ? error.detail.conflicts : undefined,
            });
            api.error({ message: "Hoán đổi lịch thất bại" });
        } finally {
            setSaving(false);
        }
    };

    return <><Modal open={open} title="Hoán đổi lịch học" width={880} onCancel={onClose}
        style={{ top: 24 }} styles={{ body: { maxHeight: "calc(100dvh - 180px)", overflowY: "auto", overflowX: "hidden", overflowWrap: "anywhere" } }}
        onOk={() => void submit()} confirmLoading={saving} okText="Hoán đổi" cancelText="Hủy">
        <Alert type="info" showIcon style={{ marginBottom: 16 }}
            message="Hai buổi chỉ đổi khung giờ; chương trình, bài học và đội ngũ giảng dạy vẫn giữ nguyên." />
        {source && <Card size="small" styles={{ body: { padding: 12 } }}>
            <ScheduleSummary item={source} tag="A" />
        </Card>}

        <Divider orientation="left" plain style={{ margin: "16px 0 12px" }}>Chọn lịch đổi với lịch A</Divider>
        <Form form={form} layout="vertical" onValuesChange={(changed) => {
            if (Object.keys(changed).some(key => key !== "reason")) setErrorNotice(null);
        }}>
            <Row gutter={12}>
                <Col xs={24} md={9}>
                    <Form.Item name="program" label="Chương trình" rules={[{ required: true }]}>
                        <Select showSearch options={programs} optionFilterProp="label" onChange={(value) => {
                            form.setFieldsValue({ second_id: undefined, first_range: undefined, second_range: undefined });
                            void loadCandidates(value);
                        }} />
                    </Form.Item>
                </Col>
                <Col xs={24} md={15}>
                    <Form.Item name="second_id" label="Lịch B" rules={[{ required: true, message: "Chọn lịch B" }]}>
                        <Select showSearch loading={loadingCandidates} optionFilterProp="searchText"
                            placeholder="Tìm theo ngày dạy, bài học hoặc giáo viên"
                            virtual={false}
                            notFoundContent={loadingCandidates ? "Đang tải lịch…" : "Không có lịch phù hợp"}
                            options={candidates.map((item) => ({
                                value: item.id,
                                label: [scheduleTime(item), lessonLabel(item)].filter(Boolean).join(" · "),
                                searchText: [scheduleTime(item), lessonLabel(item), item.teacher, item.assistant_teacher].filter(Boolean).join(" "),
                                schedule: item,
                            }))}
                            optionRender={(option) => (
                                <div style={{ padding: "4px 0", whiteSpace: "normal", overflowWrap: "anywhere" }}>
                                    <Typography.Text strong>{scheduleTime(option.data.schedule)}</Typography.Text>
                                    <div style={{ marginTop: 2 }}>{lessonLabel(option.data.schedule)}</div>
                                    <Typography.Text type="secondary">GV: {option.data.schedule.teacher || "-"}</Typography.Text>
                                </div>
                            )}
                            onChange={selectCandidate} />
                    </Form.Item>
                </Col>
            </Row>

            {selected && <>
                <Card size="small" styles={{ body: { padding: 12 } }}>
                    <ScheduleSummary item={selected} tag="B" />
                </Card>
                <Divider orientation="left" plain style={{ margin: "16px 0 12px" }}>Kết quả sau hoán đổi</Divider>
                <Row gutter={[12, 12]}>
                    <Col xs={24} md={12}>
                        <Card size="small" style={hasConflict("A") ? { borderColor: "#ff4d4f" } : undefined} title={<Space><Tag color="blue">Lịch A</Tag><span>Thời gian mới</span></Space>}>
                            <Form.Item name="first_range" style={{ marginBottom: 0 }}
                                validateStatus={hasConflict("A") ? "error" : undefined}
                                help={hasConflict("A") ? "Lịch A bị trùng. Xem chi tiết bên dưới." : undefined}
                                rules={[{ required: true, message: "Chọn thời gian cho lịch A" }]}>
                                <DatePicker.RangePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: "100%" }} />
                            </Form.Item>
                            <Typography.Text type="secondary" style={{ display: "block", marginTop: 8 }}>
                                Mặc định lấy thời gian cũ của lịch B
                            </Typography.Text>
                        </Card>
                    </Col>
                    <Col xs={24} md={12}>
                        <Card size="small" style={hasConflict("B") ? { borderColor: "#ff4d4f" } : undefined} title={<Space><Tag color="purple">Lịch B</Tag><span>Thời gian mới</span></Space>}>
                            <Form.Item name="second_range" style={{ marginBottom: 0 }}
                                validateStatus={hasConflict("B") ? "error" : undefined}
                                help={hasConflict("B") ? "Lịch B bị trùng. Xem chi tiết bên dưới." : undefined}
                                rules={[{ required: true, message: "Chọn thời gian cho lịch B" }]}>
                                <DatePicker.RangePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: "100%" }} />
                            </Form.Item>
                            <Typography.Text type="secondary" style={{ display: "block", marginTop: 8 }}>
                                Mặc định lấy thời gian cũ của lịch A
                            </Typography.Text>
                        </Card>
                    </Col>
                </Row>
            </>}
            <Form.Item name="reason" label="Lý do (không bắt buộc)" style={{ marginTop: 16, marginBottom: 0 }}>
                <Input.TextArea autoSize={{ minRows: 3, maxRows: 8 }} showCount maxLength={500}
                    placeholder="Nhập lý do hoán đổi lịch học…" />
            </Form.Item>
        </Form>
        {errorNotice && <Alert type="error" showIcon role="alert"
            style={{ marginTop: 24, whiteSpace: "pre-line", overflowWrap: "anywhere" }}
            message={errorNotice.title}
            description={errorNotice.conflicts?.length ? <ConflictDetails conflicts={errorNotice.conflicts}
                onEdit={(label) => form.scrollToField(label === "A" ? "first_range" : "second_range", { block: "center", focus: true })} /> : errorNotice.detail} />}
    </Modal>{contextHolder}</>;
};

export default SwapScheduleModal;
