import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import Header from "./components/header"
import AuthInitializer from "@/app/components/AuthInitializer"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = { title: "Fit Core" }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="ko" className="h-[100dvh]">
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-100 flex justify-center h-[100dvh]`}
            >
                <main className="w-full max-w-[480px] h-full bg-slate-50 shadow-2xl relative flex flex-col overflow-hidden">
                    <AuthInitializer />
                    <Header />

                    <div className="flex-1 flex flex-col relative w-full min-h-0 overflow-y-auto">{children}</div>
                </main>
            </body>
        </html>
    )
}
