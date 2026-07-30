"use client";

import { useEffect, useState } from "react";
import {
    Alert,
    Button,
    Flex,
    Modal,
    Space,
    Table,
    Typography,
    Upload,
} from "antd";
import {
    FileExcelOutlined,
    FileTextOutlined,
    InboxOutlined,
    UploadOutlined,
} from "@ant-design/icons";
import type { UploadFile } from "antd/es/upload/interface";

export interface ScheduleImportError {
    row: number;
    field: string;
    message: string;
}

interface ScheduleImportModalProps {
    open: boolean;
    loading: boolean;
    errors: ScheduleImportError[];
    onClose: () => void;
    onSubmit: (file: File) => Promise<void>;
    onDownloadTemplate: (format: "csv" | "xlsx") => Promise<void>;
}

const ScheduleImportModal = ({
    open,
    loading,
    errors,
    onClose,
    onSubmit,
    onDownloadTemplate,
}: ScheduleImportModalProps) => {
    const [fileList, setFileList] = useState<UploadFile[]>([]);

    useEffect(() => {
        if (open) setFileList([]);
    }, [open]);

    const selectedFile = fileList[0]?.originFileObj;

    return (
        <Modal
            title="Import lịch học"
            open={open}
            width={900}
            centered
            destroyOnClose
            onCancel={onClose}
            styles={{
                content: {
                    maxHeight: "calc(100vh - 32px)",
                    display: "flex",
                    flexDirection: "column",
                },
                body: {
                    minHeight: 0,
                    overflowY: "auto",
                },
            }}
            footer={
                <Flex wrap gap={8} justify="space-between">
                    <Space wrap>
                        <Button icon={<FileTextOutlined />} onClick={() => onDownloadTemplate("csv")}>
                            File mẫu CSV
                        </Button>
                        <Button icon={<FileExcelOutlined />} onClick={() => onDownloadTemplate("xlsx")}>
                            File mẫu Excel
                        </Button>
                    </Space>
                    <Space>
                        <Button onClick={onClose}>Hủy</Button>
                        <Button
                            type="primary"
                            icon={<UploadOutlined />}
                            loading={loading}
                            disabled={!selectedFile}
                            onClick={() => selectedFile && onSubmit(selectedFile)}
                        >
                            Import
                        </Button>
                    </Space>
                </Flex>
            }
        >
            <Alert
                type="info"
                showIcon
                message="Mỗi dòng tương ứng một lịch học"
                description={
                    <>
                        Mapping nhập theo dạng{" "}
                        <Typography.Text code>
                            course_id:lesson_id1|lesson_id2;course_id2:lesson_id3
                        </Typography.Text>.
                        Để trống Lesson Count để hệ thống tự tính. Toàn bộ file được tạo trong một giao dịch.
                    </>
                }
                style={{ marginBottom: 16 }}
            />

            <Upload.Dragger
                accept=".xlsx,.csv"
                maxCount={1}
                fileList={fileList}
                beforeUpload={() => false}
                onChange={({ fileList: next }) => setFileList(next.slice(-1))}
                onRemove={() => setFileList([])}
            >
                <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                <p className="ant-upload-text">Kéo file vào đây hoặc bấm để chọn file</p>
                <p className="ant-upload-hint">Hỗ trợ .xlsx và .csv, tối đa 5 MB/500 lịch</p>
            </Upload.Dragger>

            {errors.length > 0 && (
                <section style={{ marginTop: 16 }}>
                    <Alert
                        type="error"
                        showIcon
                        message={`Có ${errors.length} lỗi cần xử lý`}
                        style={{ marginBottom: 12 }}
                    />
                    <Table<ScheduleImportError>
                        size="small"
                        rowKey={(record, index) => `${record.row}-${record.field}-${index}`}
                        pagination={false}
                        dataSource={errors}
                        scroll={{ y: 240 }}
                        columns={[
                            { title: "Dòng", dataIndex: "row", width: 80 },
                            { title: "Trường", dataIndex: "field", width: 140 },
                            {
                                title: "Nội dung lỗi",
                                dataIndex: "message",
                                render: (value: string) => (
                                    <Typography.Text style={{ overflowWrap: "anywhere" }}>
                                        {value}
                                    </Typography.Text>
                                ),
                            },
                        ]}
                    />
                </section>
            )}
        </Modal>
    );
};

export default ScheduleImportModal;
