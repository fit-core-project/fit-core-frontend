// app/page.tsx
import Link from "next/link"

export default function HomePage() {
    return (
        <div className="p-6 flex flex-col gap-4">
            <h1 className="text-3xl font-extrabold text-gray-900">Fit Core 🏋️</h1>
            <p className="text-gray-600">오늘의 운동 계획을 확인하세요.</p>

            <div className="grid grid-cols-1 gap-3 mt-4">
                <div className="p-4 border rounded-xl shadow-sm">오늘의 루틴: 상체 웨이트</div>
                <div className="p-4 border rounded-xl shadow-sm">단백질 섭취량: 120g / 150g</div>
            </div>

            {/* 프로필 페이지로 이동하는 버튼 */}
            <Link
                href="/profile"
                className="mt-8 bg-blue-600 text-white text-center py-3 rounded-lg font-semibold active:scale-95 transition-transform"
            >
                마이페이지로 이동
            </Link>
        </div>
    )
}
