"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Table as AntTable,
  Card,
  Button,
  Input,
  InputNumber,
  Modal,
  Drawer,
  Form,
  Tag,
  Space,
  Row,
  Col,
  Typography,
  Upload,
  Tooltip,
  Badge,
  Tabs,
  Select,
  Switch,
  message,
  Alert,
} from "antd";
import {
  PlusOutlined,
  UploadOutlined,
  ReloadOutlined,
  EditOutlined,
  EyeOutlined,
  SearchOutlined,
  UserOutlined,
  TeamOutlined,
  CodeOutlined,
  FileExcelOutlined,
  SettingOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import {
  getRoomConfigs,
  saveRoomConfig,
  importRoomConfigs,
  RoomConfigRecord,
  SaveRoomConfigPayload,
} from "@/services/roomConfigService";
import { useQuizClassesQuery, useQuizLessonsQuery } from "@/hooks/useQuizQueries";
import type { QuizClassOption, QuizLessonOption } from "@/services/quizService";
import { buildLessonSelectOptions } from "@/app/(admin)/quizzes/quiz.utils";
import { FormSection } from "../schedule/components/Modal/ScheduleModal";
import TeachingStaffSelect from "@/components/shared/TeachingStaffSelect";
import CustomTable from "@/components/ui/Table";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function RoomConfigPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RoomConfigRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [filterLearnNumber, setFilterLearnNumber] = useState<number | null>(null);

  // Options fetched from API (quiz classes + lessons — same as quiz modal)

  // Import Modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importRows, setImportRows] = useState<SaveRoomConfigPayload[]>([]);
  const [importProgramCode, setImportProgramCode] = useState<string | undefined>();
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<any | null>(null);


  // Edit / Create Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RoomConfigRecord | null>(null);
  const [form] = Form.useForm();

  // Active tab in Config editor: 'ui' or 'json'
  const [configTab, setConfigTab] = useState<"ui" | "json">("ui");
  const [rawJsonText, setRawJsonText] = useState("{}");
  const [jsonError, setJsonError] = useState<string | null>(null);

  // View Detail Drawer state
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<RoomConfigRecord | null>(null);

  // Watch selected code to load lesson options dynamically (same as quiz modal)
  const selectedCode = Form.useWatch('code', form);
  const classesQuery = useQuizClassesQuery();
  const lessonsQuery = useQuizLessonsQuery(selectedCode);

  const classRows: QuizClassOption[] = Array.isArray(classesQuery.data?.data)
    ? classesQuery.data.data
    : [];
  const lessonRows: QuizLessonOption[] = lessonsQuery.data?.data || [];

  // Build class select options (giống quiz modal)
  const classSelectOptions = classRows.map((cls) => ({
    value: cls.code,
    label: cls.subject_name ? `${cls.code} \u2014 ${cls.subject_name}` : cls.code,
    searchText: `${cls.code} ${cls.subject_name || ''}`.toLowerCase(),
  }));

  const isFieldEditable = (fieldCode: string) => {
    if (
      (fieldCode === 'teacher' || fieldCode === 'assistant_teacher')
    ) {
      return false;
    }
    return true;
  };

  const requiredWhenEditable = (fieldCode: string, message: string) =>
    isFieldEditable(fieldCode) ? [{ required: true, message }] : [];


  // Fetch table data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await getRoomConfigs({
        page,
        limit,
        search: search.trim() || undefined,
        learn_number: filterLearnNumber !== null && filterLearnNumber !== undefined ? filterLearnNumber : undefined,
      });

      if (res?.success) {
        setData(res.data.items || []);
        setTotal(res.data.total || 0);
      } else {
        message.error(res?.message || "Không thể tải danh sách cấu hình phòng học");
      }
    } catch (err: any) {
      message.error(err.message || "Lỗi khi kết nối với máy chủ");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, filterLearnNumber]);


  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sync Form values to Raw JSON Text
  const syncUiFormToJson = (values: any) => {
    const configObj = {
      cam: values.cam ?? false,
      evg: values.evg || "evg",
      mic: values.mic ?? false,
      leaderboard: values.leaderboard ?? true,
      screen_share: values.screen_share ?? false,
      stream_key: values.stream_key || "",
    };
    setRawJsonText(JSON.stringify(configObj, null, 2));
    setJsonError(null);
  };

  // Handle open create/edit modal
  const handleOpenModal = (record?: RoomConfigRecord) => {
    form.resetFields();
    setJsonError(null);
    setConfigTab("ui");

    if (record) {
      setEditingRecord(record);
      const configObj = record.config || {};
      const jsonStr = JSON.stringify(configObj, null, 2);
      setRawJsonText(jsonStr);

      form.setFieldsValue({
        code: record.code,
        learn_number: record.learn_number,
        // Giáo viên: set username để TeachingStaffSelect hiển thị đúng giá trị
        teacher_username: record.teacher?.username || undefined,
        teacher_name: record.teacher?.name || '',
        teacher_hmid: record.teacher?.student_hmid || '',
        // Trợ giảng
        assistant_username: record.assistant_teacher?.username || undefined,
        assistant_name: record.assistant_teacher?.name || '',
        assistant_hmid: record.assistant_teacher?.student_hmid || '',

        // Config UI fields
        cam: configObj.cam ?? false,
        evg: configObj.evg || 'evg',
        mic: configObj.mic ?? false,
        leaderboard: configObj.leaderboard ?? true,
        screen_share: configObj.screen_share ?? false,
        stream_key: configObj.stream_key || '',
        config_json: jsonStr,
      });
    } else {
      setEditingRecord(null);

      const defaultConfig = {
        cam: false,
        evg: 'evg',
        mic: false,
        leaderboard: true,
        screen_share: false,
        stream_key: '',
      };
      const defaultJson = JSON.stringify(defaultConfig, null, 2);
      setRawJsonText(defaultJson);

      form.setFieldsValue({
        code: undefined,
        learn_number: 1,
        teacher_username: undefined,
        assistant_username: undefined,
        ...defaultConfig,
        config_json: defaultJson,
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveSubmit = async () => {
    try {
      const values = await form.validateFields();

      let finalConfig: any = {};
      if (configTab === "json") {
        try {
          finalConfig = JSON.parse(rawJsonText);
          setJsonError(null);
        } catch (e) {
          setJsonError("Cấu hình JSON không hợp lệ. Vui lòng kiểm tra lại cú pháp.");
          message.error("Định dạng JSON không hợp lệ");
          return;
        }
      } else {
        finalConfig = {
          cam: values.cam ?? false,
          evg: values.evg || "evg",
          mic: values.mic ?? false,
          leaderboard: values.leaderboard ?? true,
          screen_share: values.screen_share ?? false,
          stream_key: values.stream_key || "",
        };
      }

      setSaving(true);
      const codeVal = String(values.code).trim();
      const learnNumberVal = Number(values.learn_number);
      // class_id = code + learn_number nối trực tiếp (ví dụ: toan-6-2027 + 14 = toan-6-202714)
      const classId = `${codeVal}${learnNumberVal}`;

      const payload: SaveRoomConfigPayload = {
        code: codeVal,
        learn_number: learnNumberVal,
        config: finalConfig,
      };

      // Teacher staff info (room_id = 1)
      if (values.teacher_username && values.teacher_username.trim()) {
        payload.teacher = {
          username: values.teacher_username.trim(),
          student_hmid: values.teacher_hmid ? String(values.teacher_hmid).trim() : '',
          name: values.teacher_name ? values.teacher_name.trim() : '',
          code: codeVal,
          learn_number: learnNumberVal,
          islearn: 0,
          room_id: 1,
          class_id: classId,
        };
      }

      // Assistant teacher staff info (room_id = 1)
      if (values.assistant_username && values.assistant_username.trim()) {
        payload.assistant_teacher = {
          username: values.assistant_username.trim(),
          student_hmid: values.assistant_hmid ? String(values.assistant_hmid).trim() : '',
          name: values.assistant_name ? values.assistant_name.trim() : '',
          code: codeVal,
          learn_number: learnNumberVal,
          islearn: 0,
          room_id: 1,
          class_id: classId,
        };
      }

      const res: any = await saveRoomConfig(payload);
      if (res?.success) {
        message.success(editingRecord ? "Cập nhật cấu hình phòng học thành công!" : "Tạo cấu hình phòng học mới thành công!");
        setIsModalOpen(false);
        fetchData();
      } else {
        message.error(res?.message || "Lưu cấu hình thất bại");
      }
    } catch (err: any) {
      if (err.errorFields) return;
      message.error(err.message || "Đã xảy ra lỗi khi lưu");
    } finally {
      setSaving(false);
    }
  };

  // Handle viewing detail drawer
  const handleViewDetail = (record: RoomConfigRecord) => {
    setDetailRecord(record);
    setIsDetailDrawerOpen(true);
  };

  const prepareImportRows = (jsonRows: any[]) => {
    if (!importProgramCode) {
      message.warning("Vui lòng chọn Chương trình trước khi đọc dữ liệu import");
      return;
    }
    const errors: string[] = [];
    const parsedRows: SaveRoomConfigPayload[] = [];
    jsonRows.forEach((row: any, index) => {
      const rowNumber = index + 2;
      const sourceCode = String(row.subject || row.code || row["Mã chương trình"] || row["Mã môn"] || row["subject_code"] || "").trim();
      const code = sourceCode || importProgramCode;
      const learn_number = Number(row.learn_number || row["Bài"] || row["Buổi học"] || row["learnNumber"] || 0);
      if (code !== importProgramCode) {
        errors.push(`Dòng ${rowNumber}: không thuộc Chương trình ${importProgramCode}`);
        return;
      }
      if (!Number.isInteger(learn_number) || learn_number <= 0) {
        errors.push(`Dòng ${rowNumber}: Số bài phải là số nguyên lớn hơn 0`);
        return;
      }

      let configObj: Record<string, unknown> = {};
      if (row.config) {
        if (typeof row.config === "object" && !Array.isArray(row.config)) configObj = row.config;
        else if (typeof row.config === "string") {
          try { configObj = JSON.parse(row.config); } catch { errors.push(`Dòng ${rowNumber}: Cấu hình JSON không hợp lệ`); return; }
        }
      }

      const payloadRow: SaveRoomConfigPayload = { code, learn_number, config: configObj };
      parsedRows.push(payloadRow);
    });
    setImportRows(parsedRows);
    setImportErrors(errors);
    if (errors.length) message.warning(`Đã đọc ${parsedRows.length} dòng hợp lệ, có ${errors.length} dòng cần sửa`);
    else message.success(`Đã đọc ${parsedRows.length} dòng hợp lệ`);
  };

  const downloadImportTemplate = () => {
    const worksheet = XLSX.utils.json_to_sheet([{
      learn_number: 1,
      config: '{"cam":false,"evg":"evg","mic":false,"leaderboard":true,"screen_share":false,"stream_key":""}',
    }]);
    worksheet['!cols'] = [
      { wch: 14 }, { wch: 76 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Cấu hình phòng');
    XLSX.writeFile(workbook, 'mau-import-cau-hinh-phong-hoc.xlsx');
  };

  // Process uploaded Excel / CSV for Import Modal
  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const buffer = new Uint8Array(e.target.result);
        const workbook = XLSX.read(buffer, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet);

        prepareImportRows(jsonRows);
      } catch (err: any) {
        message.error("Lỗi khi đọc file Excel/CSV: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
    return false;
  };

  // Submit Import
  const handleExecuteImport = async () => {
    if (importRows.length === 0) {
      message.warning("Không có dữ liệu để import");
      return;
    }

    setImporting(true);
    setImportResult(null);
    try {
      const res: any = await importRoomConfigs(importProgramCode!, importRows);
      if (res?.success) {
        setImportResult(res.data);
        message.success(res.message || "Import cấu hình phòng hoàn tất!");
        fetchData();
      } else {
        message.error(res?.message || "Import thất bại");
      }
    } catch (err: any) {
      message.error(err.message || "Lỗi trong quá trình import");
    } finally {
      setImporting(false);
    }
  };

  // Table columns definition with user-friendly labels
  const columns = [
    {
      title: "STT",
      key: "stt",
      width: 60,
      align: "center" as const,
      render: (_: any, __: any, index: number) => (page - 1) * limit + index + 1,
    },
    {
      title: "Mã lớp",
      dataIndex: "code",
      key: "code",
      render: (text: string) => {
        const found = classRows.find((s) => s.code === text);
        return (
          <Space direction="vertical" size={0}>
            <Tag color="blue" style={{ fontSize: 13, padding: "2px 8px" }}>
              {text}
            </Tag>
          </Space>
        );
      },
    },
    {
      title: "Bài thứ",
      dataIndex: "learn_number",
      key: "learn_number",
      width: 120,
      align: "center" as const,
      render: (val: number) => (
        <Badge count={`Bài ${val}`} style={{ backgroundColor: "#52c41a", padding: "0 8px" }} />
      ),
    },
    {
      title: "Giáo viên phụ trách",
      key: "teacher",
      render: (record: RoomConfigRecord) => {
        if (!record.teacher) {
          return <Text type="secondary" style={{ fontStyle: "italic" }}>Chưa gán Giáo viên</Text>;
        }
        return (
          <Space direction="vertical" size={2}>
            <Space>
              <UserOutlined style={{ color: "#1890ff" }} />
              <Text>{record.teacher.name || record.teacher.username}</Text>
            </Space>
          </Space>
        );
      },
    },
    {
      title: "Trợ giảng phụ trách",
      key: "assistant_teacher",
      render: (record: RoomConfigRecord) => {
        if (!record.assistant_teacher) {
          return <Text type="secondary" style={{ fontStyle: "italic" }}>Chưa gán Trợ giảng</Text>;
        }
        return (
          <Space direction="vertical" size={2}>
            <Space>
              <TeamOutlined style={{ color: "#722ed1" }} />
              <Text>{record.assistant_teacher.name || record.assistant_teacher.username}</Text>
            </Space>
            {/* {record.assistant_teacher.student_hmid && (
              <Tag color="purple">Mã: {record.assistant_teacher.student_hmid}</Tag>
            )} */}
          </Space>
        );
      },
    },
    {
      title: "Cấu hình phòng học",
      key: "config",
      ellipsis: true,
      render: (record: RoomConfigRecord) => {
        const config = record.config || {};
        return (
          <Space direction="vertical" size={2}>
            <Space size={4} wrap>
              <Tag color={config.cam ? "success" : "default"}>Cam: {config.cam ? "Bật" : "Tắt"}</Tag>
              <Tag color={config.mic ? "success" : "default"}>Mic: {config.mic ? "Bật" : "Tắt"}</Tag>
              <Tag color={config.screen_share ? "success" : "default"}>
                Share màn hình: {config.screen_share ? "Bật" : "Tắt"}
              </Tag>
            </Space>
            <Button
              type="link"
              size="small"
              style={{ padding: 0, height: "auto" }}
              onClick={() => handleViewDetail(record)}
            >
              Xem chi tiết
            </Button>
          </Space>
        );
      },
    },
    {
      title: "Cập nhật lần cuối",
      key: "updated",
      width: 170,
      render: (record: RoomConfigRecord) => (
        <Space direction="vertical" size={0}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.updated_by || "Hệ thống"}
          </Text>
          <Text style={{ fontSize: 11, color: "#8c8c8c" }}>
            {record.updated_at ? dayjs(record.updated_at).format("DD/MM/YYYY HH:mm") : "-"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 130,
      align: "center" as const,
      render: (record: RoomConfigRecord) => (
        <Space>
          <Tooltip title="Xem chi tiết cấu hình">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>
          <Tooltip title="Chỉnh sửa cấu hình">
            <Button
              type="primary"
              ghost
              icon={<EditOutlined />}
              onClick={() => handleOpenModal(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Header section */}
      <Card
        style={{
          marginBottom: 16,
          borderRadius: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col>
            <Title level={5} style={{ margin: 0, color: "#1f2937" }}>
              <VideoCameraOutlined style={{ color: "#1677ff", marginRight: 10 }} />
              Cấu hình Phòng học Trực tuyến
            </Title>
            <Text type="secondary">
              Quản lý cấu hình phòng học livestream và tự động gán Giáo viên & Trợ giảng cho từng buổi học.
            </Text>
          </Col>
          <Col>
            <Space wrap>
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchData}
                loading={loading}
              >
                Làm mới
              </Button>
              <Button
                icon={<FileExcelOutlined />}
                style={{ backgroundColor: "#2e7d32", color: "#fff", borderColor: "#2e7d32" }}
                onClick={() => {
                  setImportRows([]);
                  setImportProgramCode(undefined);
                  setImportErrors([]);
                  setImportResult(null);
                  setIsImportModalOpen(true);
                }}
              >
                Import file
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => handleOpenModal()}
              >
                Thêm cấu hình mới
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>
      {/* Main Data Table */}
      <Card
        style={{
          borderRadius: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        <Row gutter={[16, 16]} align="middle" style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Tìm kiếm môn học, mã môn hoặc người cập nhật..."
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <InputNumber
              style={{ width: "100%" }}
              placeholder="Lọc số buổi học..."
              value={filterLearnNumber}
              onChange={(val) => setFilterLearnNumber(val)}
              min={1}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Button
              onClick={() => {
                setSearch("");
                setFilterLearnNumber(null);
              }}
            >
              Xóa bộ lọc
            </Button>
          </Col>
        </Row>
        <CustomTable
          columns={columns}
          dataSource={data}
          rowKey={(record) => `${record.code}_${record.learn_number}`}
          loading={loading}
          pagination={{
            current: page,
            pageSize: limit,
            total,
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50", "100"],
            onChange: (p, l) => {
              setPage(p);
              setLimit(l);
            },
            showTotal: (totalCount) => `Tổng số ${totalCount} cấu hình phòng học`,
          }}
        />
      </Card>

      {/* Modal Create / Edit Room Config */}
      <Modal
        title={
          <span>{editingRecord ? "Chỉnh sửa Cấu hình Phòng học" : "Tạo Cấu hình Phòng học mới"}</span>
        }
        centered
        open={isModalOpen}
        onOk={handleSaveSubmit}
        onCancel={() => setIsModalOpen(false)}
        confirmLoading={saving}
        width={780}
        styles={{
          content: {
            maxHeight: 'calc(100vh - 32px)',
            display: 'flex',
            flexDirection: 'column',
          },
          body: {
            flex: 1,
            minHeight: 0,
            maxHeight: 'calc(100vh - 200px)',
            overflowY: 'auto',
            overflowX: 'hidden',
            paddingRight: 8,
          },
        }}
        okText="Lưu Cấu Hình"
        cancelText="Hủy"
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 16 }}
          onValuesChange={(_, allValues) => {
            if (configTab === "ui") {
              syncUiFormToJson(allValues);
            }
          }}
        >
          <FormSection title="Thông tin buổi học">
            <Row gutter={24}>
              <Col span={14}>
                <Form.Item
                  label="Mã lớp"
                  name="code"
                  rules={[{ required: true, message: 'Vui lòng chọn mã lớp' }]}
                >
                  <Select
                    showSearch
                    placeholder="Chọn mã lớp học"
                    options={classSelectOptions}
                    loading={classesQuery.isLoading || classesQuery.isValidating}
                    optionFilterProp="searchText"
                    popupMatchSelectWidth={480}
                    onChange={() => {
                      form.setFieldValue('learn_number', undefined);
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={10}>
                <Form.Item
                  label="Bài thứ"
                  name="learn_number"
                  rules={[{ required: true, message: 'Chọn bài thứ' }]}
                >
                  <Select
                    showSearch
                    options={buildLessonSelectOptions(lessonRows, editingRecord?.learn_number)}
                    placeholder={selectedCode ? 'Chọn buổi học' : 'Chọn mã lớp trước'}
                    disabled={!selectedCode}
                    loading={lessonsQuery.isLoading || lessonsQuery.isValidating}
                    optionFilterProp="label"
                    popupMatchSelectWidth={500}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={24}>
              <Col span={12}>
                <Form.Item label="Giáo viên" name="teacher_username">
                  <TeachingStaffSelect
                    teacherType={1}
                    showSearch
                    optionFilterProp="label"
                    placeholder="Chọn giáo viên"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Trợ giảng" name="assistant_username">
                  <TeachingStaffSelect
                    teacherType={0}
                    showSearch
                    optionFilterProp="label"
                    placeholder="Chọn trợ giảng"
                  />
                </Form.Item>
              </Col>
            </Row>
            {selectedCode && (
              <div style={{ marginBottom: 12, padding: '8px 12px', background: '#f5f5f5', borderRadius: 6, fontSize: 13 }}>
                <Space split="|" size={16}>
                  <span><Text type="secondary">Mã lớp:</Text> <Text strong>{selectedCode}</Text></span>
                  {classRows.find(c => c.code === selectedCode)?.subject_name && (
                    <span><Text type="secondary">Môn học:</Text> <Text strong>{classRows.find(c => c.code === selectedCode)?.subject_name}</Text></span>
                  )}
                  {classRows.find(c => c.code === selectedCode)?.lesson_count !== undefined && (
                    <span><Text type="secondary">Số bài:</Text> <Text strong>{classRows.find(c => c.code === selectedCode)?.lesson_count}</Text></span>
                  )}
                </Space>
              </div>
            )}
          </FormSection>

          <FormSection title="Cấu hình phòng học">
            <Tabs
              activeKey={configTab}
              onChange={(key) => setConfigTab(key as "ui" | "json")}
              items={[
                {
                  key: "ui",
                  label: (
                    <span>
                      <SettingOutlined /> Cấu hình Trực quan (Dễ sử dụng)
                    </span>
                  ),
                  children: (
                    <div style={{ paddingTop: 8 }}>
                      <Row gutter={[16, 8]}>
                        <Col span={6}>
                          <Form.Item label="Camera" name="cam" valuePropName="checked">
                            <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item label="Microphone" name="mic" valuePropName="checked">
                            <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item label="Leaderboard" name="leaderboard" valuePropName="checked">
                            <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item label="Chia sẻ màn hình" name="screen_share" valuePropName="checked">
                            <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Row gutter={16}>
                        <Col span={12}>
                          <Form.Item label="EVG" name="evg">
                            <Input placeholder="evg" />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item label="Stream Key" name="stream_key">
                            <Input placeholder="mã-stream-key" />
                          </Form.Item>
                        </Col>
                      </Row>
                    </div>),
                },
                {
                  key: "json",
                  label: (
                    <span>
                      <CodeOutlined /> Mã JSON Cấu hình (Nâng cao)
                    </span>
                  ),
                  children: (
                    <div style={{ paddingTop: 8 }}>
                      {jsonError && <Alert message={jsonError} type="error" showIcon style={{ marginBottom: 12 }} />}
                      <Form.Item label="Nội dung Raw JSON">
                        <TextArea
                          rows={9}
                          value={rawJsonText}
                          onChange={(e) => {
                            setRawJsonText(e.target.value);
                            setJsonError(null);
                          }}
                          style={{ fontFamily: "monospace", fontSize: 13 }}
                        />
                      </Form.Item>
                    </div>
                  ),
                },
              ]}
            />
          </FormSection>
        </Form>
      </Modal>

      {/* Drawer View Detail */}
      <Drawer
        title={`Chi tiết Cấu hình Phòng học: ${detailRecord?.code} - Bài ${detailRecord?.learn_number}`}
        placement="right"
        width={600}
        onClose={() => setIsDetailDrawerOpen(false)}
        open={isDetailDrawerOpen}
      >
        {detailRecord && (
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            <Card size="small" title="Thông tin Tổng quan">
              <Paragraph>
                <Text strong>Mã môn học: </Text>
                <Tag color="blue">{detailRecord.code}</Tag>
              </Paragraph>
              <Paragraph>
                <Text strong>Số buổi học: </Text>
                <Tag color="green">Buổi {detailRecord.learn_number}</Tag>
              </Paragraph>
              <Paragraph>
                <Text strong>Người cập nhật: </Text>
                {detailRecord.updated_by || "Hệ thống"}
              </Paragraph>
              <Paragraph>
                <Text strong>Thời gian cập nhật: </Text>
                {detailRecord.updated_at ? dayjs(detailRecord.updated_at).format("DD/MM/YYYY HH:mm:ss") : "-"}
              </Paragraph>
            </Card>

            <Card size="small" title="Giáo viên & Trợ giảng phụ trách">
              <Paragraph>
                <Text strong>Giáo viên (room_id = 1): </Text>
                {detailRecord.teacher ? (
                  <Tag color="blue">{detailRecord.teacher.name || detailRecord.teacher.username} ({detailRecord.teacher.student_hmid || ""})</Tag>
                ) : (
                  <Text type="secondary">Chưa gán</Text>
                )}
              </Paragraph>
              <Paragraph>
                <Text strong>Trợ giảng (room_id = 2): </Text>
                {detailRecord.assistant_teacher ? (
                  <Tag color="purple">{detailRecord.assistant_teacher.name || detailRecord.assistant_teacher.username} ({detailRecord.assistant_teacher.student_hmid || ""})</Tag>
                ) : (
                  <Text type="secondary">Chưa gán</Text>
                )}
              </Paragraph>
            </Card>

            <Card size="small" title="Nội dung Cấu hình (JSON)">
              <Paragraph copyable={{ text: JSON.stringify(detailRecord.config, null, 2) }}>
                <Text type="secondary">Sao chép mã JSON</Text>
              </Paragraph>
              <pre
                style={{
                  background: "#282c34",
                  color: "#abb2bf",
                  padding: 12,
                  borderRadius: 6,
                  maxHeight: 320,
                  overflow: "auto",
                  fontSize: 12,
                }}
              >
                {JSON.stringify(detailRecord.config || {}, null, 2)}
              </pre>
            </Card>
          </Space>
        )}
      </Drawer>

      {/* Modal Import Bulk */}
      <Modal
        title={
          <Space>
            <FileExcelOutlined style={{ color: "#52c41a" }} />
            <span>Import Cấu hình Phòng học từ Excel</span>
          </Space>
        }
        open={isImportModalOpen}
        onCancel={() => setIsImportModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsImportModalOpen(false)}>
            Đóng
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={importing}
            onClick={handleExecuteImport}
            disabled={importRows.length === 0 || !importProgramCode || importErrors.length > 0}
          >
            Thực hiện Import ({importRows.length} dòng)
          </Button>,
        ]}
        width={800}
        destroyOnClose
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Import được thực hiện cho đúng một Chương trình"
          description="Chọn Chương trình trước, sau đó tải file Excel. Nếu có cột Mã chương trình, giá trị phải trùng với lựa chọn này."
        />
        <Form.Item label="Chương trình" required style={{ marginBottom: 12 }}>
          <Select
            showSearch
            placeholder="Chọn Chương trình để import"
            value={importProgramCode}
            options={classSelectOptions}
            optionFilterProp="searchText"
            onChange={(value) => {
              setImportProgramCode(value);
              setImportRows([]);
              setImportErrors([]);
            }}
          />
        </Form.Item>
        <Tabs
          defaultActiveKey="file"
          items={[
            {
              key: "file",
              label: "1. Upload File Excel / CSV",
              children: (
                <div style={{ padding: "16px 0" }}>
                  <Upload.Dragger
                    accept=".xlsx, .xls, .csv"
                    beforeUpload={handleFileUpload}
                    showUploadList={false}
                  >
                    <p className="ant-upload-drag-icon">
                      <UploadOutlined style={{ fontSize: 36, color: "#1677ff" }} />
                    </p>
                    <p className="ant-upload-text">Nhấp hoặc Kéo thả file Excel (.xlsx, .csv) vào đây</p>
                    <p className="ant-upload-hint">
                      Tải file mẫu để dùng đúng các cột: <Text code>learn_number</Text>, <Text code>config</Text>. Giáo viên và trợ giảng được quản lý tại Lịch học.
                    </p>
                    <Button type="link" onClick={(event) => { event.stopPropagation(); downloadImportTemplate(); }}>
                      Tải file mẫu Excel
                    </Button>
                  </Upload.Dragger>
                </div>
              ),
            },
          ]}
        />

        {importErrors.length > 0 && (
          <Alert
            style={{ marginTop: 16 }}
            type="error"
            showIcon
            message={`Có ${importErrors.length} dòng không hợp lệ`}
            description={<ul style={{ margin: 0, paddingLeft: 18 }}>{importErrors.slice(0, 10).map((error) => <li key={error}>{error}</li>)}</ul>}
          />
        )}

        {importRows.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Alert
              message={`Đã chuẩn bị ${importRows.length} dòng dữ liệu sẵn sàng lưu`}
              type="success"
              showIcon
              style={{ marginBottom: 12 }}
            />
            <AntTable
              size="small"
              dataSource={importRows}
              rowKey={(r, idx) => `${r.code}_${r.learn_number}_${idx}`}
              pagination={{ pageSize: 5 }}
              columns={[
                { title: "Mã môn", dataIndex: "code", key: "code" },
                { title: "Bài học", dataIndex: "learn_number", key: "learn_number" },
              ]}
            />
          </div>
        )}

        {importResult && (
          <div style={{ marginTop: 16 }}>
            <Alert
              message={`Kết quả Import: Thành công ${importResult.successCount}/${importResult.total} bản ghi`}
              type={importResult.errorCount > 0 ? "warning" : "success"}
              showIcon
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
