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
    errorCode?: string;
    message: string;
    packageId?: string;
    courseId?: string;
    lessonId?: string;
    duplicateWithRow?: number;
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
                        Dùng format Sheet vận hành với các cột{" "}
                        <Typography.Text code>ID course</Typography.Text>,{" "}
                        <Typography.Text code>ID Bài giảng</Typography.Text> và{" "}
                        <Typography.Text code>ID package</Typography.Text>.
                        Nhiều ID trong một ô được phân cách bằng dấu phẩy.
                        Hệ thống kiểm tra toàn bộ file với HMO trước khi tạo lịch;
                        nếu có một dòng lỗi thì không dòng nào được import.
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
                <p className="ant-upload-hint">Hỗ trợ .xlsx và .csv, tối đa 10 MB/1.000 lịch</p>
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
                            {
                                title: "Mã lỗi",
                                dataIndex: "errorCode",
                                width: 220,
                                render: (value: string) => value
                                    ? <Typography.Text code>{value}</Typography.Text>
                                    : "-",
                            },
                            {
                                title: "Package / Course / Lesson",
                                key: "context",
                                width: 250,
                                render: (_, record) => [
                                    record.packageId && `P: ${record.packageId}`,
                                    record.courseId && `C: ${record.courseId}`,
                                    record.lessonId && `L: ${record.lessonId}`,
                                ].filter(Boolean).join(" / ") || record.field || "-",
                            },
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
