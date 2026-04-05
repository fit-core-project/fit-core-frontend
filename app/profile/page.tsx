// app/profile/page.tsx
import Link from "next/link"

export default function Page() {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold">내 프로필</h1>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p>이름: 홍길동</p>
                <p>목표: 체지방 5% 감량</p>
            </div>

            {/* 메인으로 돌아가는 링크 */}
            <Link href="/" className="mt-6 inline-block text-blue-500 underline">
                홈으로 돌아가기
            </Link>
        </div>
    )
}
