import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "damitl",
    description: 'Welcome to My Site'
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
                {children}
            </body>
        </html>
    );
}
