'use client';

import {
    Alert,
    Button,
    Flex,
    Modal,
    Radio,
    Space,
    Typography,
    Upload,
} from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { ImportError } from '../types';



const { Dragger } = Upload;

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
                    Bỏ qua mã đã tồn tại
                </Radio>

                <Radio value="overwrite">
                    Cập nhật mã đã tồn tại
                </Radio>
            </Radio.Group>

            <Dragger
                accept=".xlsx,.csv"
                maxCount={1}
                beforeUpload={(file) => {
                    onFileChange(file);

                    return false;
                }}
                onRemove={() => {
                    onFileChange(null);

                    return true;
                }}
                fileList={
                    importFile
                        ? [
                              {
                                  uid: 'teacher-profile-import',
                                  name: importFile.name,
                                  status: 'done',
                              },
                          ]
                        : []
                }
            >
                <p className="ant-upload-drag-icon">
                    <UploadOutlined />
                </p>

                <p>
                    Chọn hoặc kéo file
                    Excel/CSV vào đây
                </p>

                <p
                    style={{
                        color: '#8c8c8c',
                    }}
                >
                    Tối đa 5 MB và 2.000
                    dòng mỗi lần nhập.
                </p>
            </Dragger>

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
