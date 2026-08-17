"use client";

import { Alert, Button, Divider, Modal, Radio, Space, Typography } from "antd";
import { CloudDownloadOutlined } from "@ant-design/icons";
import type { UploadFile } from "antd/es/upload/interface";
import ImportFileDragger from "@/components/shared/ImportFileDragger";

const { Paragraph, Text } = Typography;

interface QuizImportModalProps {
    open: boolean;
    importing: boolean;
    mode: "skip" | "overwrite";
    files: UploadFile[];
    onModeChange: (mode: "skip" | "overwrite") => void;
    onFilesChange: (files: UploadFile[]) => void;
    onDownloadTemplate: () => void;
    onImport: () => void;
    onClose: () => void;
}

const QuizImportModal = ({
    open,
    importing,
    mode,
    files,
    onModeChange,
    onFilesChange,
    onDownloadTemplate,
    onImport,
    onClose,
}: QuizImportModalProps) => (
    <Modal
        title="Nhập câu hỏi từ Excel"
        open={open}
        onCancel={onClose}
        onOk={onImport}
        confirmLoading={importing}
        okText="Kiểm tra và nhập dữ liệu"
        okButtonProps={{ disabled: files.length === 0 }}
        cancelText="Hủy"
        width={660}
    >
        <Space direction="vertical" style={{ width: "100%", marginTop: 12 }} size={14}>
            <Alert
                showIcon
                type="info"
                message="Cách nhập nhanh nhất"
                description={(
                    <ol style={{ margin: "6px 0 0", paddingLeft: 20 }}>
                        <li>Tải file mẫu và mở sheet <b>Hướng dẫn</b>.</li>
                        <li>Nhập mỗi câu hỏi trên một dòng trong sheet <b>Nhập câu hỏi</b>.</li>
                        <li>Lưu file, kéo thả vào khu vực bên dưới rồi chọn <b>Kiểm tra và nhập dữ liệu</b>.</li>
                    </ol>
                )}
            />
            <Button type="primary" ghost icon={<CloudDownloadOutlined />} onClick={onDownloadTemplate}>
                Bước 1: Tải file Excel mẫu có ví dụ
            </Button>
            <Paragraph type="secondary" style={{ margin: 0 }}>
                File mẫu có sẵn ví dụ cho Trắc nghiệm, Điền từ và Trả lời ngắn. Bạn chỉ cần nhập các cột thông thường,
                không cần viết mã JSON.
            </Paragraph>

            <Divider style={{ margin: "2px 0" }} />
            <div>
                <Text strong>Khi file có Mã quiz đã tồn tại:</Text>
                <Radio.Group
                    value={mode}
                    onChange={(event) => onModeChange(event.target.value)}
                    style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}
                >
                    <Radio value="skip">
                        <Text strong>An toàn – bỏ qua câu đã tồn tại</Text>
                        <br />
                        <Text type="secondary">Khuyên dùng khi nhập câu hỏi mới; dữ liệu cũ không bị thay đổi.</Text>
                    </Radio>
                    <Radio value="overwrite">
                        <Text strong>Cập nhật – ghi đè câu đã tồn tại</Text>
                        <br />
                        <Text type="secondary">Chỉ dùng khi bạn xuất dữ liệu cũ, sửa file và muốn cập nhật theo đúng Mã quiz.</Text>
                    </Radio>
                </Radio.Group>
            </div>

            <ImportFileDragger
                file={files[0]?.originFileObj || null}
                onFileChange={(file) => onFilesChange(file ? [{
                    uid: `quiz-import-${file.name}-${file.lastModified}`,
                    name: file.name,
                    status: "done",
                    originFileObj: file as any,
                }] : [])}
                maxSizeMb={5}
                maxRows={5000}
                requiredHeaders={[
                    ["learn_number", "Bài học"],
                    ["quiz_name", "Câu hỏi"],
                    ["quiz_type", "Loại câu hỏi"],
                ]}
                sheetNames={["Nhập câu hỏi"]}
                prompt="Bước 2: Kéo file vào đây hoặc bấm để chọn"
                hint="Chấp nhận .xlsx hoặc .csv, tối đa 5 MB và 5.000 dòng"
            />

            <Alert
                type="warning"
                showIcon
                message="Lưu ý trước khi nhập"
                description="Chương trình được xác định từ bộ lọc hiện tại, không cần cột Mã chương trình trong file. Thứ tự nên là duy nhất trong cùng Chương trình và bài học. Hệ thống kiểm tra toàn bộ file trước; nếu có một dòng lỗi thì chưa dòng nào được lưu."
            />
        </Space>
    </Modal>
);

export default QuizImportModal;
