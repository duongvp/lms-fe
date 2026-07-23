import type { FieldPolicy, ModuleField, ResolvedFieldPermission } from "@/types/fieldPolicy";

const DEFAULT_RULE = { visible: true, editable: true };

export const normalizeFieldPolicy = (policy: unknown): FieldPolicy => {
    if (!policy || typeof policy !== "object") return {};
    return policy as FieldPolicy;
};

export const resolveFieldRule = (
    policy: unknown,
    moduleCode: string,
    fieldCode: string
) => {
    const normalizedPolicy = normalizeFieldPolicy(policy);
    const fieldsPolicy = normalizedPolicy.modules?.[moduleCode]?.fields;

    if (!fieldsPolicy) {
        return DEFAULT_RULE;
    }

    const wildcardRule = fieldsPolicy["*"];
    const fieldRule = fieldsPolicy[fieldCode];

    return {
        visible: fieldRule?.visible ?? wildcardRule?.visible ?? false,
        editable: fieldRule?.editable ?? wildcardRule?.editable ?? false,
    };
};

export const resolveModuleFieldPermissions = (
    fields: ModuleField[],
    policy: unknown,
    moduleCode: string
): ResolvedFieldPermission[] =>
    fields.map((field) => ({
        field,
        ...resolveFieldRule(policy, moduleCode, field.fieldCode),
    }));

export const canEditAnyField = (
    fields: ModuleField[],
    policy: unknown,
    moduleCode: string
) => resolveModuleFieldPermissions(fields, policy, moduleCode).some((item) => item.editable);

export const sanitizeEditablePayload = <T extends Record<string, any>>(
    payload: T,
    fields: ModuleField[],
    policy: unknown,
    moduleCode: string
) => {
    const editableFieldCodes = new Set(
        resolveModuleFieldPermissions(fields, policy, moduleCode)
            .filter((item) => item.editable)
            .map((item) => item.field.fieldCode)
    );

    return Object.entries(payload).reduce<Record<string, any>>((acc, [key, value]) => {
        if (editableFieldCodes.has(key)) {
            acc[key] = value;
        }
        return acc;
    }, {}) as Partial<T>;
};

export const validateFieldPolicy = (policy: unknown) => {
    if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
        throw new Error("fieldPolicy phải là object.");
    }

    const modules = (policy as FieldPolicy).modules;
    if (!modules || typeof modules !== "object" || Array.isArray(modules)) {
        throw new Error("fieldPolicy.modules phải là object.");
    }

    Object.entries(modules).forEach(([moduleCode, modulePolicy]) => {
        if (!modulePolicy || typeof modulePolicy !== "object" || Array.isArray(modulePolicy)) {
            throw new Error(`Policy của module ${moduleCode} không hợp lệ.`);
        }

        const fields = modulePolicy.fields;
        if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
            throw new Error(`Policy fields của module ${moduleCode} không hợp lệ.`);
        }

        Object.entries(fields).forEach(([fieldCode, rule]) => {
            if (!rule || typeof rule !== "object" || Array.isArray(rule)) {
                throw new Error(`Rule của field ${moduleCode}.${fieldCode} không hợp lệ.`);
            }

            if (typeof rule.visible !== "boolean" || typeof rule.editable !== "boolean") {
                throw new Error(`Rule của field ${moduleCode}.${fieldCode} phải có visible/editable boolean.`);
            }

            if (rule.editable && !rule.visible) {
                throw new Error(`Field ${moduleCode}.${fieldCode} không thể editable=true khi visible=false.`);
            }
        });
    });
};
