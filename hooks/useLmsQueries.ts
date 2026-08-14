"use client";

import useSWR, { useSWRConfig } from "swr";
import { useAuthStore } from "@/stores/authStore";
import { getLessons, type LessonListParams } from "@/services/lessonService";
import { getLivestreams, getSchedulingPrograms, type LivestreamListParams } from "@/services/livestreamService";
import { getModuleFields } from "@/services/roleService";
import { getTeachingStaffOptions, type CanViewStreamKey } from "@/services/teacherProfileService";
import { getPackageCourses } from "@/services/packageCourseService";
import { isSWRNamespace, SWR_NAMESPACES, swrKeys } from "@/lib/swrKeys";

// Cache phải được tách theo phiên, không chỉ theo userId. Nếu cùng một người
// vừa logout rồi login lại, các Select cần fetch option mới thay vì dùng entry
// rỗng còn lại từ phiên cũ.
const useAuthCacheScope = () => useAuthStore(
    (state) => `${state.user.userId}:${state.authSessionVersion}`
);

export const useLessonsQuery = (params: LessonListParams | null) => {
    const userId = useAuthCacheScope();
    return useSWR(
        params ? swrKeys.lessonList(userId, params) : null,
        () => getLessons(params!),
        { dedupingInterval: 30_000 }
    );
};

export const useSchedulesQuery = (params: LivestreamListParams | null) => {
    const userId = useAuthCacheScope();
    return useSWR(
        params ? swrKeys.scheduleList(userId, params) : null,
        () => getLivestreams(params!),
        { dedupingInterval: 15_000 }
    );
};

export const useSchedulingProgramsQuery = () => {
    const userId = useAuthCacheScope();
    return useSWR(
        swrKeys.schedulePrograms(userId),
        getSchedulingPrograms,
        { dedupingInterval: 5 * 60_000 }
    );
};

export const useModuleFieldsQuery = (moduleCode: string) => {
    const userId = useAuthCacheScope();
    return useSWR(
        swrKeys.moduleFields(userId, moduleCode),
        () => getModuleFields(moduleCode),
        { dedupingInterval: 10 * 60_000 }
    );
};

export const useTeachingStaffQuery = (teacherType: CanViewStreamKey) => {
    const userId = useAuthCacheScope();
    return useSWR(
        swrKeys.teachingStaff(userId, teacherType),
        () => getTeachingStaffOptions(teacherType),
        { dedupingInterval: 2 * 60_000 }
    );
};

export const usePackageCoursesQuery = (enabled = true) => {
    const userId = useAuthCacheScope();
    return useSWR(
        enabled ? swrKeys.packageCourses(userId) : null,
        () => getPackageCourses(),
        { dedupingInterval: 5 * 60_000 }
    );
};

export const useLmsCache = () => {
    const { mutate } = useSWRConfig();
    return {
        refreshLessons: () => mutate(
            (key) => isSWRNamespace(key, SWR_NAMESPACES.lessons),
            undefined,
            { revalidate: true }
        ),
        refreshSchedules: () => mutate(
            (key) => isSWRNamespace(key, SWR_NAMESPACES.schedules),
            undefined,
            { revalidate: true }
        ),
        refreshTeachingStaff: (teacherType?: CanViewStreamKey) => mutate(
            (key) => Array.isArray(key)
                && key[0] === SWR_NAMESPACES.teachingStaff
                && (teacherType === undefined || key[2] === teacherType),
            undefined,
            { revalidate: true }
        ),
    };
};
