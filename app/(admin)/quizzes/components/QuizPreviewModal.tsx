"use client";

import { Button, Modal, Tag, Typography } from "antd";
import { CheckCircleFilled } from "@ant-design/icons";
import { quizTypeLabel, statusMeta } from "../quiz.constants";
import type { QuizFormValues } from "../quiz.types";
import { LETTERS } from "../quiz.utils";
import styles from "../quiz.module.css";

const { Text } = Typography;

interface QuizPreviewModalProps {
    open: boolean;
    values: QuizFormValues;
    canViewAnswers: boolean;
    canViewDuration: boolean;
    canViewStatus: boolean;
    onClose: () => void;
}

const QuizPreviewModal = ({
    open,
    values,
    canViewAnswers,
    canViewDuration,
    canViewStatus,
    onClose,
}: QuizPreviewModalProps) => {
    const quizType = Number(values.quiz_type || 1) as 1 | 2 | 3;
    const answers = values.answers || [];
    const status = statusMeta(values.quiz_status);

    return (
        <Modal
            title="Xem trước câu hỏi"
            open={open}
            onCancel={onClose}
            footer={<Button type="primary" onClick={onClose}>Đóng</Button>}
            width={600}
            destroyOnClose
        >
            <div style={{ padding: "12px 0" }}>
                <div className={styles.previewMeta} style={{ marginBottom: 12 }}>
                    <Tag color={quizType === 1 ? "blue" : quizType === 2 ? "purple" : "cyan"}>
                        {quizTypeLabel(quizType)}
                    </Tag>
                    {canViewDuration && <Tag>{values.ans_duration || 0} giây</Tag>}
                    {canViewStatus && <Tag color={status.color}>{status.label}</Tag>}
                </div>
                <div className={styles.previewQuestion}>
                    {values.quiz_name?.trim() || "Nội dung câu hỏi sẽ hiển thị tại đây."}
                </div>
                {canViewAnswers && (quizType === 1 ? (
                    answers.length ? answers.map((item, index) => (
                        <div
                            key={index}
                            className={`${styles.previewOption} ${item.correct ? styles.previewOptionCorrect : ""}`}
                        >
                            <span className={styles.optionKey}>{LETTERS[index]}.</span>
                            <span style={{ flex: 1 }}>{item.text || "Lựa chọn chưa có nội dung"}</span>
                            {item.correct && <CheckCircleFilled style={{ color: "#22a447", marginTop: 3 }} />}
                        </div>
                    )) : <div className={styles.emptyAnswer}>Chưa có lựa chọn</div>
                ) : quizType === 2 ? (
                    answers.length ? answers.map((item, index) => (
                        <div key={index} className={styles.previewOption}>
                            <span className={styles.optionKey}>{index + 1}.</span>
                            <span>
                                <Text type="secondary">{item.placeholder || "Vị trí trống"}</Text>
                                <br />
                                {item.text || "Chưa nhập đáp án"}
                            </span>
                        </div>
                    )) : <div className={styles.emptyAnswer}>Chưa có ô điền từ</div>
                ) : (
                    <div className={styles.previewOption}>
                        <span>{values.short_answer || "Chưa nhập đáp án mẫu"}</span>
                    </div>
                ))}
            </div>
        </Modal>
    );
};

export default QuizPreviewModal;
