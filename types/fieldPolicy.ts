export interface ModuleField {
    id?: number | string;
    fieldCode: string;
    fieldLabel: string;
    fieldType?: string | null;
    sortOrder?: number;
}

export interface ModuleStructure {
    id?: number | string;
    code: string;
    name: string;
    fields: ModuleField[];
}

export interface FieldRule {
    visible: boolean;
    editable: boolean;
}

export interface FieldPolicy {
    modules?: Record<
        string,
        {
            fields?: Record<string, Partial<FieldRule>>;
        }
    >;
}

export interface ResolvedFieldPermission extends FieldRule {
    field: ModuleField;
}
