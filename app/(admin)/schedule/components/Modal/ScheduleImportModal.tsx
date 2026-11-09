"use client";

import Table from "@/components/ui/ModalTable";
import { useEffect, useRef, useState } from "react";
import {
    Alert,
    Button,
    Flex,
    Modal,
    Input,
    Radio,
    Space,
    Typography,
} from "antd";
import {
    FileExcelOutlined,
    FileTextOutlined,
    LinkOutlined,
    UploadOutlined,
} from "@ant-design/icons";
import { presentScheduleImportError, type ScheduleImportError } from "@/helper/scheduleImportErrors";
export type { ScheduleImportError } from "@/helper/scheduleImportErrors";
import ImportFileDragger from "@/components/shared/ImportFileDragger";

const SCHEDULE_IMPORT_SAMPLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/1R2awLXyXD41_mKEi2zz8M7kunL2pqEAEw8dl-QmEx9A/edit?usp=sharing#gid=20261109";

interface ScheduleImportModalProps {
    open: boolean;
    loading: boolean;
    errors: ScheduleImportError[];
    mode: "create" | "update";
    allowCreateImport: boolean;
    allowUpdateImport: boolean;
    onClose: () => void;
    onClearErrors: () => void;
    onSubmit: (
        file: File | undefined,
        sheetUrl?: string,
        existingDataMode?: "skip" | "overwrite"
    ) => Promise<void>;
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
    onClearErrors,
    onSubmit,
    onModeChange,
    onDownloadTemplate,
}: ScheduleImportModalProps) => {
    const [selectedFile, setSelectedFile] = useState<File>();
    const [sheetUrl, setSheetUrl] = useState("");
    const [importSource, setImportSource] = useState<"file" | "sheet">("file");
    const [existingDataMode, setExistingDataMode] = useState<"skip" | "overwrite">("skip");

    const errorSectionRef = useRef<HTMLElement>(null);
    useEffect(() => {
        if (!open || !errors.length) return;
        const frame = requestAnimationFrame(() => errorSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
        return () => cancelAnimationFrame(frame);
    }, [open, errors]);

    useEffect(() => {
        if (open) {
            setSelectedFile(undefined);
            setSheetUrl("");
            setImportSource("file");
            setExistingDataMode("skip");
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
                                existingDataMode,
                            )}
                        >
                            {mode === 'update' ? 'Cập nhật lịch' : 'Import tạo lịch'}
                        </Button>
                    </Space>
                </Flex>
            }
        >
            <Flex justify="space-between" align="center" wrap gap={8} style={{ marginBottom: 12 }}>
                <Radio.Group
                    value={mode}
                    onChange={(event) => onModeChange(event.target.value)}
                    optionType="button"
                    buttonStyle="solid"
                >
                    {allowUpdateImport && <Radio.Button value="update">Cập nhật lịch</Radio.Button>}
                    {allowCreateImport && <Radio.Button value="create">Tạo lịch mới</Radio.Button>}
                </Radio.Group>
                <Button
                    type="link"
                    icon={<LinkOutlined />}
                    href={SCHEDULE_IMPORT_SAMPLE_SHEET_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ paddingInline: 0 }}
                >
                    Google Sheet mẫu
                </Button>
            </Flex>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
                {mode === "update"
                    ? "Dùng file đã export, sửa thông tin cần cập nhật rồi tải lên."
                    : "Dùng file mẫu hoặc Google Sheet mẫu, mỗi dòng tương ứng một lịch học."}
            </Typography.Paragraph>

            <Radio.Group
                value={importSource}
                onChange={(event) => { setImportSource(event.target.value); onClearErrors(); }}
                style={{ marginBottom: 12 }}
            >
                <Space wrap size={20}>
                    <Radio value="file">File CSV/Excel</Radio>
                    <Radio value="sheet">Link Google Sheets</Radio>
                </Space>
            </Radio.Group>

            {importSource === "file" ? (
                <ImportFileDragger
                    file={selectedFile}
                    onFileChange={(file) => { setSelectedFile(file || undefined); onClearErrors(); }}
                    maxSizeMb={10}
                    maxRows={300}
                    requiredHeaders={[
                        ["Ngày live", "start_time"],
                        ["Khung giờ", "end_time"],
                        ["Bài", "Số thứ tự bài", "learn_number"],
                        ["lesson_name", "Tên bài giảng"],
                        ...(mode === "update" ? [["Mã định danh lịch", "c_key", "key"], ["Lần học", "lesson_count"]] : []),
                    ]}
                    hint="CSV hoặc Excel · Tối đa 10 MB / 300 lịch"
                />
            ) : (
                <div>
                    <Input
                        value={sheetUrl}
                        onChange={(event) => { setSheetUrl(event.target.value); onClearErrors(); }}
                        placeholder="Dán link Google Sheets"
                        aria-label="Link Google Sheets"
                    />
                    <Typography.Text type="secondary" style={{ display: "block", marginTop: 6 }}>
                        Bật quyền xem bằng link · Tối đa 300 lịch
                    </Typography.Text>
                </div>
            )}

            {mode === "update" && (
                <div style={{ marginTop: 16 }}>
                    <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
                        Dữ liệu đã có
                    </Typography.Text>
                    <Radio.Group
                        value={existingDataMode}
                        onChange={(event) => setExistingDataMode(event.target.value)}
                    >
                        <Space wrap size={16}>
                            <Radio value="skip">Chỉ bổ sung ô trống</Radio>
                            <Radio value="overwrite">Ghi đè theo file</Radio>
                        </Space>
                    </Radio.Group>
                    <Typography.Text type="secondary" style={{ display: "block", marginTop: 6 }}>
                        Chọn ghi đè để đổi thời gian. Ô trống trong file giữ nguyên dữ liệu cũ.
                    </Typography.Text>
                </div>
            )}

            <Alert
                type="info"
                showIcon
                message={mode === "update" ? "Lưu ý khi cập nhật lịch" : "Lưu ý khi tạo lịch mới"}
                description={
                    <ul style={{ margin: 0, paddingInlineStart: 18, fontSize: 13, lineHeight: 1.6 }}>
                        {mode === "update" ? (
                            <li>Giữ nguyên mã định danh lịch, mã chương trình, môn, hệ thống, bài và lần học.</li>
                        ) : (
                            <li>Nhập Bài theo chương trình để tạo lịch mới; để trống mã định danh lịch.</li>
                        )}
                        <li>
                            Nhập tiền tố/hậu tố ở hai cột riêng. Giáo viên và trợ giảng phải đang hoạt động trên hệ thống.
                        </li>
                        <li>
                            ID khóa học, bài giảng và gói học được đối chiếu trước khi lưu; để trống cả ba để giữ nguyên mapping.
                        </li>
                        <li>
                            Nếu có lỗi, hệ thống báo theo dòng và chưa lưu bất kỳ lịch nào.
                        </li>
                    </ul>
                }
                style={{ marginTop: 16 }}
            />

            {errors.length > 0 && (
                <section ref={errorSectionRef} style={{ marginTop: 16 }} aria-label="Lỗi import lịch học" aria-live="polite">
                    <Alert
                        type="error"
                        showIcon
                        message={`Chưa lưu dữ liệu · ${errors.length} lỗi${errors.some(error => error.row > 1) ? ` tại ${new Set(errors.filter(error => error.row > 1).map(error => error.row)).size} dòng` : ""}`}
                        description="Chưa có lịch nào được tạo hoặc cập nhật. Sửa theo hướng dẫn bên dưới rồi thử lại."
                        style={{ marginBottom: 12 }}
                    />
                    <Table<ScheduleImportError>
                        size="small"
                        tableLayout="fixed"
                        rowKey={(record, index) => `${record.row}-${record.field}-${index}`}
                        pagination={false}
                        dataSource={errors}
                        scroll={{ y: 320 }}
                        columns={[
                            {
                                title: "Dòng", width: 72,
                                render: (_, record) => presentScheduleImportError(record).rowLabel,
                                onCell: () => ({ style: { verticalAlign: "top" } }),
                            },
                            {
                                title: "Nguyên nhân và cách sửa",
                                onCell: () => ({ style: { whiteSpace: "normal", overflowWrap: "anywhere", verticalAlign: "top" } }),
                                render: (_, record) => {
                                    const error = presentScheduleImportError(record);
                                    return (
                                        <div style={{ whiteSpace: "normal", overflowWrap: "anywhere" }}>
                                            <Typography.Text strong>{error.field}</Typography.Text>
                                            <div>{error.message}</div>
                                            {error.context && <Typography.Text type="secondary" style={{ display: "block", fontSize: 12 }}>{error.context}</Typography.Text>}
                                            {error.originalTime && <Typography.Text type="secondary" style={{ display: "block", fontSize: 12 }}>Lịch gốc bắt đầu: {error.originalTime}</Typography.Text>}
                                            {record.currentValue !== undefined && <div style={{ fontSize: 12 }}>Giá trị gốc: <Typography.Text strong>{record.currentValue || "(ô trống)"}</Typography.Text></div>}
                                            {record.importedValue !== undefined && <div style={{ fontSize: 12 }}>Trong file: <Typography.Text>{record.importedValue || "(ô trống)"}</Typography.Text></div>}
                                            {error.ids && <Typography.Text type="secondary" style={{ display: "block", fontSize: 12 }}>{error.ids}</Typography.Text>}
                                            <div style={{ marginTop: 4 }}><Typography.Text strong>Cách sửa: </Typography.Text>{error.suggestion}</div>
                                        </div>
                                    );
                                },
                            },
                        ]}
                    />
                </section>
            )}
        </Modal>
    );
};

export default ScheduleImportModal;
