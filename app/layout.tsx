import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
})

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
})

export const metadata: Metadata = {
    title: "Fit Core",
    description: "My Mobile First App",
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="ko" className="h-full">
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased 
        bg-gray-100 flex justify-center min-h-full`}
            >
                {/* 모바일 화면처럼 보이게 하는 메인 컨테이너 */}
                <main className="w-full max-w-[480px] min-h-screen bg-white shadow-2xl relative flex flex-col">
                    {children}
                </main>
            </body>
        </html>
    )
}
