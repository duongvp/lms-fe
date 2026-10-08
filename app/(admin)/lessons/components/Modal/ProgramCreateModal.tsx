"use client";

import Select from "@/components/ui/MobileSelect";
import { Alert, Button, Col, Form, Input, InputNumber, Modal, Row, Space, Typography } from "antd";
import { useEffect } from "react";
import { useLessonSubjectOptions } from "@/hooks/useLessonSubjectOptions";
import type { CreateLessonProgramPayload } from "@/services/lessonService";
import { GRADE_OPTIONS } from "@/constants/subjects";
import { buildLessonSubjectCode, buildTopuniProgramCode, getSuggestedSchoolYear } from "@/helper/lesson";
import { getTopuniPathwayOptions, TOPUNI_EXAM_OPTIONS, TOPUNI_PHASE_OPTIONS, TOPUNI_SUBJECT_OPTIONS } from "@/constants/topuniProgram";

type Props = {
    open: boolean;
    loading: boolean;
    onClose: () => void;
    onSubmit: (payload: CreateLessonProgramPayload) => Promise<void>;
};

const normalizeSubjectName = (value: unknown) => String(
    Array.isArray(value) ? value.at(-1) : value ?? ""
).trim();

const ProgramCreateModal = ({ open, loading, onClose, onSubmit }: Props) => {
    const [form] = Form.useForm<CreateLessonProgramPayload & { school_year: number; phase: string; phase_number?: number | null; exam: string; pathway: string }>();
    // Chỉ lấy các môn đã có trong cột lessons.subject_name; người dùng vẫn có thể nhập môn mới.
    const subjectOptions = useLessonSubjectOptions(true, false);
    const selectedGrade = Form.useWatch("grade", form);
    const selectedSystemType = Form.useWatch("system_type", form);
    const selectedSubject = Form.useWatch("subject_name", form);
    const selectedSchoolYear = Form.useWatch("school_year", form);
    const selectedPhase = Form.useWatch("phase", form);
    const selectedPhaseNumber = Form.useWatch("phase_number", form);
    const selectedExam = Form.useWatch("exam", form);
    const selectedPathway = Form.useWatch("pathway", form);
    const isTopuni = selectedSystemType === "topuni";
    const pathwayOptions = getTopuniPathwayOptions(selectedExam, normalizeSubjectName(selectedSubject));
    const programSubjectOptions = isTopuni
        ? [...TOPUNI_SUBJECT_OPTIONS, ...subjectOptions.filter((option) => !TOPUNI_SUBJECT_OPTIONS.some((item) => item.value === option.value))]
        : subjectOptions;

    useEffect(() => {
        if (open) form.resetFields();
    }, [form, open]);

    useEffect(() => {
        if (selectedSystemType === "topuni") {
            form.setFieldValue("grade", 12);
        }
    }, [form, selectedSystemType]);

    useEffect(() => {
        if (!open || selectedSystemType !== "topuni") return;
        const options = getTopuniPathwayOptions(selectedExam, normalizeSubjectName(selectedSubject));
        const currentPathway = form.getFieldValue("pathway");
        const nextPathway = options.length === 1 ? options[0].value
            : options.some((option) => option.value === currentPathway) ? currentPathway : undefined;
        if (nextPathway !== currentPathway) form.setFieldValue("pathway", nextPathway);
    }, [form, open, selectedSystemType, selectedExam, selectedSubject]);

    useEffect(() => {
        if (!open) return;
        const subjectName = normalizeSubjectName(form.getFieldValue("subject_name"));
        const schoolYear = Number(form.getFieldValue("school_year"));
        const grade = Number(form.getFieldValue("grade"));
        const generatedCode = selectedSystemType === "topuni" ? buildTopuniProgramCode({
            phase: selectedPhase,
            phaseNumber: selectedPhaseNumber,
            subjectName,
            exam: selectedExam,
            pathway: selectedPathway,
            schoolYear,
        }) : selectedSystemType === "topclass"
            && Number.isInteger(grade) && grade >= 1 && grade <= 12
            && Number.isInteger(schoolYear) && schoolYear >= 2020 && schoolYear <= 2100
            ? buildLessonSubjectCode(subjectName, grade, schoolYear) : "";
        form.setFieldValue("subject_code", generatedCode || undefined);
    }, [form, open, selectedGrade, selectedSchoolYear, selectedSubject, selectedSystemType, selectedPhase, selectedPhaseNumber, selectedExam, selectedPathway]);

    return (
        <Modal
            open={open}
            title="Tạo Chương trình mới"
            width={680}
            destroyOnClose
            onCancel={onClose}
            footer={[
                <Button key="cancel" onClick={onClose}>Hủy</Button>,
                <Button key="save" type="primary" loading={loading} onClick={() => form.submit()}>
                    Tạo Chương trình
                </Button>,
            ]}
        >
            <Alert
                showIcon
                type="info"
                style={{ marginBottom: 16 }}
                message="Chương trình được quản lý theo Mã chương trình của đề cương"
                description="Tên bài học đầu tiên không bắt buộc. Nếu để trống, hệ thống tạo bài đầu tiên với tên “Bài 1”. Sau khi tạo, bạn có thể đổi tên, thêm hoặc import các bài còn lại."
            />
            <Form
                className="responsive-modal-form"
                form={form}
                layout="vertical"
                initialValues={{ school_year: getSuggestedSchoolYear(), system_type: "topclass", phase: "tongon" }}
                onFinish={({ school_year: _schoolYear, phase: _phase, phase_number: _phaseNumber, exam: _exam, pathway: _pathway, subject_name, ...values }) => onSubmit({
                    ...values,
                    subject_name: normalizeSubjectName(subject_name),
                })}
            >
                <Row gutter={12}>
                    <Col xs={24} md={isTopuni ? 8 : 7}>
                        <Form.Item name="system_type" label="Hệ thống" rules={[{ required: true }]}> 
                            <Select options={[
                                { value: "topclass", label: "Topclass" },
                                { value: "topuni", label: "Topuni" },
                            ]} />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={7} style={{ display: isTopuni ? "none" : undefined }}>
                        <Form.Item
                            name="grade"
                            label="Khối"
                            rules={[{ required: !isTopuni, message: "Chọn khối" }]}
                        >
                            <Select options={GRADE_OPTIONS} placeholder="Chọn khối" />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={isTopuni ? 8 : 10}>
                        <Form.Item
                            name="subject_name"
                            label="Môn học"
                            rules={[{ required: true, message: "Chọn môn học" }]}
                        >
                            <Select
                                showSearch
                                mode="tags"
                                maxCount={1}
                                optionFilterProp="label"
                                placeholder="Chọn hoặc nhập môn học mới"
                                options={programSubjectOptions}
                            />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={isTopuni ? 8 : 7}>
                        <Form.Item
                            name="school_year"
                            label={isTopuni ? "Năm học (năm kết thúc)" : "Năm kết thúc"}
                            rules={[{ required: true, message: "Nhập năm" }]}
                        >
                            <InputNumber min={2020} max={2100} precision={0} style={{ width: "100%" }} />
                        </Form.Item>
                    </Col>
                </Row>
                {isTopuni && <Row gutter={12}>
                    <Col xs={24} md={8}>
                        <Form.Item label="Giai đoạn" required tooltip="Ô số bên phải không bắt buộc. Nhập 3 để dùng tongon3; để trống để dùng tongon.">
                            <Space.Compact block>
                                <Form.Item name="phase" noStyle rules={[{ required: true, message: "Chọn giai đoạn" }]}>
                                    <Select options={TOPUNI_PHASE_OPTIONS} style={{ width: "65%" }} />
                                </Form.Item>
                                <Form.Item name="phase_number" noStyle
                                    rules={[{ validator: (_, value) => value == null || (Number.isSafeInteger(value) && value >= 1)
                                        ? Promise.resolve() : Promise.reject(new Error("Nhập số nguyên từ 1 trở lên")) }]}>
                                    <InputNumber aria-label="Số giai đoạn" min={1} precision={0} placeholder="Số" style={{ width: "35%" }} />
                                </Form.Item>
                            </Space.Compact>
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="exam" label="Kỳ thi" rules={[{ required: true, message: "Chọn kỳ thi" }]}>
                            <Select options={TOPUNI_EXAM_OPTIONS} placeholder="Chọn kỳ thi" />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="pathway" label="Lộ trình"
                            tooltip="Lộ trình theo quy tắc đã có; môn khác có thể chọn V, A hoặc S."
                            rules={[
                                { required: true, message: "Chọn lộ trình" },
                                { validator: (_, value) => !value || pathwayOptions.some((option) => option.value === value)
                                    ? Promise.resolve() : Promise.reject(new Error("Lộ trình không phù hợp với môn và kỳ thi")) },
                            ]}>
                            <Select options={pathwayOptions} disabled={pathwayOptions.length <= 1}
                                placeholder={selectedExam ? "Chọn lộ trình" : "Chọn kỳ thi trước"} />
                        </Form.Item>
                    </Col>
                </Row>}
                <Form.Item
                    name="subject_code"
                    label="Mã chương trình"
                    extra={<Typography.Text type="secondary">{isTopuni
                        ? "Ghép liền: Giai đoạn + Số (nếu có) + Môn + Kỳ thi + Lộ trình + Năm học. Ví dụ: tongon3toantsav2027."
                        : "Tự sinh từ môn học, khối và năm kết thúc. Bạn có thể nhập môn mới trực tiếp và sửa mã khi cần."}</Typography.Text>}
                    rules={[
                        { required: true, whitespace: true, message: "Nhập Mã chương trình" },
                        { max: 100, message: "Mã chương trình không được quá 100 ký tự" },
                        { pattern: /^[A-Za-z0-9_-]+$/, message: "Chỉ dùng chữ không dấu, số, dấu gạch ngang hoặc gạch dưới" },
                    ]}
                >
                    <Input placeholder={isTopuni ? "VD: tongontoantsav2027" : "VD: nguvan-6-2027"} maxLength={100} />
                </Form.Item>
                <Form.Item
                    name="lesson_name"
                    label="Tên bài học đầu tiên"
                    extra="Không bắt buộc. Để trống để dùng tên Bài 1."
                    rules={[
                        { max: 400, message: "Tên bài học không được quá 400 ký tự" },
                    ]}
                >
                    <Input placeholder="VD: Đọc hiểu văn bản" maxLength={400} />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default ProgramCreateModal;
