"use client";

import { useEffect, useState } from "react";
import {
    Alert,
    Button,
    Flex,
    Modal,
    Radio,
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
import type {
    LessonImportError,
    LessonImportMode,
    LessonExportFormat,
} from "../lesson.types";

interface LessonImportModalProps {
    open: boolean;
    loading: boolean;
    errors: LessonImportError[];
    onClose: () => void;
    onSubmit: (file: File, mode: LessonImportMode) => Promise<void>;
    onDownloadTemplate: (format: LessonExportFormat) => Promise<void>;
}

const LessonImportModal = ({
    open,
    loading,
    errors,
    onClose,
    onSubmit,
    onDownloadTemplate,
}: LessonImportModalProps) => {
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [importMode, setImportMode] = useState<LessonImportMode>("overwrite");

    useEffect(() => {
        if (!open) return;
        setFileList([]);
        setImportMode("overwrite");
    }, [open]);

    const selectedFile = fileList[0]?.originFileObj;

    return (
        <Modal
            title="Import bài học"
            open={open}
            width={920}
            centered
            destroyOnClose
            onCancel={onClose}
            styles={{
                body: {
                    maxHeight: "calc(100vh - 190px)",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                },
            }}
            footer={
                <Flex wrap gap={8} justify="space-between" align="center">
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
                            onClick={() => selectedFile && onSubmit(selectedFile, importMode)}
                        >
                            Import
                        </Button>
                    </Space>
                </Flex>
            }
        >
            <div style={{ overflowY: "auto", paddingRight: 4 }}>
                <Alert
                    type="info"
                    showIcon
                    message="Quy tắc import"
                    description="Nếu để trống số thứ tự, hệ thống tự sinh bài tiếp theo. Nếu nhập thủ công, số bài phải liên tục trong từng Khối + Môn học."
                    style={{ marginBottom: 16 }}
                />

                <Flex wrap gap={16} align="flex-end" style={{ marginBottom: 16 }}>
                    <div style={{ flex: "1 1 320px" }}>
                        <Typography.Text strong>
                            Khi trùng Khối + Môn học + Số thứ tự
                        </Typography.Text>
                        <div style={{ marginTop: 8 }}>
                            <Radio.Group
                                value={importMode}
                                onChange={(event) => setImportMode(event.target.value)}
                                optionType="button"
                                buttonStyle="solid"
                                options={[
                                    { label: "Ghi đè", value: "overwrite" },
                                    { label: "Bỏ qua", value: "skip" },
                                ]}
                            />
                        </div>
                    </div>
                </Flex>

                <Upload.Dragger
                    accept=".xlsx,.csv"
                    maxCount={1}
                    fileList={fileList}
                    beforeUpload={() => false}
                    onChange={({ fileList: nextFileList }) => setFileList(nextFileList.slice(-1))}
                    onRemove={() => setFileList([])}
                    style={{ paddingBlock: 4 }}
                >
                    <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                    <p className="ant-upload-text">Kéo file vào đây hoặc bấm để chọn file</p>
                    <p className="ant-upload-hint">Hỗ trợ định dạng .xlsx và .csv</p>
                </Upload.Dragger>

                {errors.length > 0 && (
                    <section style={{ marginTop: 16 }}>
                        <Alert
                            type="error"
                            showIcon
                            message={`Có ${errors.length} lỗi cần xử lý`}
                            description="Sửa các dòng bên dưới trong file rồi thực hiện import lại."
                            style={{ marginBottom: 12 }}
                        />
                        <Table<LessonImportError>
                            size="small"
                            rowKey={(record, index) => `${record.row}-${record.field}-${index}`}
                            pagination={false}
                            dataSource={errors}
                            tableLayout="fixed"
                            scroll={{ x: 720, y: 260 }}
                            columns={[
                                {
                                    title: "Dòng",
                                    dataIndex: "row",
                                    width: 72,
                                    fixed: "left",
                                },
                                {
                                    title: "Trường",
                                    dataIndex: "field",
                                    width: 140,
                                    render: (value) => value || "-",
                                },
                                {
                                    title: "Nội dung lỗi",
                                    dataIndex: "message",
                                    width: 500,
                                    render: (value: string) => (
                                        <Typography.Paragraph
                                            style={{
                                                margin: 0,
                                                whiteSpace: "normal",
                                                overflowWrap: "anywhere",
                                            }}
                                        >
                                            {value}
                                        </Typography.Paragraph>
                                    ),
                                },
                            ]}
                        />
                    </section>
                )}
            </div>
        </Modal>
    );
};

export default LessonImportModal;
