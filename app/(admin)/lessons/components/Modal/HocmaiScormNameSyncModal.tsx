"use client";
import Select from "@/components/ui/MobileSelect";
import Table from "@/components/ui/ModalTable";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Descriptions,
  Input,
  Modal,
  Progress,
  Space,
  Tag,
  Typography,
} from "antd";
import {
  formatHocmaiSchedule,
  pickQuickApprovalLesson,
} from "@/helper/hocmaiScormQuickApproval";
import {
  applyHocmaiScormNames,
  getHocmaiScormNameSyncStatus,
  getManualHocmaiScormLessons,
  getHocmaiScormTeachers,
  type HocmaiScormTeacher,
  type HocmaiScormOptions,
  type HocmaiScormManualLessons,
  previewHocmaiScormNames,
  resolveManualHocmaiScormLesson,
  resolveManualHocmaiScormLessonsBulk,
  type HocmaiScormPreviewResult,
  type HocmaiScormPreviewRow,
  type HocmaiScormManualResolution,
} from "@/services/lessonService";

type Props = {
  open: boolean;
  programCode: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};
const statusTag = (status: HocmaiScormPreviewRow["status"]) =>
  status === "update" ? (
    <Tag color="blue">Sẽ cập nhật</Tag>
  ) : status === "unchanged" ? (
    <Tag color="green">Không thay đổi</Tag>
  ) : (
    <Tag color="orange">Bỏ qua</Tag>
  );

export default function HocmaiScormNameSyncModal({
  open,
  programCode,
  onClose,
  onSuccess,
  onError,
}: Props) {
  const [matchingMode, setMatchingMode] = useState<HocmaiScormOptions["matchingMode"]>("name_teacher");
  const [teachers, setTeachers] = useState<HocmaiScormTeacher[]>([]);
  const [teacherPrefixes, setTeacherPrefixes] = useState<Record<string, string>>({});
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [teachersError, setTeachersError] = useState("");
  const [teachersReload, setTeachersReload] = useState(0);
  const syncOptions: HocmaiScormOptions = { matchingMode, teacherPrefixes };
  const [preview, setPreview] = useState<HocmaiScormPreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [packageFilter, setPackageFilter] = useState<string>();
  const [courseFilter, setCourseFilter] = useState<string>();
  const [lessonFilter, setLessonFilter] = useState<string>();
  const [manualOverrides, setManualOverrides] = useState<
    Record<
      string,
      HocmaiScormManualResolution & {
        expectedName: string;
        approvalMode?: "quick" | "manual";
      }
    >
  >({});
  const [resolvingKey, setResolvingKey] = useState<string>();
  const [bulkResolving, setBulkResolving] = useState(false);
  const [manualEditorRow, setManualEditorRow] =
    useState<HocmaiScormPreviewRow>();
  const [manualEditorLessonId, setManualEditorLessonId] = useState("");
  const [manualLessons, setManualLessons] = useState<HocmaiScormManualLessons["lessons"]>([]);
  const [manualLessonsLoading, setManualLessonsLoading] = useState(false);
  const [manualLessonsError, setManualLessonsError] = useState("");
  const [manualLessonsReload, setManualLessonsReload] = useState(0);
  const manualEditorVersion = useRef(0);
  const [manualEditorResolution, setManualEditorResolution] = useState<
    HocmaiScormManualResolution & { expectedName: string }
  >();
  const [progress, setProgress] = useState<{
    updated: number;
    total: number;
  } | null>(null);
  const requestVersion = useRef(0);
  useEffect(() => {
    requestVersion.current += 1;
    manualEditorVersion.current += 1;
    if (open) {
      setMatchingMode("name_teacher");
      setTeacherPrefixes({});
      setTeachers([]);
      setTeachersError("");
      setPreview(null);
      setProgress(null);
      setLoading(false);
      setPackageFilter(undefined);
      setCourseFilter(undefined);
      setLessonFilter(undefined);
      setManualOverrides({});
      setResolvingKey(undefined);
      setBulkResolving(false);
      setManualEditorRow(undefined);
      setManualEditorLessonId("");
      setManualLessons([]);
      setManualLessonsError("");
      setManualEditorResolution(undefined);
    }
  }, [open, programCode]);
  useEffect(() => {
    if (!open || !programCode) return;
    let disposed = false;
    setTeachersLoading(true);
    setTeachersError("");
    void getHocmaiScormTeachers(programCode).then((response: any) => {
      if (disposed) return;
      const list = response.data as HocmaiScormTeacher[];
      if (!Array.isArray(list)) throw new Error("Danh sách giáo viên không hợp lệ");
      setTeachers(list);
      setTeacherPrefixes(Object.fromEntries(list.filter((teacher) => teacher.prefix).map((teacher) => [teacher.key, teacher.prefix])));
    }).catch((error: any) => {
      if (!disposed) setTeachersError(error.message || "Không thể tải giáo viên của chương trình");
    }).finally(() => { if (!disposed) setTeachersLoading(false); });
    return () => { disposed = true; };
  }, [open, programCode, teachersReload]);
  const invalidatePreview = () => {
    requestVersion.current += 1;
    manualEditorVersion.current += 1;
    setPreview(null);
    setManualOverrides({});
    setManualEditorRow(undefined);
    setManualEditorResolution(undefined);
    setResolvingKey(undefined);
    setProgress(null);
    setPackageFilter(undefined);
    setCourseFilter(undefined);
    setLessonFilter(undefined);
  };
  const packageOptions = useMemo(
    () =>
      Array.from(
        new Set(
          (preview?.rows || [])
            .map((row) => row.packageId)
            .filter(Boolean) as string[],
        ),
      )
        .sort((a, b) => a.localeCompare(b, "vi", { numeric: true }))
        .map((value) => ({ value, label: value })),
    [preview],
  );
  const courseOptions = useMemo(
    () =>
      Array.from(
        new Set(
          (preview?.rows || [])
            .filter((row) => !packageFilter || row.packageId === packageFilter)
            .map((row) => row.courseId)
            .filter(Boolean) as string[],
        ),
      )
        .sort((a, b) => a.localeCompare(b, "vi", { numeric: true }))
        .map((value) => ({ value, label: value })),
    [preview, packageFilter],
  );
  const lessonOptions = useMemo(
    () =>
      Array.from(
        new Map(
          (preview?.rows || [])
            .filter(
              (row) =>
                (!packageFilter || row.packageId === packageFilter) &&
                (!courseFilter || row.courseId === courseFilter) &&
                (manualOverrides[row.key]?.lessonId || row.hocmaiLessonId),
            )
            .map((row) => {
              const resolvedLessonId =
                manualOverrides[row.key]?.lessonId || row.hocmaiLessonId!;
              return [
                resolvedLessonId,
                {
                  value: resolvedLessonId,
                  label: resolvedLessonId + " — " + row.lessonName,
                },
              ];
            }),
        ).values(),
      ).sort((a, b) => a.value.localeCompare(b.value, "vi", { numeric: true })),
    [preview, packageFilter, courseFilter, manualOverrides],
  );
  const filteredRows = useMemo(
    () =>
      (preview?.rows || []).filter(
        (row) =>
          (!packageFilter || row.packageId === packageFilter) &&
          (!courseFilter || row.courseId === courseFilter) &&
          (!lessonFilter ||
            (manualOverrides[row.key]?.lessonId || row.hocmaiLessonId) ===
              lessonFilter),
      ),
    [preview, packageFilter, courseFilter, lessonFilter, manualOverrides],
  );
  const manualOverrideList = Object.values(manualOverrides)
    .map((item) => ({
      rowKey: item.rowKey,
      lessonId: item.lessonId,
      expectedName: item.expectedName.trim(),
    }))
    .filter((item) => item.expectedName);
  const manualTargetCount = new Set(
    Object.values(manualOverrides).map(
      (item) => `${item.courseId}::${item.lessonId}`,
    ),
  ).size;
  const totalUpdates = (preview?.updateCount || 0) + manualTargetCount;
  const quickApprovableRows = useMemo(
    () => filteredRows.filter((row) => (
      row.status === "skipped"
      && !manualOverrides[row.key]
      && Boolean(pickQuickApprovalLesson(row))
    )),
    [filteredRows, manualOverrides],
  );
  const quickApprovedRows = useMemo(
    () => filteredRows.filter(
      (row) => manualOverrides[row.key]?.approvalMode === "quick",
    ),
    [filteredRows, manualOverrides],
  );
  useEffect(() => {
    if (!open || !manualEditorRow) return;
    let disposed = false;
    setManualLessons([]);
    setManualLessonsError("");
    setManualLessonsLoading(true);
    void getManualHocmaiScormLessons(programCode, manualEditorRow.key)
      .then((response: any) => {
        if (disposed) return;
        const data = response.data as HocmaiScormManualLessons;
        if (data?.rowKey !== manualEditorRow.key || data.packageId !== manualEditorRow.packageId
          || data.courseId !== manualEditorRow.courseId || !Array.isArray(data.lessons)) {
          throw new Error("Danh sách Lesson không thuộc Package/Course đang chọn");
        }
        setManualLessons(data.lessons);
        if (!data.lessons.some((lesson) => lesson.lessonId === manualEditorLessonId)) {
          setManualEditorLessonId("");
          setManualEditorResolution(undefined);
        }
      })
      .catch((error: any) => {
        if (!disposed) setManualLessonsError(error.message || "Không thể tải danh sách Lesson HOCMAI");
      })
      .finally(() => { if (!disposed) setManualLessonsLoading(false); });
    return () => { disposed = true; };
    // Selection is captured when the list is requested; it does not refetch on selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, programCode, manualEditorRow, manualLessonsReload]);
  const closeManualEditor = () => {
    manualEditorVersion.current += 1;
    setManualEditorRow(undefined);
    setManualEditorResolution(undefined);
    setResolvingKey(undefined);
  };
  const openManualEditor = (row: HocmaiScormPreviewRow) => {
    manualEditorVersion.current += 1;
    const current = manualOverrides[row.key];
    setManualLessons([]);
    setManualLessonsError("");
    setManualLessonsLoading(true);
    setResolvingKey(undefined);
    setManualEditorRow(row);
    setManualEditorLessonId(current?.lessonId || row.hocmaiLessonId || pickQuickApprovalLesson(row)?.lessonId || "");
    setManualEditorResolution(current);
  };
  const quickApproveAll = async () => {
    if (!quickApprovableRows.length) return;
    const version = requestVersion.current;
    setBulkResolving(true);
    try {
      const selections = quickApprovableRows.map((row) => ({
        rowKey: row.key,
        lessonId: pickQuickApprovalLesson(row)!.lessonId,
      }));
      const resolvedItems: HocmaiScormManualResolution[] = [];
      for (let index = 0; index < selections.length; index += 200) {
        const response: any = await resolveManualHocmaiScormLessonsBulk(
          programCode,
          selections.slice(index, index + 200),
          syncOptions,
        );
        resolvedItems.push(...(response.data as HocmaiScormManualResolution[]));
      }
      if (version !== requestVersion.current) return;
      if (resolvedItems.some((resolved) => !resolved.suggestedName))
        onError("Một số Lesson thiếu chức danh Cô/Thầy; vui lòng chọn trong xử lý thủ công");
      setManualOverrides((current) => {
        const next = { ...current };
        resolvedItems.filter((resolved) => resolved.suggestedName).forEach((resolved) => {
          next[resolved.rowKey] = {
            ...resolved,
            expectedName: resolved.suggestedName,
            approvalMode: "quick",
          };
        });
        return next;
      });
    } catch (error: any) {
      if (version === requestVersion.current)
        onError(error.message || "Không thể duyệt nhanh tất cả");
    } finally {
      if (version === requestVersion.current) setBulkResolving(false);
    }
  };
  const removeAllQuickApprovals = () => {
    const keys = new Set(quickApprovedRows.map((row) => row.key));
    setManualOverrides((current) => Object.fromEntries(
      Object.entries(current).filter(([rowKey]) => !keys.has(rowKey)),
    ));
  };
  const quickApprove = async (row: HocmaiScormPreviewRow) => {
    const candidate = pickQuickApprovalLesson(row);
    if (!candidate) {
      openManualEditor(row);
      return;
    }
    const version = requestVersion.current;
    setResolvingKey(row.key);
    try {
      const response: any = await resolveManualHocmaiScormLesson(
        programCode,
        row.key,
        candidate.lessonId,
        syncOptions,
      );
      if (version !== requestVersion.current) return;
      const resolved = response.data as HocmaiScormManualResolution;
      if (!resolved.suggestedName) {
        openManualEditor(row);
        return;
      }
      setManualOverrides((current) => ({
        ...current,
        [row.key]: {
          ...resolved,
          expectedName: resolved.suggestedName,
          approvalMode: "quick",
        },
      }));
    } catch (error: any) {
      if (version === requestVersion.current) onError(error.message || "Không thể duyệt nhanh Lesson ID");
    } finally {
      if (version === requestVersion.current) setResolvingKey(undefined);
    }
  };
  const removeManualOverride = (rowKey: string) => {
    setManualOverrides((current) => {
      const next = { ...current };
      delete next[rowKey];
      return next;
    });
  };
  const resolveManual = async () => {
    if (!manualEditorRow || manualLessonsLoading || manualLessonsError
      || !manualLessons.some((lesson) => lesson.lessonId === manualEditorLessonId))
      return onError("Vui lòng chọn Lesson thuộc Package/Course này");
    const version = manualEditorVersion.current;
    const parentVersion = requestVersion.current;
    setResolvingKey(manualEditorRow.key);
    try {
      const response: any = await resolveManualHocmaiScormLesson(
        programCode,
        manualEditorRow.key,
        manualEditorLessonId,
        syncOptions,
      );
      if (version !== manualEditorVersion.current || parentVersion !== requestVersion.current) return;
      const resolved = response.data as HocmaiScormManualResolution;
      setManualEditorResolution({ ...resolved, expectedName: resolved.suggestedName });
    } catch (error: any) {
      if (version !== manualEditorVersion.current || parentVersion !== requestVersion.current) return;
      onError(error.message || "Lesson đã chọn không hợp lệ");
      setManualEditorResolution(undefined);
    } finally {
      if (version === manualEditorVersion.current && parentVersion === requestVersion.current)
        setResolvingKey(undefined);
    }
  };
  const saveManualOverride = () => {
    if (!manualEditorRow || !manualEditorResolution?.expectedName.trim()
      || (manualEditorResolution.requiresHonorific && !manualEditorResolution.honorific))
      return onError("Vui lòng chọn Cô/Thầy và nhập tên dự kiến đầy đủ");
    setManualOverrides((current) => ({
      ...current,
      [manualEditorRow.key]: {
        ...manualEditorResolution,
        expectedName: manualEditorResolution.expectedName.trim(),
        approvalMode: "manual",
      },
    }));
    setManualEditorRow(undefined);
    setManualEditorResolution(undefined);
    setManualEditorLessonId("");
    manualEditorVersion.current += 1;
  };
  const updateManualExpectedName = (rowKey: string, expectedName: string) =>
    setManualOverrides((current) =>
      current[rowKey]
        ? { ...current, [rowKey]: { ...current[rowKey], expectedName } }
        : current,
    );
  const close = () => {
    closeManualEditor();
    requestVersion.current += 1;
    setLoading(false);
    setProgress(null);
    onClose();
  };
  const createPreview = async () => {
    if (!programCode)
      return onError("Vui lòng lọc một chương trình trước khi đồng bộ");
    const version = requestVersion.current;
    setLoading(true);
    try {
      const response: any = await previewHocmaiScormNames(programCode, syncOptions);
      if (version === requestVersion.current) setPreview(response.data);
    } catch (error: any) {
      if (version === requestVersion.current)
        onError(error.message || "Không thể tạo bản xem trước");
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  };
  const apply = async () => {
    if (!totalUpdates) return;
    const version = requestVersion.current;
    setLoading(true);
    setProgress({ updated: 0, total: totalUpdates });
    try {
      const started: any = await applyHocmaiScormNames(
        programCode,
        manualOverrideList,
        syncOptions,
      );
      const jobId = String(started?.data?.id || "");
      if (!jobId) throw new Error("Backend không trả tiến trình đồng bộ");
      while (version === requestVersion.current) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        const response: any = await getHocmaiScormNameSyncStatus(jobId);
        if (version !== requestVersion.current) return;
        const job = response?.data;
        setProgress({
          updated: Number(job?.updated || 0),
          total: Number(job?.total || totalUpdates),
        });
        if (job?.status === "completed") {
          onSuccess(
            "Đã cập nhật " + Number(job.updated || 0) + " tên SCORM từ HOCMAI.",
          );
          close();
          return;
        }
        if (job?.status === "failed")
          throw new Error(job.error || "Đồng bộ thất bại");
      }
    } catch (error: any) {
      if (version === requestVersion.current)
        onError(error.message || "Đồng bộ thất bại");
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  };
  return (
    <>
      <Modal
        open={open}
        onCancel={close}
        width={1180}
        title="Đồng bộ tên SCORM từ HOCMAI"
        okText={
          preview
            ? "Xác nhận cập nhật " + totalUpdates + " bài"
            : "Tạo bản xem trước"
        }
        cancelText="Hủy"
        confirmLoading={loading || bulkResolving}
        okButtonProps={{
          disabled:
            bulkResolving || teachersLoading || Boolean(teachersError) || !programCode || Boolean(preview && !totalUpdates),
        }}
        onOk={() => void (preview ? apply() : createPreview())}
      >
        <Alert
          type="info"
          showIcon
          message={
            <>
              Chương trình: <b>{programCode || "Chưa chọn"}</b>
            </>
          }
          description="Chọn riêng một luồng ghép Lesson và nhập tiền tố cho từng giáo viên. Chỉ dùng outline HOCMAI; không tự chuyển sang luồng khác và không lấy Lesson ID mapping cũ. Tiền tố chỉ dùng cho lần đồng bộ này, không lưu vào hồ sơ giáo viên."
          style={{ marginBottom: 16 }}
        />
        <Space direction="vertical" style={{ width: "100%", marginBottom: 16 }}>
          <Typography.Text strong>Luồng ghép Lesson HOCMAI</Typography.Text>
          <Select
            value={matchingMode}
            disabled={loading || bulkResolving}
            options={[
              { value: "name_teacher", label: "Theo tên bài + giáo viên (luồng SCORM cũ)" },
              { value: "lesson_id", label: "Theo thuật toán đồng bộ Lesson ID" },
            ]}
            onChange={(mode: HocmaiScormOptions["matchingMode"]) => {
              invalidatePreview();
              setMatchingMode(mode);
            }}
            style={{ width: "100%" }}
          />
          <Typography.Text type="secondary">
            {matchingMode === "name_teacher"
              ? "Chỉ nhận diện khi tên bài, giáo viên và Session đáp ứng điều kiện của luồng SCORM cũ."
              : "Phân bổ Lesson theo thuật toán đồng bộ Lesson ID trên các lịch của cùng bài và Package/Course; có thể xét lesson chưa có hậu tố giáo viên."}
            {" "}Hãy kiểm tra Lesson ID và tên dự kiến trong preview trước khi xác nhận. Đổi luồng hoặc tiền tố sẽ xóa preview và các lựa chọn thủ công để kiểm tra lại.
          </Typography.Text>
          <Typography.Text strong>Tiền tố giáo viên của chương trình</Typography.Text>
          {teachersLoading && <Typography.Text type="secondary">Đang tải danh sách giáo viên…</Typography.Text>}
          {teachersError && <Alert type="error" message={teachersError}
            action={<Button onClick={() => setTeachersReload((value) => value + 1)}>Tải lại</Button>} />}
          {!teachersLoading && !teachersError && !teachers.length && <Typography.Text type="secondary">Chương trình chưa có giáo viên theo lịch.</Typography.Text>}
          {teachers.map((teacher) => (
            <div key={teacher.key} style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ minWidth: 220 }}>{teacher.name}</span>
              <Input
                aria-label={`Tiền tố ${teacher.name}`}
                value={teacherPrefixes[teacher.key] || ""}
                placeholder="Cô, Thầy, TS.…"
                maxLength={50}
                disabled={loading || bulkResolving || teachersLoading}
                onChange={(event) => {
                  invalidatePreview();
                  setTeacherPrefixes((current) => ({ ...current, [teacher.key]: event.target.value }));
                }}
                style={{ width: 200 }}
              />
              <Typography.Text type="secondary">
                {teacherPrefixes[teacher.key]?.trim() ? `${teacherPrefixes[teacher.key].trim()} ${teacher.name}` : "Chưa nhập tiền tố"}
              </Typography.Text>
            </div>
          ))}
          <Typography.Text type="secondary">Tiền tố nhập ở đây được ưu tiên. Nếu để trống, chỉ dùng chức danh có căn cứ từ dữ liệu hiện có; thiếu thông tin sẽ cần chọn thủ công.</Typography.Text>
        </Space>
        {!preview && (
          <Typography.Text type="secondary">
            Bấm “Tạo bản xem trước” để kiểm tra toàn bộ thay đổi. Chưa có dữ
            liệu nào được cập nhật ở bước này.
          </Typography.Text>
        )}
        {preview && (
          <>
            <Descriptions
              bordered
              size="small"
              column={5}
              style={{ marginBottom: 16 }}
            >
              <Descriptions.Item label="Lịch học">
                {preview.scheduleCount}
              </Descriptions.Item>
              <Descriptions.Item label="Giáo viên">
                {preview.teacherCount}
              </Descriptions.Item>
              <Descriptions.Item label="Package/Course">
                {preview.packageCourseCount}
              </Descriptions.Item>
              <Descriptions.Item label="Sẽ cập nhật">
                <Space>
                  <Tag color="blue">{preview.updateCount}</Tag>
                  {manualTargetCount > 0 && (
                    <Tag color="purple">
                      +{manualTargetCount} đích đã chọn
                    </Tag>
                  )}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Không đổi / Bỏ qua">
                <Space>
                  <Tag color="green">{preview.unchangedCount}</Tag>
                  <Tag color="orange">{preview.skippedCount}</Tag>
                </Space>
              </Descriptions.Item>
            </Descriptions>
            {progress && (
              <Progress
                percent={
                  progress.total
                    ? Math.round((progress.updated * 100) / progress.total)
                    : 0
                }
                status={loading ? "active" : "normal"}
                format={() => progress.updated + "/" + progress.total + " bài"}
                style={{ marginBottom: 12 }}
              />
            )}
            {!!preview.skippedCount && (
              <Alert
                type="warning"
                showIcon
                message={
                  preview.skippedCount +
                  " mục được bỏ qua để tránh cập nhật nhầm"
                }
                description={preview.warnings.slice(0, 5).join("; ")}
                style={{ marginBottom: 12 }}
              />
            )}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(180px, 1fr))",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Lọc theo Package"
                value={packageFilter}
                options={packageOptions}
                onChange={(value) => {
                  setPackageFilter(value);
                  setCourseFilter(undefined);
                  setLessonFilter(undefined);
                }}
              />
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Lọc theo Course"
                value={courseFilter}
                options={courseOptions}
                onChange={(value) => {
                  setCourseFilter(value);
                  setLessonFilter(undefined);
                }}
              />
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Lọc theo Lesson HOCMAI"
                value={lessonFilter}
                options={lessonOptions}
                onChange={setLessonFilter}
              />
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={{ color: "#667085" }}>
                Đang hiển thị {filteredRows.length}/{preview.rows.length} kết quả
              </span>
              <Space wrap>
                <Typography.Text type="secondary">
                  Áp dụng trên danh sách đang lọc
                </Typography.Text>
                <Button
                  type="primary"
                  size="small"
                  loading={bulkResolving}
                  disabled={!quickApprovableRows.length}
                  onClick={() => void quickApproveAll()}
                >
                  Duyệt nhanh tất cả ({quickApprovableRows.length})
                </Button>
                <Button
                  danger
                  size="small"
                  disabled={!quickApprovedRows.length || bulkResolving}
                  onClick={removeAllQuickApprovals}
                >
                  Xóa duyệt nhanh tất cả ({quickApprovedRows.length})
                </Button>
              </Space>
            </div>
            <Table<HocmaiScormPreviewRow>
              size="small"
              rowKey="key"
              dataSource={filteredRows}
              pagination={false}
              scroll={{ x: 1565, y: 500 }}
              columns={[
                { title: "Bài", width: 65, dataIndex: "learnNumber" },
                {
                  title: "Lịch học",
                  width: 185,
                  render: (_, row) =>
                    formatHocmaiSchedule(row.scheduleTime, row.occurrence),
                },
                {
                  title: "Tên bài trong đề cương",
                  width: 220,
                  dataIndex: "lessonName",
                },
                {
                  title: "Giáo viên",
                  width: 170,
                  dataIndex: "teacherName",
                  render: (value) =>
                    value || (
                      <Typography.Text type="danger">Thiếu</Typography.Text>
                    ),
                },
                {
                  title: "Package / Course",
                  width: 145,
                  render: (_, row) =>
                    row.packageId && row.courseId
                      ? row.packageId + " / " + row.courseId
                      : "—",
                },
                {
                  title: "Lesson ID HOCMAI",
                  width: 210,
                  dataIndex: "hocmaiLessonId",
                  render: (value, row) =>
                    manualOverrides[row.key]?.lessonId || value || "—",
                },
                {
                  title: "Session HOCMAI",
                  width: 170,
                  dataIndex: "hocmaiSessionName",
                  render: (value, row) =>
                    manualOverrides[row.key]?.sessionName ||
                    value ||
                    row.candidateSessions
                      ?.map((session) => session.name)
                      .join(", ") ||
                    "—",
                },
                {
                  title: "Tên hiện tại",
                  width: 230,
                  dataIndex: "currentName",
                  render: (value, row) =>
                    manualOverrides[row.key]?.currentName || value || "—",
                },
                {
                  title: "Tên dự kiến",
                  width: 260,
                  dataIndex: "expectedName",
                  render: (value, row) =>
                    manualOverrides[row.key] ? (
                      <Input
                        value={manualOverrides[row.key].expectedName}
                        maxLength={255}
                        onChange={(event) =>
                          updateManualExpectedName(row.key, event.target.value)
                        }
                      />
                    ) : value ? (
                      <b
                        style={{
                          color:
                            row.status === "update" ? "#1677ff" : undefined,
                        }}
                      >
                        {value}
                      </b>
                    ) : (
                      "—"
                    ),
                },
                {
                  title: "Kết quả",
                  width: 235,
                  fixed: "right",
                  render: (_, row) => {
                    const approved = manualOverrides[row.key];
                    const canQuickApprove =
                      row.status === "skipped" &&
                      row.candidateSessions?.length === 1 &&
                      Boolean(row.candidateSessions[0].lessons.length);
                    return (
                      <div>
                        {approved ? (
                          <Tag color={approved.approvalMode === "quick" ? "cyan" : "purple"}>
                            {approved.approvalMode === "quick"
                              ? "Đã duyệt nhanh"
                              : "Đã chọn thủ công"}
                          </Tag>
                        ) : (
                          statusTag(row.status)
                        )}
                        {row.status === "skipped" && (
                          <Space size={4} wrap style={{ display: "flex", marginTop: 2 }}>
                            {!approved && canQuickApprove && (
                              <Button
                                type="link"
                                size="small"
                                loading={resolvingKey === row.key}
                                disabled={bulkResolving}
                                style={{ paddingInline: 0 }}
                                onClick={() => void quickApprove(row)}
                              >
                                Duyệt nhanh
                              </Button>
                            )}
                            {approved && (
                              <Button
                                type="link"
                                danger
                                size="small"
                                style={{ paddingInline: 0 }}
                                onClick={() => removeManualOverride(row.key)}
                              >
                                Xóa nhanh
                              </Button>
                            )}
                            <Button
                              type="link"
                              size="small"
                              style={{ paddingInline: 0 }}
                              onClick={() => openManualEditor(row)}
                            >
                              {approved
                                ? "Sửa"
                                : "Chọn Lesson HOCMAI"}
                            </Button>
                          </Space>
                        )}
                        {approved ? (
                          <div
                            style={{
                              color: "#8c8c8c",
                              marginTop: 4,
                              whiteSpace: "normal",
                            }}
                          >
                            {approved.sessionName || "Session đã chọn"} · Lesson {approved.lessonId}
                          </div>
                        ) : row.reason ? (
                          <div
                            style={{
                              color: "#8c8c8c",
                              marginTop: 4,
                              whiteSpace: "normal",
                            }}
                          >
                            {row.reason}
                          </div>
                        ) : row.sharedTarget ? (
                          <div
                            style={{
                              color: "#8c8c8c",
                              marginTop: 4,
                              whiteSpace: "normal",
                            }}
                          >
                            Lesson ID này được dùng chung cho lịch khác.
                          </div>
                        ) : null}
                      </div>
                    );
                  },
                },
              ]}
            />
          </>
        )}
      </Modal>
      <Modal
        open={open && Boolean(manualEditorRow)}
        title="Xử lý thủ công Lesson HOCMAI"
        onCancel={closeManualEditor}
        okText={
          manualEditorResolution ? "Áp dụng vào preview" : "Kiểm tra Lesson đã chọn"
        }
        confirmLoading={Boolean(resolvingKey)}
        okButtonProps={{ disabled: manualLessonsLoading || Boolean(manualLessonsError)
          || !manualLessons.some((lesson) => lesson.lessonId === manualEditorLessonId)
          || Boolean(manualEditorResolution?.requiresHonorific && !manualEditorResolution.honorific) }}
        onOk={() =>
          void (manualEditorResolution ? saveManualOverride() : resolveManual())
        }
      >
        <Alert
          type="warning"
          showIcon
          message={
            manualEditorRow
              ? `Bài ${manualEditorRow.learnNumber} — ${manualEditorRow.teacherName}`
              : ""
          }
          description={
            manualEditorRow
              ? `Package ${manualEditorRow.packageId} / Course ${manualEditorRow.courseId}`
              : ""
          }
          style={{ marginBottom: 16 }}
        />
        {manualLessonsError && (
          <Alert type="error" showIcon message={manualLessonsError}
            action={<Button size="small" onClick={() => setManualLessonsReload((value) => value + 1)}>Tải lại</Button>}
            style={{ marginBottom: 12 }} />
        )}
        <Typography.Text strong>Lesson HOCMAI trong Package/Course</Typography.Text>
        <Select
          showSearch
          allowClear
          optionFilterProp="label"
          loading={manualLessonsLoading}
          disabled={manualLessonsLoading || Boolean(manualLessonsError)}
          value={manualEditorLessonId || undefined}
          placeholder={manualLessonsLoading ? "Đang tải toàn bộ Lesson…" : "Tìm theo tên hoặc ID rồi chọn Lesson"}
          options={manualLessons.map((lesson) => ({
            value: lesson.lessonId,
            label: `${lesson.sectionName ? lesson.sectionName + " · " : ""}${lesson.lessonId} — ${lesson.name || "Chưa có tên"}`,
          }))}
          notFoundContent={manualLessonsLoading ? "Đang tải…" : "Không tìm thấy Lesson"}
          onChange={(lessonId) => {
            manualEditorVersion.current += 1;
            setManualEditorLessonId(lessonId || "");
            setManualEditorResolution(undefined);
            setResolvingKey(undefined);
          }}
          style={{ width: "100%", marginTop: 6, marginBottom: 8 }}
        />
        <Typography.Paragraph type="secondary">
          {manualLessonsLoading ? "Đang tải danh sách từ HOCMAI."
            : `Có ${manualLessons.length} Lesson thuộc Package/Course này. Tìm theo tên, Session hoặc ID để chọn; không cần nhập Lesson ID thủ công.`}
        </Typography.Paragraph>
        {manualEditorResolution && (
          <Space direction="vertical" style={{ width: "100%" }} size={12}>
            <div>
              <Typography.Text type="secondary">
                Tên hiện tại trên HOCMAI
              </Typography.Text>
              <div>{manualEditorResolution.currentName}</div>
            </div>
            {manualEditorResolution.requiresHonorific && (
              <div>
                <Typography.Text strong>Chức danh giáo viên</Typography.Text>
                <Select
                  value={manualEditorResolution.honorific}
                  placeholder="Chọn Cô hoặc Thầy"
                  options={[{ value: "Cô", label: "Cô" }, { value: "Thầy", label: "Thầy" }]}
                  onChange={(honorific: string) => setManualEditorResolution((current) => current ? {
                    ...current,
                    honorific,
                    expectedName: `${current.baseName}_${honorific} ${current.teacherName}`,
                  } : current)}
                  style={{ width: "100%", marginTop: 6 }}
                />
                <Typography.Text type="warning">
                  HOCMAI và lịch chưa đủ thông tin xác định chức danh. Hãy chọn Cô/Thầy để tạo tên đầy đủ.
                </Typography.Text>
              </div>
            )}
            <div>
              <Typography.Text strong>Tên dự kiến</Typography.Text>
              <Input
                value={manualEditorResolution.expectedName}
                maxLength={255}
                onChange={(event) =>
                  setManualEditorResolution((current) =>
                    current
                      ? { ...current, expectedName: event.target.value }
                      : current,
                  )
                }
                style={{ marginTop: 6 }}
              />
            </div>
            <Typography.Text type="secondary">
              Mặc định: Tên bài_[Chức danh] Họ tên đầy đủ của giáo viên theo
              lịch. Bạn có thể sửa trước khi áp dụng.
            </Typography.Text>
          </Space>
        )}
      </Modal>
    </>
  );
}
