import type { Metadata } from "next"
import { LegalDocument, LegalSection } from "../terms/LegalDocument"

export const metadata: Metadata = { title: "개인정보 처리방침 | Fit Core" }

export default function PrivacyPage() {
    return (
        <LegalDocument
            title="개인정보 처리방침"
            summary="Fit Core가 어떤 정보를 왜 모으고, 얼마나 보관하고, 어떻게 지우는지 알려 드려요."
        >
            <LegalSection title="1. 모으는 정보">
                <ul>
                    <li>
                        <strong>계정 정보</strong>: 소셜 로그인으로 받는 이메일, 이름, 프로필 사진, 연결한 로그인 서비스(카카오·네이버·구글)
                    </li>
                    <li>
                        <strong>프로필</strong>: 닉네임, 성별, 생년월일, 운동 목표, 운동 경력, 주당 운동 횟수, 쓸 수 있는 장비, 메모
                    </li>
                    <li>
                        <strong>신체 정보</strong>: 체중, 체지방률, 체성분 기록(골격근량, 체지방량, 내장지방 레벨, 허리엉덩이비율 등), 기준 중량
                    </li>
                    <li>
                        <strong>건강 관련 정보</strong>: 통증 부위, 근육통(DOMS) 기록
                    </li>
                    <li>
                        <strong>활동 기록</strong>: 운동 기록(루틴, 세트, 중량, 횟수), 식단 기록과 영양 목표, AI에게 보낸 질문
                    </li>
                    <li>
                        <strong>탈퇴 기록</strong>: 탈퇴한 시각과 탈퇴할 때의 접속 IP
                    </li>
                </ul>
            </LegalSection>

            <LegalSection title="2. 쓰는 목적">
                <ul>
                    <li>몸 상태와 장비에 맞는 AI 운동 루틴을 만들기 위해</li>
                    <li>운동·식단·체성분 기록과 통계를 보여 주기 위해</li>
                    <li>로그인과 계정 연결을 처리하기 위해</li>
                </ul>
                <p>광고나 판매 목적으로 쓰지 않고, 다른 회사에 팔지 않아요. 아래 AI 처리를 위한 전달만 예외예요.</p>
            </LegalSection>

            <LegalSection title="3. AI 처리">
                <p>
                    루틴 생성, 식단 분석, 영양제 상담을 위해 필요한 정보(통증 부위, 근육통, 장비, 목표, 입력한 문장 등)를 Fit Core AI 서버로
                    보내고, 이 서버는 답을 만들기 위해 외부 AI 모델 제공 업체의 API에 내용을 전달할 수 있어요.
                    전달한 정보는 답을 만드는 데에만 써요.
                </p>
            </LegalSection>

            <LegalSection title="4. 보관 기간">
                <ul>
                    <li>탈퇴하기 전까지 보관해요.</li>
                    <li>
                        탈퇴하면 바로 프로필을 익명으로 바꿔요. 이름, 닉네임, 프로필 사진, 성별, 생년월일, 체중·체지방률, 체성분, 기준 중량,
                        통증 부위·근육통, 운동 설정과 메모를 지우고, 이메일은 알아볼 수 없는 값으로 바꾸고, 소셜 로그인 연결 정보를 지워요.
                    </li>
                    <li>
                        탈퇴한 뒤에는 이전에 받은 로그인 정보로도 접속할 수 없어요.
                    </li>
                    <li>
                        운동 기록, 식단 기록과 영양 목표, AI 루틴 기록은 기록할 때 입력한 통증 부위·근육통, 운동 메모, 루틴 요청 문장, 음식
                        이름과 함께 탈퇴 후 30일 동안 이름·이메일 같은 계정 정보와 분리된 익명 계정에 연결된 채 보관해요. 이 기간에도 탈퇴한
                        계정이나 같은 소셜 계정으로 새로 가입한 계정에서는 다시 볼 수 없어요.
                    </li>
                    <li>탈퇴한 시각과 탈퇴할 때의 접속 IP를 탈퇴 기록으로 남겨요.</li>
                    <li>
                        <strong>탈퇴하고 30일이 지나면</strong> 운동·식단·루틴 기록, 탈퇴 기록, 익명 계정까지 모두 완전히 지워요. 지운 정보는
                        되살릴 수 없어요.
                    </li>
                    <li>
                        30일을 기다리지 않고 바로 지우고 싶다면 <strong>탈퇴하기 전에</strong> 설정 &gt; 문의 / 피드백의 이메일로 요청해 주세요.
                        계정을 확인한 뒤 지우고 결과를 알려 드려요.
                    </li>
                    <li>법에서 보관을 요구하는 정보가 있으면 그 기간 동안만 따로 보관해요.</li>
                </ul>
            </LegalSection>

            <LegalSection title="5. 지우는 방법">
                <p>
                    설정 &gt; <strong>회원 탈퇴</strong>에서 직접 탈퇴할 수 있어요. 탈퇴로 지워지는 범위와 시점은 위 4번과 같아요. 프로필은
                    바로 익명으로 바뀌고, 운동·식단·루틴 기록과 계정은 30일 뒤 완전히 지워져요. 일부 정보만 고치거나 지우고 싶다면 마이 페이지의
                    프로필 수정을 쓰거나 문의해 주세요.
                </p>
            </LegalSection>

            <LegalSection title="6. 이 기기에 저장하는 정보">
                <p>
                    로그인 상태, 무게 단위 같은 설정, 진행 중인 루틴은 브라우저 저장소에 저장해요. 브라우저 데이터를 지우면 함께 사라져요.
                </p>
            </LegalSection>

            <LegalSection title="7. 문의">
                <p>개인정보에 관한 문의와 열람·정정·삭제 요청은 설정 &gt; 문의 / 피드백의 이메일로 보내 주세요.</p>
            </LegalSection>
        </LegalDocument>
    )
}
