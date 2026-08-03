import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppSWRProvider from "@/providers/AppSWRProvider";

export const metadata: Metadata = {
    title: "Học trực tuyến - livestream",
    description: 'Welcome to My Site',
    icons: {
        icon: "/A2S.png",
    },
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
};


export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <head />
            <body>
                <AppSWRProvider>{children}</AppSWRProvider>
            </body>
        </html>
    );
}
