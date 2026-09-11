"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Button, Checkbox, Modal, Progress, Radio, Select, Space, Spin, Table, Tag, Typography } from "antd";
import { FileTextOutlined } from "@ant-design/icons";
import {
    applyScormCourseMappings,
    applyScormNameSync,
    getScormNameSyncSheets,
    getScormNameSyncStatus,
    getLessonPrograms,
    previewScormCourseMappings,
    previewScormNameSync,
    type ScormCourseMappingPreviewResult,
    type ScormNameSyncPreviewResult,
    type LessonProgramOption,
} from "@/services/lessonService";

const HMO_MAX_RECORDS_PER_REQUEST = 500;
type SyncMode = "names" | "course-mappings";

const sheetKey = (value: string) => value.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const programSheetKey = (code: string) => {
    let key = sheetKey(code).replace(/20\d{2}$/, "");
    if (key.startsWith("nguvan")) key = key.replace(/^nguvan/, "van");
    if (key.startsWith("tienganh")) key = key.replace(/^tienganh/, "ta");
    if (key.startsWith("hoahoc")) key = key.replace(/^hoahoc/, "hh");
    if (key.startsWith("vatly")) key = key.replace(/^vatly/, "vl");
    if (key.startsWith("vatli")) key = key.replace(/^vatli/, "vl");
    return key;
};
const programMatchesSheet = (programCode: string, sheet: string) => programSheetKey(programCode) === sheetKey(sheet);

type MappingPreviewGroup = {
    sheetName: string;
    programCode: string;
    preview: ScormCourseMappingPreviewResult;
};

type Props = {
    open: boolean;
    programCode: string;
    onClose: () => void;
    onSuccess: (message: string) => void;
    onError: (message: string) => void;
};

export default function ScormNameSyncModal({ open, programCode, onClose, onSuccess, onError }: Props) {
    const [mode, setMode] = useState<SyncMode>("names");
    const [sheets, setSheets] = useState<string[]>([]);
    const [programs, setPrograms] = useState<LessonProgramOption[]>([]);
    const [programBySheet, setProgramBySheet] = useState<Record<string, string>>({});
    const [selected, setSelected] = useState<string[]>([]);
    const [namePreview, setNamePreview] = useState<ScormNameSyncPreviewResult | null>(null);
    const [mappingPreviews, setMappingPreviews] = useState<MappingPreviewGroup[]>([]);
    const [mappingErrors, setMappingErrors] = useState<string[]>([]);
    const [mappingProgress, setMappingProgress] = useState<{ current: number; total: number; label: string } | null>(null);
    const [sheetsLoading, setSheetsLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [progress, setProgress] = useState<{ updated: number; total: number } | null>(null);
    const requestVersion = useRef(0);
    const batchCount = namePreview ? Math.ceil(namePreview.updates.length / HMO_MAX_RECORDS_PER_REQUEST) : 0;
    const hasPreview = mode === "names" ? Boolean(namePreview) : mappingPreviews.length > 0 || mappingErrors.length > 0;
    const mappingUpdatesNeeded = mappingPreviews.reduce((total, item) => total + item.preview.updatesNeeded, 0);

    const handleClose = () => {
        requestVersion.current += 1;
        setActionLoading(false);
        setSheetsLoading(false);
        setProgress(null);
        setMappingProgress(null);
        onClose();
    };

    useEffect(() => {
        if (!open) return;
        const version = ++requestVersion.current;
        setMode("names"); setNamePreview(null); setMappingPreviews([]); setMappingErrors([]); setProgress(null); setMappingProgress(null); setSheetsLoading(true);
        Promise.all([getScormNameSyncSheets(), getLessonPrograms()]).then(([response, programResponse]: any[]) => {
            if (version !== requestVersion.current) return;
            const names = (response?.data || []).map((item: any) => item.title);
            setSheets(names); setPrograms(Array.isArray(programResponse?.data) ? programResponse.data : []); setSelected([]); setProgramBySheet({});
        }).catch((error) => {
            if (version === requestVersion.current) onError(error.message || "Không thể tải danh sách trang tính");
        }).finally(() => {
            if (version === requestVersion.current) setSheetsLoading(false);
        });
    }, [open, onError]);

    const changeMode = (next: SyncMode) => {
        setMode(next); setNamePreview(null); setMappingPreviews([]); setMappingErrors([]); setProgress(null); setMappingProgress(null); setSelected([]); setProgramBySheet({});
    };
    const selectMappingSheet = (sheet: string, checked: boolean) => {
        setSelected((current) => checked ? [...current, sheet] : current.filter((item) => item !== sheet));
        if (!checked) return;
        const candidates = programs.filter((item) => programMatchesSheet(item.subject_code, sheet));
        // Khi cùng môn/khối có nhiều niên khóa, không tự chọn bừa. Chỉ ưu tiên
        // chương trình đang lọc hoặc tự điền khi thực sự chỉ có một ứng viên.
        const suggested = candidates.find((item) => item.subject_code === programCode)
            || (candidates.length === 1 ? candidates[0] : undefined);
        if (suggested) setProgramBySheet((current) => ({ ...current, [sheet]: current[sheet] || suggested.subject_code }));
    };
    const createPreview = async () => {
        const version = requestVersion.current; setActionLoading(true);
        try {
            if (mode === "names") {
                const response: any = await previewScormNameSync(selected);
                if (version === requestVersion.current) setNamePreview(response.data);
            } else {
                const missing = selected.filter((sheet) => !programBySheet[sheet]);
                if (missing.length) throw new Error(`Chưa chọn chương trình đích cho: ${missing.join(", ")}`);
                const duplicates = selected.filter((sheet, index) => selected.findIndex((other) => programBySheet[other] === programBySheet[sheet]) !== index);
                if (duplicates.length) throw new Error("Mỗi chương trình đích chỉ được ghép với một tab nguồn trong cùng lượt đồng bộ");
                const previews: MappingPreviewGroup[] = [];
                const errors: string[] = [];
                setMappingProgress({ current: 0, total: selected.length, label: "Đang chuẩn bị..." });
                for (let index = 0; index < selected.length; index += 1) {
                    const sheetName = selected[index]; const targetProgram = programBySheet[sheetName];
                    setMappingProgress({ current: index, total: selected.length, label: `${sheetName} → ${targetProgram}` });
                    try {
                        const response: any = await previewScormCourseMappings(targetProgram, [sheetName]);
                        previews.push({ sheetName, programCode: targetProgram, preview: response.data });
                    } catch (error: any) { errors.push(`${sheetName} → ${targetProgram}: ${error.message || "Không thể xem trước"}`); }
                    if (version !== requestVersion.current) return;
                    setMappingProgress({ current: index + 1, total: selected.length, label: `${sheetName} → ${targetProgram}` });
                }
                setMappingPreviews(previews); setMappingErrors(errors); setMappingProgress(null);
            }
        } catch (error: any) {
            if (version === requestVersion.current) onError(error.message || "Không thể xem trước dữ liệu");
        } finally { if (version === requestVersion.current) setActionLoading(false); }
    };
    const applyNames = async () => {
        const version = requestVersion.current; setActionLoading(true);
        setProgress({ updated: 0, total: namePreview?.updates.length || 0 });
        try {
            const started: any = await applyScormNameSync(selected);
            const jobId = String(started?.data?.id || "");
            if (!jobId) throw new Error("Backend không trả tiến trình đồng bộ");
            while (version === requestVersion.current) {
                await new Promise((resolve) => setTimeout(resolve, 800));
                const response: any = await getScormNameSyncStatus(jobId);
                if (version !== requestVersion.current) return;
                const job = response?.data;
                setProgress({ updated: Number(job?.updated || 0), total: Number(job?.total || 0) });
                if (job?.status === "completed") { onSuccess(`Đã cập nhật ${job.updated} bài giảng.`); handleClose(); return; }
                if (job?.status === "failed") throw new Error(job?.error || "Đồng bộ thất bại");
            }
        } catch (error: any) {
            if (version === requestVersion.current) onError(error.message || "Đồng bộ thất bại");
        } finally { if (version === requestVersion.current) setActionLoading(false); }
    };
    const applyMappings = async () => {
        const version = requestVersion.current; setActionLoading(true);
        try {
            let added = 0; let removed = 0; const errors: string[] = [];
            setMappingProgress({ current: 0, total: mappingPreviews.length, label: "Đang bắt đầu..." });
            for (let index = 0; index < mappingPreviews.length; index += 1) {
                const item = mappingPreviews[index];
                setMappingProgress({ current: index, total: mappingPreviews.length, label: `${item.sheetName} → ${item.programCode}` });
                try {
                    const response: any = await applyScormCourseMappings(item.programCode, [item.sheetName]);
                    added += Number(response?.data?.added || 0);
                    removed += Number(response?.data?.removed || 0);
                } catch (error: any) { errors.push(`${item.sheetName} → ${item.programCode}: ${error.message || "Đồng bộ thất bại"}`); }
                if (version !== requestVersion.current) return;
                setMappingProgress({ current: index + 1, total: mappingPreviews.length, label: `${item.sheetName} → ${item.programCode}` });
            }
            if (errors.length) { setMappingErrors(errors); onError(`Đã thêm ${added}, xóa ${removed} mapping; ${errors.length} chương trình lỗi.`); return; }
            onSuccess(`Đã thêm ${added}, xóa ${removed} mapping cho ${mappingPreviews.length} chương trình.`); handleClose();
        } catch (error: any) {
            if (version === requestVersion.current) onError(error.message || "Không thể đồng bộ Course ID/Package ID");
        } finally { if (version === requestVersion.current) setActionLoading(false); }
    };

    const okText = sheetsLoading ? "Đang tải danh sách…" : !hasPreview ? "Xem trước"
        : mode === "names" ? `Cập nhật ${namePreview?.updates.length || 0} bài giảng${batchCount > 1 ? ` · ${batchCount} lượt gửi` : ""}`
            : `Đồng bộ ${mappingUpdatesNeeded} thay đổi`;

    return <Modal open={open} onCancel={handleClose} width={1100} title="Đồng bộ dữ liệu bài giảng từ Google Sheets"
        okText={okText}
        okButtonProps={{ disabled: !selected.length || sheetsLoading || actionLoading || (mode === "course-mappings" && (selected.some((sheet) => !programBySheet[sheet]) || Boolean(hasPreview && !mappingUpdatesNeeded))), loading: sheetsLoading || actionLoading }}
        onOk={() => void (!hasPreview ? createPreview() : mode === "names" ? applyNames() : applyMappings())}>
        <Radio.Group value={mode} optionType="button" buttonStyle="solid" onChange={(event) => changeMode(event.target.value)} style={{ marginBottom: 16 }} options={[
            { value: "names", label: "Đồng bộ tên bài giảng" },
            { value: "course-mappings", label: "Đồng bộ Course ID/Package ID theo bài" },
        ]} />
        {sheetsLoading && !sheets.length ? <Spin /> : <>
            {!hasPreview && <div>
                {mode === "course-mappings" && <Alert type="info" showIcon message="Ghép từng tab với chương trình cần nhận mapping"
                    description="Tick tab nguồn rồi chọn chương trình đích ngay bên dưới. Sau đồng bộ, mapping của từng bài khớp sẽ giống chính xác Google Sheets; mapping thừa sẽ bị xóa." style={{ marginBottom: 16 }} />}
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
                    <div><b>Chọn chương trình cần đồng bộ</b><div style={{ color: "#667085", marginTop: 4 }}>Tab GV và các tab không đủ dữ liệu đã được loại trừ.</div></div>
                    <Tag color="blue">{selected.length}/{sheets.length} đã chọn</Tag>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 10, background: "#f7faff", border: "1px solid #d6e4ff", borderRadius: 8, marginBottom: 12 }}>
                    {mode === "names" ? <Checkbox checked={selected.length === sheets.length} indeterminate={selected.length > 0 && selected.length < sheets.length} onChange={(event) => setSelected(event.target.checked ? sheets : [])}><b>Chọn tất cả</b></Checkbox> : <b>Chọn từng tab và chương trình đích</b>}
                    <Button type="link" size="small" onClick={() => setSelected([])}>Bỏ chọn tất cả</Button>
                </div>
                {mode === "names" ? <Checkbox.Group value={selected} onChange={(values) => setSelected(values as string[])} style={{ display: "block" }}>
                    <div style={{ maxHeight: 420, overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 10 }}>
                        {sheets.map((sheet) => { const checked = selected.includes(sheet); return <label key={sheet} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10, padding: 12, borderRadius: 8, border: `1px solid ${checked ? "#91caff" : "#e5e7eb"}`, background: checked ? "#f0f7ff" : "#fff" }}><Checkbox value={sheet} /><FileTextOutlined style={{ color: checked ? "#1677ff" : "#98a2b3" }} /><b>{sheet}</b></label>; })}
                    </div>
                </Checkbox.Group> : <div style={{ maxHeight: 440, overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 10 }}>
                    {sheets.map((sheet) => { const checked = selected.includes(sheet); return <div key={sheet} style={{ padding: 12, borderRadius: 8, border: `1px solid ${checked ? "#91caff" : "#e5e7eb"}`, background: checked ? "#f0f7ff" : "#fff" }}>
                        <Checkbox checked={checked} onChange={(event) => selectMappingSheet(sheet, event.target.checked)}><FileTextOutlined /> <b>{sheet}</b></Checkbox>
                        {checked && <Select
                            showSearch
                            optionFilterProp="label"
                            value={programBySheet[sheet]}
                            onChange={(value) => setProgramBySheet((current) => ({ ...current, [sheet]: value }))}
                            placeholder="Chọn chương trình nhận mapping"
                            style={{ width: "100%", marginTop: 10 }}
                            options={[...programs].sort((left, right) => Number(programMatchesSheet(right.subject_code, sheet)) - Number(programMatchesSheet(left.subject_code, sheet))).map((item) => ({ value: item.subject_code, label: `${item.subject_code}${item.subject_name ? ` — ${item.subject_name}` : ""}` }))}
                        />}
                    </div>; })}
                </div>}
            </div>}
            {mode === "course-mappings" && mappingProgress && <Progress
                percent={mappingProgress.total ? Math.round(mappingProgress.current * 100 / mappingProgress.total) : 0}
                status="active"
                format={() => `${mappingProgress.current}/${mappingProgress.total}`}
                style={{ marginBottom: 8 }}
            />}
            {mode === "course-mappings" && mappingProgress && <Typography.Text type="secondary">Đang xử lý: {mappingProgress.label}</Typography.Text>}
            {mode === "names" && namePreview && <>
                <Alert type="info" showIcon message={`Đã đọc ${namePreview.rowsRead} dòng; ${namePreview.updates.length} bài cần cập nhật; ${namePreview.skippedLessons} mục bỏ qua.`} style={{ marginBottom: 12 }} />
                {batchCount > 1 && <Alert type="warning" showIcon message={`HMO chỉ nhận tối đa ${HMO_MAX_RECORDS_PER_REQUEST} bài/lượt gửi`} description={`${namePreview.updates.length} bài sẽ được tách thành ${batchCount} lượt gửi tuần tự.`} style={{ marginBottom: 12 }} />}
                {progress && <Progress percent={progress.total ? Math.round(progress.updated * 100 / progress.total) : 0} status={actionLoading ? "active" : "normal"} format={() => `${progress.updated}/${progress.total} bài giảng`} />}
                {!!namePreview.warnings.length && <Alert type="warning" showIcon message={`${namePreview.warnings.length} cảnh báo`} description={namePreview.warnings.slice(0, 5).map((item) => item.message).join("; ")} style={{ marginBottom: 12 }} />}
                <Table virtual size="small" rowKey={(row) => `${row.sheetName}-${row.rowNumber}-${row.courseId}-${row.lessonId}`} pagination={false} scroll={{ x: 950, y: 520 }} dataSource={namePreview.updates} columns={[
                    { title: "Sheet / dòng", width: 145, render: (_, row) => `${row.sheetName} / ${row.rowNumber}` },
                    { title: "Course / Lesson", width: 165, render: (_, row) => `${row.courseId} / ${row.lessonId}` },
                    { title: "GV", width: 170, dataIndex: "teacherName" },
                    { title: "Tên bài giảng", width: 470, render: (_, row) => <div><div style={{ color: "#98a2b3", textDecoration: "line-through" }}>{row.oldName}</div><b style={{ color: "#1677ff" }}>{row.newName}</b></div> },
                ]} />
            </>}
            {mode === "course-mappings" && hasPreview && !mappingProgress && <>
                <Alert type={mappingUpdatesNeeded ? "info" : mappingErrors.length ? "warning" : "success"} showIcon message={`${mappingPreviews.length}/${selected.length} chương trình xem trước thành công; có ${mappingUpdatesNeeded} thay đổi mapping.`} description={`${mappingPreviews.reduce((total, item) => total + item.preview.matchedLessons, 0)}/${mappingPreviews.reduce((total, item) => total + item.preview.lessonsTotal, 0)} bài khớp tên. Sau đồng bộ, mapping sẽ giống chính xác Google Sheets; lần đồng bộ Lesson ID HMO tiếp theo sẽ dọn mapping calendar thuộc gói đã xóa.`} style={{ marginBottom: 12 }} />
                {!!mappingErrors.length && <Alert type="error" showIcon message={`${mappingErrors.length} chương trình lỗi`} description={mappingErrors.join("; ")} style={{ marginBottom: 12 }} />}
                {mappingPreviews.some((item) => item.preview.warnings.length) && <Alert type="warning" showIcon message="Có cảnh báo cần kiểm tra" description={mappingPreviews.flatMap((group) => group.preview.warnings.map((warning) => `${group.programCode}: ${warning.message}`)).slice(0, 8).join("; ")} style={{ marginBottom: 12 }} />}
                <Table size="small" rowKey={(row) => `${row.programCode}-${row.lessonId}`} pagination={false} scroll={{ x: 1050, y: 500 }} dataSource={mappingPreviews.flatMap((group) => group.preview.rows.map((row) => ({ ...row, programCode: group.programCode, sourceSheet: group.sheetName })))} columns={[
                    { title: "Chương trình", dataIndex: "programCode", width: 155 },
                    { title: "Bài", dataIndex: "learnNumber", width: 70 },
                    { title: "Tên bài", dataIndex: "lessonName", width: 320 },
                    { title: "Tab nguồn", dataIndex: "sourceSheet", width: 110 },
                    { title: "Mapping hiện tại", width: 180, render: (_, row) => row.currentMappings.length ? <Space direction="vertical" size={2}>{row.currentMappings.map((item) => <Typography.Text key={`${item.packageId}-${item.courseId}`} type="secondary">{item.packageId} / {item.courseId}</Typography.Text>)}</Space> : "—" },
                    { title: "Sẽ thêm", width: 160, render: (_, row) => row.additions.length ? <Space direction="vertical" size={2}>{row.additions.map((item) => <Tag color="blue" key={`${item.packageId}-${item.courseId}`}>{item.packageId} / {item.courseId}</Tag>)}</Space> : "—" },
                    { title: "Sẽ xóa", width: 160, render: (_, row) => row.removals.length ? <Space direction="vertical" size={2}>{row.removals.map((item) => <Tag color="red" key={`${item.packageId}-${item.courseId}`}>{item.packageId} / {item.courseId}</Tag>)}</Space> : <Tag color="green">Đã khớp</Tag> },
                ]} />
            </>}
        </>}
    </Modal>;
}
