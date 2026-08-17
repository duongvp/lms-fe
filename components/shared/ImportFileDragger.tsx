"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Typography, Upload } from "antd";
import { CheckCircleOutlined, DeleteOutlined, InboxOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";

export type ImportHeaderRequirement = string | string[];

type Props = {
    file?: File | null;
    onFileChange: (file: File | null) => void;
    requiredHeaders: ImportHeaderRequirement[];
    maxRows: number;
    maxSizeMb: number;
    prompt?: string;
    hint?: string;
    sheetNames?: string[];
    disabled?: boolean;
};

const normalizeHeader = (value: unknown) => String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

const formatSize = (bytes: number) => (
    bytes >= 1024 * 1024
        ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.max(1, Math.round(bytes / 1024))} KB`
);

const ImportFileDragger = ({
    file,
    onFileChange,
    requiredHeaders,
    maxRows,
    maxSizeMb,
    prompt = "Kéo file vào đây hoặc bấm để chọn file",
    hint,
    sheetNames,
    disabled = false,
}: Props) => {
    const [error, setError] = useState("");
    const [rowCount, setRowCount] = useState<number>();
    const [checking, setChecking] = useState(false);

    useEffect(() => {
        if (!file) setRowCount(undefined);
    }, [file]);

    const validateFile = async (nextFile: File) => {
        setError("");
        setChecking(true);
        try {
            const extension = nextFile.name.split(".").pop()?.toLowerCase();
            if (extension !== "xlsx" && extension !== "csv") {
                throw new Error("Chỉ hỗ trợ file .xlsx hoặc .csv");
            }
            if (nextFile.size > maxSizeMb * 1024 * 1024) {
                throw new Error(`File vượt quá dung lượng tối đa ${maxSizeMb} MB`);
            }

            const workbook = XLSX.read(await nextFile.arrayBuffer(), {
                type: "array",
                raw: false,
            });
            const preferredSheet = sheetNames?.find((name) => workbook.Sheets[name]);
            const sheetName = preferredSheet || workbook.SheetNames[0];
            const worksheet = sheetName ? workbook.Sheets[sheetName] : undefined;
            if (!worksheet) throw new Error("File không có sheet dữ liệu");

            const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
                header: 1,
                defval: "",
                blankrows: false,
                raw: false,
            });
            const normalizedRequirements = requiredHeaders.map((requirement) => (
                (Array.isArray(requirement) ? requirement : [requirement]).map(normalizeHeader)
            ));
            const headerIndex = matrix.slice(0, 50).findIndex((row) => {
                const headers = new Set(row.map(normalizeHeader).filter(Boolean));
                return normalizedRequirements.every((aliases) => aliases.some((alias) => headers.has(alias)));
            });
            if (headerIndex < 0) {
                const expected = requiredHeaders.map((requirement) => (
                    Array.isArray(requirement) ? requirement[0] : requirement
                )).join(", ");
                throw new Error(`File không đúng mẫu hoặc thiếu cột bắt buộc: ${expected}`);
            }

            const dataRows = matrix.slice(headerIndex + 1).filter((row) => (
                row.some((cell) => String(cell ?? "").trim() !== "")
            ));
            if (!dataRows.length) throw new Error("File không có dữ liệu để import");
            if (dataRows.length > maxRows) {
                throw new Error(`File có ${dataRows.length} dòng, vượt giới hạn ${maxRows} dòng/lần`);
            }

            setRowCount(dataRows.length);
            onFileChange(nextFile);
        } catch (validationError: any) {
            onFileChange(null);
            setRowCount(undefined);
            setError(validationError?.message || "Không thể đọc file import");
        } finally {
            setChecking(false);
        }
    };

    return (
        <div>
            <Upload.Dragger
                accept=".xlsx,.csv"
                maxCount={1}
                multiple={false}
                showUploadList={false}
                fileList={[]}
                disabled={disabled || checking}
                beforeUpload={(nextFile) => {
                    void validateFile(nextFile);
                    return false;
                }}
            >
                <p className="ant-upload-drag-icon">
                    {file ? <CheckCircleOutlined style={{ color: "#52c41a" }} /> : <InboxOutlined />}
                </p>
                <p className="ant-upload-text" style={{ overflowWrap: "anywhere" }}>
                    {checking ? "Đang kiểm tra file..." : file ? file.name : prompt}
                </p>
                <p className="ant-upload-hint">
                    {file
                        ? `File hợp lệ • ${rowCount ?? 0} dòng • ${formatSize(file.size)}. Bấm hoặc kéo file khác để thay thế.`
                        : hint || `Hỗ trợ .xlsx, .csv; tối đa ${maxSizeMb} MB/${maxRows.toLocaleString("vi-VN")} dòng`}
                </p>
                {file && (
                    <Button
                        type="link"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={(event) => {
                            event.stopPropagation();
                            setError("");
                            setRowCount(undefined);
                            onFileChange(null);
                        }}
                    >
                        Bỏ chọn file
                    </Button>
                )}
            </Upload.Dragger>
            {error && (
                <Alert
                    type="error"
                    showIcon
                    message="File không hợp lệ"
                    description={<Typography.Text>{error}</Typography.Text>}
                    style={{ marginTop: 8 }}
                />
            )}
        </div>
    );
};

export default ImportFileDragger;
