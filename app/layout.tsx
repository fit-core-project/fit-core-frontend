import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import Header from "./components/header"
import AuthInitializer from "@/app/components/AuthInitializer"
import MainLayout from "@/app/components/MainLayout"
import Providers from "@/components/Providers"
import MSWProvider from "@/app/components/MSWProvider"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = { title: "Fit Core" }

// NODE_ENV guard prevents MSW from activating in production even if
// NEXT_PUBLIC_API_MODE is accidentally set to "mock" in deploy config.
const isMockMode =
    process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_API_MODE === "mock"

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
                <MainLayout>
                    <section className="relative flex h-full w-full max-w-[480px] shrink-0 flex-col overflow-hidden bg-slate-50 shadow-2xl">
                        {isMockMode ? <MSWProvider>{content}</MSWProvider> : content}
                    </section>
                </MainLayout>
            </body>
        </html>
    )
}
