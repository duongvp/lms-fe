'use client';

import {
    Button,
    Dropdown,
    Flex,
    Grid,
    Space,
    Typography,
} from 'antd';
import MobileAdminToolbar from '@/components/shared/MobileAdminToolbar';
import {
    DownloadOutlined,
    FileExcelOutlined,
    PlusOutlined,
    UploadOutlined,
    SyncOutlined,
} from '@ant-design/icons';

const { Title } = Typography;

interface TeacherProfileHeaderProps {
    search: string;
    onSearchChange: (value: string) => void;
    filters: React.ReactNode;
    filterCount: number;
    canImport: boolean;
    canExport: boolean;
    canCreate: boolean;
    onOpenImport: () => void;
    onCreate: () => void;
    canSyncHmid: boolean;
    syncingHmid: boolean;
    selectedHmidCount: number;
    onSyncHmid: () => void;
    onExport: (
        format: 'xlsx' | 'csv'
    ) => Promise<void>;
}

const TeacherProfileHeader = ({
    search,
    onSearchChange,
    filters,
    filterCount,
    canImport,
    canExport,
    canCreate,
    onOpenImport,
    onCreate,
    canSyncHmid,
    syncingHmid,
    selectedHmidCount,
    onSyncHmid,
    onExport,
}: TeacherProfileHeaderProps) => {
    const isMobile = !Grid.useBreakpoint().md;
    const actions = <>
        {canSyncHmid && <Button icon={<SyncOutlined />} loading={syncingHmid} disabled={!selectedHmidCount} onClick={onSyncHmid}>Đồng bộ HMID đã chọn ({selectedHmidCount})</Button>}
        {canImport && <Button icon={<UploadOutlined />} onClick={onOpenImport}>Nhập file</Button>}
        {canExport && <><Button icon={<DownloadOutlined />} onClick={() => void onExport('xlsx')}>Xuất Excel</Button><Button icon={<DownloadOutlined />} onClick={() => void onExport('csv')}>Xuất CSV</Button></>}
    </>;
    if (isMobile) return <>
        <Title level={4} style={{ margin: '0 0 12px' }}>Giáo viên & Trợ giảng</Title>
        <MobileAdminToolbar search={search} placeholder="Tìm tên đăng nhập, họ tên" onSearchChange={onSearchChange} filters={filters} filterCount={filterCount} onCreate={canCreate ? onCreate : undefined} createLabel="Thêm nhân sự" actions={canSyncHmid || canImport || canExport ? actions : undefined} />
    </>;
    return (
        <Flex
            className="responsive-page-toolbar"
            justify="space-between"
            align="center"
            wrap
            gap={12}
            style={{ marginBottom: 16 }}
        >
            <Title
                level={4}
                style={{ margin: 0 }}
            >
                Giáo viên & Trợ giảng
            </Title>

            <Space className="responsive-action-buttons" wrap>
                {canSyncHmid && (
                    <Button
                        icon={<SyncOutlined spin={syncingHmid} />}
                        loading={syncingHmid}
                        disabled={selectedHmidCount === 0}
                        onClick={onSyncHmid}
                    >
                        Đồng bộ HMID đã chọn ({selectedHmidCount})
                    </Button>
                )}
                {canImport && (
                    <>
                        <Button
                            icon={
                                <UploadOutlined />
                            }
                            onClick={onOpenImport}
                        >
                            Nhập file
                        </Button>
                    </>
                )}

                {canExport && (
                    <Dropdown
                        menu={{
                            items: [
                                {
                                    key: 'xlsx',
                                    label: 'Xuất Excel',
                                },
                                {
                                    key: 'csv',
                                    label: 'Xuất CSV',
                                },
                            ],
                            onClick: ({ key }) =>
                                void onExport(
                                    key as
                                        | 'xlsx'
                                        | 'csv'
                                ),
                        }}
                    >
                        <Button
                            icon={
                                <DownloadOutlined />
                            }
                        >
                            Xuất file
                        </Button>
                    </Dropdown>
                )}

                {canCreate && (
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={onCreate}
                    >
                        Thêm nhân sự
                    </Button>
                )}
            </Space>
        </Flex>
    );
};

export default TeacherProfileHeader;
