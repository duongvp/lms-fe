import { useState, useEffect, useRef } from 'react';

export const useBarcodeScanner = (onScan: (code: string) => void, enabled: boolean) => {
    const [barcode, setBarcode] = useState<string>('');
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                if (barcode) {
                    onScan(barcode);
                    setBarcode('');
                }
            } else if (e.key.length === 1) {
                setBarcode(prev => prev + e.key);
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                timeoutRef.current = setTimeout(() => setBarcode(''), 150);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [barcode, enabled, onScan]);

    return { barcode };
};