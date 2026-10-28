import { Fragment, type ReactNode } from 'react';
import Link from 'next/link';
import { isSafeGuideImage, isSafeGuideLink, type GuideRichNode } from '@/services/userGuideService';
import styles from '../user-guide.module.css';

// Render the supported document schema through React; never inject author HTML.
function renderNode(node: GuideRichNode, depth = 0): ReactNode {
    if (depth > 40) return null;
    const children = node.content?.map((child, index) => <Fragment key={index}>{renderNode(child, depth + 1)}</Fragment>);
    if (node.type === 'text') {
        let text: ReactNode = node.text || '';
        for (const mark of node.marks || []) {
            if (mark.type === 'bold') text = <strong>{text}</strong>;
            if (mark.type === 'italic') text = <em>{text}</em>;
            if (mark.type === 'underline') text = <u>{text}</u>;
            if (mark.type === 'strike') text = <s>{text}</s>;
            if (mark.type === 'link' && typeof mark.attrs?.href === 'string' && isSafeGuideLink(mark.attrs.href)) text = mark.attrs.href.startsWith('/user-guide/')
                ? <Link href={mark.attrs.href}>{text}</Link>
                : <a href={mark.attrs.href} target="_blank" rel="noopener noreferrer">{text}</a>;
        }
        return text;
    }
    switch (node.type) {
        case 'doc': return children;
        case 'paragraph': return <p>{children?.length ? children : <br />}</p>;
        case 'heading': return <h3>{children}</h3>;
        case 'bulletList': return <ul>{children}</ul>;
        case 'orderedList': return <ol start={typeof node.attrs?.start === 'number' && Number.isSafeInteger(node.attrs.start) ? node.attrs.start : 1}>{children}</ol>;
        case 'listItem': return <li>{children}</li>;
        case 'blockquote': return <blockquote>{children}</blockquote>;
        case 'image': return typeof node.attrs?.src === 'string' && isSafeGuideImage(node.attrs.src) ? <img src={node.attrs.src} alt={typeof node.attrs.alt === 'string' ? node.attrs.alt : ''} loading="lazy" /> : null;
        case 'hardBreak': return <br />;
        default: return children;
    }
}

export default function GuideRichContent({ content }: { content: GuideRichNode }) {
    return <div className={styles.richContent}>{renderNode(content)}</div>;
}
