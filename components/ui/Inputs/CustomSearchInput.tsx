// components/CustomSearchInput.tsx
import { Input, InputProps, Spin } from 'antd';
import { DownOutlined, SearchOutlined } from '@ant-design/icons';
import React, { useMemo, useState, useEffect } from 'react';
import debounce from 'lodash/debounce';

interface CustomSearchInputProps extends Omit<InputProps, 'onChange'> {
    fetchApi?: (value: string) => Promise<void>; // BẮT BUỘC fetchApi trả về Promise
    debounceTime?: number;
    hiddleIcon?: boolean
}

const CustomSearchInput: React.FC<CustomSearchInputProps> = ({
    hiddleIcon = false,
    placeholder,
    fetchApi,
    debounceTime = 300,
    value,
    ...restProps
}) => {
    const [loading, setLoading] = useState(false);
    const [inputValue, setInputValue] = useState(String(value ?? ''));

    useEffect(() => {
        setInputValue(String(value ?? ''));
    }, [value]);

    const debouncedFetchApi = useMemo(() => {
        if (!fetchApi) return undefined;
        return debounce(async (value: string) => {
            try {
                setLoading(true);
                await fetchApi(value);
            } finally {
                setLoading(false);
            }
        }, debounceTime);
    }, [fetchApi, debounceTime]);

    useEffect(() => {
        return () => {
            debouncedFetchApi?.cancel();
        };
    }, [debouncedFetchApi]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
        if (debouncedFetchApi) {
            debouncedFetchApi(e.target.value);
        }
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
