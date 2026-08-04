"use client";

import { useEffect, useRef, useState } from "react";

export const useTableViewport = (reservedHeight = 112, minimumHeight = 80) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollY, setScrollY] = useState(minimumHeight);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const updateHeight = () => {
            setScrollY(Math.max(minimumHeight, container.clientHeight - reservedHeight));
        };

        updateHeight();
        const observer = new ResizeObserver(updateHeight);
        observer.observe(container);
        return () => observer.disconnect();
    }, [minimumHeight, reservedHeight]);

    return { containerRef, scrollY };
};
