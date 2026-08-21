import type { SelectProps } from "antd";
import type { HocmaiSectionOption } from "@/services/livestreamService";

export const hmoOptionKey = (option: HocmaiSectionOption) => (
    `${option.package_id}::${option.course_id}::${option.lesson_id}`
);

export const hmoLessonIdFromMappingKey = (value: unknown) => {
    const text = String(value || "");
    return text.split("::").at(-1) || text;
};

const compareIds = (left: string, right: string) => (
    left.localeCompare(right, "vi", { numeric: true })
);

export const buildGroupedHmoOptions = (
    source: HocmaiSectionOption[]
): NonNullable<SelectProps["options"]> => {
    const unique = Array.from(new Map(
        source.map((option) => [hmoOptionKey(option), option])
    ).values());
    const groups = new Map<string, HocmaiSectionOption[]>();

    unique.forEach((option) => {
        const key = `${option.package_id}::${option.course_id}`;
        const current = groups.get(key) || [];
        current.push(option);
        groups.set(key, current);
    });

    return Array.from(groups.entries())
        .sort(([left], [right]) => compareIds(left, right))
        .map(([key, options]) => {
            const [packageId, courseId] = key.split("::");
            const sorted = [...options].sort((left, right) => (
                compareIds(String(left.lesson_id), String(right.lesson_id))
            ));
            return {
                label: `Package ${packageId} · Course ${courseId} (${sorted.length} Lesson ID)`,
                options: sorted.map((option) => ({
                    value: hmoOptionKey(option),
                    label: `${option.lesson_id}${option.lesson_name ? ` · ${option.lesson_name}` : ""}`,
                })),
            };
        });
};

export const summarizeHmoOptions = (source: HocmaiSectionOption[]) => {
    const uniqueMappings = new Set(source.map(hmoOptionKey)).size;
    const uniqueLessonIds = new Set(source.map((option) => String(option.lesson_id))).size;
    const pairs = new Set(source.map((option) => `${option.package_id}::${option.course_id}`)).size;
    return uniqueMappings === uniqueLessonIds
        ? `${uniqueLessonIds} Lesson ID từ ${pairs} Package/Course`
        : `${uniqueLessonIds} Lesson ID (${uniqueMappings} mapping) từ ${pairs} Package/Course`;
};

export const summarizeSelectedHmoMappings = (keys: string[] = []) => {
    const uniqueMappings = Array.from(new Set(keys.map(String).filter(Boolean)));
    const uniqueLessonIds = new Set(uniqueMappings.map(hmoLessonIdFromMappingKey)).size;
    return uniqueMappings.length === uniqueLessonIds
        ? `${uniqueLessonIds} Lesson ID HMO`
        : `${uniqueLessonIds} Lesson ID HMO (${uniqueMappings.length} mapping Package/Course)`;
};
