"use client";

import { useRef, useState } from 'react';
import { Button, Empty, Input, Popconfirm, Space, Tooltip } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, CopyOutlined, DeleteOutlined, DragOutlined, FileTextOutlined, PictureOutlined, PlusOutlined, TableOutlined, UnorderedListOutlined, WarningOutlined } from '@ant-design/icons';
import { isSafeGuideImage, type GuideBlock } from '@/services/userGuideService';
import GuideRichEditor from './GuideRichEditor';
import styles from '../user-guide.module.css';

const labels: Record<GuideBlock['type'], string> = { text: 'Đoạn văn', steps: 'Các bước', table: 'Bảng thông tin', notice: 'Lưu ý', image: 'Hình minh họa' };
const icons = { text: <FileTextOutlined />, steps: <UnorderedListOutlined />, table: <TableOutlined />, notice: <WarningOutlined />, image: <PictureOutlined /> };

export function createGuideBlock(type: GuideBlock['type']): GuideBlock {
    const id = crypto.randomUUID();
    switch (type) {
        case 'text': return { id, type, text: '' };
        case 'steps': return { id, type, steps: [''] };
        case 'table': return { id, type, table: { columns: ['Cột 1', 'Cột 2'], rows: [['', '']] } };
        case 'notice': return { id, type, notice: '' };
        case 'image': return { id, type, imageUrl: '', imageCaption: '' };
    }
}

export default function GuideBlocksEditor({ blocks, onChange }: { blocks: GuideBlock[]; onChange: (blocks: GuideBlock[]) => void }) {
    const dragging = useRef<string | null>(null);
    const [dropTarget, setDropTarget] = useState<{ id: string; after: boolean } | null>(null);
    const [announcement, setAnnouncement] = useState('');
    const replace = (block: GuideBlock) => onChange(blocks.map(value => value.id === block.id ? block : value));
    const move = (from: number, to: number) => {
        if (from === to || from < 0 || to < 0 || to >= blocks.length) return;
        const next = [...blocks]; const [block] = next.splice(from, 1); next.splice(to, 0, block);
        onChange(next); setAnnouncement(`${labels[block.type]} đã chuyển đến vị trí ${to + 1}.`);
    };
    const firstTextId = blocks.find(block => block.type === 'text')?.id;
    return <div className={styles.blocksEditor}>
        <p className={styles.blockHelp}><DragOutlined /> Kéo tay nắm để sắp xếp khối, hoặc dùng nút ↑ ↓. Có thể thêm nhiều khối cùng loại.</p>
        <span role="status" className={styles.srOnly}>{announcement}</span>
        {!blocks.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Thêm khối bên dưới để bắt đầu nội dung phần này." />}
        {blocks.map((block, index) => <section key={block.id} data-block-id={block.id} data-block-type={block.type} aria-label={`Khối ${index + 1}: ${labels[block.type]}`} className={`${styles.editorBlock} ${dropTarget?.id === block.id ? dropTarget.after ? styles.blockDropAfter : styles.blockDropBefore : ''}`}
            onDragOver={event => {
                if (!dragging.current) return;
                event.preventDefault(); event.dataTransfer.dropEffect = 'move';
                const rect = event.currentTarget.getBoundingClientRect();
                const after = event.clientY > rect.top + rect.height / 2;
                if (dropTarget?.id !== block.id || dropTarget.after !== after) setDropTarget({ id: block.id, after });
            }} onDrop={event => {
                if (!dragging.current) return;
                event.preventDefault(); event.stopPropagation();
                const from = blocks.findIndex(value => value.id === dragging.current);
                const rect = event.currentTarget.getBoundingClientRect();
                const insertion = index + (event.clientY > rect.top + rect.height / 2 ? 1 : 0);
                move(from, insertion > from ? insertion - 1 : insertion);
                dragging.current = null; setDropTarget(null);
            }}>
            <div className={styles.editorBlockHeading}>
                <div className={styles.blockLabel}><Tooltip title="Kéo để đổi vị trí"><button type="button" className={styles.blockDragHandle} draggable aria-label={`Kéo khối ${index + 1}: ${labels[block.type]}`} onDragStart={event => { dragging.current = block.id; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', block.id); }} onDragEnd={() => { dragging.current = null; setDropTarget(null); }}><DragOutlined /></button></Tooltip><strong>{icons[block.type]} {labels[block.type]}</strong><span className={styles.blockNumber}>{index + 1}</span></div>
                <Space size={0}>
                    <Tooltip title="Đưa khối lên"><Button size="small" type="text" icon={<ArrowUpOutlined />} aria-label={`Đưa khối ${index + 1} lên`} disabled={!index} onClick={() => move(index, index - 1)} /></Tooltip>
                    <Tooltip title="Đưa khối xuống"><Button size="small" type="text" icon={<ArrowDownOutlined />} aria-label={`Đưa khối ${index + 1} xuống`} disabled={index === blocks.length - 1} onClick={() => move(index, index + 1)} /></Tooltip>
                    <Tooltip title="Nhân bản khối"><Button size="small" type="text" icon={<CopyOutlined />} aria-label={`Nhân bản khối ${index + 1}`} onClick={() => { const next = [...blocks]; next.splice(index + 1, 0, { ...structuredClone(block), id: crypto.randomUUID() }); onChange(next); }} /></Tooltip>
                    <Popconfirm title={`Xóa khối ${labels[block.type].toLocaleLowerCase('vi')} này?`} okText="Xóa" cancelText="Giữ lại" onConfirm={() => onChange(blocks.filter(value => value.id !== block.id))}><Button type="text" size="small" danger icon={<DeleteOutlined />} aria-label={`Xóa khối ${index + 1}`} /></Popconfirm>
                </Space>
            </div>
            {block.type === 'text' && <GuideRichEditor id={block.id === firstTextId ? 'guide-editor-section-text' : `guide-editor-text-${block.id}`} text={block.text} content={block.richText} onChange={(text, richText) => replace({ ...block, text, richText })} />}
            {block.type === 'steps' && <>
                {block.steps.map((step, i) => <div className={styles.editorStep} key={i}><span>{i + 1}</span><Input.TextArea aria-label={`Nội dung bước ${i + 1}`} value={step} autoSize={{ minRows: 1, maxRows: 6 }} placeholder={`Mô tả thao tác ở bước ${i + 1}`} onChange={e => replace({ ...block, steps: block.steps.map((value, j) => j === i ? e.target.value : value) })} /><Space size={0}><Button type="text" size="small" icon={<ArrowUpOutlined />} aria-label={`Đưa bước ${i + 1} lên`} disabled={!i} onClick={() => { const steps = [...block.steps]; [steps[i], steps[i - 1]] = [steps[i - 1], steps[i]]; replace({ ...block, steps }); }} /><Button type="text" size="small" icon={<DeleteOutlined />} aria-label={`Xóa bước ${i + 1}`} onClick={() => replace({ ...block, steps: block.steps.filter((_, j) => j !== i) })} /></Space></div>)}
                <Button type="dashed" block icon={<PlusOutlined />} onClick={() => replace({ ...block, steps: [...block.steps, ''] })}>Thêm bước</Button>
            </>}
            {block.type === 'table' && <>
                <div className={styles.editorTableScroll}><table className={styles.editorTable}><thead><tr>{block.table.columns.map((column, ci) => <th key={ci}><div><Input aria-label={`Tên cột ${ci + 1}`} value={column} placeholder={`Tên cột ${ci + 1}`} onChange={e => replace({ ...block, table: { ...block.table, columns: block.table.columns.map((value, j) => j === ci ? e.target.value : value) } })} /><Popconfirm title="Xóa cột và các ô trong cột?" okText="Xóa" cancelText="Hủy" onConfirm={() => replace({ ...block, table: { columns: block.table.columns.filter((_, j) => j !== ci), rows: block.table.rows.map(row => row.filter((_, j) => j !== ci)) } })}><Button type="text" size="small" danger icon={<DeleteOutlined />} aria-label={`Xóa cột ${ci + 1}`} disabled={block.table.columns.length <= 2} /></Popconfirm></div></th>)}<th aria-label="Thao tác dòng" /></tr></thead><tbody>{block.table.rows.map((row, ri) => <tr key={ri}>{row.map((cell, ci) => <td key={ci}><Input.TextArea aria-label={`Ô dòng ${ri + 1} cột ${ci + 1}`} value={cell} autoSize={{ minRows: 2, maxRows: 8 }} onChange={e => replace({ ...block, table: { ...block.table, rows: block.table.rows.map((r, i) => i === ri ? r.map((value, j) => j === ci ? e.target.value : value) : r) } })} /></td>)}<td><Button type="text" danger size="small" icon={<DeleteOutlined />} aria-label={`Xóa dòng ${ri + 1}`} disabled={block.table.rows.length <= 1} onClick={() => replace({ ...block, table: { ...block.table, rows: block.table.rows.filter((_, j) => j !== ri) } })} /></td></tr>)}</tbody></table></div>
                <Space wrap><Button size="small" icon={<PlusOutlined />} onClick={() => replace({ ...block, table: { ...block.table, rows: [...block.table.rows, block.table.columns.map(() => '')] } })}>Thêm dòng</Button><Button size="small" icon={<PlusOutlined />} onClick={() => replace({ ...block, table: { columns: [...block.table.columns, `Cột ${block.table.columns.length + 1}`], rows: block.table.rows.map(row => [...row, '']) } })}>Thêm cột</Button></Space>
            </>}
            {block.type === 'notice' && <Input.TextArea aria-label="Nội dung lưu ý" value={block.notice} autoSize={{ minRows: 2, maxRows: 6 }} placeholder="Điều người dùng cần chú ý trước khi thao tác…" onChange={e => replace({ ...block, notice: e.target.value })} />}
            {block.type === 'image' && <><label htmlFor={`image-${block.id}`}>Đường dẫn ảnh HTTPS</label><Input id={`image-${block.id}`} value={block.imageUrl} placeholder="https://…" status={block.imageUrl && !isSafeGuideImage(block.imageUrl) ? 'error' : undefined} onChange={e => replace({ ...block, imageUrl: e.target.value })} /><label htmlFor={`caption-${block.id}`}>Mô tả ảnh</label><Input id={`caption-${block.id}`} value={block.imageCaption} maxLength={300} onChange={e => replace({ ...block, imageCaption: e.target.value })} /></>}
        </section>)}
        <div className={styles.editorInsert}><span>Thêm khối vào phần này</span><Space wrap>{(['text', 'steps', 'table', 'notice', 'image'] as const).map(type => <Button key={type} icon={icons[type]} onClick={() => onChange([...blocks, createGuideBlock(type)])}>{type === 'table' ? 'Bảng' : type === 'image' ? 'Hình ảnh' : labels[type]}</Button>)}</Space></div>
    </div>;
}
