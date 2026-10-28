import type { ReactNode } from 'react';
import { GuideProvider } from './components/GuideProvider';
import styles from './user-guide.module.css';

export default function UserGuideLayout({ children }: { children: ReactNode }) {
    return <div className={styles.root} lang="vi"><GuideProvider>{children}</GuideProvider></div>;
}
