import type { Metadata } from "next"
import "./globals.css"
import Header from "@/app/components/Header"
import AppShell from "@/app/components/AppShell"
import AuthInitializer from "@/app/components/AuthInitializer"
import AuthGuard from "@/app/components/AuthGuard"
import MainLayout from "@/app/components/MainLayout"
import Providers from "@/components/Providers"
import MSWProvider from "@/app/components/MSWProvider"
import { Toaster } from "sonner"

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
            <AppShell>
                <AuthGuard>{children}</AuthGuard>
            </AppShell>
        </Providers>
    )

    return (
        <html lang="ko" className="h-[100dvh]">
            <body className="h-[100dvh] bg-surface antialiased">
                <MainLayout>
                    <section className="relative flex h-full w-full max-w-[480px] shrink-0 flex-col overflow-hidden bg-ground min-[481px]:border-x min-[481px]:border-hairline">
                        {isMockMode ? <MSWProvider>{content}</MSWProvider> : content}
                    </section>
                </MainLayout>
                <Toaster richColors position="top-center" />
            </body>
        </html>
    )
}
