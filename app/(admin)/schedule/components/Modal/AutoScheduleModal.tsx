"use client";

import { PlusOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Checkbox, DatePicker, Empty, Form, Input, InputNumber, message, Modal, Pagination, Select, Space, Spin, Table, TimePicker, Typography } from "antd";
import dayjs from "dayjs";
import {
    commitAutoSchedule,
    getProgramLessonsForScheduling,
    getHocmaiSectionsForSchedulingLesson,
    previewAutoSchedule,
    type AutoSchedulePayload,
    type SchedulingLesson,
    type HocmaiSectionOption,
} from "@/services/livestreamService";
import { useEffect, useRef, useState } from "react";

type Props = {
    open: boolean;
    programCode: string;
    onClose: () => void;
    onSuccess: () => void | Promise<void>;
};

const WEEKDAYS = [
    { value: 1, label: "Thứ 2" }, { value: 2, label: "Thứ 3" },
    { value: 3, label: "Thứ 4" }, { value: 4, label: "Thứ 5" },
    { value: 5, label: "Thứ 6" }, { value: 6, label: "Thứ 7" },
    { value: 7, label: "Chủ nhật" },
];
const BLOCKS_PER_PAGE = 3;
const hmoOptionKey = (option: HocmaiSectionOption) => (
    `${option.package_id}::${option.course_id}::${option.lesson_id}`
);

const buildSessions = (position: number) => [
    {
        weekday: position === 0 ? 1 : 2,
        start_time: dayjs("19:00", "HH:mm"),
        end_time: dayjs("20:30", "HH:mm"),
        hmo_mapping_keys: [],
    },
    {
        weekday: 6,
        start_time: dayjs(position === 0 ? "19:00" : "20:30", "HH:mm"),
        end_time: dayjs(position === 0 ? "20:30" : "22:00", "HH:mm"),
        hmo_mapping_keys: [],
    },
];

const AutoScheduleModal = ({ open, programCode, onClose, onSuccess }: Props) => {
    const [form] = Form.useForm();
    const [lessons, setLessons] = useState<SchedulingLesson[]>([]);
    const [preview, setPreview] = useState<any[]>([]);
    const [payload, setPayload] = useState<AutoSchedulePayload | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingLessons, setLoadingLessons] = useState(false);
    const [blockSize, setBlockSize] = useState<1 | 2>(1);
    const [lessonLimit, setLessonLimit] = useState(0);
    const [blockPage, setBlockPage] = useState(1);
    const [hmoOptions, setHmoOptions] = useState<Record<string, HocmaiSectionOption[]>>({});
    const [loadingHmoLessonIds, setLoadingHmoLessonIds] = useState<Set<string>>(new Set());
    const requestedHmoLessonIds = useRef(new Set<string>());

    const divideIntoBlocks = (source: SchedulingLesson[], size: 1 | 2, requestedLimit = lessonLimit) => {
        const remaining = source.filter((lesson) => Number(lesson.scheduled_count || 0) === 0);
        const normalizedLimit = Math.min(
            remaining.length,
            Math.max(0, Number(requestedLimit) || 0)
        );
        const available = remaining.slice(0, normalizedLimit);
        const blocks = [];
        for (let index = 0; index < available.length; index += size) {
            const blockLessons = available.slice(index, index + size);
            blocks.push({
                block_name: `Block ${blocks.length + 1}`,
                lessons: blockLessons.map((lesson, lessonIndex) => ({
                    learn_number: lesson.learn_number,
                    session_id: lesson.id,
                    lesson_name: lesson.lesson_name,
                    sessions: buildSessions(lessonIndex),
                })),
            });
        }
        form.setFieldValue("blocks", blocks);
        setBlockPage(1);
        setPreview([]);
        setPayload(null);
    };

    useEffect(() => {
        if (!open || !programCode) return;
        let active = true;
        setLoadingLessons(true);
        getProgramLessonsForScheduling(programCode)
            .then((response: any) => {
                if (!active) return;
                const rows = Array.isArray(response?.data) ? response.data : [];
                const remainingCount = rows.filter(
                    (lesson: SchedulingLesson) => Number(lesson.scheduled_count || 0) === 0
                ).length;
                setLessons(rows);
                setLessonLimit(remainingCount);
                setHmoOptions({});
                requestedHmoLessonIds.current.clear();
                divideIntoBlocks(rows, 1, remainingCount);
            })
            .catch((error: any) => message.error(error?.message || "Không thể tải bài học của chương trình"))
            .finally(() => active && setLoadingLessons(false));
        return () => { active = false; };
        // form ổn định trong suốt vòng đời component.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, programCode]);

    useEffect(() => {
        if (!open || !programCode) return;
        const available = lessons
            .filter((lesson) => Number(lesson.scheduled_count || 0) === 0)
            .slice(0, lessonLimit);
        const firstLessonIndex = (blockPage - 1) * BLOCKS_PER_PAGE * blockSize;
        const visibleLessons = available.slice(
            firstLessonIndex,
            firstLessonIndex + BLOCKS_PER_PAGE * blockSize
        );
        visibleLessons.forEach((lesson) => {
            const lessonId = String(lesson.id);
            if (requestedHmoLessonIds.current.has(lessonId)) return;
            requestedHmoLessonIds.current.add(lessonId);
            setLoadingHmoLessonIds((current) => new Set(current).add(lessonId));
            getHocmaiSectionsForSchedulingLesson(programCode, lessonId)
                .then((response: any) => {
                    const options = Array.isArray(response?.data) ? response.data : [];
                    setHmoOptions((current) => ({ ...current, [lessonId]: options }));
                })
                .catch((error: any) => {
                    requestedHmoLessonIds.current.delete(lessonId);
                    message.error(error?.message || `Không thể tải Lesson ID HMO cho bài ${lesson.learn_number}`);
                })
                .finally(() => setLoadingHmoLessonIds((current) => {
                    const next = new Set(current);
                    next.delete(lessonId);
                    return next;
                }));
        });
    }, [blockPage, blockSize, lessonLimit, lessons, open, programCode]);

    const buildPayload = async (): Promise<AutoSchedulePayload> => {
        const values = await form.validateFields();
        return {
            program_code: programCode,
            system_type: values.system_type,
            strategy: values.strategy,
            start_date: values.start_date.format("YYYY-MM-DD"),
            holidays: String(values.holidays || "").split(",").map((item) => item.trim()).filter(Boolean),
            customize_lesson_names: Boolean(values.customize_lesson_names),
            lesson_name_prefix: values.customize_lesson_names ? String(values.lesson_name_prefix || "") : "",
            lesson_name_suffix: values.customize_lesson_names ? String(values.lesson_name_suffix || "") : "",
            blocks: values.blocks.map((block: any, blockIndex: number) => ({
                block_name: block.block_name || `Block ${blockIndex + 1}`,
                lessons: block.lessons.map((lesson: any) => ({
                    learn_number: Number(lesson.learn_number),
                    session_id: lesson.session_id,
                    lesson_name: lesson.lesson_name,
                    sessions: lesson.sessions.map((session: any) => ({
                        weekday: Number(session.weekday),
                        start_time: session.start_time.format("HH:mm"),
                        end_time: session.end_time.format("HH:mm"),
                        hmo_mappings: (session.hmo_mapping_keys || [])
                            .map((key: string) => (hmoOptions[String(lesson.session_id)] || [])
                                .find((option) => hmoOptionKey(option) === key))
                            .filter(Boolean),
                    })),
                })),
            })),
        };
    };

    const handlePreview = async () => {
        setLoading(true);
        try {
            const nextPayload = await buildPayload();
            const response: any = await previewAutoSchedule(nextPayload);
            setPayload(nextPayload);
            setPreview(response?.data?.calendars || []);
        } catch (error: any) {
            message.error(error?.message || "Không thể tạo bản xem trước");
        } finally {
            setLoading(false);
        }
    };

    const handleCommit = async () => {
        if (!payload) return;
        setLoading(true);
        try {
            await commitAutoSchedule(payload);
            setPreview([]);
            setPayload(null);
            await onSuccess();
            onClose();
        } catch (error: any) {
            message.error(error?.message || "Không thể tạo lịch tự động");
        } finally {
            setLoading(false);
        }
    };

    const pastCount = lessons.filter((lesson) => Number(lesson.past_scheduled_count || 0) > 0).length;
    const assignedCount = lessons.filter((lesson) => Number(lesson.scheduled_count || 0) > 0).length;
    const remainingCount = Math.max(0, lessons.length - assignedCount);

    return (
        <Modal
            open={open}
            title={`Tạo lịch tự động · ${programCode}`}
            width={1100}
            onCancel={onClose}
            footer={[
                <Button key="cancel" onClick={onClose}>Đóng</Button>,
                <Button key="preview" loading={loading} disabled={loadingLessons || remainingCount === 0} onClick={() => void handlePreview()}>Xem trước</Button>,
                <Button key="commit" type="primary" disabled={!preview.length} loading={loading} onClick={() => void handleCommit()}>
                    Xác nhận tạo {preview.length || ""} lịch
                </Button>,
            ]}
        >
            <Spin spinning={loadingLessons}>
                <Form
                    form={form}
                    layout="vertical"
                    initialValues={{
                        system_type: "topclass",
                        strategy: "interleaved",
                        start_date: dayjs(),
                        customize_lesson_names: false,
                        lesson_name_prefix: "[Lịch {n}] - ",
                        lesson_name_suffix: "",
                        blocks: [],
                    }}
                    onValuesChange={() => { setPreview([]); setPayload(null); }}
                >
                    <Space align="start" wrap>
                        <Form.Item name="system_type" label="Hệ học" rules={[{ required: true }]}>
                            <Select style={{ width: 150 }} options={[{ value: "topclass", label: "Topclass" }, { value: "topuni", label: "Topuni" }]} />
                        </Form.Item>
                        <Form.Item name="strategy" label="Cách xếp" rules={[{ required: true }]}>
                            <Select style={{ width: 230 }} options={[{ value: "interleaved", label: "Xen kẽ trong Block" }, { value: "by_block", label: "Lần lượt từng bài" }]} />
                        </Form.Item>
                        <Form.Item label="Chia Block">
                            <Space.Compact>
                                <Select value={blockSize} style={{ width: 160 }} onChange={(value: 1 | 2) => setBlockSize(value)} options={[{ value: 1, label: "1 bài / Block" }, { value: 2, label: "2 bài / Block" }]} />
                                <Button disabled={remainingCount === 0} onClick={() => divideIntoBlocks(lessons, blockSize)}>Chia lại</Button>
                            </Space.Compact>
                        </Form.Item>
                        <Form.Item label="Số bài muốn tạo">
                            <InputNumber
                                min={remainingCount > 0 ? 1 : 0}
                                max={remainingCount}
                                value={lessonLimit}
                                disabled={remainingCount === 0}
                                style={{ width: 150 }}
                                onChange={(value) => {
                                    const nextValue = Math.min(
                                        remainingCount,
                                        Math.max(remainingCount > 0 ? 1 : 0, Number(value) || 0)
                                    );
                                    setLessonLimit(nextValue);
                                    divideIntoBlocks(lessons, blockSize, nextValue);
                                }}
                            />
                        </Form.Item>
                        <Form.Item name="start_date" label="Ngày bắt đầu" rules={[{ required: true }]}>
                            <DatePicker format="DD/MM/YYYY" />
                        </Form.Item>
                        <Form.Item name="holidays" label="Ngày nghỉ (YYYY-MM-DD, cách nhau dấu phẩy)">
                            <Input style={{ width: 320 }} placeholder="2027-09-02, 2027-11-20" />
                        </Form.Item>
                    </Space>

                    <Card size="small" style={{ marginBottom: 12, background: "#fafafa" }}>
                        <Form.Item name="customize_lesson_names" valuePropName="checked" style={{ marginBottom: 0 }}>
                            <Checkbox>Tạo tên hiển thị theo mẫu cho toàn bộ danh sách</Checkbox>
                        </Form.Item>
                        <Form.Item noStyle shouldUpdate={(previous, current) => (
                            previous.customize_lesson_names !== current.customize_lesson_names
                        )}>
                            {({ getFieldValue }) => getFieldValue("customize_lesson_names") && (
                                <>
                                    <Space wrap align="end" size={12} style={{ display: "flex", marginTop: 12 }}>
                                        <Form.Item
                                            name="lesson_name_prefix"
                                            label="Đoạn phía trước"
                                            rules={[{ max: 100, message: "Đoạn phía trước không được quá 100 ký tự" }]}
                                            style={{ flex: "1 1 260px", marginBottom: 0 }}
                                        >
                                            <Input placeholder="Ví dụ: [Lịch {n}] - " maxLength={100} />
                                        </Form.Item>
                                        <Form.Item
                                            name="lesson_name_suffix"
                                            label="Đoạn phía sau"
                                            rules={[{ max: 100, message: "Đoạn phía sau không được quá 100 ký tự" }]}
                                            style={{ flex: "1 1 260px", marginBottom: 0 }}
                                        >
                                            <Input placeholder="Ví dụ: - Lần {n}" maxLength={100} />
                                        </Form.Item>
                                    </Space>
                                    <Typography.Text type="secondary" style={{ display: "block", marginTop: 8 }}>
                                        Dùng <Typography.Text code>{"{n}"}</Typography.Text> để tự tăng theo số lần của từng bài:
                                        lần đầu giữ nguyên tên, từ lần 2 mới áp dụng mẫu.
                                    </Typography.Text>
                                </>
                            )}
                        </Form.Item>
                    </Card>

                    {!!lessons.length && (
                        <Alert
                            showIcon
                            type={remainingCount > 0 ? "info" : "warning"}
                            style={{ marginBottom: 12 }}
                            message={`Chương trình có ${lessons.length} bài · ${assignedCount} bài đã được gán lịch · ${remainingCount} bài chưa có lịch`}
                            description={remainingCount > 0
                                ? `Hệ thống chỉ tạo cho bài chưa có lịch. Trong đó có ${pastCount} bài đã diễn ra; lần này đang chọn ${lessonLimit}/${remainingCount} bài còn lại.`
                                : "Tất cả bài đã được gán lịch nên không còn bài nào để tạo tự động."}
                        />
                    )}

                    <Form.List name="blocks">
                        {(blockFields) => blockFields.length ? (
                            <Space direction="vertical" style={{ width: "100%" }}>
                                {blockFields
                                    .slice((blockPage - 1) * BLOCKS_PER_PAGE, blockPage * BLOCKS_PER_PAGE)
                                    .map((blockField) => {
                                    const blockIndex = blockField.name;
                                    return (
                                    <Card key={blockField.key} size="small" title={`Block ${blockIndex + 1}`}>
                                        <Form.List name={[blockField.name, "lessons"]}>
                                            {(lessonFields) => (
                                                <Space direction="vertical" style={{ width: "100%" }}>
                                                    {lessonFields.map((lessonField) => {
                                                        const lessonId = String(form.getFieldValue([
                                                            "blocks", blockField.name, "lessons", lessonField.name, "session_id",
                                                        ]) || "");
                                                        const outlineOptions = hmoOptions[lessonId] || [];
                                                        return (
                                                        <Card key={lessonField.key} type="inner" size="small">
                                                            <Form.Item name={[lessonField.name, "session_id"]} hidden><Input /></Form.Item>
                                                            <Space wrap>
                                                                <Form.Item name={[lessonField.name, "learn_number"]} label="Bài"><Input disabled style={{ width: 70 }} /></Form.Item>
                                                                <Form.Item name={[lessonField.name, "lesson_name"]} label="Tên bài"><Input disabled style={{ width: 360 }} /></Form.Item>
                                                            </Space>
                                                            <Form.List name={[lessonField.name, "sessions"]}>
                                                                {(sessionFields, { add, remove }) => (
                                                                    <Space direction="vertical" style={{ width: "100%" }}>
                                                                        {sessionFields.map((sessionField, sessionIndex) => (
                                                                            <Space key={sessionField.key} align="start" wrap>
                                                                                <Form.Item name={[sessionField.name, "weekday"]} label={`Buổi ${sessionIndex + 1}`} rules={[{ required: true }]}><Select style={{ width: 125 }} options={WEEKDAYS} /></Form.Item>
                                                                                <Form.Item name={[sessionField.name, "start_time"]} label="Bắt đầu" rules={[{ required: true }]}><TimePicker format="HH:mm" /></Form.Item>
                                                                                <Form.Item name={[sessionField.name, "end_time"]} label="Kết thúc" rules={[{ required: true }]}><TimePicker format="HH:mm" /></Form.Item>
                                                                                <Form.Item name={[sessionField.name, "hmo_mapping_keys"]} label="Lesson ID HMO">
                                                                                    <Select
                                                                                        mode="multiple"
                                                                                        allowClear
                                                                                        showSearch
                                                                                        loading={loadingHmoLessonIds.has(lessonId)}
                                                                                        style={{ width: 360 }}
                                                                                        placeholder={outlineOptions.length
                                                                                            ? "Chọn section lesson_id từ HMO"
                                                                                            : "Bài chưa có Course ID hoặc HMO không có section"}
                                                                                        options={outlineOptions.map((option) => ({
                                                                                            value: hmoOptionKey(option),
                                                                                            label: `${option.lesson_id} · ${option.lesson_name || "Không tên"} · Course ${option.course_id} / Package ${option.package_id}`,
                                                                                        }))}
                                                                                        optionFilterProp="label"
                                                                                        maxTagCount="responsive"
                                                                                    />
                                                                                </Form.Item>
                                                                                {sessionFields.length > 1 && <Button danger type="text" onClick={() => remove(sessionField.name)} style={{ marginTop: 30 }}>Xóa</Button>}
                                                                            </Space>
                                                                        ))}
                                                                        <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => add({ weekday: 1, start_time: dayjs("19:00", "HH:mm"), end_time: dayjs("20:30", "HH:mm"), hmo_mapping_keys: [] })}>Thêm buổi cho bài này</Button>
                                                                    </Space>
                                                                )}
                                                            </Form.List>
                                                        </Card>
                                                        );
                                                    })}
                                                </Space>
                                            )}
                                        </Form.List>
                                    </Card>
                                    );
                                })}
                                {blockFields.length > BLOCKS_PER_PAGE && (
                                    <Pagination
                                        current={blockPage}
                                        pageSize={BLOCKS_PER_PAGE}
                                        total={blockFields.length}
                                        showSizeChanger={false}
                                        onChange={setBlockPage}
                                        showTotal={(total) => `${total} Block · chỉ render ${BLOCKS_PER_PAGE} Block/trang`}
                                    />
                                )}
                            </Space>
                        ) : <Empty description={remainingCount === 0 ? "Tất cả bài đã được gán lịch" : "Chưa chọn bài để tạo Block"} />}
                    </Form.List>
                </Form>
            </Spin>

            {preview.length > 0 && (
                <>
                    <Typography.Title level={5} style={{ marginTop: 16 }}>Xem trước {preview.length} lịch</Typography.Title>
                    <Table size="small" rowKey={(_, index) => String(index)} pagination={{ pageSize: 10 }} dataSource={preview} columns={[
                        { title: "Block", render: (_value, row) => Number(row.auto_schedule?.block_index ?? 0) + 1 },
                        { title: "Bài", dataIndex: "learn_number" },
                        { title: "Tên bài", dataIndex: "lesson_name" },
                        { title: "Bắt đầu", dataIndex: "start_time", render: (value) => dayjs(String(value).replace(/Z$/, "")).format("DD/MM/YYYY HH:mm") },
                        { title: "Kết thúc", dataIndex: "end_time", render: (value) => dayjs(String(value).replace(/Z$/, "")).format("DD/MM/YYYY HH:mm") },
                    ]} />
                </>
            )}
        </Modal>
    );
};

export default AutoScheduleModal;
