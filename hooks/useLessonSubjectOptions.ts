"use client";

import useSWR from "swr";
import { SUBJECT_OPTIONS } from "@/constants/subjects";
import {
    getLessonPrograms,
    getLessonSubjects,
    type LessonProgramOption,
    type LessonSubjectOption,
} from "@/services/lessonService";
import { useAuthStore } from "@/stores/authStore";
import { swrKeys } from "@/lib/swrKeys";

type SubjectSelectOption = (typeof SUBJECT_OPTIONS)[number];

const normalizeSubjectName = (value: string) => value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/\s+/g, "")
    .toLocaleLowerCase("vi-VN");

const mergeSubjectOptions = (databaseSubjects: LessonSubjectOption[]) => {
    const merged = new Map<string, SubjectSelectOption>();

    [...SUBJECT_OPTIONS, ...databaseSubjects.map((subject) => ({
        value: subject.subject_name.trim(),
        label: subject.subject_name.trim(),
        subjectCode: subject.subject_code.trim(),
    }))].forEach((subject) => {
        const key = normalizeSubjectName(subject.label);
        if (key && !merged.has(key)) merged.set(key, subject);
    });

    return Array.from(merged.values()).sort((left, right) => (
        left.label.localeCompare(right.label, "vi")
    ));
};

export const useLessonSubjectOptions = () => {
    const userId = useAuthStore((state) => state.user.userId);
    const { data } = useSWR(
        swrKeys.lessonSubjects(userId),
        getLessonSubjects,
        { dedupingInterval: 5 * 60_000 }
    );
    const responseData = data?.data;
    const subjects: LessonSubjectOption[] = Array.isArray(responseData)
        ? responseData
        : Array.isArray(responseData?.data)
            ? responseData.data
            : Array.isArray(responseData?.subjects)
                ? responseData.subjects
                : [];

    return mergeSubjectOptions(subjects);
};

export const useLessonProgramOptions = () => {
    const userId = useAuthStore((state) => state.user.userId);
    const { data } = useSWR(
        swrKeys.lessonPrograms(userId),
        getLessonPrograms,
        { dedupingInterval: 5 * 60_000 }
    );
    const responseData = data?.data;
    const programs: LessonProgramOption[] = Array.isArray(responseData)
        ? responseData
        : Array.isArray(responseData?.data)
            ? responseData.data
            : [];

    return programs;
};
