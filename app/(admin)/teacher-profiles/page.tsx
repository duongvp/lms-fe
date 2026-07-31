'use client';

import React from 'react';
import {
    Form,
    notification,
} from 'antd';

import { useAuthStore } from '@/stores/authStore';
import { PermissionKey } from '@/types/permissions';

import {
    createTeacherProfile,
    deleteTeacherProfile,
    downloadTeacherProfileTemplate,
    exportTeacherProfiles,
    getTeacherProfiles,
    importTeacherProfiles,
    TeacherProfile,
    TeacherProfilePayload,
    updateTeacherProfile,
    updateTeacherProfileStatus,
} from '@/services/teacherProfileService';
import { ImportError } from '../teacher-profiles/types';
import TeacherProfileHeader from '../teacher-profiles/components/TeacherProfileHeader';
import TeacherProfileFilters from '../teacher-profiles/components/TeacherProfileFilters';
import TeacherProfileTable from '../teacher-profiles/components/TeacherProfileTable';
import TeacherProfileFormModal from '../teacher-profiles/components/TeacherProfileFormModal';
import TeacherProfileImportModal from '../teacher-profiles/components/TeacherProfileImportModal';
import CustomSearchInput from '@/components/ui/Inputs/CustomSearchInput';


const downloadBlob = (
    blob: Blob,
    filename: string
) => {
    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement('a');

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
};

const TeacherProfilesPage = () => {
    const [form] =
        Form.useForm<TeacherProfilePayload>();

    const [rows, setRows] =
        React.useState<TeacherProfile[]>([]);

    const [loading, setLoading] =
        React.useState(false);

    const [saving, setSaving] =
        React.useState(false);

    const [editing, setEditing] =
        React.useState<TeacherProfile | null>(
            null
        );

    const [modalOpen, setModalOpen] =
        React.useState(false);

    const [importOpen, setImportOpen] =
        React.useState(false);

    const [importFile, setImportFile] =
        React.useState<File | null>(null);

    const [importMode, setImportMode] =
        React.useState<
            'skip' | 'overwrite'
        >('skip');

    const [importing, setImporting] =
        React.useState(false);

    const [importErrors, setImportErrors] =
        React.useState<ImportError[]>([]);

    const [search, setSearch] =
        React.useState('');

    const [teacherType, setTeacherType] =
        React.useState<
            1 | 2 | undefined
        >();

    const [status, setStatus] =
        React.useState<
            0 | 1 | undefined
        >();

    const [
        updatingStatusId,
        setUpdatingStatusId,
    ] = React.useState<number | null>(null);

    const [pagination, setPagination] =
        React.useState({
            current: 1,
            pageSize: 20,
            total: 0,
        });

    const [
        api,
        contextHolder,
    ] = notification.useNotification();

    const hasPermission =
        useAuthStore(
            (state) =>
                state.hasPermission
        );

    const canCreate =
        hasPermission(
            PermissionKey.TEACHER_PROFILE_CREATE
        );

    const canUpdate =
        hasPermission(
            PermissionKey.TEACHER_PROFILE_EDIT
        );

    const canChangeStatus =
        hasPermission(
            PermissionKey.TEACHER_PROFILE_STATUS
        );

    const canDelete =
        hasPermission(
            PermissionKey.TEACHER_PROFILE_DELETE
        );

    const canImport =
        hasPermission(
            PermissionKey.TEACHER_PROFILE_IMPORT
        );

    const canExport =
        hasPermission(
            PermissionKey.TEACHER_PROFILE_EXPORT
        );

    /**
     * LOAD DATA
     */
    const loadData =
        React.useCallback(
            async (
                page = pagination.current,
                pageSize = pagination.pageSize
            ) => {
                try {
                    setLoading(true);

                    const response: any =
                        await getTeacherProfiles({
                            page,
                            limit: pageSize,
                            search:
                                search ||
                                undefined,
                            teacher_type:
                                teacherType,
                            status,
                        });

                    const result =
                        response?.data ??
                        {};

                    const data: TeacherProfile[] =
                        Array.isArray(
                            result.data
                        )
                            ? result.data
                            : [];

                    setRows(data);

                    setPagination(
                        (current) => ({
                            ...current,
                            current:
                                result
                                    .pagination
                                    ?.page ??
                                page,
                            pageSize:
                                result
                                    .pagination
                                    ?.limit ??
                                pageSize,
                            total:
                                result
                                    .pagination
                                    ?.total ??
                                0,
                        })
                    );
                } catch (
                    error: any
                ) {
                    api.error({
                        message:
                            'Không thể tải nhân sự giảng dạy',
                        description:
                            error?.message ||
                            'Có lỗi xảy ra',
                    });
                } finally {
                    setLoading(false);
                }
            },
            [
                api,
                pagination.current,
                pagination.pageSize,
                search,
                status,
                teacherType,
            ]
        );

    /**
     * SEARCH / FILTER
     */
    React.useEffect(() => {
        const timer =
            window.setTimeout(
                () => {
                    void loadData(1);
                },
                250
            );

        return () =>
            window.clearTimeout(
                timer
            );
    }, [
        search,
        status,
        teacherType,
    ]); // eslint-disable-line react-hooks/exhaustive-deps

    /**
     * CREATE
     */
    const openCreate = () => {
        setEditing(null);

        form.resetFields();

        form.setFieldsValue({
            username: '',
            display_name: '',
            teacher_type: 1,
            status: 1,
        });

        setModalOpen(true);
    };

    /**
     * EDIT
     */
    const openEdit = (
        record: TeacherProfile
    ) => {
        setEditing(record);

        form.setFieldsValue({
            display_name:
                record.display_name,
            teacher_type:
                record.teacher_type,
            status: record.status,
        });

        setModalOpen(true);
    };

    /**
     * SAVE
     */
    const save = async () => {
        try {
            const values =
                await form.validateFields();

            setSaving(true);

            if (editing) {
                await updateTeacherProfile(
                    editing.id,
                    {
                        display_name:
                            values.display_name,
                        teacher_type:
                            values.teacher_type,
                    }
                );
            } else {
                await createTeacherProfile(
                    values
                );
            }

            api.success({
                message: editing
                    ? 'Đã cập nhật nhân sự'
                    : 'Đã thêm nhân sự',
            });

            setModalOpen(false);

            await loadData(
                editing
                    ? pagination.current
                    : 1
            );
        } catch (
            error: any
        ) {
            if (
                error?.errorFields
            ) {
                return;
            }

            api.error({
                message:
                    'Không thể lưu',
                description:
                    error?.message ||
                    'Có lỗi xảy ra',
            });
        } finally {
            setSaving(false);
        }
    };

    /**
     * CHANGE STATUS
     */
    const changeStatus = async (
        record: TeacherProfile,
        active: boolean
    ) => {
        const nextStatus =
            active ? 1 : 0;

        try {
            setUpdatingStatusId(
                record.id
            );

            await updateTeacherProfileStatus(
                record.id,
                nextStatus
            );

            setRows(
                (currentRows) =>
                    currentRows.map(
                        (item) =>
                            item.id ===
                            record.id
                                ? {
                                      ...item,
                                      status:
                                          nextStatus,
                                  }
                                : item
                    )
            );

            api.success({
                message:
                    'Đã cập nhật trạng thái',
            });
        } catch (
            error: any
        ) {
            api.error({
                message:
                    'Không thể cập nhật trạng thái',
                description:
                    error?.message ||
                    'Có lỗi xảy ra',
            });
        } finally {
            setUpdatingStatusId(
                null
            );
        }
    };

    /**
     * DELETE
     */
    const remove = async (
        record: TeacherProfile
    ) => {
        try {
            await deleteTeacherProfile(
                record.id
            );

            api.success({
                message:
                    'Đã xóa nhân sự',
            });

            await loadData();
        } catch (
            error: any
        ) {
            api.error({
                message:
                    'Không thể xóa',
                description:
                    error?.message ||
                    'Có lỗi xảy ra',
            });
        }
    };

    /**
     * EXPORT
     */
    const handleExport = async (
        format: 'xlsx' | 'csv'
    ) => {
        try {
            const blob =
                await exportTeacherProfiles(
                    format,
                    {
                        search:
                            search ||
                            undefined,
                        teacher_type:
                            teacherType,
                        status,
                    }
                );

            downloadBlob(
                blob,
                `nhan-su-giang-day.${format}`
            );

            api.success({
                message:
                    'Đã xuất danh sách nhân sự',
            });
        } catch (
            error: any
        ) {
            api.error({
                message:
                    'Không thể xuất file',
                description:
                    error?.message ||
                    'Có lỗi xảy ra',
            });
        }
    };

    /**
     * DOWNLOAD TEMPLATE
     */
    const handleTemplate =
        async (
            format:
                | 'xlsx'
                | 'csv'
        ) => {
            try {
                const blob =
                    await downloadTeacherProfileTemplate(
                        format
                    );

                downloadBlob(
                    blob,
                    `mau-nhap-nhan-su-giang-day.${format}`
                );
            } catch (
                error: any
            ) {
                api.error({
                    message:
                        'Không thể tải file mẫu',
                    description:
                        error?.message ||
                        'Có lỗi xảy ra',
                });
            }
        };

    /**
     * IMPORT
     */
    const handleImport =
        async () => {
            if (!importFile) {
                api.warning({
                    message:
                        'Vui lòng chọn file cần nhập',
                });

                return;
            }

            try {
                setImporting(true);
                setImportErrors([]);

                const response: any =
                    await importTeacherProfiles(
                        importFile,
                        importMode
                    );

                const result =
                    response?.data ??
                    {};

                api.success({
                    message:
                        'Nhập danh sách thành công',
                    description: `Thêm ${
                        result.created ??
                        0
                    }, cập nhật ${
                        result.updated ??
                        0
                    }, bỏ qua ${
                        result.skipped ??
                        0
                    }.`,
                });

                setImportOpen(false);
                setImportFile(null);

                await loadData(1);
            } catch (
                error: any
            ) {
                const errors =
                    error?.detail
                        ?.errors;

                if (
                    Array.isArray(
                        errors
                    )
                ) {
                    setImportErrors(
                        errors
                    );
                }

                api.error({
                    message:
                        'Không thể nhập file',
                    description:
                        error?.message ||
                        'Có lỗi xảy ra',
                });
            } finally {
                setImporting(false);
            }
        };

    /**
     * OPEN IMPORT
     */
    const openImport = () => {
        setImportErrors([]);
        setImportFile(null);
        setImportOpen(true);
    };

    /**
     * CLOSE IMPORT
     */
    const closeImport = () => {
        setImportOpen(false);
        setImportFile(null);
        setImportErrors([]);
    };

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                minHeight: 0,
                overflow: 'hidden',
            }}
        >
        
            {contextHolder}

            <TeacherProfileHeader
                canImport={canImport}
                canExport={canExport}
                canCreate={canCreate}
                onOpenImport={openImport}
                onCreate={openCreate}
                onDownloadTemplate={
                    handleTemplate
                }
                onExport={
                    handleExport
                }
            />

            <TeacherProfileFilters
                search={search}
                teacherType={
                    teacherType
                }
                status={status}
                onSearchChange={
                    setSearch
                }
                onTeacherTypeChange={
                    setTeacherType
                }
                onStatusChange={
                    setStatus
                }
            />

            <TeacherProfileTable
                rows={rows}
                loading={loading}
                canChangeStatus={
                    canChangeStatus
                }
                canUpdate={
                    canUpdate
                }
                canDelete={
                    canDelete
                }
                updatingStatusId={
                    updatingStatusId
                }
                pagination={
                    pagination
                }
                onPageChange={(
                    page,
                    pageSize
                ) =>
                    void loadData(
                        page,
                        pageSize
                    )
                }
                onChangeStatus={
                    changeStatus
                }
                onEdit={openEdit}
                onDelete={remove}
            />

            <TeacherProfileFormModal
                open={modalOpen}
                loading={saving}
                editing={editing}
                form={form}
                onSubmit={save}
                onClose={() =>
                    setModalOpen(
                        false
                    )
                }
            />

            <TeacherProfileImportModal
                open={importOpen}
                importing={
                    importing
                }
                importFile={
                    importFile
                }
                importMode={
                    importMode
                }
                importErrors={
                    importErrors
                }
                onModeChange={
                    setImportMode
                }
                onFileChange={
                    setImportFile
                }
                onSubmit={
                    handleImport
                }
                onClose={
                    closeImport
                }
            />
        </div>
    );
};

export default TeacherProfilesPage;
