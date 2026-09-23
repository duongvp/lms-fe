import katex from "katex";
import type { ElementType } from "react";

type MathSegment = {
    content: string;
    display: boolean;
    math: boolean;
    raw?: string;
};

interface MathTextProps {
    value?: string | null;
    as?: "span" | "div";
    className?: string;
    fallback?: string;
    title?: string;
}

const isEscaped = (value: string, index: number) => {
    let slashCount = 0;
    for (let cursor = index - 1; cursor >= 0 && value[cursor] === "\\"; cursor -= 1) {
        slashCount += 1;
    }
    return slashCount % 2 === 1;
};

const findClosingDelimiter = (value: string, start: number, delimiter: "$" | "$$") => {
    let cursor = start;
    while (cursor < value.length) {
        const found = value.indexOf(delimiter, cursor);
        if (found < 0) return -1;
        if (!isEscaped(value, found)) return found;
        cursor = found + delimiter.length;
    }
    return -1;
};

const parseMathSegments = (value: string): MathSegment[] => {
    const segments: MathSegment[] = [];
    let textStart = 0;
    let cursor = 0;

    while (cursor < value.length) {
        if (value[cursor] !== "$" || isEscaped(value, cursor)) {
            cursor += 1;
            continue;
        }

        const delimiter: "$" | "$$" = value.startsWith("$$", cursor) ? "$$" : "$";
        const mathStart = cursor + delimiter.length;
        const closing = findClosingDelimiter(value, mathStart, delimiter);
        if (closing < 0) {
            cursor += delimiter.length;
            continue;
        }

        if (cursor > textStart) {
            segments.push({ content: value.slice(textStart, cursor), display: false, math: false });
        }
        const content = value.slice(mathStart, closing);
        segments.push({
            content,
            display: delimiter === "$$",
            math: true,
            raw: `${delimiter}${content}${delimiter}`,
        });
        cursor = closing + delimiter.length;
        textStart = cursor;
    }

    if (textStart < value.length) {
        segments.push({ content: value.slice(textStart), display: false, math: false });
    }
    return segments.length ? segments : [{ content: value, display: false, math: false }];
};

const renderMath = (segment: MathSegment) => {
    try {
        // Chấp nhận nội dung được copy từ Markdown, nơi dấu gạch dưới đôi khi
        // bị escape thành \_. Dữ liệu gốc vẫn được giữ nguyên khi lưu.
        const latex = segment.content.replace(/\\_/g, "_");
        return katex.renderToString(latex, {
            displayMode: segment.display,
            throwOnError: false,
            strict: "warn",
            trust: false,
            output: "htmlAndMathml",
        });
    } catch {
        return null;
    }
};

const MathText = ({ value, as = "span", className, fallback = "", title }: MathTextProps) => {
    const content = String(value || fallback);
    const Component = as as ElementType;

    return (
        <Component className={className} title={title}>
            {parseMathSegments(content).map((segment, index) => {
                if (!segment.math) return <span key={index}>{segment.content}</span>;
                const html = renderMath(segment);
                if (!html) return <span key={index}>{segment.raw}</span>;
                const MathComponent = segment.display ? "div" : "span";
                return (
                    <MathComponent
                        key={index}
                        className={segment.display ? "quiz-math-display" : "quiz-math-inline"}
                        dangerouslySetInnerHTML={{ __html: html }}
                    />
                );
            })}
        </Component>
    );
};

export const hasMathSyntax = (value?: string | null) => /(^|[^\\])\$\$?[\s\S]+?\$\$?/.test(String(value || ""));

export default MathText;
