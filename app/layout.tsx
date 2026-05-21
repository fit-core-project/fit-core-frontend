import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import Header from "./components/header"
import AuthInitializer from "@/app/components/AuthInitializer"
import LogViewer from "@/app/components/LogViewer"
import Providers from "@/components/Providers"
import MSWProvider from "@/app/components/MSWProvider"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = { title: "Fit Core" }

const isMockMode = process.env.NEXT_PUBLIC_API_MODE === "mock"

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    const content = (
        <Providers>
            <AuthInitializer />
            <Header />
            <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-y-auto">{children}</div>
        </Providers>
    )

    return (
        <html lang="ko" className="h-[100dvh]">
            <body className={`${geistSans.variable} ${geistMono.variable} h-[100dvh] bg-slate-950 antialiased`}>
                <main className="flex h-full w-full justify-center overflow-hidden">
                    <LogViewer
                        title="AI Engine Logs"
                        endpoint={process.env.NEXT_PUBLIC_API_URL}
                        accentClassName="bg-emerald-400"
                    />
                    <section className="relative flex h-full w-full max-w-[480px] shrink-0 flex-col overflow-hidden bg-slate-50 shadow-2xl">
                        {isMockMode ? <MSWProvider>{content}</MSWProvider> : content}
                    </section>
                    <LogViewer
                        title="Spring Boot Logs"
                        endpoint={process.env.NEXT_PUBLIC_BASE_URL}
                        accentClassName="bg-sky-400"
                    />
                </main>
            </body>
        </html>
    )
}
