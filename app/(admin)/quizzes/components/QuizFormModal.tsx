"use client";

import {
    Button,
    Col,
    Divider,
    Flex,
    Form,
    Input,
    InputNumber,
    Modal,
    Row,
    Select,
} from "antd";
import type { FormInstance } from "antd";
import { EyeOutlined, PlusOutlined, ReloadOutlined, SaveOutlined } from "@ant-design/icons";
import type { QuizApiResponse, QuizLessonOption, QuizType } from "@/services/quizService";
import { QUIZ_TYPE_OPTIONS, SCORE_TYPE_OPTIONS, STATUS_OPTIONS } from "../quiz.constants";
import type { QuizClassSelectOption, QuizFormValues } from "../quiz.types";
import { buildLessonSelectOptions, INITIAL_QUIZ_FORM_VALUES } from "../quiz.utils";
import QuizAnswerEditor from "./QuizAnswerEditor";
import styles from "../quiz.module.css";

interface QuizFormModalProps {
    open: boolean;
    editing: QuizApiResponse | null;
    form: FormInstance<QuizFormValues>;
    classOptions: QuizClassSelectOption[];
    classesLoading: boolean;
    selectedCode?: string;
    lessons: QuizLessonOption[];
    lessonsLoading: boolean;
    suggestedQuizIndex?: number;
    duplicateIndexQuiz?: QuizApiResponse | null;
    indexSuggestionLoading?: boolean;
    saving: boolean;
    canViewField: (field: string) => boolean;
    canEditField: (field: string) => boolean;
    onSubmit: (values: QuizFormValues) => Promise<void>;
    onPreview: () => void;
    onReset: () => void;
    onClose: () => void;
}

const QuizFormModal = ({
    open,
    editing,
    form,
    classOptions,
    classesLoading,
    selectedCode,
    lessons,
    lessonsLoading,
    suggestedQuizIndex,
    duplicateIndexQuiz,
    indexSuggestionLoading,
    saving,
    canViewField,
    canEditField,
    onSubmit,
    onPreview,
    onReset,
    onClose,
}: QuizFormModalProps) => {
    const quizType = (Form.useWatch("quiz_type", form) || 1) as QuizType;

    const handleTypeChange = (type: QuizType) => {
        if (type === 1) {
            form.setFieldValue("answers", [
                { text: "", correct: true },
                { text: "", correct: false },
            ]);
        }
        if (type === 2) {
            form.setFieldValue("answers", [{ placeholder: "", text: "", correct: true }]);
        }
        if (type === 3) form.setFieldValue("short_answer", "");
    };

    return (
        <Modal
            title={editing ? `Cập nhật câu hỏi (${editing.quiz_id})` : "Thêm mới câu hỏi"}
            open={open}
            onCancel={onClose}
            centered
            footer={null}
            width={850}
            destroyOnClose
            styles={{
            content: {
                maxHeight: "calc(100vh - 32px)",
                display: "flex",
                flexDirection: "column",
                },
                body: {
                    minHeight: 0,
                    overflowY: "auto",
                    overflowX:"hidden",
                },
            }}
        >
            <Form<QuizFormValues>
                className="responsive-modal-form"
                form={form}
                layout="vertical"
                initialValues={INITIAL_QUIZ_FORM_VALUES}
                onFinish={onSubmit}
                requiredMark="optional"
                style={{ marginTop: 16}}
            >
                <Row gutter={14}>
                    {canViewField("code") && <Col xs={24} md={12}>
                        <Form.Item name="code" label="Chương trình" rules={[{ required: true, message: "Chọn Chương trình" }]}> 
                            <Select
                                options={classOptions}
                                placeholder="Chọn Chương trình"
                                disabled={!canEditField("code")}
                                loading={classesLoading}
                                showSearch
                                optionFilterProp="searchText"
                                popupMatchSelectWidth={480}
                                onChange={() => {
                                    form.setFieldValue("learn_number", undefined);
                                    form.setFields([{
                                        name: "quiz_index",
                                        value: undefined,
                                        touched: false,
                                    }]);
                                }}
                            />
                        </Form.Item>
                    </Col>}
                    {canViewField("learn_number") && <Col xs={16} md={8}>
                        <Form.Item name="learn_number" label="Bài học" rules={[{ required: true, message: "Chọn bài học" }]}>
                            <Select
                                options={buildLessonSelectOptions(lessons, editing?.learn_number)}
                                placeholder={selectedCode ? "Chọn bài học" : "Chọn Chương trình trước"}
                                disabled={!canEditField("learn_number") || !selectedCode}
                                loading={lessonsLoading}
                                showSearch
                                optionFilterProp="label"
                                popupMatchSelectWidth={500}
                                onChange={() => form.setFields([{
                                    name: "quiz_index",
                                    value: undefined,
                                    touched: false,
                                }])}
                            />
                        </Form.Item>
                    </Col>}
                    {canViewField("quiz_index") && <Col xs={8} md={4}>
                        <Form.Item
                            name="quiz_index"
                            label="Thứ tự"
                            rules={[{ required: true, message: "Nhập thứ tự" }]}
                            validateStatus={duplicateIndexQuiz ? "warning" : undefined}
                            help={duplicateIndexQuiz
                                ? editing
                                    ? `Thứ tự này đang có câu hỏi "${duplicateIndexQuiz.quiz_name}". Vui lòng chọn thứ tự khác.`
                                    : `Thứ tự này đang có câu hỏi "${duplicateIndexQuiz.quiz_name}". Lưu tiếp sẽ ghi đè câu hỏi cũ.`
                                : indexSuggestionLoading
                                    ? "Đang tính thứ tự đề xuất..."
                                    : suggestedQuizIndex
                                    ? `Đề xuất: ${suggestedQuizIndex}`
                                    : undefined}
                        >
                            <InputNumber
                                min={1}
                                precision={0}
                                style={{ width: "100%" }}
                                disabled={!canEditField("quiz_index") || !editing}
                            />
                        </Form.Item>
                    </Col>}
                </Row>

                {canViewField("quiz_name") && <Form.Item
                    name="quiz_name"
                    label="Nội dung câu hỏi"
                    rules={[
                        { required: true, whitespace: true, message: "Nhập nội dung câu hỏi" },
                        { max: 500, message: "Tối đa 500 ký tự" },
                    ]}
                >
                    <Input.TextArea
                        rows={3}
                        showCount
                        maxLength={500}
                        placeholder="Nhập câu hỏi rõ ràng, ngắn gọn..."
                        disabled={!canEditField("quiz_name")}
                    />
                </Form.Item>}

                <Row gutter={14}>
                    {canViewField("quiz_type") && <Col xs={24} lg={12}>
                        <Form.Item name="quiz_type" label="Loại câu hỏi" rules={[{ required: true }]}>
                            <Select options={QUIZ_TYPE_OPTIONS} disabled={!canEditField("quiz_type")} onChange={handleTypeChange} />
                        </Form.Item>
                    </Col>}
                    {canViewField("score_type") && <Col xs={24} lg={12}>
                        <Form.Item name="score_type" label="Cách tính điểm" rules={[{ required: true }]}>
                            <Select options={SCORE_TYPE_OPTIONS} disabled={!canEditField("score_type")} />
                        </Form.Item>
                    </Col>}
                    {canViewField("ans_duration") && <Col xs={12} lg={12}>
                        <Form.Item name="ans_duration" label="Thời gian trả lời" rules={[{ required: true, message: "Nhập thời gian" }]}>
                            <InputNumber
                                min={1}
                                max={3600}
                                precision={0}
                                addonAfter="giây"
                                style={{ width: "100%" }}
                                disabled={!canEditField("ans_duration")}
                            />
                        </Form.Item>
                    </Col>}
                    {canViewField("quiz_status") && <Col xs={12} lg={12}>
                        <Form.Item name="quiz_status" label="Trạng thái" rules={[{ required: true }]}>
                            <Select options={STATUS_OPTIONS} disabled={!canEditField("quiz_status")} />
                        </Form.Item>
                    </Col>}
                </Row>

                {canViewField("ans") && (
                    <QuizAnswerEditor quizType={quizType} editable={canEditField("ans")} />
                )}

                <Divider />
                <Flex justify="flex-end" gap={8} wrap>
                    <Button icon={<EyeOutlined />} onClick={onPreview}>Xem trước</Button>
                    <Button icon={<ReloadOutlined />} onClick={onReset}>
                        {editing ? "Đặt lại" : "Làm mới"}
                    </Button>
                    <Button
                        type="primary"
                        htmlType="submit"
                        loading={saving}
                        icon={editing ? <SaveOutlined /> : <PlusOutlined />}
                    >
                        {editing ? "Lưu thay đổi" : "Thêm câu hỏi"}
                    </Button>
                </Flex>
            </Form>
        </Modal>
    );
};

export default QuizFormModal;
