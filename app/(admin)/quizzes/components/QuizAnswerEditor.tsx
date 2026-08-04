"use client";

import { Button, Checkbox, Divider, Flex, Form, Input, Space, Typography } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import type { QuizType } from "@/services/quizService";
import type { EditorAnswer } from "../quiz.types";
import { LETTERS } from "../quiz.utils";
import styles from "../quiz.module.css";

const { Text } = Typography;

interface QuizAnswerEditorProps {
    quizType: QuizType;
    editable: boolean;
}

const QuizAnswerEditor = ({ quizType, editable }: QuizAnswerEditorProps) => <>
    <Divider orientation="left" plain>Đáp án</Divider>
    {quizType !== 3 ? (
        <Form.List name="answers" rules={[{
            validator: async (_, answers: EditorAnswer[]) => {
                if (quizType === 1 && (!answers || answers.length < 2)) {
                    throw new Error("Cần ít nhất hai lựa chọn");
                }
                if (quizType === 2 && (!answers || answers.length < 1)) {
                    throw new Error("Cần ít nhất một ô điền từ");
                }
            },
        }]}>
            {(fields, { add, remove }, { errors }) => (
                <Space direction="vertical" size={10} style={{ width: "100%" }}>
                    {fields.map((field, index) => (
                        <div className={styles.answerRow} key={field.key}>
                            <Flex gap={10} align="flex-start">
                                <Text strong style={{ width: 22, paddingTop: 6 }}>
                                    {quizType === 1 ? `${LETTERS[index]}.` : `${index + 1}.`}
                                </Text>
                                <div style={{ flex: 1 }}>
                                    {quizType === 2 && <Form.Item
                                        {...field}
                                        key={`placeholder-${field.key}`}
                                        name={[field.name, "placeholder"]}
                                        rules={[{ required: true, whitespace: true, message: "Nhập gợi ý vị trí trống" }]}
                                        style={{ marginBottom: 8 }}
                                    >
                                        <Input placeholder="Gợi ý/vị trí cần điền" disabled={!editable} />
                                    </Form.Item>}
                                    <Form.Item
                                        {...field}
                                        key={`text-${field.key}`}
                                        name={[field.name, "text"]}
                                        rules={[{ required: true, whitespace: true, message: "Nhập đáp án" }]}
                                        style={{ marginBottom: 0 }}
                                    >
                                        <Input
                                            placeholder={quizType === 1
                                                ? `Nội dung lựa chọn ${LETTERS[index]}`
                                                : "Các đáp án chấp nhận, phân tách bằng dấu ;"}
                                            disabled={!editable}
                                        />
                                    </Form.Item>
                                </div>
                                {quizType === 1 && <Form.Item
                                    {...field}
                                    key={`correct-${field.key}`}
                                    name={[field.name, "correct"]}
                                    valuePropName="checked"
                                    style={{ margin: "5px 0 0" }}
                                >
                                    <Checkbox disabled={!editable}>Đúng</Checkbox>
                                </Form.Item>}
                                {fields.length > (quizType === 1 ? 2 : 1) && editable && (
                                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                                )}
                            </Flex>
                        </div>
                    ))}
                    <Form.ErrorList errors={errors} />
                    {editable && fields.length < (quizType === 1 ? 26 : 20) && (
                        <Button
                            type="dashed"
                            icon={<PlusOutlined />}
                            onClick={() => add({ text: "", placeholder: "", correct: false })}
                            block
                        >
                            {quizType === 1 ? "Thêm lựa chọn" : "Thêm ô điền từ"}
                        </Button>
                    )}
                </Space>
            )}
        </Form.List>
    ) : (
        <Form.Item
            name="short_answer"
            label="Đáp án mẫu"
            rules={[{ required: true, whitespace: true, message: "Nhập đáp án mẫu" }]}
        >
            <Input.TextArea
                rows={3}
                placeholder="Nhập đáp án dùng để đối chiếu/chấm bài"
                disabled={!editable}
            />
        </Form.Item>
    )}
</>;

export default QuizAnswerEditor;
