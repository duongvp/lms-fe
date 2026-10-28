"use client";

import { ClockCircleOutlined } from '@ant-design/icons';
import { Alert, Image, Tag } from 'antd';
import { getGuideBlocks, guideSectionText, guideDate, isSafeGuideImage, type GuideArticle } from '@/services/userGuideService';
import GuideRichContent from './GuideRichContent';
import styles from '../user-guide.module.css';

export default function GuideArticleContent({ article, categoryName, preview = false, idPrefix = 'section' }: {
    article: GuideArticle; categoryName?: string; preview?: boolean; idPrefix?: string;
}) {
    const minutes = Math.max(1, Math.ceil(article.sections.map(guideSectionText).join(' ').split(/\s+/).length / 200));
    return <>
                <header className={styles.articleHeader}>
                    <Tag color="blue">{categoryName || 'Chưa chọn danh mục'}</Tag><Tag>Hướng dẫn LMS STREAM</Tag>
                    <h1>{article.title || 'Tiêu đề bài viết'}</h1><p>{article.description || (preview ? 'Mô tả ngắn sẽ xuất hiện tại đây.' : '')}</p>
                    <div className={styles.articleMeta}><span>Cập nhật {guideDate(article.updatedAt)}</span><span><ClockCircleOutlined /> Khoảng {minutes} phút đọc</span></div>
                </header>
                {Boolean(article.audience || article.prerequisites?.some(item => item.trim())) && <div className={styles.articlePreparation}>
                    {article.audience && <div><strong>Dành cho ai?</strong><p>{article.audience}</p></div>}
                    {!!article.prerequisites?.some(item => item.trim()) && <div><strong>Chuẩn bị trước khi thực hiện</strong><ul>{article.prerequisites.filter(item => item.trim()).map((item, i) => <li key={i}>{item}</li>)}</ul></div>}
                </div>}
                {!preview && article.sections.length > 1 && <nav className={styles.mobileToc} aria-label="Mục lục trên điện thoại"><strong>Trong bài viết này</strong>{article.sections.map((s, index) => <a key={s.id} href={`#${idPrefix}-${s.id}`}>{index + 1}. {s.title}</a>)}</nav>}
                <div className={styles.articleBody}>{article.sections.map((section, index) => <section key={section.id} id={`${idPrefix}-${section.id}`} className={styles.contentSection}>
                    <h2><span>{String(index + 1).padStart(2, '0')}</span>{section.title || 'Phần chưa đặt tên'}</h2>
                    {getGuideBlocks(section).map(block => <div key={block.id} data-guide-block={block.type} className={styles.articleBlock}>
                        {block.type === 'text' && (block.richText ? <GuideRichContent content={block.richText} /> : block.text.split('\n').filter(Boolean).map((p, i) => <p key={i}>{p}</p>))}
                        {block.type === 'steps' && block.steps.some(step => step.trim()) && <ol className={styles.steps}>{block.steps.filter(step => step.trim()).map((step, i) => <li key={i}>{step}</li>)}</ol>}
                        {block.type === 'table' && <div className={styles.guideTableWrap} role="region" aria-label={`Bảng ${section.title}`} tabIndex={0}><table className={styles.guideTable}><caption>{section.title}</caption><thead><tr>{block.table.columns.map((column, i) => <th scope="col" key={i}>{column}</th>)}</tr></thead><tbody>{block.table.rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>}
                        {block.type === 'notice' && block.notice && <Alert className={styles.sectionNotice} type="warning" showIcon message="Lưu ý khi thao tác" description={block.notice} />}
                        {block.type === 'image' && isSafeGuideImage(block.imageUrl) && <figure className={styles.figure}><Image src={block.imageUrl} alt={block.imageCaption || section.title} style={{ maxWidth: '100%' }} /><figcaption>{block.imageCaption}</figcaption></figure>}
                    </div>)}
                </section>)}</div>
    </>;
}
