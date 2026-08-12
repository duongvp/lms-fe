import { Card, Layout } from "antd";
import Image from "next/image";
import '@ant-design/v5-patch-for-react-19';

const { Content } = Layout;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <Layout style={{ minHeight: '100dvh' }}>
            <Content style={{ position: 'relative', minHeight: '100dvh', width: '100%', overflow: 'auto' }}>
                {/* <Image
                    src="/assets/bg-warehouse.jpg"
                    alt="warehouse"
                    fill
                    sizes="100vw"
                    style={{ objectFit: "cover", zIndex: 0 }}
                    priority
                /> */}
                <img
                    src="https://huongnghiep.hocmai.vn/wp-content/uploads/2025/12/Thumbnail-video-YT_huyennk.png"
                    alt="warehouse"
                    style={{ position: "absolute", inset: 0, objectFit: "cover", height: "100%", width: "100%", zIndex: 0 }}
                />
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.4)', // lớp phủ mờ
                        zIndex: 1,
                    }}
                />
                <Card className='login-form' styles={{ body: { padding: 24 } }}>
                    {children}
                </Card>
            </Content>
        </Layout>
    );
}
