"use client" // 여기서만 클라이언트 모드 사용

import AuthProvider from "@/components/AuthProvider"
import QueryProvider from "@/components/QueryProvider"

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <QueryProvider>{children}</QueryProvider>
        </AuthProvider>
    )
}
