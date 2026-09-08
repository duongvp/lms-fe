"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Button, Checkbox, Modal, Progress, Spin, Table, Tag } from "antd";
import { FileTextOutlined } from "@ant-design/icons";
import { applyScormNameSync, getScormNameSyncSheets, getScormNameSyncStatus, previewScormNameSync, type ScormNameSyncPreviewResult } from "@/services/lessonService";

const HMO_MAX_RECORDS_PER_REQUEST = 500;

export default function ScormNameSyncModal({ open, onClose, onSuccess, onError }: { open: boolean; onClose: () => void; onSuccess: (message: string) => void; onError: (message: string) => void }) {
    const [sheets, setSheets] = useState<string[]>([]); const [selected, setSelected] = useState<string[]>([]);
    const [preview, setPreview] = useState<ScormNameSyncPreviewResult | null>(null);
    const [sheetsLoading, setSheetsLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [progress, setProgress] = useState<{ updated: number; total: number } | null>(null);
    const batchCount = preview ? Math.ceil(preview.updates.length / HMO_MAX_RECORDS_PER_REQUEST) : 0;
    const requestVersion = useRef(0);
    const handleClose = () => { requestVersion.current += 1; setActionLoading(false); setSheetsLoading(false); setProgress(null); onClose(); };
    useEffect(() => { if (!open) return; const version = ++requestVersion.current; setPreview(null); setProgress(null); setSheetsLoading(true); getScormNameSyncSheets().then((r: any) => { if (version !== requestVersion.current) return; const names = (r?.data || []).map((x: any) => x.title); setSheets(names); setSelected(names); }).catch((e) => { if (version === requestVersion.current) onError(e.message || "Không thể tải danh sách trang tính"); }).finally(() => { if (version === requestVersion.current) setSheetsLoading(false); }); }, [open, onError]);
    const createPreview = async () => { const version = requestVersion.current; setActionLoading(true); try { const r: any = await previewScormNameSync(selected); if (version === requestVersion.current) setPreview(r.data); } catch (e: any) { if (version === requestVersion.current) onError(e.message || "Không thể xem trước dữ liệu"); } finally { if (version === requestVersion.current) setActionLoading(false); } };
    const apply = async () => { const version = requestVersion.current; setActionLoading(true); setProgress({ updated: 0, total: preview?.updates.length || 0 }); try { const started: any = await applyScormNameSync(selected); const jobId = String(started?.data?.id || ""); if (!jobId) throw new Error("Backend không trả tiến trình đồng bộ");
        while (version === requestVersion.current) { await new Promise((resolve) => setTimeout(resolve, 800)); const response: any = await getScormNameSyncStatus(jobId); if (version !== requestVersion.current) return; const job = response?.data; setProgress({ updated: Number(job?.updated || 0), total: Number(job?.total || 0) }); if (job?.status === "completed") { onSuccess(`Đã cập nhật ${job.updated} bài giảng.`); handleClose(); return; } if (job?.status === "failed") throw new Error(job?.error || "Đồng bộ thất bại"); }
    } catch (e: any) { if (version === requestVersion.current) onError(e.message || "Đồng bộ thất bại"); } finally { if (version === requestVersion.current) setActionLoading(false); } };
    return <Modal open={open} onCancel={handleClose} width={1100} title="Đồng bộ tên bài giảng từ Google Sheets" okText={sheetsLoading ? "Đang tải danh sách…" : preview ? `Cập nhật ${preview.updates.length} bài giảng${batchCount > 1 ? ` · ${batchCount} lượt gửi` : ""}` : "Xem trước"} okButtonProps={{ disabled: !selected.length || sheetsLoading || actionLoading, loading: sheetsLoading || actionLoading }} onOk={() => void (preview ? apply() : createPreview())}>
        {sheetsLoading && !sheets.length ? <Spin /> : <>
            {!preview && <div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", marginBottom: 18 }}>
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "#1f1f1f", marginBottom: 4 }}>Chọn chương trình cần đồng bộ</div>
                        <div style={{ color: "#667085", lineHeight: 1.5 }}>Danh sách tự lấy từ Google Sheets. Tab <b>GV</b> và các tab không có đủ dữ liệu bài giảng đã được loại trừ.</div>
                    </div>
                    <Tag color="blue" style={{ margin: 0, whiteSpace: "nowrap", padding: "3px 9px", borderRadius: 12 }}>{selected.length}/{sheets.length} đã chọn</Tag>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#f7faff", border: "1px solid #d6e4ff", borderRadius: 8, marginBottom: 12 }}>
                    <Checkbox checked={selected.length === sheets.length} indeterminate={selected.length > 0 && selected.length < sheets.length} onChange={(e) => setSelected(e.target.checked ? sheets : [])}><b>Chọn tất cả</b></Checkbox>
                    <Button type="link" size="small" onClick={() => setSelected([])}>Bỏ chọn tất cả</Button>
                </div>
                <Checkbox.Group value={selected} onChange={(values) => setSelected(values as string[])} style={{ display: "block" }}>
                    <div style={{ maxHeight: 420, overflowY: "auto", padding: "2px 4px 2px 2px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 10 }}>
                            {sheets.map((sheet) => {
                                const checked = selected.includes(sheet);
                                return <label key={sheet} style={{ cursor: "pointer", minHeight: 56, display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: `1px solid ${checked ? "#91caff" : "#e5e7eb"}`, background: checked ? "#f0f7ff" : "#fff", transition: "all .15s" }}>
                                    <Checkbox value={sheet} />
                                    <FileTextOutlined style={{ color: checked ? "#1677ff" : "#98a2b3" }} />
                                    <span style={{ flex: 1, fontWeight: checked ? 600 : 500, color: "#344054" }}>{sheet}</span>
                                </label>;
                            })}
                        </div>
                    </div>
                </Checkbox.Group>
            </div>}
            {preview && <><Alert type="info" showIcon message={`Đã đọc ${preview.rowsRead} dòng; ${preview.updates.length} bài cần cập nhật; ${preview.skippedLessons} mục bỏ qua.`} style={{ marginBottom: 12 }} />
                {batchCount > 1 && <Alert type="warning" showIcon message={`HMO chỉ nhận tối đa ${HMO_MAX_RECORDS_PER_REQUEST} bài/lượt gửi`} description={`${preview.updates.length} bài sẽ được tách thành ${batchCount} lượt gửi tuần tự. Tiến trình bên dưới sẽ theo dõi từng lượt.`} style={{ marginBottom: 12 }} />}
                {progress && <Progress percent={progress.total ? Math.round(progress.updated * 100 / progress.total) : 0} status={actionLoading ? "active" : "normal"} format={() => `${progress.updated}/${progress.total} bài giảng`} style={{ marginBottom: 12 }} />}
                {!!preview.warnings.length && <Alert type="warning" showIcon message={`${preview.warnings.length} cảnh báo`} description={preview.warnings.slice(0, 5).map((w) => w.message).join("; ")} style={{ marginBottom: 12 }} />}
                <Table virtual size="small" rowKey={(r) => `${r.sheetName}-${r.rowNumber}-${r.courseId}-${r.lessonId}`} pagination={false} scroll={{ x: 950, y: 520 }} dataSource={preview.updates} columns={[
                    { title: "Sheet / dòng", width: 145, render: (_, r) => `${r.sheetName} / ${r.rowNumber}` },
                    { title: "Course / Lesson", width: 165, render: (_, r) => `${r.courseId} / ${r.lessonId}` },
                    { title: "GV", width: 170, dataIndex: "teacherName" },
                    {
                        title: "Tên bài giảng", width: 470,
                        render: (_, r) => <div style={{ lineHeight: 1.5, padding: "2px 0" }}>
                            <div style={{ color: "#98a2b3", textDecoration: "line-through", marginBottom: 3 }}>{r.oldName}</div>
                            <div style={{ color: "#1677ff", fontWeight: 600 }}>{r.newName}</div>
                        </div>,
                    },
                ]} />
            </>}
        </>}
    </Modal>;
}
