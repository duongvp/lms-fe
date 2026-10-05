'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Checkbox, Empty, Input, Typography } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { Popup } from 'antd-mobile';
import type { AttendanceResetStudent } from '@/services/livestreamService';

interface Props {
    open: boolean;
    students: AttendanceResetStudent[];
    selectedIds: number[];
    onChange: (ids: number[]) => void;
    onClose: () => void;
}

const normalize = (value: unknown) => String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
    .toLocaleLowerCase('vi');

export default function AttendanceResetStudentPicker({ open, students, selectedIds, onChange, onClose }: Props) {
    const [search, setSearch] = useState('');
    useEffect(() => { if (open) setSearch(''); }, [open]);
    const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
    const matches = useMemo(() => {
        const term = normalize(search.trim());
        if (!term) return students;
        return students.filter(student => normalize([student.name, student.username, student.student_hmid].join(' ')).includes(term));
    }, [search, students]);
    const visible = matches.slice(0, 100);
    const selectedCount = students.filter(student => selected.has(student.id)).length;
    const allSelected = students.length > 0 && selectedCount === students.length;

    const toggle = (id: number) => onChange(selected.has(id)
        ? selectedIds.filter(value => value !== id)
        : [...selectedIds, id]);

    return <Popup
        visible={open}
        position="bottom"
        onClose={onClose}
        onMaskClick={onClose}
        bodyClassName="attendance-reset-student-picker"
        bodyStyle={{ '--z-index': 1200 } as React.CSSProperties}
        style={{ '--z-index': 1200 } as React.CSSProperties}
    >
        <div className="attendance-reset-student-picker-header">
            <div><strong>Chọn học viên</strong><Typography.Text type="secondary">{selectedIds.length} đã chọn · {students.length} học viên</Typography.Text></div>
            <Button type="text" aria-label="Đóng danh sách học viên" icon={<CloseOutlined />} onClick={onClose} />
        </div>
        <div className="attendance-reset-student-picker-search">
            <Input.Search allowClear value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm tên, tài khoản hoặc HMID" aria-label="Tìm học viên" />
            <Typography.Text type="secondary">{matches.length} kết quả{matches.length > 100 ? ' · Hiển thị 100 đầu tiên, nhập thêm để tìm' : ''}</Typography.Text>
            <Checkbox
                className="attendance-reset-student-select-all"
                checked={allSelected}
                indeterminate={selectedCount > 0 && !allSelected}
                disabled={!students.length}
                onChange={event => onChange(event.target.checked ? Array.from(new Set(students.map(student => student.id))) : [])}
            >Chọn tất cả {students.length} học viên</Checkbox>
        </div>
        <div className="attendance-reset-student-picker-list">
            {visible.length ? visible.map(student => <Checkbox
                key={student.id}
                className={`attendance-reset-student-option${selected.has(student.id) ? ' attendance-reset-student-option-selected' : ''}`}
                checked={selected.has(student.id)}
                onChange={() => toggle(student.id)}
            >
                <span className="attendance-reset-student-option-info">
                    <strong>{student.name || student.username || `Học viên ${student.id}`}</strong>
                    <span>{[student.username, student.student_hmid].filter(Boolean).join(' · ')}</span>
                </span>
            </Checkbox>) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không tìm thấy học viên" />}
        </div>
        <div className="attendance-reset-student-picker-footer">
            <span>Đã chọn {selectedIds.length}</span>
            <Button type="primary" onClick={onClose}>Xong</Button>
        </div>
    </Popup>;
}
