'use client';

import {
    Button,
    Dropdown,
    Flex,
    Space,
    Typography,
} from 'antd';
import {
    DownloadOutlined,
    FileExcelOutlined,
    PlusOutlined,
    UploadOutlined,
} from '@ant-design/icons';

const { Title } = Typography;

interface TeacherProfileHeaderProps {
    canImport: boolean;
    canExport: boolean;
    canCreate: boolean;
    onOpenImport: () => void;
    onCreate: () => void;
    onExport: (
        format: 'xlsx' | 'csv'
    ) => Promise<void>;
}

const TeacherProfileHeader = ({
    canImport,
    canExport,
    canCreate,
    onOpenImport,
    onCreate,
    onExport,
}: TeacherProfileHeaderProps) => {
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
