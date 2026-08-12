import type { SelectProps } from "antd";
import type { HocmaiSectionOption } from "@/services/livestreamService";

export const hmoOptionKey = (option: HocmaiSectionOption) => (
    `${option.package_id}::${option.course_id}::${option.lesson_id}`
);

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
    const uniqueOptions = new Set(source.map(hmoOptionKey)).size;
    const pairs = new Set(source.map((option) => `${option.package_id}::${option.course_id}`)).size;
    return `${uniqueOptions} Lesson ID từ ${pairs} Package/Course`;
};
