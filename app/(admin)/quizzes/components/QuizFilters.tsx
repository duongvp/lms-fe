"use client";

import { Col, Divider, Row, Select, Typography } from "antd";
import type { QuizClassOption, QuizLessonOption } from "@/services/quizService";
import { QUIZ_TYPE_OPTIONS, STATUS_OPTIONS } from "../quiz.constants";
import type { QuizClassSelectOption, QuizFilterValues } from "../quiz.types";
import { buildLessonSelectOptions } from "../quiz.utils";
import styles from "../quiz.module.css";

const { Text } = Typography;

interface QuizFiltersProps {
    filters: QuizFilterValues;
    classOptions: QuizClassSelectOption[];
    classes: QuizClassOption[];
    classesLoading: boolean;
    lessons: QuizLessonOption[];
    lessonsLoading: boolean;
    reorderMode: boolean;
    onFiltersChange: (filters: QuizFilterValues) => void;
}

const QuizFilters = ({
    filters,
    classOptions,
    classes,
    classesLoading,
    lessons,
    lessonsLoading,
    reorderMode,
    onFiltersChange,
}: QuizFiltersProps) => {
    const lessonNameByNumber = new Map(
        lessons.map((item) => [Number(item.learn_number), item.lesson_name])
    );

    return <div className={styles.filters}>
        <Row gutter={[12, 12]}>
            <Col xs={24} sm={12} xl={7}>
                <Select
                    options={classOptions}
                    value={filters.code}
                    onChange={(value) => onFiltersChange({
                        ...filters,
                        code: value,
                        learn_number: undefined,
                    })}
                    placeholder="Chọn lớp học"
                    style={{ width: "100%" }}
                    allowClear
                    showSearch
                    loading={classesLoading}
                    optionFilterProp="searchText"
                    disabled={reorderMode}
                />
            </Col>
            <Col xs={24} sm={12} xl={7}>
                <Select
                    value={filters.learn_number === undefined ? undefined : Number(filters.learn_number)}
                    onChange={(value) => onFiltersChange({ ...filters, learn_number: value })}
                    options={buildLessonSelectOptions(lessons)}
                    placeholder={filters.code ? "Chọn bài học" : "Chọn lớp trước"}
                    style={{ width: "100%" }}
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    loading={lessonsLoading}
                    disabled={!filters.code || reorderMode}
                />
            </Col>
            <Col xs={12} sm={6} xl={5}>
                <Select
                    value={filters.quiz_type}
                    onChange={(value) => onFiltersChange({ ...filters, quiz_type: value })}
                    options={QUIZ_TYPE_OPTIONS}
                    placeholder="Loại câu hỏi"
                    style={{ width: "100%" }}
                    allowClear
                    disabled={reorderMode}
                />
            </Col>
            <Col xs={12} sm={6} xl={5}>
                <Select
                    value={filters.quiz_status}
                    onChange={(value) => onFiltersChange({ ...filters, quiz_status: value })}
                    options={STATUS_OPTIONS}
                    placeholder="Trạng thái"
                    style={{ width: "100%" }}
                    allowClear
                    disabled={reorderMode}
                />
            </Col>
        </Row>
    </div>;
};

export default QuizFilters;
