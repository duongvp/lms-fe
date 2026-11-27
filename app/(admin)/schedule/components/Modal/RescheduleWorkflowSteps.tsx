"use client";
import {Steps} from 'antd';
import styles from './RescheduleWorkflow.module.css';

const titles = ['Chọn cách xử lý', 'Thiết lập lịch', 'Thông báo', 'Xem trước và xác nhận'];
export default function RescheduleWorkflowSteps({current}: {current: number}) {
    return <div className={styles.progress} aria-label={`Bước ${current + 1} trên 4: ${titles[current]}`}>
        <div className={styles.desktopSteps}><Steps size="small" current={current} responsive={false} items={titles.map(title => ({title}))}/></div>
        <div className={styles.mobileSteps}>
            <span>Bước {current + 1}/4 · <strong>{titles[current]}</strong></span>
            <div className={styles.segments} aria-hidden>{titles.map((title, index) => <span key={title} className={index <= current ? styles.segmentActive : ''}/>)}</div>
        </div>
    </div>;
}
