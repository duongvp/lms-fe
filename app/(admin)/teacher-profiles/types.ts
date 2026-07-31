import type { TeacherProfile } from '@/services/teacherProfileService';

export type ImportError = {
    row: number;
    field: string;
    message: string;
};

export type TeacherProfileFormMode = 'create' | 'edit';

export type TeacherProfilePagination = {
    current: number;
    pageSize: number;
    total: number;
};

export type TeacherProfileFilters = {
    search: string;
    teacherType: 0 | 1 | undefined;
    status: 0 | 1 | undefined;
};

export type TeacherProfileTableProps = {
    rows: TeacherProfile[];
    loading: boolean;
    canChangeStatus: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    updatingStatusId: number | null;
    onChangeStatus: (
        record: TeacherProfile,
        active: boolean
    ) => Promise<void>;
    onEdit: (record: TeacherProfile) => void;
    onDelete: (record: TeacherProfile) => Promise<void>;
};
