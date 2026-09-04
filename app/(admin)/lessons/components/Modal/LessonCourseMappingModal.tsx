"use client";

import { ClearOutlined } from "@ant-design/icons";
import { Alert, Button, Col, Form, message, Modal, Radio, Row, Select, Space, Table, Typography } from "antd";
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
    const selectedCourseId = Form.useWatch("course_id", form);
    const packageCourseSheetUrl = process.env.NEXT_PUBLIC_PACKAGE_COURSE_SHEET_URL
        || "https://docs.google.com/spreadsheets/d/1m_KNVZc5PMu-UQi2PCrEGuXAfVM0NPGEghRbEYnJeH0/edit?usp=sharing";

    const packageOptions = useMemo(() => {
        const grouped = new Map<string, Set<string>>();
        packageCourses
            .filter((item) => !selectedCourseId || item.course_id === selectedCourseId)
            .forEach((item) => {
                const names = grouped.get(item.package_id) ?? new Set<string>();
                if (item.product_name) names.add(item.product_name);
                grouped.set(item.package_id, names);
            });
        return Array.from(grouped.entries()).map(([packageId, names]) => ({
            value: packageId,
            label: `${packageId}${names.size ? ` · ${Array.from(names).join(", ")}` : ""}`,
        }));
    }, [packageCourses, selectedCourseId]);

    const courseOptions = useMemo(() => {
        const seen = new Set<string>();
        return packageCourses
            .filter((item) => !selectedPackageId || item.package_id === selectedPackageId)
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

    const clearPackageCourse = () => {
        form.resetFields(["package_id", "course_id"]);
    };

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
            const skippedPast = Number(result.skipped_past ?? 0);
            message.success(
                skippedPast > 0
                    ? `Đã xử lý ${result.affected ?? 0} bài; bỏ qua ${skippedPast} bài đã diễn ra.`
                    : `Đã xử lý ${result.affected ?? 0} bài.`,
            );
            await loadMappings();
        } catch (error: any) {
            message.error(error?.message || "Không thể cập nhật Course ID");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal className="lesson-course-mapping-modal" open={open} title={`Course ID theo đề cương · ${programCode}`} width={850} style={{ top: 24 }} onCancel={onClose} footer={<Button onClick={onClose}>Đóng</Button>}>
            <Alert
                showIcon
                type="info"
                message={
                    <>
                        Package ID và Course ID được tải từ <Typography.Link href={packageCourseSheetUrl} target="_blank" rel="noreferrer">Google Sheet</Typography.Link>.
                        {" "}Có thể chọn mục nào trước; danh sách còn lại sẽ được lọc theo lựa chọn đó.
                    </>
                }
                style={{ marginBottom: 16 }}
            />
            <Form className="responsive-modal-form" form={form} layout="vertical" initialValues={{ action: "add", scope: selectedLessonIds.length ? "selected" : "all" }}>
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
                </Space>
                <Row gutter={8} align="top">
                    <Col xs={24} md={8}>
                        <Form.Item name="package_id" label="Package ID" rules={[{ required: true, message: "Chọn Package ID" }]}>
                            <Select
                                loading={loadingPackageCourses}
                                options={packageOptions}
                                showSearch
                                allowClear
                                optionFilterProp="label"
                                placeholder="Chọn Package từ Google Sheet"
                            />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="course_id" label="Course ID" rules={[{ required: true, message: "Chọn Course ID" }]}>
                            <Select
                                loading={loadingPackageCourses}
                                options={courseOptions}
                                showSearch
                                allowClear
                                optionFilterProp="label"
                                placeholder={selectedPackageId ? "Chọn Course thuộc Package" : "Chọn Course từ Google Sheet"}
                            />
                        </Form.Item>
                    </Col>
                    <Col xs={12} md={4}>
                        <Button
                            block
                            icon={<ClearOutlined />}
                            disabled={!selectedPackageId && !selectedCourseId}
                            onClick={clearPackageCourse}
                            style={{ marginTop: 30 }}
                        >
                            Xóa chọn
                        </Button>
                    </Col>
                    <Col xs={12} md={4}>
                        <Button
                            block
                            type="primary"
                            loading={loading}
                            disabled={loadingPackageCourses || packageCourses.length === 0}
                            onClick={() => void submit()}
                            style={{ marginTop: 30 }}
                        >
                            Thực hiện
                        </Button>
                    </Col>
                </Row>
            </Form>
            {!loadingPackageCourses && packageCourses.length === 0 && (
                <Alert type="warning" showIcon message="Không tải được dữ liệu Package/Course từ Google Sheet" style={{ marginBottom: 16 }} />
            )}
            <Typography.Title level={5}>Mapping hiện tại</Typography.Title>
            <Table<LessonCourseMapping>
                className="lesson-course-mapping-table"
                size="small"
                loading={loading}
                rowKey="id"
                dataSource={rows}
                pagination={false}
                scroll={{ x: 560, y: "calc(100dvh - 480px)" }}
                tableLayout="fixed"
                columns={[
                    { title: "Bài", dataIndex: "learn_number", width: 70 },
                    { title: "Tên bài", dataIndex: "lesson_name" },
                    { title: "Package ID", dataIndex: "package_id", width: 130 },
                    { title: "Course ID", dataIndex: "course_id", width: 120 },
                ]}
            />
        </Modal>
    );
};

export default LessonCourseMappingModal;
