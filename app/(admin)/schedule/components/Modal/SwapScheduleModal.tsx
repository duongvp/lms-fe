"use client";

import React, { useEffect, useState } from "react";
import { Alert, Card, Col, DatePicker, Divider, Form, Input, Modal, notification, Row, Select, Space, Tag, Typography } from "antd";
import dayjs, { Dayjs } from "dayjs";
import { getLivestreams, swapLivestreamTimes } from "@/services/livestreamService";

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

const label = (item: Schedule) => [
    item.code,
    item.learn_number ? `Bài ${item.learn_number}` : "",
    item.lesson_name,
    item.teacher,
    item.start_time ? dayjs(item.start_time).format("DD/MM/YYYY HH:mm") : "",
].filter(Boolean).join(" · ");

const ScheduleSummary = ({ item, tag }: { item: Schedule; tag: string }) => (
    <Space direction="vertical" size={3} style={{ width: "100%" }}>
        <Space size={8} wrap>
            <Tag color={tag === "A" ? "blue" : "purple"}>Lịch {tag}</Tag>
            <Typography.Text strong>{item.code || "Chưa có chương trình"}</Typography.Text>
            {item.learn_number ? <Typography.Text type="secondary">Bài {item.learn_number}</Typography.Text> : null}
        </Space>
        <Typography.Text ellipsis={{ tooltip: item.lesson_name }} style={{ maxWidth: "100%" }}>
            {item.lesson_name || "Chưa có tên bài học"}
        </Typography.Text>
        <Typography.Text type="secondary">
            GV: {item.teacher || "-"} · TG: {item.assistant_teacher || "-"}
        </Typography.Text>
        <Typography.Text type="secondary">
            Hiện tại: {item.start_time ? dayjs(item.start_time).format("DD/MM/YYYY HH:mm") : "-"}
            {item.end_time ? ` – ${dayjs(item.end_time).format("HH:mm")}` : ""}
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
    const selectedId = Form.useWatch("second_id", form);
    const selected = candidates.find((item) => String(item.id) === String(selectedId));

    useEffect(() => {
        if (!open) return;
        form.resetFields();
        form.setFieldValue("program", source?.code);
        setCandidates([]);
    }, [open, source, form]);

    const loadCandidates = async (program: string, keyword = "") => {
        if (!program) return setCandidates([]);
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
            api.error({ message: "Không tải được lịch", description: error?.message });
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
        if (!target || !source) return;
        form.setFieldsValue({
            first_range: [dayjs(target.start_time), dayjs(target.end_time)],
            second_range: [dayjs(source.start_time), dayjs(source.end_time)],
        });
    };

    const submit = async () => {
        const values = await form.validateFields();
        setSaving(true);
        try {
            const firstRange = values.first_range as [Dayjs, Dayjs];
            const secondRange = values.second_range as [Dayjs, Dayjs];
            await swapLivestreamTimes({
                first_id: source!.id!, second_id: values.second_id,
                first_start_time: firstRange[0].format("YYYY-MM-DDTHH:mm:ss"),
                first_end_time: firstRange[1].format("YYYY-MM-DDTHH:mm:ss"),
                second_start_time: secondRange[0].format("YYYY-MM-DDTHH:mm:ss"),
                second_end_time: secondRange[1].format("YYYY-MM-DDTHH:mm:ss"),
                reason: values.reason,
            });
            onSuccess();
        } catch (error: any) {
            api.error({
                message: "Hoán đổi lịch thất bại",
                description: error?.message || "Không thể hoán đổi hai lịch học.",
            });
        } finally {
            setSaving(false);
        }
    };

    return <><Modal open={open} title="Hoán đổi lịch học" width={880} onCancel={onClose}
        onOk={() => void submit()} confirmLoading={saving} okText="Hoán đổi" cancelText="Hủy">
        <Alert type="info" showIcon style={{ marginBottom: 16 }}
            message="Hai buổi chỉ đổi khung giờ; chương trình, bài học và đội ngũ giảng dạy vẫn giữ nguyên." />
        {source && <Card size="small" styles={{ body: { padding: 12 } }}>
            <ScheduleSummary item={source} tag="A" />
        </Card>}

        <Divider orientation="left" plain style={{ margin: "16px 0 12px" }}>Chọn lịch đổi với lịch A</Divider>
        <Form form={form} layout="vertical">
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
                        <Select showSearch loading={loadingCandidates} optionFilterProp="label"
                            placeholder="Tìm theo bài học, giáo viên hoặc thời gian"
                            options={candidates.map((item) => ({ value: item.id, label: label(item) }))}
                            onChange={selectCandidate} />
                    </Form.Item>
                </Col>
            </Row>

            {selected && <>
                <Card size="small" styles={{ body: { padding: 12 } }}>
                    <ScheduleSummary item={selected} tag="B" />
                </Card>
                <Divider orientation="left" plain style={{ margin: "16px 0 12px" }}>Kết quả sau hoán đổi</Divider>
                <Row gutter={12}>
                    <Col xs={24} md={12}>
                        <Card size="small" title={<Space><Tag color="blue">A</Tag><span>Thời gian mới</span></Space>}>
                            <Form.Item name="first_range" style={{ marginBottom: 0 }}
                                rules={[{ required: true, message: "Chọn thời gian cho lịch A" }]}>
                                <DatePicker.RangePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: "100%" }} />
                            </Form.Item>
                            <Typography.Text type="secondary" style={{ display: "block", marginTop: 8 }}>
                                Mặc định lấy thời gian cũ của lịch B
                            </Typography.Text>
                        </Card>
                    </Col>
                    <Col xs={24} md={12}>
                        <Card size="small" title={<Space><Tag color="purple">B</Tag><span>Thời gian mới</span></Space>}>
                            <Form.Item name="second_range" style={{ marginBottom: 0 }}
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
                <Input maxLength={500} placeholder="Hoán đổi lịch học" />
            </Form.Item>
        </Form>
    </Modal>{contextHolder}</>;
};

export default SwapScheduleModal;
