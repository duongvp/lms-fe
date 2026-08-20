'use client';

import {
    Alert,
    Button,
    Flex,
    Modal,
    Radio,
    Space,
    Typography,
    Dropdown,
} from 'antd';
import { FileExcelOutlined } from '@ant-design/icons';
import { ImportError } from '../types';
import ImportFileDragger from '@/components/shared/ImportFileDragger';



interface TeacherProfileImportModalProps {
    open: boolean;
    importing: boolean;

    importFile: File | null;
    importMode: 'skip' | 'overwrite';
    importErrors: ImportError[];

    onModeChange: (
        mode: 'skip' | 'overwrite'
    ) => void;

    onFileChange: (
        file: File | null
    ) => void;

    onSubmit: () => Promise<void>;
    onClose: () => void;
    onDownloadTemplate: (format: 'xlsx' | 'csv') => Promise<void>;
}

const TeacherProfileImportModal = ({
    open,
    importing,
    importFile,
    importMode,
    importErrors,
    onModeChange,
    onFileChange,
    onSubmit,
    onClose,
    onDownloadTemplate,
}: TeacherProfileImportModalProps) => {
    return (
        <Modal
            open={open}
            title="Nhập giáo viên và trợ giảng từ file"
            okText="Bắt đầu nhập"
            cancelText="Hủy"
            confirmLoading={importing}
            onOk={() => void onSubmit()}
            onCancel={onClose}
        >
            <Radio.Group
                value={importMode}
                onChange={(event) =>
                    onModeChange(
                        event.target.value
                    )
                }
                style={{
                    marginBottom: 16,
                }}
            >
                <Radio value="skip">
                    Bỏ qua Tên đăng nhập đã tồn tại
                </Radio>

                <Radio value="overwrite">
                    Cập nhật Tên đăng nhập đã tồn tại
                </Radio>
            </Radio.Group>
            
            <Dropdown
                menu={{
                    items: [
                        {
                            key: 'xlsx',
                            label: 'File mẫu Excel',
                        },
                        {
                            key: 'csv',
                            label: 'File mẫu CSV',
                        },
                    ],
                    onClick: ({ key }) =>
                        void onDownloadTemplate(
                            key as 'xlsx' | 'csv'
                        ),
                }}
            >
                <Button
                    icon={<FileExcelOutlined />}
                    style={{ marginBottom: 16, marginLeft: 16 }}
                >
                    Tải file mẫu
                </Button>
            </Dropdown>

            <ImportFileDragger
                file={importFile}
                onFileChange={onFileChange}
                maxSizeMb={5}
                maxRows={2000}
                requiredHeaders={[
                    ['username', 'Tên đăng nhập (*)', 'Tên đăng nhập'],
                    ['display_name', 'Họ và tên'],
                    ['can_view_stream_key', 'Quyền xem Stream Key (1: Giáo viên, 0: Trợ giảng)'],
                    ['status', 'Trạng thái (1: Hoạt động, 0: Ngừng hoạt động)'],
                ]}
                prompt="Chọn hoặc kéo file Excel/CSV vào đây"
                hint="Tối đa 5 MB và 2.000 dòng mỗi lần nhập"
            />

            {importErrors.length > 0 && (
                <Alert
                    type="error"
                    showIcon
                    style={{
                        marginTop: 16,
                    }}
                    message={`Có ${importErrors.length} dòng không hợp lệ`}
                    description={
                        <div
                            style={{
                                maxHeight: 180,
                                overflowY:
                                    'auto',
                            }}
                        >
                            {importErrors
                                .slice(0, 50)
                                .map(
                                    (
                                        error,
                                        index
                                    ) => (
                                        <div
                                            key={`${error.row}-${index}`}
                                        >
                                            Dòng{' '}
                                            {
                                                error.row
                                            }
                                            :{' '}
                                            {
                                                error.message
                                            }
                                        </div>
                                    )
                                )}
                        </div>
                    }
                />
            )}
        </Modal>
    );
};

export default TeacherProfileImportModal;
