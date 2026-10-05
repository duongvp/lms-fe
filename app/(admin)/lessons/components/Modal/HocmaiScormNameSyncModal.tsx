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
  const [manualEditorSessionKey, setManualEditorSessionKey] = useState<string>();
  const [manualEditorResolution, setManualEditorResolution] = useState<
    HocmaiScormManualResolution & { expectedName: string }
  >();
  const [progress, setProgress] = useState<{
    updated: number;
    total: number;
  } | null>(null);
  const requestVersion = useRef(0);
  useEffect(() => {
    if (open) {
      requestVersion.current += 1;
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
      setManualEditorSessionKey(undefined);
      setManualEditorResolution(undefined);
    }
  }, [open, programCode]);
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
                (row.hocmaiLessonId || manualOverrides[row.key]?.lessonId),
            )
            .map((row) => {
              const resolvedLessonId =
                row.hocmaiLessonId || manualOverrides[row.key]!.lessonId;
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
            (row.hocmaiLessonId || manualOverrides[row.key]?.lessonId) ===
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
  const manualCandidateSessions = manualEditorRow?.candidateSessions || [];
  const manualSelectedSession = manualCandidateSessions.find(
    (session) => session.key === manualEditorSessionKey,
  );
  const openManualEditor = (row: HocmaiScormPreviewRow) => {
    const current = manualOverrides[row.key];
    const sessions = row.candidateSessions || [];
    const currentSession = current
      ? sessions.find((session) =>
          session.lessons.some((lesson) => lesson.lessonId === current.lessonId),
        )
      : undefined;
    const defaultSession =
      currentSession || (sessions.length === 1 ? sessions[0] : undefined);
    setManualEditorRow(row);
    setManualEditorLessonId(
      current?.lessonId || pickQuickApprovalLesson(row)?.lessonId || "",
    );
    setManualEditorSessionKey(defaultSession?.key);
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
        );
        resolvedItems.push(...(response.data as HocmaiScormManualResolution[]));
      }
      if (version !== requestVersion.current) return;
      setManualOverrides((current) => {
        const next = { ...current };
        resolvedItems.forEach((resolved) => {
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
    setResolvingKey(row.key);
    try {
      const response: any = await resolveManualHocmaiScormLesson(
        programCode,
        row.key,
        candidate.lessonId,
      );
      const resolved = response.data as HocmaiScormManualResolution;
      setManualOverrides((current) => ({
        ...current,
        [row.key]: {
          ...resolved,
          expectedName: resolved.suggestedName,
          approvalMode: "quick",
        },
      }));
    } catch (error: any) {
      onError(error.message || "Không thể duyệt nhanh Lesson ID");
    } finally {
      setResolvingKey(undefined);
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
    if (!manualEditorRow || !/^\d+$/.test(manualEditorLessonId))
      return onError("Lesson ID phải là số nguyên dương");
    setResolvingKey(manualEditorRow.key);
    try {
      const response: any = await resolveManualHocmaiScormLesson(
        programCode,
        manualEditorRow.key,
        manualEditorLessonId,
      );
      const resolved = response.data as HocmaiScormManualResolution;
      setManualEditorResolution({
        ...resolved,
        expectedName: resolved.suggestedName,
      });
    } catch (error: any) {
      onError(error.message || "Lesson ID không hợp lệ");
      setManualEditorResolution(undefined);
    } finally {
      setResolvingKey(undefined);
    }
  };
  const saveManualOverride = () => {
    if (!manualEditorRow || !manualEditorResolution?.expectedName.trim())
      return onError("Vui lòng nhập tên dự kiến");
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
    setManualEditorSessionKey(undefined);
  };
  const updateManualExpectedName = (rowKey: string, expectedName: string) =>
    setManualOverrides((current) =>
      current[rowKey]
        ? { ...current, [rowKey]: { ...current[rowKey], expectedName } }
        : current,
    );
  const close = () => {
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
      const response: any = await previewHocmaiScormNames(programCode);
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
            bulkResolving || !programCode || Boolean(preview && !totalUpdates),
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
          description="Hệ thống đối chiếu đề cương, lịch dạy, giáo viên và Package/Course với outline HOCMAI. Lesson ID chỉ được xác định từ outline API theo tên bài và giáo viên; Lesson ID mapping cũ và Google Sheets không được sử dụng trong nghiệp vụ này."
          style={{ marginBottom: 16 }}
        />
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
                              : "Nhập tay"}
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
                                : row.candidateSessions?.length
                                  ? "Chọn / sửa"
                                  : "Nhập Lesson ID"}
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
        open={Boolean(manualEditorRow)}
        title="Xử lý thủ công Lesson HOCMAI"
        onCancel={() => {
          setManualEditorRow(undefined);
          setManualEditorSessionKey(undefined);
          setManualEditorResolution(undefined);
        }}
        okText={
          manualEditorResolution ? "Áp dụng vào preview" : "Kiểm tra Lesson ID"
        }
        confirmLoading={Boolean(resolvingKey)}
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
        {!!manualCandidateSessions.length && (
          <Space direction="vertical" style={{ width: "100%", marginBottom: 16 }}>
            <div>
              <Typography.Text strong>Session HOCMAI</Typography.Text>
              <Select
                showSearch
                optionFilterProp="label"
                value={manualEditorSessionKey}
                placeholder="Chọn session chứa bài học"
                options={manualCandidateSessions.map((session) => ({
                  value: session.key,
                  label: `${session.name} (${session.lessons.length} Lesson)`,
                }))}
                onChange={(sessionKey) => {
                  const session = manualCandidateSessions.find(
                    (item) => item.key === sessionKey,
                  );
                  setManualEditorSessionKey(sessionKey);
                  setManualEditorLessonId(
                    session?.lessons.length === 1
                      ? session.lessons[0].lessonId
                      : "",
                  );
                  setManualEditorResolution(undefined);
                }}
                style={{ width: "100%", marginTop: 6 }}
              />
            </div>
            {manualSelectedSession && (
              <div>
                <Typography.Text strong>Lesson trong session</Typography.Text>
                <Select
                  showSearch
                  optionFilterProp="label"
                  value={
                    manualSelectedSession.lessons.some(
                      (lesson) => lesson.lessonId === manualEditorLessonId,
                    )
                      ? manualEditorLessonId
                      : undefined
                  }
                  placeholder="Chọn đúng Lesson"
                  options={manualSelectedSession.lessons.map((lesson) => ({
                    value: lesson.lessonId,
                    label: lesson.lessonId + " — " + lesson.name,
                  }))}
                  onChange={(lessonId) => {
                    setManualEditorLessonId(lessonId);
                    setManualEditorResolution(undefined);
                  }}
                  style={{ width: "100%", marginTop: 6 }}
                />
              </div>
            )}
            <Typography.Text type="secondary">
              Hệ thống gợi ý các session và Lesson cùng khớp. Hãy chọn đúng
              session theo lịch; nếu cần vẫn có thể nhập Lesson ID trực tiếp bên
              dưới.
            </Typography.Text>
          </Space>
        )}
        <Typography.Text strong>Lesson ID HOCMAI</Typography.Text>
        <Input
          value={manualEditorLessonId}
          placeholder="Nhập Lesson ID"
          onChange={(event) => {
            setManualEditorLessonId(event.target.value.replace(/\D/g, ""));
            setManualEditorResolution(undefined);
          }}
          onPressEnter={() => void resolveManual()}
          style={{ marginTop: 6, marginBottom: 16 }}
        />
        {manualEditorResolution && (
          <Space direction="vertical" style={{ width: "100%" }} size={12}>
            <div>
              <Typography.Text type="secondary">
                Tên hiện tại trên HOCMAI
              </Typography.Text>
              <div>{manualEditorResolution.currentName}</div>
            </div>
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
