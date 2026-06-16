import { Suspense } from "react"
import MyPageContent from "@/app/my/MyPageContent"

export default function Page() {
    return (
        <Suspense fallback={<div className="flex-1 bg-slate-50" />}>
            <MyPageContent />
        </Suspense>
    )
}
