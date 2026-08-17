"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Input, Modal, Radio } from "antd";
import { FileExcelOutlined, FileTextOutlined, LinkOutlined } from "@ant-design/icons";
import ImportFileDragger from "@/components/shared/ImportFileDragger";

const PROGRAM_IMPORT_SAMPLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/1wzZ65B67FIljP8ZRbQXCxCdKV-W5oUXvz6_bx4Nhwa4/edit?gid=0#gid=0";

type Props = {
    open: boolean; loading: boolean; onClose: () => void;
    onSubmit: (file: File | undefined, sheetUrl?: string) => Promise<void>;
    onDownloadTemplate: (format: "csv" | "xlsx") => Promise<void>;
    errors: Array<{ row: number; field?: string; message: string }>;
};

export default function ProgramImportModal({ open, loading, onClose, onSubmit, onDownloadTemplate, errors }: Props) {
    const [file, setFile] = useState<File>();
    const [sheetUrl, setSheetUrl] = useState("");
    const [importSource, setImportSource] = useState<"file" | "sheet">("file");
    useEffect(() => {
        if (open) {
            setFile(undefined);
            setSheetUrl("");
            setImportSource("file");
        }
    }, [open]);
    return <Modal open={open} title="Import chương trình" onCancel={onClose} destroyOnClose
        footer={<><Button onClick={onClose}>Hủy</Button><Button type="primary" loading={loading}
            disabled={importSource === "file" ? !file : !sheetUrl.trim()}
            onClick={() => onSubmit(
                importSource === "file" ? file : undefined,
                importSource === "sheet" ? sheetUrl.trim() : undefined,
            )}>Import chương trình</Button></>}>
        <Alert showIcon type="info" style={{ marginBottom: 16 }} message="Toàn bộ thông tin nằm trong file"
            description="File mẫu gồm Hệ thống, Khối, Môn học, Mã chương trình, Số thứ tự bài, Tên bài học và Trạng thái. Một file có thể chứa nhiều chương trình, tối đa 500 dòng/lần." />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            <Button icon={<FileTextOutlined />} onClick={() => onDownloadTemplate("csv")}>Tải file mẫu CSV</Button>
            <Button icon={<FileExcelOutlined />} onClick={() => onDownloadTemplate("xlsx")}>Tải file mẫu Excel</Button>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 16, padding: "8px 12px", border: "1px solid #d9d9d9", borderRadius: 8, background: "#fafafa" }}>
            <span>Tham khảo cấu trúc dữ liệu trên Google Sheet mẫu</span>
            <Button type="link" icon={<LinkOutlined />} href={PROGRAM_IMPORT_SAMPLE_SHEET_URL} target="_blank" rel="noopener noreferrer" style={{ paddingInline: 0 }}>
                Mở Google Sheet mẫu
            </Button>
        </div>
        <div style={{ marginBottom: 12 }}>
            <strong style={{ display: "block", marginBottom: 6 }}>Nguồn import</strong>
            <Radio.Group value={importSource} onChange={(event) => setImportSource(event.target.value)}>
                <span style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
                    <Radio value="file">Dùng file CSV/Excel</Radio>
                    <Radio value="sheet">Dùng link Google Sheets</Radio>
                </span>
            </Radio.Group>
        </div>
        {importSource === "file" ? (
            <ImportFileDragger
                file={file}
                onFileChange={(next) => setFile(next || undefined)}
                maxSizeMb={10}
                maxRows={500}
                requiredHeaders={[
                    ["system_type", "Hệ thống"],
                    ["grade", "Khối"],
                    ["subject_name", "Môn học"],
                    ["subject_code", "Mã chương trình"],
                    ["learn_number", "Số thứ tự bài"],
                    ["lesson_name", "Tên bài học"],
                    ["status", "Trạng thái"],
                ]}
                prompt="Kéo file vào đây hoặc bấm để chọn file chương trình"
            />
        ) : (
            <>
                <Input value={sheetUrl} onChange={(event) => setSheetUrl(event.target.value)} placeholder="Dán link Google Sheets công khai" />
                <div style={{ marginTop: 8, fontSize: 12, color: "#8c8c8c" }}>Sheet phải bật quyền “Anyone with the link can view”. Nếu có nhiều tab, dùng link của đúng tab cần import.</div>
            </>
        )}
        {errors.length > 0 && <Alert type="error" showIcon style={{ marginTop: 16 }} message={`Có ${errors.length} lỗi cần sửa`} description={<ul style={{ margin: 8, paddingLeft: 18 }}>{errors.slice(0, 10).map((error, index) => <li key={`${error.row}-${index}`}>Dòng {error.row}: {error.field ? `${error.field} — ` : ""}{error.message}</li>)}{errors.length > 10 && <li>… và {errors.length - 10} lỗi khác.</li>}</ul>} />}
    </Modal>;
}
