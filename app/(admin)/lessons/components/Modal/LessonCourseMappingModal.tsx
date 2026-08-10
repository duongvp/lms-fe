"use client";

import { Alert, Button, Form, message, Modal, Radio, Select, Space, Table, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import {
    getLessonCourseMappings,
    updateLessonCourseMappings,
    type LessonCourseMapping,
} from "@/services/lessonService";
import { usePackageCoursesQuery } from "@/hooks/useLmsQueries";
import type { PackageCourseOption } from "@/services/packageCourseService";

type Props = {
    open: boolean;
    programCode: string;
    selectedLessonIds: Array<string | number>;
    onClose: () => void;
};

const LessonCourseMappingModal = ({ open, programCode, selectedLessonIds, onClose }: Props) => {
    const [form] = Form.useForm();
    const [rows, setRows] = useState<LessonCourseMapping[]>([]);
    const [loading, setLoading] = useState(false);
    const packageCoursesQuery = usePackageCoursesQuery(open);
    const packageCourses: PackageCourseOption[] = packageCoursesQuery.data?.data ?? [];
    const loadingPackageCourses = packageCoursesQuery.isLoading || packageCoursesQuery.isValidating;
    const selectedPackageId = Form.useWatch("package_id", form);

    const packageOptions = useMemo(() => {
        const grouped = new Map<string, Set<string>>();
        packageCourses.forEach((item) => {
            const names = grouped.get(item.package_id) ?? new Set<string>();
            if (item.product_name) names.add(item.product_name);
            grouped.set(item.package_id, names);
        });
        return Array.from(grouped.entries()).map(([packageId, names]) => ({
            value: packageId,
            label: `${packageId}${names.size ? ` · ${Array.from(names).join(", ")}` : ""}`,
        }));
    }, [packageCourses]);

    const courseOptions = useMemo(() => {
        const seen = new Set<string>();
        return packageCourses
            .filter((item) => item.package_id === selectedPackageId)
            .filter((item) => {
                if (seen.has(item.course_id)) return false;
                seen.add(item.course_id);
                return true;
            })
            .map((item) => ({
                value: item.course_id,
                label: `${item.course_id}${item.course_name ? ` · ${item.course_name}` : ""}`,
            }));
    }, [packageCourses, selectedPackageId]);

    const loadMappings = async () => {
        if (!programCode) return;
        setLoading(true);
        try {
            const response: any = await getLessonCourseMappings(programCode);
            setRows(Array.isArray(response?.data) ? response.data : []);
        } catch (error: any) {
            message.error(error?.message || "Không thể tải Course ID của đề cương");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            form.setFieldsValue({
                action: "add",
                scope: selectedLessonIds.length ? "selected" : "all",
                package_id: undefined,
                course_id: undefined,
            });
            void loadMappings();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, programCode]);

    const submit = async () => {
        const values = await form.validateFields();
        setLoading(true);
        try {
            const response: any = await updateLessonCourseMappings({
                program_code: programCode,
                action: values.action,
                package_id: String(values.package_id),
                course_id: String(values.course_id),
                lesson_ids: values.scope === "selected" ? selectedLessonIds : undefined,
            });
            const result = response?.data || {};
            message.success(`Đã xử lý ${result.affected ?? 0} bài; bỏ qua ${result.skipped_past ?? 0} bài đã diễn ra.`);
            await loadMappings();
        } catch (error: any) {
            message.error(error?.message || "Không thể cập nhật Course ID");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal open={open} title={`Course ID theo đề cương · ${programCode}`} width={850} onCancel={onClose} footer={<Button onClick={onClose}>Đóng</Button>}>
            <Alert
                showIcon
                type="info"
                message="Package ID và Course ID được tải từ PACKAGE_COURSE_SHEET_URL. Chọn Package trước, danh sách Course tương ứng sẽ được lọc tự động."
                style={{ marginBottom: 16 }}
            />
            <Form form={form} layout="vertical" initialValues={{ action: "add", scope: selectedLessonIds.length ? "selected" : "all" }}>
                <Space align="start" wrap>
                    <Form.Item name="action" label="Thao tác" rules={[{ required: true }]}>
                        <Radio.Group optionType="button" buttonStyle="solid" options={[{ value: "add", label: "Thêm" }, { value: "delete", label: "Xóa" }]} />
                    </Form.Item>
                    <Form.Item name="scope" label="Phạm vi" rules={[{ required: true }]}>
                        <Radio.Group options={[
                            { value: "selected", label: `${selectedLessonIds.length} bài đã chọn`, disabled: !selectedLessonIds.length },
                            { value: "all", label: "Toàn bộ Chương trình" },
                        ]} />
                    </Form.Item>
                    <Form.Item name="package_id" label="Package ID" rules={[{ required: true, message: "Chọn Package ID" }]}>
                        <Select
                            style={{ width: 280 }}
                            loading={loadingPackageCourses}
                            options={packageOptions}
                            showSearch
                            optionFilterProp="label"
                            placeholder="Chọn Package từ Google Sheet"
                            onChange={() => form.setFieldValue("course_id", undefined)}
                        />
                    </Form.Item>
                    <Form.Item name="course_id" label="Course ID" rules={[{ required: true, message: "Chọn Course ID" }]}>
                        <Select
                            style={{ width: 300 }}
                            loading={loadingPackageCourses}
                            disabled={!selectedPackageId}
                            options={courseOptions}
                            showSearch
                            optionFilterProp="label"
                            placeholder={selectedPackageId ? "Chọn Course thuộc Package" : "Chọn Package trước"}
                        />
                    </Form.Item>
                    <Button type="primary" loading={loading} disabled={loadingPackageCourses || packageCourses.length === 0} onClick={() => void submit()} style={{ marginTop: 30 }}>Thực hiện</Button>
                </Space>
            </Form>
            {!loadingPackageCourses && packageCourses.length === 0 && (
                <Alert type="warning" showIcon message="Không tải được Package/Course từ PACKAGE_COURSE_SHEET_URL" style={{ marginBottom: 16 }} />
            )}
            <Typography.Title level={5}>Mapping hiện tại</Typography.Title>
            <Table<LessonCourseMapping>
                size="small"
                loading={loading}
                rowKey="id"
                dataSource={rows}
                pagination={{ pageSize: 8 }}
                columns={[
                    { title: "Bài", dataIndex: "learn_number", width: 70 },
                    { title: "Tên bài", dataIndex: "lesson_name" },
                    { title: "Package ID", dataIndex: "package_id" },
                    { title: "Course ID", dataIndex: "course_id" },
                ]}
            />
        </Modal>
    );
};

export default LessonCourseMappingModal;
