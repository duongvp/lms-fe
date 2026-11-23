// Preserve selected labels while choices reload or filters temporarily conflict.
// Do not silently clear the user's draft; clearing a filter expands the choices.
export const scheduleFacetOptions = <T extends {value: string | number}>(
    options: T[], allowed: Array<string | number> | undefined, selected: unknown,
): T[] => {
    const chosen = Array.isArray(selected) ? selected : selected == null ? [] : [selected];
    const visible = new Set([...(allowed ?? []), ...chosen].map(String));
    return options.filter(option => visible.has(String(option.value)));
};
