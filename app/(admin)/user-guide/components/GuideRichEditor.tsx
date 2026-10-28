"use client";

import { useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ImageExtension from '@tiptap/extension-image';
import { Button, Input, Modal, Select, Tooltip } from 'antd';
import { BoldOutlined, ItalicOutlined, UnderlineOutlined, StrikethroughOutlined, OrderedListOutlined, UnorderedListOutlined, LinkOutlined, DisconnectOutlined, UndoOutlined, RedoOutlined, ClearOutlined, PictureOutlined, DeleteOutlined } from '@ant-design/icons';
import { isSafeGuideImage, isSafeGuideLink, type GuideRichNode } from '@/services/userGuideService';
import styles from '../user-guide.module.css';

const SafeImage = ImageExtension.extend({
    parseHTML() { return [{ tag: 'img[src]', getAttrs: element => isSafeGuideImage(element.getAttribute('src') || '') ? null : false }]; },
});

export default function GuideRichEditor({ id = 'guide-editor-section-text', text, content, onChange }: {
    id?: string; text: string; content?: GuideRichNode; onChange: (text: string, content: GuideRichNode) => void;
}) {
    const [linkOpen, setLinkOpen] = useState(false);
    const [url, setUrl] = useState('');
    const [urlError, setUrlError] = useState(false);
    const [imageOpen, setImageOpen] = useState(false);
    const [imageUrl, setImageUrl] = useState('');
    const [imageAlt, setImageAlt] = useState('');
    const [imageError, setImageError] = useState(false);
    const linkId = id === 'guide-editor-section-text' ? 'guide-link-url' : `${id}-link-url`;
    const imageId = `${id}-image-url`;
    const editor = useEditor({
        extensions: [StarterKit.configure({
            heading: { levels: [3] }, code: false, codeBlock: false, horizontalRule: false,
            link: { openOnClick: false, autolink: false, defaultProtocol: 'https', isAllowedUri: isSafeGuideLink },
        }), SafeImage.configure({ allowBase64: false })],
        immediatelyRender: false,
        shouldRerenderOnTransaction: true,
        content: content || { type: 'doc', content: text.split('\n').map(line => ({ type: 'paragraph', content: line ? [{ type: 'text', text: line }] : [] })) },
        editorProps: { attributes: { id, role: 'textbox', 'aria-label': 'Nội dung giải thích', 'aria-multiline': 'true', 'data-placeholder': 'Viết hoặc dán nội dung tại đây…' } },
        onUpdate: ({ editor: current }) => onChange(current.isEmpty ? '' : current.getText({ blockSeparator: '\n' }), current.getJSON()),
    });
    const tools = [
        { label: 'In đậm (Ctrl+B)', icon: <BoldOutlined />, active: editor?.isActive('bold'), run: () => editor?.chain().focus().toggleBold().run() },
        { label: 'In nghiêng (Ctrl+I)', icon: <ItalicOutlined />, active: editor?.isActive('italic'), run: () => editor?.chain().focus().toggleItalic().run() },
        { label: 'Gạch chân (Ctrl+U)', icon: <UnderlineOutlined />, active: editor?.isActive('underline'), run: () => editor?.chain().focus().toggleUnderline().run() },
        { label: 'Gạch ngang', icon: <StrikethroughOutlined />, active: editor?.isActive('strike'), run: () => editor?.chain().focus().toggleStrike().run() },
        { label: 'Danh sách dấu đầu dòng', icon: <UnorderedListOutlined />, active: editor?.isActive('bulletList'), run: () => editor?.chain().focus().toggleBulletList().run() },
        { label: 'Danh sách đánh số', icon: <OrderedListOutlined />, active: editor?.isActive('orderedList'), run: () => editor?.chain().focus().toggleOrderedList().run() },
        { label: 'Chèn hoặc sửa liên kết', icon: <LinkOutlined />, active: editor?.isActive('link'), run: () => { setUrl(editor?.getAttributes('link').href || ''); setUrlError(false); setLinkOpen(true); } },
        { label: 'Bỏ liên kết', icon: <DisconnectOutlined />, disabled: !editor?.isActive('link'), run: () => editor?.chain().focus().unsetLink().run() },
        { label: 'Chèn hoặc sửa ảnh', icon: <PictureOutlined />, active: editor?.isActive('image'), run: () => { const attrs = editor?.getAttributes('image'); setImageUrl(attrs?.src || ''); setImageAlt(attrs?.alt || ''); setImageError(false); setImageOpen(true); } },
        { label: 'Xóa ảnh đang chọn', icon: <DeleteOutlined />, disabled: !editor?.isActive('image'), run: () => editor?.chain().focus().deleteSelection().run() },
        { label: 'Xóa định dạng', icon: <ClearOutlined />, run: () => editor?.chain().focus().unsetAllMarks().clearNodes().run() },
        { label: 'Hoàn tác (Ctrl+Z)', icon: <UndoOutlined />, disabled: !editor?.can().undo(), run: () => editor?.chain().focus().undo().run() },
        { label: 'Làm lại (Ctrl+Shift+Z)', icon: <RedoOutlined />, disabled: !editor?.can().redo(), run: () => editor?.chain().focus().redo().run() },
    ];
    return <div className={styles.richEditor}>
        <div className={styles.richToolbar} role="toolbar" aria-label="Định dạng nội dung">
            <Select aria-label="Kiểu đoạn văn" size="small" value={editor?.isActive('heading') ? 'heading' : editor?.isActive('blockquote') ? 'quote' : 'paragraph'} style={{ width: 120 }} disabled={!editor} options={[{ value: 'paragraph', label: 'Văn bản' }, { value: 'heading', label: 'Tiêu đề nhỏ' }, { value: 'quote', label: 'Trích dẫn' }]} onChange={value => {
                if (value === 'quote') editor?.chain().focus().toggleBlockquote().run();
                else { const chain = editor?.chain().focus(); if (editor?.isActive('blockquote')) chain?.toggleBlockquote(); if (value === 'heading') chain?.setHeading({ level: 3 }).run(); else chain?.setParagraph().run(); }
            }} />
            {tools.map(tool => <Tooltip key={tool.label} title={tool.label}><Button size="small" type={tool.active ? 'primary' : 'text'} aria-label={tool.label} aria-pressed={!!tool.active} disabled={!editor || tool.disabled} icon={tool.icon} onMouseDown={event => event.preventDefault()} onClick={tool.run} /></Tooltip>)}
        </div>
        <EditorContent editor={editor} className={styles.richContent} />
        <div className={styles.richHint}>Bôi đen văn bản để định dạng · Enter: đoạn mới · Shift+Enter: xuống dòng</div>
        <Modal title="Chèn liên kết" open={linkOpen} onCancel={() => setLinkOpen(false)} okText="Áp dụng" cancelText="Hủy" onOk={() => {
            const value = url.trim();
            if (value && !isSafeGuideLink(value)) { setUrlError(true); return; }
            if (value) { const chain = editor?.chain().focus().extendMarkRange('link'); if (editor?.state.selection.empty && !editor.isActive('link')) chain?.insertContent({ type: 'text', text: value, marks: [{ type: 'link', attrs: { href: value } }] }).run(); else chain?.setLink({ href: value }).run(); }
            else editor?.chain().focus().extendMarkRange('link').unsetLink().run();
            setLinkOpen(false);
        }}>
            <label htmlFor={linkId}>Địa chỉ liên kết</label>
            <Input id={linkId} autoFocus value={url} placeholder="https://… hoặc mailto:…" status={urlError ? 'error' : undefined} onChange={event => { setUrl(event.target.value); setUrlError(false); }} />
            {urlError && <p role="alert" style={{ color: '#cf1322' }}>Nhập địa chỉ HTTP, HTTPS hoặc email hợp lệ.</p>}
        </Modal>
        <Modal title={editor?.isActive('image') ? 'Chỉnh sửa ảnh' : 'Chèn ảnh vào đoạn văn'} open={imageOpen} onCancel={() => setImageOpen(false)} okText="Chèn / cập nhật ảnh" cancelText="Hủy" onOk={() => {
            const src = imageUrl.trim();
            if (!isSafeGuideImage(src)) { setImageError(true); return; }
            if (editor?.isActive('image')) editor.chain().focus().updateAttributes('image', { src, alt: imageAlt.trim() }).run();
            else editor?.chain().focus().setImage({ src, alt: imageAlt.trim() }).run();
            setImageOpen(false);
        }}>
            <label htmlFor={imageId}>Đường dẫn ảnh HTTPS</label>
            <Input id={imageId} value={imageUrl} placeholder="https://…" status={imageError ? 'error' : undefined} onChange={event => { setImageUrl(event.target.value); setImageError(false); }} />
            {imageError && <p role="alert" style={{ color: '#cf1322' }}>Nhập đường dẫn ảnh HTTPS hợp lệ.</p>}
            <label htmlFor={`${id}-image-alt`}>Mô tả ảnh</label>
            <Input id={`${id}-image-alt`} value={imageAlt} maxLength={300} placeholder="Mô tả ngắn nội dung hình minh họa" onChange={event => setImageAlt(event.target.value)} />
            <p className={styles.muted}>Ảnh được chèn tại vị trí con trỏ. Chọn ảnh để sửa, kéo để đổi vị trí hoặc nhấn Delete để xóa.</p>
        </Modal>
    </div>;
}
