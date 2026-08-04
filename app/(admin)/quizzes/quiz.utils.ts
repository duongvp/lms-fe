import type {
    QuizAnswerItem,
    QuizApiResponse,
    QuizLessonOption,
    QuizPayload,
    QuizType,
} from "@/services/quizService";
import type { QuizFormValues } from "./quiz.types";

export const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const INITIAL_QUIZ_FORM_VALUES: QuizFormValues = {
    code: "",
    learn_number: undefined as unknown as number,
    quiz_type: 1,
    quiz_name: "",
    answers: [{ text: "", correct: true }, { text: "", correct: false }],
    short_answer: "",
    score_type: 1,
    ans_duration: 60,
    quiz_status: "done",
    quiz_index: 1,
};

export const getAnswerKey = (item: QuizAnswerItem) =>
    Object.keys(item).find((key) => !["text", "placeholder"].includes(key));

export const recordToQuizForm = (record: QuizApiResponse): QuizFormValues => {
    const answers = Array.isArray(record.ans) ? record.ans : [];
    return {
        code: record.code,
        learn_number: Number(record.learn_number),
        quiz_type: Number(record.quiz_type) as QuizType,
        quiz_name: record.quiz_name,
        answers: record.quiz_type === 3 ? [] : answers.map((item) => ({
            text: String(item.text ?? ""),
            placeholder: String(item.placeholder ?? ""),
            correct: record.quiz_type === 1
                ? Boolean(item[getAnswerKey(item) || "A"])
                : true,
        })),
        short_answer: record.quiz_type === 3 ? String(answers[0]?.text ?? "") : "",
        score_type: Number(record.score_type) as 1 | 2,
        ans_duration: Number(record.ans_duration),
        quiz_status: record.quiz_status,
        quiz_index: Number(record.quiz_index),
    };
};

export const quizFormToPayload = (values: QuizFormValues): QuizPayload => {
    const quizType = Number(values.quiz_type) as QuizType;
    let ans: QuizAnswerItem[];
    if (quizType === 1) {
        ans = (values.answers || []).map((item, index) => ({
            [LETTERS[index]]: Boolean(item.correct),
            text: String(item.text || "").trim(),
        }));
    } else if (quizType === 2) {
        ans = (values.answers || []).map((item) => ({
            placeholder: String(item.placeholder || "").trim(),
            text: String(item.text || "").trim(),
            A: true,
        }));
    } else {
        ans = [{ A: true, text: String(values.short_answer || "").trim() }];
    }
    return {
        code: String(values.code || "").trim(),
        learn_number: Number(values.learn_number),
        quiz_type: quizType,
        quiz_name: String(values.quiz_name || "").trim(),
        ans,
        score_type: Number(values.score_type) as 1 | 2,
        ans_duration: Number(values.ans_duration),
        quiz_status: values.quiz_status,
        quiz_index: Number(values.quiz_index),
    };
};

export const buildLessonSelectOptions = (
    lessons: QuizLessonOption[],
    fallbackLearnNumber?: number
) => {
    const rows = [...lessons];
    if (
        fallbackLearnNumber !== undefined
        && !rows.some((item) => Number(item.learn_number) === Number(fallbackLearnNumber))
    ) {
        rows.push({
            learn_number: Number(fallbackLearnNumber),
            lesson_name: `Buổi ${fallbackLearnNumber}`,
        });
    }
    return rows
        .sort((left, right) => Number(left.learn_number) - Number(right.learn_number))
        .map((item) => ({
            value: Number(item.learn_number),
            label: `Buổi ${item.learn_number} — ${item.lesson_name}`,
        }));
};

export const downloadQuizBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

export const formatQuizDate = (value?: string) => value
    ? new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(new Date(value))
    : "—";
