'use client';
import Table from '@/components/ui/Table';
import responsive from './responsive.module.css';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, Collapse, Descriptions, Drawer, Form, Grid, Input, InputNumber, Modal, Select, Space, Switch, Tabs, Tag, Steps, Typography, message } from 'antd';
import type { InputNumberProps } from 'antd';
import { useAuthStore } from '@/stores/authStore';
import styles from './runtime.module.css';
import JevScopeFields, { jevCalendarLabel } from './JevScopeFields';
import L1Panel from './L1Panel';
import JevSyncStatus from './JevSyncStatus';
import PublishedPolicySelect from './PublishedPolicySelect';
import PolicyGuideEditor from './PolicyGuideEditor';
import PolicyRulesTable from './PolicyRulesTable';
import PolicyTemplatesEditor from './PolicyTemplatesEditor';
import PolicyPreview from './PolicyPreview';
import PolicyCreateModal from './PolicyCreateModal';
import { categoryName, contextNames, incidentLabel, levelName } from './policyLabels';
import policyStyles from './policy.module.css';
import { jevRequest, type JevPolicy, type JevBinding } from '@/services/jevService';

const pretty = (value: unknown) => JSON.stringify(value, null, 2);
const integerDisplay = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
const groupedIntegerProps: Pick<InputNumberProps<number | ''>, 'formatter' | 'parser'> = {
  formatter: (value, { userTyping, input }) => {
    if (userTyping) return input;
    return value == null || value === '' ? '' : integerDisplay.format(Number(value));
  },
  parser: display => {
    const digits = (display ?? '').replace(/[.\s]/g, '');
    return digits === '' ? '' : Number(digits);
  },
};
const modes = ['off', 'shadow', 'enforce'].map(value => ({ value, label: value === 'off' ? 'Tắt' : value === 'shadow' ? 'Quan sát (shadow)' : 'Thực thi (enforce)' }));
const bindingModes = [{ value: 'off', label: 'Tắt kiểm duyệt JEV' }, { value: 'shadow', label: 'Chỉ theo dõi, chưa xử lý vi phạm' }, { value: 'enforce', label: 'Áp dụng quy tắc xử lý vi phạm' }];
const bindingModeName = (mode: string) => bindingModes.find(item => item.value === mode)?.label ?? 'Chưa xác định';
function bindingModeHelp(mode: string, scopeType: string) {
  switch (mode) {
    case 'off': return {
      description: 'JEV không đánh giá và không áp dụng thêm biện pháp xử lý vi phạm cho lựa chọn này. Các hạn chế chat đã áp dụng trước đó không tự được gỡ bỏ.',
      example: 'Nếu học sinh đang bị tạm cấm chat, việc tắt JEV không tự cho phép học sinh đó chat lại.',
    };
    case 'shadow': return {
      description: 'JEV đánh giá và ghi nhận kết quả để bạn theo dõi, nhưng chưa nhắc nhở hay hạn chế chat theo kết quả đó. Cần chọn một bộ cấu hình đã phát hành.',
      example: 'Nếu JEV nhận diện một tin nhắn có nội dung xúc phạm, hệ thống chỉ ghi nhận kết quả; JEV chưa áp dụng biện pháp xử lý cho tin nhắn đó.',
    };
    case 'enforce': return {
      description: 'JEV áp dụng biện pháp xử lý theo bộ cấu hình đã chọn, như nhắc nhở, báo giáo viên hoặc tạm hạn chế chat. Chỉ xử lý khi chế độ vận hành toàn hệ thống cho phép.',
      example: 'Nếu bộ cấu hình quy định nhắc riêng khi phát hiện lời xúc phạm, JEV có thể gửi lời nhắc riêng cho học sinh. Biện pháp cụ thể phụ thuộc quy tắc và mức độ vi phạm.',
    };
    case 'inherit': return scopeType === 'CALENDAR' ? {
      description: 'Buổi học dùng thiết lập của chương trình. Nếu chương trình chưa có thiết lập riêng, hệ thống dùng cấu hình mặc định. Không cần chọn bộ cấu hình riêng cho buổi này.',
      example: 'Nếu chương trình đang chỉ theo dõi, buổi học cũng chỉ theo dõi. Khi thiết lập chung thay đổi, buổi học sẽ dùng thiết lập chung mới.',
    } : {
      description: 'Chương trình dùng cấu hình mặc định của hệ thống. Không cần chọn bộ cấu hình riêng cho chương trình này.',
      example: 'Nếu mặc định hệ thống tắt JEV, chương trình này cũng tắt JEV. Khi mặc định thay đổi, chương trình sẽ dùng thiết lập mặc định mới.',
    };
    default: return { description: 'Chọn một cách kiểm duyệt để xem tác dụng.', example: '' };
  }
}
const gateLabels: Record<string, string> = { pCategoryMin: 'Xác suất nhóm', categoryConfidenceMin: 'Độ tin cậy nhóm', pSeverityMin: 'Xác suất mức', severityConfidenceMin: 'Độ tin cậy mức' };
const actionNames: Record<string, string> = { ALLOW: 'Cho qua', BLOCK: 'Giữ / chặn tin', PRIVATE_NUDGE: 'Nhắc riêng học sinh', TEACHER_ALERT: 'Báo giáo viên', SAFETY_ALERT: 'Cảnh báo an toàn', SAFETY_SUPPORT: 'Hỗ trợ học sinh', COUNT_STRIKE: 'Tăng lượt', SLOW_MODE: 'Giãn cách chat', MUTE: 'Tạm cấm chat' };
const JsonValidityContext = React.createContext<(label: string, valid: boolean) => void>(() => {});
function JsonEditor({ value, onChange, disabled, label }: { value: any; onChange: (value: any) => void; disabled?: boolean; label: string }) {
  const [text, setText] = useState(pretty(value));
  const [error, setError] = useState('');
  const validity = React.useContext(JsonValidityContext);
  useEffect(() => {
    setText(previous => { try { if (pretty(JSON.parse(previous)) === pretty(value)) return previous; } catch {} return pretty(value); });
    setError(''); validity(label, true);
  }, [value, label, validity]);
  return <Space direction="vertical" style={{ width: '100%' }}><Input.TextArea aria-label={label} rows={18} value={text} disabled={disabled}
    style={{ fontFamily: 'monospace' }} onChange={e => { setText(e.target.value); try { const parsed = JSON.parse(e.target.value); onChange(parsed); setError(''); validity(label, true); } catch { validity(label, false); setError('JSON chưa hợp lệ; hãy sửa trước khi lưu bản nháp.'); } }} />{error && <Alert type="error" message={error} />}</Space>;
}

export default function JevPage() {
  const screens = Grid.useBreakpoint();
  const has = useAuthStore(s => s.hasPermission);
  const canView = has('jev.view');
  const [policies, setPolicies] = useState<JevPolicy[]>([]);
  const [policyPage, setPolicyPage] = useState(1), [policyTotal, setPolicyTotal] = useState(0);
  const [bindings, setBindings] = useState<JevBinding[]>([]);
  const [bindingPage, setBindingPage] = useState(1), [bindingTotal, setBindingTotal] = useState(0);
  const [runtime, setRuntime] = useState<{ revision: number; settings: any } | null>(null);
  const [runtimeDraft, setRuntimeDraft] = useState<any>(null);
  const [status, setStatus] = useState<any>(null), [statusError, setStatusError] = useState('');
  const [statusChecking, setStatusChecking] = useState(false), [statusCheckedAt, setStatusCheckedAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState(''), [syncResult, setSyncResult] = useState<{ confirmed: boolean } | null>(null);
  const [current, setCurrent] = useState<JevPolicy | null>(null), [config, setConfig] = useState<any>(null);
  const [dirty, setDirty] = useState(false), [busy, setBusy] = useState(false), [feedback, setFeedback] = useState('');
  const [validation, setValidation] = useState<any>(null), [preview, setPreview] = useState<any>(null);
  const [conflict, setConflict] = useState<any>(null);
  const [bindingDetails, setBindingDetails] = useState<JevBinding | null>(null);
  const [bindingEdit, setBindingEdit] = useState<JevBinding | 'new' | null>(null);
  const [bindingForm] = Form.useForm(), [previewForm] = Form.useForm();
  const [createOpen, setCreateOpen] = useState(false), [cloneFrom, setCloneFrom] = useState<JevPolicy | null>(null);
  const [invalidJson, setInvalidJson] = useState<Record<string, boolean>>({});
  const trackJsonValidity = useCallback((label: string, valid: boolean) => {
    setInvalidJson(previous => previous[label] === !valid ? previous : { ...previous, [label]: !valid });
    if (!valid) { setDirty(true); setValidation(null); setPreview(null); }
  }, []);
  const jsonInvalid = Object.values(invalidJson).some(Boolean);
  const [detailTab, setDetailTab] = useState('overview');
  const [ruleIndex, setRuleIndex] = useState<number | null>(null);
  const detailRequest = useRef(0);
  const editable = current?.status === 'DRAFT' && has('jev.edit');
  const showError = (e: any) => { message.error({ key: 'jev-error', content: e.message || 'Không thể xử lý yêu cầu' }); setFeedback(e.detail?.issues ? pretty(e.detail.issues) : e.message); };
  const loadPolicies = useCallback(async () => {
    const result = await jevRequest(`/policies?page=${policyPage}`); setPolicies(result.data.rows); setPolicyTotal(result.data.total);
  }, [policyPage]);
  const loadBindings = useCallback(async () => {
    const result = await jevRequest(`/bindings?page=${bindingPage}`); setBindings(result.data.rows); setBindingTotal(result.data.total);
  }, [bindingPage]);
  const loadRuntime = useCallback(async () => { const r = await jevRequest('/runtime'); setRuntime(r.data); setRuntimeDraft(r.data.settings); }, []);
  const loadStatus = useCallback(async () => {
    setStatusChecking(true);
    try { const r = await jevRequest('/status'); setStatus(r.data); setStatusError(''); }
    catch (e: any) { setStatusError(e.message || 'Không lấy được trạng thái'); }
    finally { setStatusCheckedAt(new Date().toISOString()); setStatusChecking(false); }
  }, []);
  useEffect(() => { if (canView) void loadPolicies().catch(showError); }, [canView, loadPolicies]);
  useEffect(() => { if (canView) void loadBindings().catch(showError); }, [canView, loadBindings]);
  useEffect(() => { if (canView) { void loadRuntime().catch(showError); void loadStatus(); } }, [canView, loadRuntime, loadStatus]);
  useEffect(() => { const guard = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } }; window.addEventListener('beforeunload', guard); return () => window.removeEventListener('beforeunload', guard); }, [dirty]);
  const task = async (action: () => Promise<void>) => { setBusy(true); try { await action(); } catch (e: any) { if (Array.isArray(e?.errorFields)) return; showError(e); if (e.status === 409) setConflict({ message: e.message }); } finally { setBusy(false); } };
  const openPolicy = async (row: JevPolicy) => {
    const requestId = ++detailRequest.current;
    const r = await jevRequest(`/policies/${row.id}`);
    if (requestId !== detailRequest.current) return;
    setCurrent(r.data); setConfig(r.data.config_json); setDirty(false); setValidation(null); setPreview(null); setConflict(null); setRuleIndex(null); setInvalidJson({}); setDetailTab('overview');
  };
  const change = (value: any) => { setConfig(value); setDirty(true); setValidation(null); setPreview(null); };
  const patchPolicy = (key: string, value: any) => change({ ...config, policy: { ...config.policy, [key]: value } });
  const save = () => task(async () => {
    if (!current) return;
    const r = await jevRequest(`/policies/${current.id}`, 'PUT', { expectedEditRevision: current.edit_revision, config });
    setCurrent(r.data); setConfig(r.data.config_json); setDirty(false); setValidation(null); setPreview(null); message.success('Đã lưu bản nháp'); await loadPolicies();
  });
  const synchronize = (result: any) => { if (result.sync) { setFeedback(result.sync.message); if (!result.sync.confirmed) message.warning(result.sync.message); } };
  const publish = () => Modal.confirm({ title: 'Phát hành bộ cấu hình?', content: 'Bản phát hành chỉ được đọc. Sau đó, chọn bản này trong Thiết lập từng lớp để sử dụng.', okText: 'Phát hành', cancelText: 'Hủy', onOk: () => task(async () => {
    await jevRequest(`/policies/${current!.id}/publish`, 'POST', { expectedEditRevision: current!.edit_revision });
    await openPolicy(current!); await loadPolicies(); message.success('Đã phát hành');
  }) });
  const openBinding = (row: JevBinding | 'new') => {
    setBindingEdit(row); setConflict(null);
    bindingForm.setFieldsValue(row === 'new' ? { scopeType: 'CALENDAR', scopeKey: undefined, programCode: undefined, mode: 'inherit', policyVersionId: null } : {
      programCode: row.calendar?.code, scopeType: row.scope_type, scopeKey: row.scope_key, mode: row.mode, policyVersionId: row.policy_version_id,
    });
  };
  const saveBinding = () => task(async () => {
    const values = await bindingForm.validateFields();
    const active = ['shadow', 'enforce'].includes(values.mode);
    const r = await jevRequest('/bindings', 'PUT', { scopeType: values.scopeType, mode: values.mode, scopeKey: values.scopeType === 'GLOBAL' ? '*' : values.scopeKey,
      policyVersionId: active ? values.policyVersionId : null, expectedRevision: bindingEdit === 'new' ? 0 : (bindingEdit as JevBinding).revision });
    synchronize(r); setBindingEdit(null); await loadBindings(); await loadStatus();
    // Keep unsaved runtime form intact. Its old revision will conflict and require comparison.
  });
  const settings = runtimeDraft;
  const setSettings = (key: string, value: any) => setRuntimeDraft({ ...settings, [key]: value });
  const policy = config?.policy;
  const rule = ruleIndex === null ? null : policy?.rules?.[ruleIndex];
  const setRule = (value: any) => patchPolicy('rules', policy.rules.map((r: any, index: number) => index === ruleIndex ? value : r));
  const categories = policy?.framework?.categories || [];
  const levels = policy?.framework?.levels || [];

  if (!canView) return <Alert type="warning" message="Bạn chưa có quyền xem cấu hình JEV" />;
  return <JsonValidityContext.Provider value={trackJsonValidity}><div className={`admin-responsive-page ${responsive.page}`}>
    <Typography.Title level={3}>Cấu hình kiểm duyệt JEV</Typography.Title>
    <Alert type="info" message="Phát hành bộ cấu hình chưa tự bật kiểm duyệt" description="Sau khi phát hành, chọn nơi áp dụng trong mục Thiết lập từng lớp và kiểm tra mục Chế độ chung. Tắt JEV không tự gỡ các hạn chế chat đã áp dụng." />
    {feedback && <Alert type="warning" message={<span style={{ whiteSpace: 'pre-wrap' }}>{feedback}</span>} closable onClose={() => setFeedback('')} />}
    <Tabs defaultActiveKey="policies" items={[
      ...(has('l1.view') ? [{ key: 'l1', label: 'Bộ lọc L1', children: <L1Panel /> }] : []),
      { key: 'policies', label: 'Bộ cấu hình', children: <Card className={responsive.panel} extra={<Button disabled={!has('jev.edit') || busy} onClick={() => { setCloneFrom(null); setCreateOpen(true); }}>Tạo bản nháp</Button>}>
        <Table rowKey="id" dataSource={policies} loading={busy} scroll={{ x: 650 }} pagination={{ current: policyPage, total: policyTotal, pageSize: 20, onChange: setPolicyPage, showSizeChanger: false }} columns={[
          { title: 'ID', dataIndex: 'id', width: 70 }, { title: 'Bộ cấu hình', dataIndex: 'policy_key' }, { title: 'Phiên bản', dataIndex: 'revision' },
          { title: 'Trạng thái', dataIndex: 'status', render: v => <Tag color={v === 'PUBLISHED' ? 'green' : 'gold'}>{v === 'PUBLISHED' ? 'Đã phát hành' : 'Bản nháp'}</Tag> },
          { title: 'Thao tác', render: (_, row) => <Space><Button onClick={() => void task(() => openPolicy(row))}>Mở</Button><Button disabled={!has('jev.edit')} onClick={() => { setCloneFrom(row); setCreateOpen(true); }}>Nhân bản</Button></Space> },
        ]} />
      </Card> },
      { key: 'runtime', label: 'Chế độ chung', children: <Card className={responsive.panel} title="Cấu hình vận hành" extra={<Button onClick={() => Modal.confirm({ title: 'Tải lại cấu hình vận hành?', content: 'Thay đổi chưa lưu trên form sẽ được thay bằng dữ liệu hiện tại.', onOk: () => task(loadRuntime) })}>Tải lại</Button>}>
        {!settings ? <Alert type="warning" message="Chưa có cấu hình vận hành. Kiểm tra seed tại repo Chat." /> : <Space direction="vertical" style={{ width: '100%' }}>
          <Form layout="vertical" className={styles.runtimeForm} data-testid="jev-runtime-form" disabled={!has('jev.runtime') || busy}>
            <div className={styles.primaryFields}>
              <Form.Item label="Chế độ"><Select aria-label="Chế độ toàn hệ thống" value={settings.mode} options={modes} onChange={v => setSettings('mode', v)} /></Form.Item>
              <Form.Item label="Model"><Input aria-label="Model JEV" value={settings.modelVersion} disabled /></Form.Item>
              <Form.Item className={styles.budgetField} label="Ngân sách (USD/ngày)" tooltip="Giới hạn chi phí ước tính mỗi ngày cho toàn hệ thống, tính lại lúc 7 giờ sáng theo giờ Việt Nam. Ví dụ nhập 10 là 10 USD/ngày. Đây không phải số dư hoặc số tiền đã dùng."><InputNumber aria-label="Ngân sách ước tính" style={{ width: '100%' }} value={typeof settings.maxSpendMicroUsd === 'number' ? settings.maxSpendMicroUsd / 1_000_000 : null} min={0.002688} max={1_000_000} step={0.01} precision={6} decimalSeparator="," formatter={(value, { userTyping, input }) => userTyping ? input : value == null || String(value) === '' ? '' : String(Number(value)).replace('.', ',')} onChange={v => setSettings('maxSpendMicroUsd', v == null ? null : Math.round(v * 1_000_000))} /></Form.Item>
            </div>
            <section className={styles.section} aria-label="Giới hạn đánh giá">
              <Typography.Text strong className={styles.sectionTitle}>Giới hạn đánh giá</Typography.Text>
              <div className={styles.limitFields}>
                {Object.entries({
                  maxInFlight: ['Xử lý đồng thời', 256, 'Số lượt đánh giá được xử lý cùng lúc trên mỗi bộ xử lý.'],
                  maxQueue: ['Chờ xử lý', 5000, 'Tổng số mẫu đang chờ và đang đánh giá ở chế độ theo dõi trên mỗi bộ xử lý.'],
                  maxPerRoom: ['Chờ / phòng', 1000, 'Giới hạn mẫu chờ và đang đánh giá của mỗi phòng ở chế độ theo dõi, tính trên mỗi bộ xử lý; không vượt tổng giới hạn chờ.'],
                  requestsPerSecond: ['Lượt / giây', 1000, 'Số lượt đánh giá tối đa mỗi giây, dùng chung toàn hệ thống.'],
                  maxDailyAttempts: ['Lượt / ngày', 1000000, 'Số lượt đánh giá tối đa mỗi ngày cho toàn hệ thống; tính lại từ 7 giờ sáng theo giờ Việt Nam.'],
                  deadlineMs: ['Hạn xử lý (ms)', 60000, 'Thời hạn tối đa kể từ khi nhận mẫu, gồm cả thời gian chờ. Đây không phải thời gian phản hồi của chat.'],
                  httpTimeoutMs: ['Chờ tối đa (ms)', 3000, 'Thời gian tối đa chờ phản hồi cho một lần đánh giá; không vượt hạn đánh giá.'],
                }).map(([key, [label, max, hint]]) => <Form.Item key={key} label={String(label)} tooltip={String(hint)}><InputNumber aria-label={String(label)} style={{ width: '100%' }} value={settings.limits?.[key]} min={1} max={Number(max)} precision={0} {...groupedIntegerProps} onChange={v => setSettings('limits', { ...settings.limits, [key]: v })} /></Form.Item>)}
              </div>
            </section>
            <section className={styles.section} aria-label="Tạm ngừng khi lỗi">
              <Typography.Text strong className={styles.sectionTitle}>Tạm ngừng khi lỗi liên tiếp</Typography.Text>
              <div className={styles.breakerFields}>
                <Form.Item label="Bật bảo vệ"><div className={styles.switchControl}><Switch aria-label="Bật bảo vệ khi lỗi liên tiếp" checked={settings.circuitBreaker?.enabled ?? true} onChange={v => setSettings('circuitBreaker', { failureThreshold: 3, cooldownMs: 180000, ...settings.circuitBreaker, enabled: v })} /><Typography.Text type="secondary">{(settings.circuitBreaker?.enabled ?? true) ? 'Đang bật' : 'Đang tắt'}</Typography.Text></div></Form.Item>
                <Form.Item label="Số lỗi liên tiếp"><InputNumber aria-label="Số lỗi liên tiếp" style={{ width: '100%' }} min={1} max={100} precision={0} {...groupedIntegerProps} value={settings.circuitBreaker?.failureThreshold ?? 3} onChange={v => setSettings('circuitBreaker', { enabled: true, cooldownMs: 180000, ...settings.circuitBreaker, failureThreshold: v })} /></Form.Item>
                <Form.Item label="Thời gian nghỉ (ms)"><InputNumber aria-label="Thời gian nghỉ" style={{ width: '100%' }} min={1000} max={86400000} precision={0} {...groupedIntegerProps} value={settings.circuitBreaker?.cooldownMs ?? 180000} onChange={v => setSettings('circuitBreaker', { enabled: true, failureThreshold: 3, ...settings.circuitBreaker, cooldownMs: v })} /></Form.Item>
              </div>
            </section>
            <div className={styles.footer}>
              <Button type="primary" loading={busy} disabled={!Number.isSafeInteger(settings.maxSpendMicroUsd) || settings.maxSpendMicroUsd < 2688 || settings.maxSpendMicroUsd > 1e12} onClick={() => Modal.confirm({ title: 'Lưu chế độ và giới hạn vận hành?', content: `Chế độ yêu cầu: ${settings.mode}. Sau khi lưu, Admin sẽ yêu cầu Chat đồng bộ.`, okText: 'Lưu', cancelText: 'Hủy', onOk: () => task(async () => {
                const r = await jevRequest('/runtime', 'PUT', { expectedRevision: runtime!.revision, settings }); synchronize(r); await loadRuntime(); await loadBindings(); await loadStatus();
              }) })}>Lưu vận hành</Button>
            </div>
          </Form>
          {conflict && <Alert type="error" message={conflict.message} action={<Button onClick={() => void task(async () => setConflict({ ...conflict, latest: (await jevRequest('/runtime')).data }))}>Xem bản hiện tại</Button>} description={conflict.latest && <pre style={{ whiteSpace: 'pre-wrap' }}>{pretty(conflict.latest)}</pre>} />}
        </Space>}
      </Card> },
      { key: 'bindings', label: 'Thiết lập từng lớp', children: <Card className={responsive.panel}>
        <div data-testid="jev-bindings-header" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}><Typography.Title level={4} style={{ margin: 0 }}>Cấu hình kiểm duyệt theo chương trình và buổi học</Typography.Title><Space wrap><Button onClick={() => void task(loadBindings)}>Tải lại</Button><Button disabled={!has('jev.bind') || busy} onClick={() => openBinding('new')}>Thiết lập cho chương trình / buổi học</Button></Space></div>
        <Typography.Paragraph>Chọn bộ cấu hình kiểm duyệt cho toàn bộ chương trình hoặc một buổi học cụ thể. Buổi học có thiết lập riêng sẽ được ưu tiên; các buổi còn lại dùng thiết lập của chương trình. Nếu chương trình chưa thiết lập riêng, hệ thống dùng cấu hình mặc định.</Typography.Paragraph>
        <Alert type="info" showIcon style={{ marginBottom: 16 }} message="Bảng thể hiện thiết lập đã lưu" description="Việc xử lý tin nhắn còn phụ thuộc vào chế độ vận hành toàn hệ thống và trạng thái đồng bộ. Chế độ chỉ theo dõi ghi nhận kết quả kiểm duyệt nhưng chưa áp dụng các biện pháp xử lý vi phạm." />
        <Table rowKey="id" dataSource={bindings} scroll={{ x: 900 }} pagination={{ current: bindingPage, total: bindingTotal, pageSize: 100, showSizeChanger: false, onChange: setBindingPage }} columns={[
          { title: 'Áp dụng cho', render: (_, r) => r.scope_type === 'GLOBAL' ? 'Mặc định cho các lớp chưa có thiết lập riêng' : r.scope_type === 'CODE' ? <Space direction="vertical" size={0}><Typography.Text>{r.scope_key}</Typography.Text><Typography.Text type="secondary">Toàn bộ buổi học của chương trình chưa có thiết lập riêng</Typography.Text></Space> : r.calendar ? <Space direction="vertical" size={0}><Typography.Text>{r.calendar.code}</Typography.Text><Typography.Text type="secondary">{jevCalendarLabel(r.calendar)}</Typography.Text></Space> : 'Buổi học không còn khả dụng' },
          { title: 'Cách kiểm duyệt đã thiết lập', render: (_, r) => <Space direction="vertical" size={0}>
            <Typography.Text>{r.mode === 'inherit' ? 'Dùng thiết lập chung' : bindingModeName(r.mode)}</Typography.Text>
            {r.mode === 'inherit' && <Typography.Text type="secondary">{r.configured ? `${r.configured.scope_type === 'CODE' ? `Theo chương trình ${r.configured.scope_key}` : 'Theo mặc định hệ thống'} · ${bindingModeName(r.configured.mode)}` : 'Chưa xác định được thiết lập chung'}</Typography.Text>}
          </Space> },
          { title: 'Bộ cấu hình được áp dụng', render: (_, r) => r.configured?.mode === 'off' ? 'Không áp dụng (đã tắt)' : r.configured?.policy ? <Space direction="vertical" size={0}><Typography.Text>{r.configured.policy.policy_key}</Typography.Text><Typography.Text type="secondary">Phiên bản {r.configured.policy.revision}</Typography.Text></Space> : 'Chưa xác định' },
          { title: 'Thao tác', width: 200, render: (_, r) => <Space style={{ whiteSpace: 'nowrap' }}><Button disabled={!has('jev.bind') || busy} onClick={() => openBinding(r)}>Thay đổi</Button><Button onClick={() => setBindingDetails(r)}>Chi tiết</Button></Space> },
        ]} />
      </Card> },
      { key: 'status', label: 'Trạng thái đồng bộ', children: <JevSyncStatus status={status} error={statusError} checkedAt={statusCheckedAt} checking={statusChecking} busy={busy} canRetry={has('jev.runtime')}
        retryError={syncError} retryResult={syncResult} onCheck={() => void loadStatus()} onRetry={() => void task(async () => {
          setSyncError(''); setSyncResult(null);
          try { const r = await jevRequest('/reload', 'POST', {}); setSyncResult({ confirmed: r.data.confirmed === true }); }
          catch (e: any) { setSyncError(e.message || 'Không gửi được yêu cầu đồng bộ'); }
          await loadStatus();
        })} /> },
    ]} />
    <Drawer className={`${policyStyles.policyDrawer} ${responsive.drawer}`} open={!!current} width="min(1320px, 100vw)" destroyOnClose title={current && `${current.policy_key} · Phiên bản ${current.revision} · ${current.status === 'DRAFT' ? 'Bản nháp' : 'Đã phát hành'}`} onClose={() => {
      const close = () => { ++detailRequest.current; setCurrent(null); setDirty(false); };
      if (dirty) Modal.confirm({ title: 'Đóng và bỏ thay đổi chưa lưu?', onOk: close }); else close();
    }} extra={<Space wrap>
      <Button loading={busy} disabled={!editable || !dirty || busy || jsonInvalid} onClick={() => void save()}>Lưu nháp</Button>
      <Button disabled={dirty || busy || jsonInvalid} onClick={() => void task(async () => { const r = await jevRequest(`/policies/${current!.id}/validate`, 'POST', {}); setValidation(r.data); message.success('Bộ cấu hình hợp lệ'); })}>Kiểm tra</Button>
      <Button type="primary" disabled={!has('jev.publish') || current?.status !== 'DRAFT' || dirty || busy || !validation?.valid} onClick={publish}>Phát hành</Button>
    </Space>}>
      {current && config && <Space direction="vertical" style={{ width: '100%' }}>
        <Alert type={dirty ? 'warning' : 'info'} message={dirty ? 'Có thay đổi chưa lưu. Lưu nháp trước khi kiểm tra hoặc thử tình huống.' : current.status === 'PUBLISHED' ? 'Bản phát hành chỉ đọc. Nhân bản để tạo phiên bản mới.' : `Bản nháp · lần sửa ${current.edit_revision}`} />
        {conflict && <Alert type="error" message={conflict.message} description={<Space direction="vertical"><Button onClick={() => void task(async () => setConflict({ ...conflict, latest: (await jevRequest(`/policies/${current.id}`)).data }))}>Đọc bản mới để so sánh</Button>{conflict.latest && <><Typography.Text>Bản trên DB (thay đổi trên form vẫn được giữ):</Typography.Text><pre style={{ whiteSpace: 'pre-wrap' }}>{pretty(conflict.latest.config_json)}</pre><Button onClick={() => Modal.confirm({ title: 'Bỏ thay đổi trên form và dùng bản DB?', onOk: () => openPolicy(current) })}>Dùng bản DB</Button></>}</Space>} />}
        {validation && <Alert type="success" showIcon message="Bộ cấu hình hợp lệ, có thể phát hành khi có quyền" />}
        <Tabs activeKey={detailTab} onChange={setDetailTab} items={[
          { key: 'overview', label: 'Tổng quan', children: <Space direction="vertical" size={20} className={policyStyles.fullWidth}>
            <Alert type="info" showIcon message="Bắt đầu từ phần bạn muốn thay đổi" description="Điều chỉnh cách nhận diện nội dung, cách xử lý hoặc thông báo cho học sinh. Lưu nháp và kiểm tra trước khi phát hành; bản phát hành chỉ có hiệu lực sau khi được gán trong Thiết lập từng lớp." />
            <div className={policyStyles.summaryGrid}>
              {[['Nhóm nội dung', categories.length], ['Mức độ', levels.length], ['Quy tắc xử lý', policy?.rules?.length ?? 0], ['Mẫu thông báo', policy?.templates?.length ?? 0]].map(([label, total]) => <div key={String(label)} className={policyStyles.summaryItem}><span className={policyStyles.summaryNumber}>{integerDisplay.format(Number(total))}</span><Typography.Text type="secondary">{label}</Typography.Text></div>)}
            </div>
            <Steps className={policyStyles.workflow} size="small" current={current.status === 'PUBLISHED' ? 3 : validation?.valid ? 2 : dirty ? 0 : 1} items={[{ title: 'Điều chỉnh' }, { title: 'Lưu nháp' }, { title: 'Kiểm tra' }, { title: 'Phát hành' }]} />
            <Card className={responsive.panel} title="Bạn muốn làm gì?" size="small">
              <div className={policyStyles.shortcuts}>
                <div><Button onClick={() => setDetailTab('guide')}>Nhóm nội dung và mức độ</Button><Typography.Paragraph type="secondary">Xem các nhóm như spam, xúc phạm, đe dọa và tiêu chí nhận diện từng mức độ.</Typography.Paragraph></div>
                <div><Button onClick={() => setDetailTab('rules')}>Quy tắc xử lý</Button><Typography.Paragraph type="secondary">Điều chỉnh việc nhắc nhở, chặn tin, giãn cách chat, tạm cấm chat và điều kiện thực hiện.</Typography.Paragraph></div>
                <div><Button onClick={() => setDetailTab('templates')}>Thông báo cho người dùng</Button><Typography.Paragraph type="secondary">Sửa nội dung gửi riêng cho học sinh hoặc giáo viên khi có tình huống xảy ra.</Typography.Paragraph></div>
                <div><Button onClick={() => setDetailTab('preview')}>Thử tình huống</Button><Typography.Paragraph type="secondary">Nhập kết quả đánh giá giả định để xem hành động nào đủ điều kiện. Không gửi chat, không gọi AI và không phạt học sinh.</Typography.Paragraph></div>
              </div>
            </Card>
            <Typography.Text type="secondary">Thiết lập nâng cao dành cho việc thay đổi cấu trúc hoặc xem toàn bộ cấu hình.</Typography.Text>
          </Space> },
          { key: 'guide', label: 'Nhóm nội dung và mức độ', children: <PolicyGuideEditor config={config} editable={editable} onChange={change} /> },
          { key: 'rules', label: 'Quy tắc xử lý', children: <PolicyRulesTable policy={policy} actionNames={actionNames} onEdit={setRuleIndex} /> },
          { key: 'templates', label: 'Thông báo cho người dùng', children: <PolicyTemplatesEditor templates={policy?.templates ?? []} editable={editable} onChange={value => patchPolicy('templates', value)} /> },
          { key: 'preview', label: 'Thử tình huống', children: <PolicyPreview policy={policy} form={previewForm} busy={busy} disabled={dirty || busy || jsonInvalid} result={preview} actionNames={actionNames} integerProps={groupedIntegerProps} onClear={() => setPreview(null)} onRun={() => void task(async () => {
            const values = await previewForm.validateFields();
            const response = await jevRequest('/preview', 'POST', { ...values, priorCounts: values.priorCounts,
              ...Object.fromEntries(['pCategory', 'categoryConfidence', 'pSeverity', 'severityConfidence', 'threat', 'distress'].map(key => [key, values[key] / 100])), policyVersionId: current.id });
            setPreview(response.data);
          })} /> },
          { key: 'json', label: 'Thiết lập nâng cao', children: <Space direction="vertical" size={16} className={policyStyles.fullWidth}>
            <Alert type="warning" showIcon message="Thay đổi cấu trúc cần kiểm tra toàn bộ bộ cấu hình" description="Các thiết lập bên dưới giữ nguyên định dạng của Live. Khi thêm hoặc đổi nhóm, mức độ, cần cập nhật đầy đủ tiêu chí, quy tắc xử lý và thông báo trước khi phát hành." />
            <Collapse items={[
              { key: 'framework', label: 'Cấu trúc nhóm và mức độ (JSON)', children: <JsonEditor label="Khung nhóm mức" disabled={!editable} value={policy?.framework ?? null} onChange={framework => change({ ...config, policy: { ...policy, framework }, rubric: { ...config.rubric, framework } })} /> },
              { key: 'safety', label: 'Liên kết thông báo an toàn (JSON)', children: <JsonEditor label="Mẫu an toàn" disabled={!editable} value={policy?.safetyTemplates} onChange={v => patchPolicy('safetyTemplates', v)} /> },
              { key: 'fallback', label: 'Phương án dự phòng (JSON)', children: <JsonEditor label="Phương án dự phòng" disabled={!editable} value={policy?.fallbackPlans ?? policy?.fallbacks} onChange={v => patchPolicy(policy.schemaVersion === 3 ? 'fallbackPlans' : 'fallbacks', v)} /> },
              { key: 'bundle', label: 'Toàn bộ cấu hình (JSON)', children: <JsonEditor label="Bundle cấu hình" disabled={!editable} value={config} onChange={change} /> },
            ]} />
          </Space> },
        ]} />
      </Space>}
    </Drawer>
    <Drawer className={responsive.drawer} open={!!rule} width="min(700px, 100vw)" title="Cấu hình cách xử lý" onClose={() => setRuleIndex(null)}>
      {rule && <Form layout="vertical" disabled={!editable}>
        <Typography.Title level={5}>{categoryName(rule.category, categories.find((item: any) => item.code === rule.category)?.label)} · {levelName(rule.severity, levels.find((item: any) => item.code === rule.severity)?.label)}</Typography.Title>
        <Typography.Paragraph>{rule.conditions && incidentLabel(rule.conditions.minPriorCount, rule.conditions.maxPriorCount)} · {(rule.conditions?.modes ?? []).map((mode: string) => contextNames[mode] ?? mode).join(', ')}</Typography.Paragraph>
        {rule.resolutionOnly && <Alert type="info" message="Quy tắc dự phòng khi nhóm và mức đánh giá không phù hợp với nhau." />}
        <Typography.Paragraph type="secondary">Mỗi hành động có điều kiện riêng. Chỉ thực hiện khi tất cả ngưỡng đã đặt đều đạt. Ô trống là chưa cấu hình, khác với 0%.</Typography.Paragraph>
        {rule.actions.map((a: string) => { const g = rule.gates[a]; return <Card className={responsive.panel} key={a} size="small" title={actionNames[a] || a} style={{ marginBottom: 16 }}>
          <Form.Item label="Bật hành động"><Switch disabled={!editable} checked={g.enabled} onChange={v => setRule({ ...rule, gates: { ...rule.gates, [a]: { ...g, enabled: v } } })} /></Form.Item>
          <div className={policyStyles.gateFields}>{Object.entries(gateLabels).map(([key, label]) => <Form.Item key={key} label={`${label} tối thiểu (%)`}><InputNumber min={0} max={100} step={1} value={g[key] == null ? null : g[key] * 100} placeholder="Chưa cấu hình" onChange={v => setRule({ ...rule, gates: { ...rule.gates, [a]: { ...g, [key]: v == null ? null : v / 100 } } })} style={{ width: '100%' }} /></Form.Item>)}</div>
          {g.templateKey !== undefined && <Form.Item label="Mẫu thông báo"><Select value={g.templateKey} options={(policy.templates || []).map((t: any) => ({ value: t.key, label: `${t.audience === 'student' ? 'Học sinh' : 'Giáo viên'} · ${t.body}` }))} onChange={v => setRule({ ...rule, gates: { ...rule.gates, [a]: { ...g, templateKey: v } } })} /></Form.Item>}
          {Object.entries(g.params || {}).map(([key, value]) => <Form.Item key={key} label={key === 'durationSeconds' ? 'Thời hạn (giây)' : key === 'intervalSeconds' ? 'Khoảng cách tin (giây)' : 'Khoảng nghỉ thông báo (giây)'}><InputNumber min={key === 'cooldownSeconds' ? 0 : 1} max={key === 'intervalSeconds' ? 3600 : 86400} precision={0} {...groupedIntegerProps} value={Number(value)} onChange={v => setRule({ ...rule, gates: { ...rule.gates, [a]: { ...g, params: { ...g.params, [key]: v } } } })} /></Form.Item>)}
        </Card>; })}
        <Typography.Paragraph>Lưu nháp trong bộ cấu hình để ghi toàn bộ thay đổi.</Typography.Paragraph>
      </Form>}
    </Drawer>
    <PolicyCreateModal open={createOpen} initialSource={cloneFrom} initialRows={policies} integerProps={groupedIntegerProps} onCancel={() => setCreateOpen(false)} onCreated={row => task(async () => {
      await openPolicy(row); await loadPolicies(); message.success('Đã tạo bản nháp. Bạn có thể chỉnh cấu hình bên dưới.');
    })} />
    <Modal className={`admin-responsive-modal ${responsive.modal}`} open={!!bindingDetails} title="Chi tiết thiết lập kiểm duyệt" onCancel={() => setBindingDetails(null)} footer={<Button onClick={() => setBindingDetails(null)}>Đóng</Button>}>
      {bindingDetails && <Descriptions className={responsive.descriptions} layout={screens.md ? 'horizontal' : 'vertical'} column={1} bordered size="small" items={[
        { key: 'scope', label: 'Áp dụng cho', children: bindingDetails.scope_type === 'GLOBAL' ? 'Mặc định cho các lớp chưa có thiết lập riêng' : bindingDetails.scope_type === 'CODE' ? `Chương trình ${bindingDetails.scope_key}` : bindingDetails.calendar ? <Space direction="vertical" size={0}><Typography.Text>{bindingDetails.calendar.code}</Typography.Text><Typography.Text>{jevCalendarLabel(bindingDetails.calendar)}</Typography.Text></Space> : 'Buổi học không còn khả dụng' },
        { key: 'choice', label: 'Lựa chọn đã lưu', children: bindingDetails.mode === 'inherit' ? 'Dùng thiết lập chung' : bindingModeName(bindingDetails.mode) },
        { key: 'source', label: 'Nguồn thiết lập', children: !bindingDetails.configured ? 'Chưa xác định' : bindingDetails.configured.scope_type === 'GLOBAL' ? 'Mặc định hệ thống' : bindingDetails.configured.scope_type === 'CODE' ? `Chương trình ${bindingDetails.configured.scope_key}` : 'Thiết lập riêng của buổi học' },
        { key: 'mode', label: 'Cách kiểm duyệt', children: bindingDetails.configured ? bindingModeName(bindingDetails.configured.mode) : 'Chưa xác định' },
        { key: 'policy', label: 'Bộ cấu hình', children: bindingDetails.configured?.mode === 'off' ? 'Không áp dụng (đã tắt)' : bindingDetails.configured?.policy ? `${bindingDetails.configured.policy.policy_key} · Phiên bản ${bindingDetails.configured.policy.revision}` : 'Chưa xác định' },
        { key: 'policyId', label: 'Mã bộ cấu hình', children: bindingDetails.configured?.policy?.id ?? '—' },
        { key: 'revision', label: 'Lần cập nhật thiết lập', children: bindingDetails.revision },
      ]} />}
      <Typography.Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 0 }}>Thông tin trên là thiết lập đã lưu. Việc xử lý tin nhắn còn phụ thuộc vào chế độ vận hành toàn hệ thống và trạng thái đồng bộ.</Typography.Paragraph>
    </Modal>
    <Modal className={`admin-responsive-modal ${responsive.modal}`} open={!!bindingEdit} title="Thiết lập kiểm duyệt cho lớp học" okText="Lưu và đồng bộ" cancelText="Hủy" confirmLoading={busy} onCancel={() => setBindingEdit(null)} onOk={() => void saveBinding()}>
      <Form form={bindingForm} layout="vertical">
        {bindingEdit && <JevScopeFields key={bindingEdit === 'new' ? 'new' : bindingEdit.id} form={bindingForm} locked={bindingEdit !== 'new'} initialCalendarId={bindingEdit !== 'new' && bindingEdit.scope_type === 'CALENDAR' ? bindingEdit.scope_key : undefined} />}
        <Form.Item noStyle shouldUpdate>{() => <Form.Item name="mode" label="Cách kiểm duyệt" extra="Mỗi lựa chọn có phần giải thích ngay trong danh sách. Sau khi chọn, xem ví dụ bên dưới trước khi lưu." rules={[{ required: true }]}>
          <Select popupClassName={responsive.dropdown} aria-label="Cách kiểm duyệt" virtual={false} listHeight={360}
            options={bindingForm.getFieldValue('scopeType') === 'GLOBAL' ? bindingModes : [...bindingModes, { value: 'inherit', label: 'Dùng thiết lập chung' }]}
            optionRender={option => <div style={{ whiteSpace: 'normal', padding: '4px 0' }}>
              <Typography.Text strong>{option.label}</Typography.Text>
              <Typography.Text type="secondary" style={{ display: 'block', fontSize: 13, fontWeight: 400 }}>{bindingModeHelp(String(option.value), bindingForm.getFieldValue('scopeType')).description}</Typography.Text>
            </div>} />
        </Form.Item>}</Form.Item>
        <Form.Item noStyle shouldUpdate>{() => {
          const help = bindingModeHelp(bindingForm.getFieldValue('mode'), bindingForm.getFieldValue('scopeType'));
          return <Alert data-testid="jev-mode-help" showIcon type="info" style={{ marginBottom: 20 }} message="Lựa chọn này có tác dụng gì?" description={<Space direction="vertical" size={8}>
            <Typography.Text>{help.description}</Typography.Text>
            {help.example && <Typography.Text><strong>Ví dụ: </strong>{help.example}</Typography.Text>}
            <Typography.Text type="secondary">Lựa chọn có hiệu lực sau khi lưu và đồng bộ. Bộ lọc chat và các hạn chế khác vẫn hoạt động theo cấu hình riêng.</Typography.Text>
          </Space>} />;
        }}</Form.Item>
        <Form.Item noStyle shouldUpdate>{() => ['shadow', 'enforce'].includes(bindingForm.getFieldValue('mode')) && <Form.Item name="policyVersionId" label="Bộ cấu hình kiểm duyệt" rules={[{ required: true }]}><PublishedPolicySelect /></Form.Item>}</Form.Item>
      </Form>
      {conflict && <Alert type="error" message={conflict.message} description="Đóng cửa sổ, tải lại danh sách và mở lại để xem thiết lập mới nhất trước khi lưu." />}
    </Modal>
  </div></JsonValidityContext.Provider>;
}
