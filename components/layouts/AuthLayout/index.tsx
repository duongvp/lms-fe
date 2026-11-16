import '@ant-design/v5-patch-for-react-19';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <main style={{
            minHeight: '100dvh', position: 'relative', display: 'grid',
            placeItems: 'center', padding: 16, background: '#18304e',
        }}>
            <img
                src="https://huongnghiep.hocmai.vn/wp-content/uploads/2025/12/Thumbnail-video-YT_huyennk.png"
                alt=""
                style={{ position: 'absolute', inset: 0, objectFit: 'cover', height: '100%', width: '100%', zIndex: 0 }}
            />
            <div aria-hidden="true" style={{
                position: 'absolute', inset: 0, zIndex: 1,
                background: 'linear-gradient(135deg, rgba(15, 34, 62, 0.58), rgba(15, 34, 62, 0.38))',
            }} />
            {/* Keep the page shell independent of client-injected Ant Design styles. */}
            <section className="login-form" aria-label="Xác thực tài khoản" style={{
                position: 'relative', background: '#fff', color: '#172b47',
                padding: '32px clamp(24px, 5vw, 36px)', borderRadius: 22,
                border: '1px solid rgba(255, 255, 255, 0.75)',
                boxShadow: '0 24px 80px rgba(10, 28, 55, 0.22)',
            }}>
                {children}
            </section>
        </main>
    );
}
