"use client";

import useSWR, { useSWRConfig } from "swr";
import { useAuthStore } from "@/stores/authStore";
import {
    getQuizClasses,
    getQuizIndexSuggestion,
    getQuizLessons,
    getQuizzes,
    type QuizIndexSuggestionParams,
    type QuizListParams,
} from "@/services/quizService";
import { isSWRNamespace, SWR_NAMESPACES, swrKeys } from "@/lib/swrKeys";

const useUserId = () => useAuthStore((state) => state.user.userId);

export const useQuizzesQuery = (params: QuizListParams | null) => {
    const userId = useUserId();
    return useSWR(
        params ? swrKeys.quizList(userId, params) : null,
        () => getQuizzes(params!),
        { dedupingInterval: 15_000 }
    );
};

export const useQuizClassesQuery = () => {
    const userId = useUserId();
    return useSWR(
        swrKeys.quizClasses(userId),
        getQuizClasses,
        { dedupingInterval: 5 * 60_000 }
    );
};

export const useQuizLessonsQuery = (code?: string | null) => {
    const userId = useUserId();
    return useSWR(
        code ? swrKeys.quizLessons(userId, code) : null,
        () => getQuizLessons(code!),
        { dedupingInterval: 60_000 }
    );
};

export const useQuizIndexSuggestionQuery = (params: QuizIndexSuggestionParams | null) => {
    const userId = useUserId();
    return useSWR(
        params ? swrKeys.quizIndexSuggestion(userId, params) : null,
        () => getQuizIndexSuggestion(params!),
        {
            dedupingInterval: 0,
            revalidateOnMount: true,
        }
    );
};

export const useQuizCache = () => {
    const { mutate } = useSWRConfig();
    return {
        refreshQuizzes: () => mutate(
            (key) => isSWRNamespace(key, SWR_NAMESPACES.quizzes),
            undefined,
            { revalidate: true }
        ),
    };
};
