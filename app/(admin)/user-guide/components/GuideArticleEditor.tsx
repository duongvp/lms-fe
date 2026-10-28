"use client";

import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Collapse, Empty, Input, InputNumber, Modal, Popconfirm, Segmented, Select, Space, Switch, Tag, Tooltip, message } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, CopyOutlined, DeleteOutlined, EyeOutlined, FileTextOutlined, PlusOutlined, ReadOutlined, SettingOutlined, WarningOutlined } from '@ant-design/icons';
import { getGuideBlocks, guideRichHasImage, isSafeGuideImage, normalizeGuideSearch, type GuideBlock, type GuideArticle, type GuideCategory, type GuideSection, type GuideStatus } from '@/services/userGuideService';
import GuideArticleContent from './GuideArticleContent';
import GuideBlocksEditor, { createGuideBlock } from './GuideBlocksEditor';
import styles from '../user-guide.module.css';

const permissionOptions = [
    { value: '', label: 'Mọi tài khoản đã đăng nhập' },
    ...Object.entries({ 'lessons.view': 'Người được xem đề cương', 'calendar.view': 'Người được xem lịch học', 'quiz.view': 'Người được xem câu hỏi', 'room_config.view': 'Người được xem cấu hình phòng', 'teacher_profile.view': 'Người được xem nhân sự giảng dạy', 'users.view': 'Người được xem quản trị viên', 'roles.view': 'Người được xem vai trò', 'program_teacher_banner.view': 'Người được xem banner lịch học' }).map(([value, label]) => ({ value, label })),
];
const statusLabels: Record<GuideStatus, string> = { draft: 'Bản nháp', published: 'Đã xuất bản', hidden: 'Đã ẩn' };
const newId = () => crypto.randomUUID();
const blankSection = (): GuideSection => ({ id: newId(), title: '', text: '', steps: [], blocks: [createGuideBlock('text')] });
const slugFromTitle = (value: string) => normalizeGuideSearch(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 180).replace(/-$/, '');

export default function GuideArticleEditor({ initialArticle, categories, articles, onSave, onClose }: {
    initialArticle: GuideArticle | null;
    categories: GuideCategory[];
    articles: GuideArticle[];
    onSave: (article: GuideArticle) => void | Promise<void>;
    onClose: () => void;
}) {
    const [draft, setDraft] = useState<GuideArticle>(() => initialArticle ? { ...structuredClone(initialArticle), sections: initialArticle.sections.map(s => ({ ...structuredClone(s), blocks: structuredClone(getGuideBlocks(s)) })) } : ({
        id: newId(), slug: '', title: '', description: '', categoryId: categories[0]?.id || '',
        status: 'draft', order: Math.max(0, ...articles.filter(a => a.categoryId === categories[0]?.id).map(a => a.order)) + 1,
        featured: false, updatedAt: new Date().toISOString(), prerequisites: [], sections: [blankSection()],
    }));
    const [mode, setMode] = useState<'content' | 'settings' | 'preview'>('content');
    const [selected, setSelected] = useState(0);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [autoSlug, setAutoSlug] = useState(!initialArticle);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const editorScroll = useRef<HTMLDivElement>(null);
    const [notice, contextHolder] = message.useMessage();
    const [modal, modalContext] = Modal.useModal();
    const section = draft.sections[selected];

    const categoryName = categories.find(c => c.id === draft.categoryId)?.name;

    useEffect(() => {
        if (!dirty) return;
        const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [dirty]);

    const change = (fn: (value: GuideArticle) => GuideArticle) => { setDraft(fn); setDirty(true); setErrors({}); };
    const changeSection = (patch: Partial<GuideSection>) => change(value => ({ ...value, sections: value.sections.map((s, i) => i === selected ? { ...s, ...patch } : s) }));
    const selectSection = (index: number) => { setSelected(index); editorScroll.current?.scrollTo({ top: 0 }); };
    const addSection = () => { change(value => ({ ...value, sections: [...value.sections, blankSection()] })); selectSection(draft.sections.length); };
    const moveSection = (direction: -1 | 1) => {
        const target = selected + direction;
        if (target < 0 || target >= draft.sections.length) return;
        change(value => { const sections = [...value.sections]; [sections[selected], sections[target]] = [sections[target], sections[selected]]; return { ...value, sections }; });
        selectSection(target);
    };
    const close = () => {
        if (!dirty) { onClose(); return; }
        modal.confirm({ title: 'Bạn còn thay đổi chưa lưu', content: 'Bạn có thể quay lại soạn thảo và lưu bản nháp trước khi đóng.', okText: 'Bỏ thay đổi và đóng', cancelText: 'Tiếp tục soạn', onOk: onClose });
    };
    const uniqueSlug = (title: string) => {
        const base = slugFromTitle(title);
        if (!base) return '';
        let slug = base; let suffix = 2;
        while (articles.some(a => a.id !== draft.id && a.slug === slug)) { slug = `${base.slice(0, 174)}-${suffix++}`; }
        return slug;
    };
    const save = async (status: GuideStatus) => {
        const issues: Record<string, string> = {};
        if (!draft.title.trim()) issues.title = 'Nhập tiêu đề để nhận diện bài viết.';
        if (!categories.some(c => c.id === draft.categoryId)) issues.categoryId = 'Chọn danh mục cho bài viết.';
        const slug = draft.slug.trim() || uniqueSlug(draft.title);
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 180) issues.slug = 'Đường dẫn chỉ dùng chữ thường không dấu, số và dấu gạch ngang.';
        if (articles.some(a => a.id !== draft.id && a.slug === slug)) issues.slug = 'Đường dẫn này đang được bài viết khác sử dụng.';
        if (!Number.isInteger(draft.order) || draft.order < 1) issues.order = 'Thứ tự phải là số nguyên lớn hơn 0.';
        if (status === 'published' && !draft.description.trim()) issues.description = 'Thêm mô tả ngắn trước khi xuất bản.';
        if (status === 'published' && !draft.sections.length) issues.sections = 'Thêm ít nhất một phần nội dung.';
        let badSection = -1;
        draft.sections.forEach((s, i) => {
            let error = '';
            const blocks = getGuideBlocks(s);
            blocks.forEach((block, index) => {
                let blockError = '';
                if (block.type === 'image' && block.imageUrl && !isSafeGuideImage(block.imageUrl.trim())) blockError = 'Ảnh minh họa cần đường dẫn HTTPS hợp lệ.';
                if (block.type === 'table' && (block.table.columns.length < 2 || block.table.columns.some(c => !c.trim()) || !block.table.rows.length || block.table.rows.some(row => row.length !== block.table.columns.length))) blockError = 'Bảng cần ít nhất hai tên cột và một dòng đủ ô.';
                if (status === 'published') {
                    const hasContent = block.type === 'text' ? !!block.text.trim() || guideRichHasImage(block.richText)
                        : block.type === 'steps' ? block.steps.some(step => step.trim())
                        : block.type === 'notice' ? !!block.notice.trim()
                        : block.type === 'image' ? isSafeGuideImage(block.imageUrl.trim()) : true;
                    if (!hasContent) blockError = 'Bổ sung nội dung hoặc xóa khối trống trước khi xuất bản.';
                }
                if (blockError && !error) error = `Khối ${index + 1}: ${blockError}`;
            });
            if (status === 'published' && (!s.title.trim() || !blocks.length)) error = 'Bổ sung tiêu đề và ít nhất một khối nội dung trước khi xuất bản.';
            if (error) { issues[`section-${s.id}`] = error; if (badSection < 0) badSection = i; }
        });
        if (Object.keys(issues).length) {
            setErrors(issues);
            if (issues.title) { setMode('content'); setTimeout(() => document.getElementById('guide-editor-title')?.focus(), 0); }
            else if (issues.categoryId || issues.slug || issues.order || issues.description) { setMode('settings'); if (issues.slug || issues.order) setAdvancedOpen(true); }
            else { setMode('content'); if (badSection >= 0) selectSection(badSection); }
            notice.warning('Kiểm tra các thông tin được đánh dấu trước khi lưu.');
            return;
        }
        setSaving(true);
        try {
            await onSave({
                ...draft, title: draft.title.trim(), description: draft.description.trim(), slug, status,
                audience: draft.audience?.trim() || undefined, requiredPermission: draft.requiredPermission || undefined,
                prerequisites: draft.prerequisites?.map(v => v.trim()).filter(Boolean), updatedAt: new Date().toISOString(),
                sections: draft.sections.map(s => ({ id: s.id, title: s.title.trim(), text: '', steps: [], blocks: getGuideBlocks(s).map((block): GuideBlock => {
                    switch (block.type) {
                        case 'text': return { ...block, text: block.text.trim() };
                        case 'steps': return { ...block, steps: block.steps.map(step => step.trim()).filter(Boolean) };
                        case 'notice': return { ...block, notice: block.notice.trim() };
                        case 'image': return { ...block, imageUrl: block.imageUrl.trim(), imageCaption: block.imageCaption?.trim() };
                        case 'table': return { ...block, table: { columns: block.table.columns.map(c => c.trim()), rows: block.table.rows.map(row => row.map(cell => cell.trim())) } };
                    }
                }) })),
            });
            setDirty(false);
        } catch { notice.error('Chưa lưu được bài viết. Nội dung đang soạn vẫn được giữ trong cửa sổ này.'); }
        finally { setSaving(false); }
    };
    const saveDraft = () => {
        if (initialArticle?.status === 'published') {
            modal.confirm({ title: 'Chuyển bài về bản nháp?', content: 'Bài sẽ tạm ngừng hiển thị trong danh sách hướng dẫn của phiên làm việc này.', okText: 'Chuyển về nháp', cancelText: 'Hủy', onOk: () => save('draft') });
        } else void save('draft');
    };
    const inlineError = (key: string) => errors[key] ? <span className={styles.editorError} role="alert">{errors[key]}</span> : null;
    const preview = <GuideArticleContent article={draft} categoryName={categoryName} preview idPrefix="editor-preview" />;

    return <Modal open width="100%" rootClassName={styles.editorModal} style={{ top: 0, maxWidth: 'none', margin: 0, paddingBottom: 0 }} maskClosable={false} keyboard={!saving} closable={!saving} onCancel={close}
        title={<div className={styles.editorTitle}><span>{initialArticle ? 'Chỉnh sửa bài hướng dẫn' : 'Tạo bài hướng dẫn'}</span><Tag color={draft.status === 'published' ? 'green' : 'default'}>{statusLabels[draft.status]}</Tag></div>}
        footer={<div className={styles.editorFooter}><span>{dirty ? 'Có thay đổi chưa lưu' : 'Chưa có thay đổi'} · Lưu tạm trong phiên làm việc</span><Space wrap><Button disabled={saving} onClick={close}>Đóng</Button><Button loading={saving} onClick={saveDraft}>{initialArticle?.status === 'published' ? 'Chuyển về nháp' : 'Lưu bản nháp'}</Button><Button type="primary" loading={saving} onClick={() => void save('published')}>{initialArticle?.status === 'published' ? 'Lưu thay đổi' : 'Xuất bản'}</Button></Space></div>}>
        {contextHolder}{modalContext}
        <div className={styles.editorShell}>
            <div className={styles.editorToolbar}><Segmented aria-label="Chế độ soạn bài" value={mode} onChange={value => { if (value === 'content' || value === 'settings' || value === 'preview') setMode(value); }} options={[{ value: 'content', label: 'Nội dung', icon: <FileTextOutlined /> }, { value: 'settings', label: 'Thông tin bài viết', icon: <SettingOutlined /> }, { value: 'preview', label: 'Xem trước', icon: <EyeOutlined /> }]} /><span className={styles.editorSessionNote}>Tải lại trang sẽ khôi phục thư viện ban đầu.</span></div>
            {mode === 'preview' ? <div className={styles.editorFullPreview} aria-label="Xem trước toàn bài"><article>{preview}</article></div> : mode === 'settings' ? <div className={styles.editorSettings}>
                <h2>Thông tin bài viết</h2><p className={styles.muted}>Giúp người đọc tìm đúng nội dung và biết cần chuẩn bị gì.</p>
                <label htmlFor="guide-editor-category">Danh mục <span>*</span></label><Select id="guide-editor-category" value={draft.categoryId || undefined} status={errors.categoryId ? 'error' : undefined} options={categories.map(c => ({ value: c.id, label: c.name }))} onChange={categoryId => change(v => ({ ...v, categoryId, order: initialArticle ? v.order : Math.max(0, ...articles.filter(a => a.categoryId === categoryId).map(a => a.order)) + 1 }))} />{inlineError('categoryId')}
                <label htmlFor="guide-editor-description">Mô tả ngắn <span>*</span></label><Input.TextArea id="guide-editor-description" value={draft.description} maxLength={400} showCount autoSize={{ minRows: 3, maxRows: 6 }} status={errors.description ? 'error' : undefined} placeholder="Bài này giúp người đọc thực hiện công việc gì?" onChange={e => change(v => ({ ...v, description: e.target.value }))} />{inlineError('description')}
                <label htmlFor="guide-editor-audience">Dành cho ai?</label><Input id="guide-editor-audience" value={draft.audience} maxLength={400} placeholder="Ví dụ: Nhân viên vận hành có quyền tạo lịch" onChange={e => change(v => ({ ...v, audience: e.target.value }))} />
                <label htmlFor="guide-editor-prerequisites">Chuẩn bị trước khi thực hiện</label><Input.TextArea id="guide-editor-prerequisites" value={draft.prerequisites?.join('\n') || ''} autoSize={{ minRows: 3, maxRows: 8 }} placeholder="Mỗi điều kiện nhập trên một dòng" onChange={e => change(v => ({ ...v, prerequisites: e.target.value.split('\n') }))} />
                <Collapse ghost activeKey={advancedOpen ? ['advanced'] : []} onChange={keys => setAdvancedOpen(keys.includes('advanced'))} items={[{ key: 'advanced', label: 'Thiết lập hiển thị và quyền đọc', children: <div className={styles.editorAdvanced}>
                    <label htmlFor="guide-editor-permission">Ai được đọc bài này?</label><Select id="guide-editor-permission" value={draft.requiredPermission || ''} options={permissionOptions} onChange={requiredPermission => change(v => ({ ...v, requiredPermission }))} />
                    <label htmlFor="guide-editor-order">Thứ tự trong danh mục</label><InputNumber id="guide-editor-order" min={1} precision={0} value={draft.order} onChange={order => change(v => ({ ...v, order: order ?? 1 }))} />{inlineError('order')}
                    <label htmlFor="guide-editor-featured"><Switch id="guide-editor-featured" checked={draft.featured} onChange={featured => change(v => ({ ...v, featured }))} /> Hiển thị ở “Bắt đầu từ đây”</label>
                    <label htmlFor="guide-editor-slug">Đường dẫn bài viết</label><Input id="guide-editor-slug" value={draft.slug} maxLength={180} addonBefore="/user-guide/" status={errors.slug ? 'error' : undefined} onChange={e => { setAutoSlug(false); change(v => ({ ...v, slug: e.target.value })); }} />{inlineError('slug')}<p className={styles.muted}>Được tạo tự động từ tiêu đề khi thêm mới. Đổi đường dẫn của bài đang dùng có thể làm liên kết cũ không còn đúng.</p>
                </div> }]} />
            </div> : <div className={styles.editorWorkspace}>
                <aside className={styles.editorOutline} aria-label="Các phần đang soạn"><div className={styles.editorOutlineHeading}><strong>CẤU TRÚC BÀI VIẾT</strong><span>{draft.sections.length} phần</span></div>
                    {draft.sections.map((s, i) => <button type="button" key={s.id} title={s.title || 'Phần chưa đặt tên'} aria-current={selected === i ? 'step' : undefined} className={selected === i ? styles.editorOutlineActive : ''} onClick={() => selectSection(i)}><span>{i + 1}</span><span>{s.title || 'Phần chưa đặt tên'}</span>{errors[`section-${s.id}`] && <WarningOutlined />}</button>)}
                    <Button block type="dashed" icon={<PlusOutlined />} onClick={addSection}>Thêm phần</Button>
                </aside>
                <div className={styles.editorCanvas} ref={editorScroll}>
                    <label htmlFor="guide-editor-title" className={styles.editorFieldLabel}>Tiêu đề bài viết <span>*</span></label><Input id="guide-editor-title" size="large" value={draft.title} maxLength={180} status={errors.title ? 'error' : undefined} placeholder="Ví dụ: Cách tạo lịch học mới" onChange={e => { const title = e.target.value; change(v => ({ ...v, title, slug: autoSlug ? uniqueSlug(title) : v.slug })); }} />{inlineError('title')}
                    <div className={styles.editorMobileOutline}><Select aria-label="Chọn phần để soạn" value={section?.id} placeholder="Chọn phần nội dung" options={draft.sections.map((s, i) => ({ value: s.id, label: `${i + 1}. ${s.title || 'Phần chưa đặt tên'}` }))} onChange={id => selectSection(draft.sections.findIndex(s => s.id === id))} /><Button icon={<PlusOutlined />} aria-label="Thêm phần nội dung" onClick={addSection} /></div>
                    {section ? <div className={styles.editorSection}>
                        <div className={styles.editorSectionToolbar}><span>PHẦN {selected + 1} / {draft.sections.length}</span><Space size={2}>
                            <Tooltip title="Đưa phần lên"><Button size="small" type="text" icon={<ArrowUpOutlined />} aria-label="Đưa phần lên" disabled={!selected} onClick={() => moveSection(-1)} /></Tooltip>
                            <Tooltip title="Đưa phần xuống"><Button size="small" type="text" icon={<ArrowDownOutlined />} aria-label="Đưa phần xuống" disabled={selected === draft.sections.length - 1} onClick={() => moveSection(1)} /></Tooltip>
                            <Tooltip title="Nhân bản phần"><Button size="small" type="text" icon={<CopyOutlined />} aria-label="Nhân bản phần" onClick={() => { const copy = { ...structuredClone(section), id: newId(), blocks: getGuideBlocks(section).map(block => ({ ...structuredClone(block), id: newId() })), title: section.title ? `${section.title} — bản sao` : '' }; change(v => ({ ...v, sections: [...v.sections.slice(0, selected + 1), copy, ...v.sections.slice(selected + 1)] })); selectSection(selected + 1); }} /></Tooltip>
                            <Popconfirm title="Xóa phần và toàn bộ nội dung bên trong?" okText="Xóa phần" cancelText="Giữ lại" onConfirm={() => { change(v => ({ ...v, sections: v.sections.filter((_, i) => i !== selected) })); selectSection(Math.max(0, selected - 1)); }}><Button size="small" type="text" danger icon={<DeleteOutlined />} aria-label="Xóa phần đang soạn" /></Popconfirm>
                        </Space></div>
                        {errors[`section-${section.id}`] && <Alert type="error" showIcon message={errors[`section-${section.id}`]} className={styles.editorValidation} />}
                        <label htmlFor="guide-editor-section-title" className={styles.editorFieldLabel}>Tiêu đề phần</label><Input id="guide-editor-section-title" value={section.title} maxLength={180} size="large" placeholder="Ví dụ: Các bước thực hiện" onChange={e => changeSection({ title: e.target.value })} />
                        <GuideBlocksEditor key={section.id} blocks={getGuideBlocks(section)} onChange={blocks => changeSection({ blocks })} />
                    </div> : <Empty description="Chưa có phần nội dung nào."><Button type="primary" icon={<PlusOutlined />} onClick={addSection}>Thêm phần đầu tiên</Button></Empty>}
                    {inlineError('sections')}
                </div>
                <aside className={styles.editorLivePreview} aria-label="Bản xem trước trực tiếp"><div className={styles.editorPreviewHeading}><ReadOutlined /> XEM TRƯỚC TRỰC TIẾP</div><article>{preview}</article></aside>
            </div>}
        </div>
    </Modal>;
}
