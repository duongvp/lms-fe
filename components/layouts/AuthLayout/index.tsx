import { Card, Layout } from "antd";
import Image from "next/image";
import '@ant-design/v5-patch-for-react-19';

const { Content } = Layout;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <Layout style={{ maxHeight: '100vh', height: '100vh' }}>
            <Content style={{ position: 'relative', height: '100vh', width: '100%' }}>
                <Image
                    src="/assets/bg-warehouse.jpg"
                    alt="warehouse"
                    fill
                    sizes="100vw"
                    style={{ objectFit: "cover", zIndex: 0 }}
                    priority
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
                <Card className='login-form'>
                    {children}
                </Card>
            </Content>
        </Layout>
    );
}
