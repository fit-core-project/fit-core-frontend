// app/oauth2/redirect/page.tsx
import { Suspense } from "react"
import OAuth2RedirectHandler from "@/components/OAuth2RedirectHandler"

export default function RedirectPage() {
    return (
        <Suspense fallback={<div>로그인 처리 중...</div>}>
            <OAuth2RedirectHandler />
        </Suspense>
    )
}
