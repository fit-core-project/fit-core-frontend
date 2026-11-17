import { MapPinOff } from "lucide-react"
import { ButtonLink } from "@/components/ui"

export const metadata = { title: "페이지를 찾을 수 없어요 | Fit Core" }

export default function NotFound() {
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-ground px-4 py-12 text-center">
            <MapPinOff className="size-7 text-ink-3" aria-hidden />
            <h1 className="text-title font-bold text-ink">페이지를 찾을 수 없어요</h1>
            <p className="max-w-[30ch] text-body text-ink-2">주소가 바뀌었거나 없는 페이지예요.</p>
            <div className="mt-4 w-full max-w-[320px]">
                <ButtonLink href="/" variant="primary" size="lg" block>
                    홈으로
                </ButtonLink>
            </div>
        </div>
    )
}
