// components/CustomSearchInput.tsx
import { Input, InputProps, Spin } from 'antd';
import { DownOutlined, SearchOutlined } from '@ant-design/icons';
import React, { useMemo, useRef, useState, useEffect } from 'react';
import debounce from 'lodash/debounce';

interface CustomSearchInputProps extends Omit<InputProps, 'onChange'> {
    fetchApi?: (value: string) => Promise<void>; // BẮT BUỘC fetchApi trả về Promise
    debounceTime?: number;
    hiddleIcon?: boolean;
    onValueChange?: (value: string) => void;
    resetKey?: number;
}

const CustomSearchInput: React.FC<CustomSearchInputProps> = ({
    hiddleIcon = false,
    placeholder,
    fetchApi,
    debounceTime = 300,
    value,
    onValueChange,
    resetKey,
    onCompositionStart,
    onCompositionEnd,
    ...restProps
}) => {
    const [loading, setLoading] = useState(false);
    const [inputValue, setInputValue] = useState(String(value ?? ''));
    const inputValueRef = useRef(inputValue);
    const lastNotifiedValueRef = useRef<string | undefined>(undefined);
    const lastResetKeyRef = useRef(resetKey);
    const fetchApiRef = useRef(fetchApi);
    fetchApiRef.current = fetchApi;
    const composingRef = useRef(false);
    const requestRef = useRef(0);

    const debouncedFetchApi = useMemo(() => {
        return debounce(async (value: string) => {
            const fetch = fetchApiRef.current;
            if (!fetch) return;
            lastNotifiedValueRef.current = value;
            const request = ++requestRef.current;
            try {
                setLoading(true);
                await fetch(value);
            } finally {
                if (request === requestRef.current) setLoading(false);
            }
        }, debounceTime);
    }, [debounceTime]);

    useEffect(() => {
        const nextValue = String(value ?? '');
        const forceReset = lastResetKeyRef.current !== resetKey;
        lastResetKeyRef.current = resetKey;
        // Parent xác nhận từ khóa đã gửi không được ghi đè bản nháp mới hơn.
        if (!forceReset && (nextValue === inputValueRef.current || nextValue === lastNotifiedValueRef.current)) return;
        debouncedFetchApi.cancel();
        requestRef.current += 1;
        setLoading(false);
        inputValueRef.current = nextValue;
        setInputValue(nextValue);
    }, [value, resetKey, debouncedFetchApi]);

    useEffect(() => {
        const cancel = () => {
            debouncedFetchApi.cancel();
            requestRef.current += 1;
        };
        window.addEventListener('lms:route-navigation-start', cancel);
        return () => {
            window.removeEventListener('lms:route-navigation-start', cancel);
            cancel();
        };
    }, [debouncedFetchApi]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        inputValueRef.current = e.target.value;
        setInputValue(e.target.value);
        onValueChange?.(e.target.value);
        if (!composingRef.current) {
            debouncedFetchApi(e.target.value);
        }
    };

    const compositionProps: Pick<InputProps, 'onCompositionStart' | 'onCompositionEnd'> = {
        onCompositionStart: (event) => {
            composingRef.current = true;
            debouncedFetchApi.cancel();
            onCompositionStart?.(event);
        },
        onCompositionEnd: (event) => {
            composingRef.current = false;
            const text = event.currentTarget.value;
            inputValueRef.current = text;
            setInputValue(text);
            onValueChange?.(text);
            debouncedFetchApi(text);
            onCompositionEnd?.(event);
        },
    };

    if (hiddleIcon) {
        return (
            <Input
                placeholder={placeholder}
                style={{
                    border: 'none',
                    borderBottom: '1px solid #d9d9d9',
                    borderRadius: 0,
                    boxShadow: 'none',
                    flex: 1,
                    ...restProps.style,
                }}
                {...restProps}
                value={inputValue}
                onChange={handleChange}
                {...compositionProps}
            />
        )
    }

    return (
        <div style={{ position: 'relative' }}>
            <Input
                placeholder={placeholder}
                style={{ paddingLeft: 30, paddingRight: 30 }}
                {...restProps}
                value={inputValue}
                onChange={handleChange}
                {...compositionProps}
            />
            {loading ? (
                <Spin
                    size="small"
                    style={{
                        position: 'absolute',
                        right: 10,
                        top: '50%',
                        transform: 'translateY(-50%)',
                    }}
                />
            ) : (
                <DownOutlined
                    style={{
                        position: 'absolute',
                        right: 10,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#888',
                        fontSize: 12,
                        pointerEvents: 'none',
                    }}
                />
            )}
            <SearchOutlined
                style={{
                    position: 'absolute',
                    left: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#888',
                    fontSize: 16,
                }}
            />
        </div>
    );
};

export default CustomSearchInput;
