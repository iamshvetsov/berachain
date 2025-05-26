import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'DCA',
    description: 'Dollar-cost averaging order system'
};

export default function RootLayout({
    children
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
