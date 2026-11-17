import type { Metadata } from "next"
import Link from "next/link"
import { LegalDocument, LegalSection } from "./LegalDocument"

export const metadata: Metadata = { title: "이용약관 | Fit Core" }

export default function TermsPage() {
    return (
        <LegalDocument title="이용약관" summary="Fit Core를 쓰기 전에 알아 두면 좋은 약속이에요. 짧게 정리했어요.">
            <LegalSection title="1. 서비스 소개">
                <p>
                    Fit Core는 몸 상태(통증 부위, 근육통, 컨디션)와 쓸 수 있는 장비·시간을 바탕으로 AI가 오늘의 운동 루틴을 제안하고, 운동과
                    식단을 기록하도록 돕는 웹 서비스예요. 지금은 포트폴리오 단계로 운영하고 있어 기능과 이 약관이 바뀔 수 있어요.
                </p>
            </LegalSection>

            <LegalSection title="2. 의료 조언이 아니에요">
                <p>
                    AI 루틴, 식단 분석, 영양제 답변은 <strong>참고용 정보</strong>이고 의사·트레이너·영양사의 진단이나 처방을 대신하지 않아요.
                    통증이 심하거나 질환이 있다면 운동 전에 전문가와 상의하세요. 루틴을 따라 운동할지는 본인이 판단해요.
                </p>
            </LegalSection>

            <LegalSection title="3. 계정">
                <ul>
                    <li>카카오·네이버·구글 계정으로 로그인해요. 비밀번호는 Fit Core에 저장하지 않아요.</li>
                    <li>다른 사람의 계정을 쓰거나 서비스를 방해하는 행동은 하지 말아 주세요.</li>
                    <li>
                        설정 &gt; 회원 탈퇴에서 언제든 탈퇴할 수 있어요. 탈퇴하면 프로필은 바로 익명으로 바뀌고, 운동·식단·루틴 기록과 계정은
                        탈퇴 30일 뒤 완전히 지워져 되살릴 수 없어요. 자세한 내용은 개인정보 처리방침에서 볼 수 있어요.
                    </li>
                </ul>
            </LegalSection>

            <LegalSection title="4. 테스트 모드">
                <p>
                    테스트 모드는 예시 데이터로 둘러보는 기능이에요. 프로필·운동·식단 기록은 이 기기 브라우저에만 저장돼요. 다만 AI 루틴 생성이나
                    식단 분석, 영양제 질문처럼 AI가 필요한 기능은 입력한 내용을 AI 서버로 보낼 수 있어요.
                </p>
            </LegalSection>

            <LegalSection title="5. 서비스 변경과 중단">
                <p>
                    운영 상황에 따라 기능을 바꾸거나 서비스를 멈출 수 있어요. 중요한 변경은 앱 안에서 미리 알릴게요. 무료로 제공하는 서비스라
                    서비스 중단으로 생긴 손해는 법이 정한 범위 밖에서는 책임지기 어려워요.
                </p>
            </LegalSection>

            <LegalSection title="6. 개인정보">
                <p>
                    어떤 정보를 왜 모으고 언제 지우는지는{" "}
                    <Link href="/privacy" className="font-bold text-ink underline underline-offset-2">
                        개인정보 처리방침
                    </Link>
                    에 정리했어요.
                </p>
            </LegalSection>

            <LegalSection title="7. 문의">
                <p>궁금한 점은 설정 &gt; 문의 / 피드백의 이메일로 보내 주세요.</p>
            </LegalSection>
        </LegalDocument>
    )
}
