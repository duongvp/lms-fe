"use client";

import { useRef } from "react";
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

const useAuthCacheScope = () => useAuthStore(
    (state) => `${state.user.userId}:${state.authSessionVersion}`
);

export const useQuizzesQuery = (params: QuizListParams | null) => {
    const userId = useAuthCacheScope();
    const activeRequestRef = useRef<AbortController | null>(null);
    return useSWR(
        params ? swrKeys.quizList(userId, params) : null,
        async () => {
            activeRequestRef.current?.abort();
            const controller = new AbortController();
            activeRequestRef.current = controller;
            try {
                return await getQuizzes(params!, controller.signal);
            } finally {
                if (activeRequestRef.current === controller) {
                    activeRequestRef.current = null;
                }
            }
        },
        {
            dedupingInterval: 15_000,
            keepPreviousData: true,
            shouldRetryOnError: (error) => (
                error?.name !== "AbortError" && error?.message !== "Request timeout"
            ),
        }
    );
};

export const useQuizClassesQuery = () => {
    const userId = useAuthCacheScope();
    return useSWR(
        swrKeys.quizClasses(userId),
        getQuizClasses,
        { dedupingInterval: 5 * 60_000 }
    );
};

export const useQuizLessonsQuery = (code?: string | null) => {
    const userId = useAuthCacheScope();
    return useSWR(
        code ? swrKeys.quizLessons(userId, code) : null,
        () => getQuizLessons(code!),
        { dedupingInterval: 60_000 }
    );
};

export const useQuizIndexSuggestionQuery = (params: QuizIndexSuggestionParams | null) => {
    const userId = useAuthCacheScope();
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
