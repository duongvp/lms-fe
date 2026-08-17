"use client";

import { useEffect, useState } from "react";
import {
    Alert,
    Button,
    Flex,
    Modal,
    Input,
    Radio,
    Space,
    Table,
    Typography,
} from "antd";
import {
    FileExcelOutlined,
    FileTextOutlined,
    LinkOutlined,
    UploadOutlined,
} from "@ant-design/icons";
import ImportFileDragger from "@/components/shared/ImportFileDragger";

const SCHEDULE_IMPORT_SAMPLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/1R2awLXyXD41_mKEi2zz8M7kunL2pqEAEw8dl-QmEx9A/edit?usp=sharing";

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
    mode: "create" | "update";
    allowCreateImport: boolean;
    allowUpdateImport: boolean;
    onClose: () => void;
    onSubmit: (file: File | undefined, sheetUrl?: string) => Promise<void>;
    onModeChange: (mode: "create" | "update") => void;
    onDownloadTemplate: (format: "csv" | "xlsx") => Promise<void>;
}

const ScheduleImportModal = ({
    open,
    loading,
    errors,
    mode,
    allowCreateImport,
    allowUpdateImport,
    onClose,
    onSubmit,
    onModeChange,
    onDownloadTemplate,
}: ScheduleImportModalProps) => {
    const [selectedFile, setSelectedFile] = useState<File>();
    const [sheetUrl, setSheetUrl] = useState("");
    const [importSource, setImportSource] = useState<"file" | "sheet">("file");

    useEffect(() => {
        if (open) {
            setSelectedFile(undefined);
            setSheetUrl("");
            setImportSource("file");
        }
    }, [open]);

    useEffect(() => {
        setSelectedFile(undefined);
    }, [mode]);

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
                            disabled={importSource === "file" ? !selectedFile : !sheetUrl.trim()}
                            onClick={() => onSubmit(
                                importSource === "file" ? selectedFile : undefined,
                                importSource === "sheet" ? sheetUrl.trim() : undefined,
                            )}
                        >
                            {mode === 'update' ? 'Cập nhật lịch' : 'Import tạo lịch'}
                        </Button>
                    </Space>
                </Flex>
            }
        >
            <Flex
                align="center"
                justify="space-between"
                wrap
                gap={8}
                style={{
                    marginBottom: 12,
                    padding: "8px 12px",
                    border: "1px solid #d9d9d9",
                    borderRadius: 8,
                    background: "#fafafa",
                }}
            >
                <Typography.Text>Tham khảo cấu trúc dữ liệu trên Google Sheet mẫu</Typography.Text>
                <Button
                    type="link"
                    icon={<LinkOutlined />}
                    href={SCHEDULE_IMPORT_SAMPLE_SHEET_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ paddingInline: 0 }}
                >
                    Mở Google Sheet mẫu
                </Button>
            </Flex>
            <Alert
                type="info"
                showIcon
                message={mode === 'update' ? "Cập nhật lịch học hàng loạt" : "Tạo lịch học hàng loạt"}
                description={
                    mode === 'update' ? (
                    <div>
                        <Typography.Paragraph style={{ marginBottom: 8 }}>
                            Dùng cùng file mẫu với tạo mới. Cột <Typography.Text code>key</Typography.Text> là bắt buộc
                            và được dùng để tìm chính xác lịch cần cập nhật.
                        </Typography.Paragraph>
                        <Typography.Paragraph style={{ marginBottom: 8 }}>
                            Không được thay đổi <Typography.Text code>code</Typography.Text>,{" "}
                            <Typography.Text code>learn_number</Typography.Text> hoặc{" "}
                            <Typography.Text code>system_type</Typography.Text> và{" "}
                            <Typography.Text code>lesson_count</Typography.Text>. Lịch đã diễn ra hoặc đã nghỉ sẽ không được cập nhật.
                        </Typography.Paragraph>
                        <Typography.Paragraph style={{ marginBottom: 0 }}>
                            Hệ thống kiểm tra toàn bộ dữ liệu trước khi cập nhật. Nếu có một dòng không hợp lệ,
                            không lịch nào trong file bị thay đổi.
                        </Typography.Paragraph>
                    </div>
                    ) : (
                    <div>
                        <Typography.Paragraph style={{ marginBottom: 8 }}>
                            File CSV, Excel và Google Sheets dùng cùng một cấu trúc; mỗi dòng tương ứng một lịch học.
                        </Typography.Paragraph>
                        <Typography.Paragraph style={{ marginBottom: 8 }}>
                            Hệ thống tìm bài học trong chương trình bằng <Typography.Text code>code</Typography.Text> và{" "}
                            <Typography.Text code>learn_number</Typography.Text>. Package ID và Course ID đã được thiết lập
                            trong phần quản lý đề cương nên không cần nhập lại trong file lịch.
                        </Typography.Paragraph>
                        <Typography.Paragraph style={{ marginBottom: 8 }}>
                            Lesson ID HMO chưa được gán khi import. Sau khi tạo lịch, hãy dùng chức năng{" "}
                            <Typography.Text strong>Đồng bộ Lesson ID HMO</Typography.Text> và chọn đối chiếu theo
                            tên lịch hoặc tên bài học.
                        </Typography.Paragraph>
                        <Typography.Paragraph style={{ marginBottom: 0 }}>
                            Hệ thống kiểm tra toàn bộ dữ liệu trước khi tạo. Nếu có một dòng không hợp lệ,
                            không lịch nào trong file được thêm vào.
                        </Typography.Paragraph>
                    </div>
                    )
                }
                style={{ marginBottom: 16 }}
            />
            <Radio.Group
                value={mode}
                onChange={(event) => onModeChange(event.target.value)}
                style={{ marginBottom: 16 }}
                optionType="button"
                buttonStyle="solid"
            >
                {allowCreateImport && <Radio.Button value="create">Import tạo lịch</Radio.Button>}
                {allowUpdateImport && <Radio.Button value="update">Cập nhật lịch</Radio.Button>}
            </Radio.Group>

            <div style={{ margin: "6px 0 12px" }}>
                <Radio.Group value={importSource} onChange={(event) => setImportSource(event.target.value)}>
                    <Space wrap size={20}>
                        <Radio value="file">Dùng file CSV/Excel</Radio>
                        <Radio value="sheet">Dùng link Google Sheets</Radio>
                    </Space>
                </Radio.Group>
            </div>

            <ImportFileDragger
                file={selectedFile}
                onFileChange={(file) => setSelectedFile(file || undefined)}
                maxSizeMb={10}
                maxRows={300}
                requiredHeaders={[
                    ["code", "Mã buổi học"],
                    ["subject", "Môn"],
                    "start_time",
                    "end_time",
                    "learn_number",
                    ["lesson_name", "Tên bài giảng"],
                    "system_type",
                    ...(mode === "update" ? ["key"] : []),
                ]}
                hint="Hỗ trợ .xlsx và .csv, cùng format với Google Sheets, tối đa 10 MB/300 lịch"
                disabled={importSource !== "file"}
            />
            <div style={{ margin: "16px 0", textAlign: "center", color: "#8c8c8c" }}>hoặc</div>
            <div style={{ opacity: importSource === "sheet" ? 1 : 0.55 }}>
                <Typography.Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                    Dán link Google Sheets đã bật quyền xem bằng link và có cùng cấu trúc file mẫu.
                </Typography.Text>
                <Input
                    value={sheetUrl}
                    onChange={(event) => setSheetUrl(event.target.value)}
                    placeholder="Dán link Google Sheets công khai"
                    disabled={importSource !== "sheet"}
                />
                <Typography.Text type="secondary" style={{ display: "block", marginTop: 8 }}>
                    Sheet cần bật quyền xem bằng link và có cùng các cột như file mẫu. Hỗ trợ tối đa 300 lịch/lần.
                </Typography.Text>
            </div>

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
                        scroll={{ x: "max-content", y: 240 }}
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
                                title: "Trường / dữ liệu liên quan",
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
