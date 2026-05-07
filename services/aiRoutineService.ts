import { RoutineDraft } from "@/types/routine"
import { RoutineGenerateRequest } from "@/utils/requestAssembler"
import { normalizeRoutineResponse } from "@/utils/routineAdapter"
import routineApiClient from "@/lib/api/routine/routineApiClient"

const TIMEOUT_MS = 60_000

// ─── Hardcoded fallback (returned whenever any step fails) ───────────────────

const FALLBACK_ROUTINE: RoutineDraft = {
    routineDraftId: "draft_fallback_local",
    generationStatus: "fallback",
    statusReasonCode: "llmTimeout",
    isFallback: true,
    totalEstimatedTime: 40,
    summaryTitle: "기본 안전 루틴 (AI 대체)",
    rationaleSummary: [
        "AI 코치 연결이 원활하지 않아 기본 안전 루틴으로 대체되었습니다.",
        "컨디션에 맞춰 중량을 직접 조절해 주세요.",
    ],
    warnings: ["AI 응답 실패 — 기본 루틴으로 대체됨"],
    routineBlocks: [
        {
            exerciseId: "barbell_squat",
            exerciseName: "바벨 스쿼트",
            exerciseRationale: "하체 주요 근육을 고르게 자극하는 복합 운동입니다.",
            prescription: [
                { setIndex: 0, targetReps: 10, targetWeightKg: null, targetRir: 3, targetRestSec: 90 },
                { setIndex: 1, targetReps: 10, targetWeightKg: null, targetRir: 2, targetRestSec: 90 },
                { setIndex: 2, targetReps: 8, targetWeightKg: null, targetRir: 2, targetRestSec: 90 },
            ],
        },
        {
            exerciseId: "barbell_bench_press",
            exerciseName: "벤치프레스",
            exerciseRationale: "가슴·삼두·전면 삼각근을 동시에 자극하는 상체 핵심 운동입니다.",
            prescription: [
                { setIndex: 0, targetReps: 10, targetWeightKg: null, targetRir: 3, targetRestSec: 90 },
                { setIndex: 1, targetReps: 8, targetWeightKg: null, targetRir: 2, targetRestSec: 90 },
                { setIndex: 2, targetReps: 8, targetWeightKg: null, targetRir: 2, targetRestSec: 90 },
            ],
        },
        {
            exerciseId: "barbell_row",
            exerciseName: "바벨 로우",
            exerciseRationale: "등 근육 전반과 이두근을 자극하는 당기기 복합 운동입니다.",
            prescription: [
                { setIndex: 0, targetReps: 10, targetWeightKg: null, targetRir: 3, targetRestSec: 90 },
                { setIndex: 1, targetReps: 10, targetWeightKg: null, targetRir: 2, targetRestSec: 90 },
                { setIndex: 2, targetReps: 8, targetWeightKg: null, targetRir: 2, targetRestSec: 90 },
            ],
        },
    ],
}

function makeFallback(): RoutineDraft {
    return { ...FALLBACK_ROUTINE, routineDraftId: `draft_fb_${Date.now()}` }
}

// ─── Prompt builder ──────────────────────────────────────────────────────────

function buildPrompt(req: RoutineGenerateRequest): string {
    const domsInfo =
        req.currentDoms.length > 0 ? req.currentDoms.map((d) => `${d.bodyPart}(${d.level})`).join(", ") : "없음"

    return `당신은 전문 퍼스널 트레이너입니다. 아래 조건에 맞는 운동 루틴을 설계하세요.

[운동 조건]
- 목표 근육: ${req.targetMuscles.join(", ") || "전신"}
- 가용 시간: ${req.timeAvailableMin}분
- 훈련 목표: ${req.goal}
- 사용 불가 장비: ${req.unavailableEquipment.join(", ") || "없음"}
- 통증/부상 부위 (자극 금지): ${req.currentPainAreas.join(", ") || "없음"}
- DOMS 부위 (볼륨 축소): ${domsInfo}${req.userNote ? `\n- 추가 요청: ${req.userNote}` : ""}

[하드 룰]
1. 통증·부상 부위는 절대 자극하지 마세요.
2. 사용 불가 장비는 사용하지 마세요.
3. exercises 배열은 2개 이상이어야 합니다.

[소프트 룰]
1. DOMS moderate 이상 부위는 세트 수를 20~30% 줄이세요.
2. totalEstimatedTime은 ${req.timeAvailableMin}분 이하로 맞추세요.

아래 JSON 스키마 그대로만 출력하세요. 코드블록·설명 텍스트 없이 순수 JSON만 출력:
{
  "totalEstimatedTime": number,
  "summaryTitle": string,
  "rationaleSummary": string[],
  "warnings": string[],
  "exercises": [
    {
      "exerciseName": string,
      "exerciseRationale": string,
      "prescription": [
        { "setIndex": number, "targetReps": number, "targetWeightKg": number|null, "targetRir": number, "targetRestSec": number }
      ]
    }
  ]
}`
}

// ─── Gemini direct call (dev/direct mode only) ───────────────────────────────
// NEXT_PUBLIC_AI_ROUTE=direct 일 때만 진입.
// fetch는 외부 Gemini API(https://generativelanguage.googleapis.com)로 가는 호출이며,
// 우리 백엔드 상대경로 fetch가 아니다. AxiosController 대상이 아님.
// 백엔드 경로는 아래 generateRoutine()의 else 분기에서 routineApiClient → AxiosController로 처리.

async function callGeminiDirect(req: RoutineGenerateRequest): Promise<RoutineDraft> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
        // Next.js 환경 변수 파싱 버그 방지 및 문자열 정리
        let apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || ""
        apiKey = apiKey.replace(/['"]/g, "").trim()

        if (!apiKey) {
            throw new Error("API Key is empty or undefined")
        }

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`

        const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
                contents: [{ parts: [{ text: buildPrompt(req) }] }],
                generationConfig: { responseMimeType: "application/json" },
            }),
        })

        if (!res.ok) {
            const errorText = await res.text()
            throw new Error(`Gemini API error: ${res.status} - Details: ${errorText}`)
        }

        const geminiData = await res.json()
        const rawText: string | undefined = geminiData.candidates?.[0]?.content?.parts?.[0]?.text

        if (!rawText) {
            throw new Error("Gemini returned empty content")
        }

        // 마크다운 백틱 및 json 글자 완벽 제거
        const cleaned = rawText
            .replace(/^```json/i, "")
            .replace(/^```/i, "")
            .replace(/```$/i, "")
            .trim()

        const parsed = JSON.parse(cleaned)

        return normalizeRoutineResponse(parsed, { status: "success", isFallback: false })
    } finally {
        clearTimeout(timer)
    }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function generateRoutine(requestPayload: RoutineGenerateRequest): Promise<RoutineDraft> {
    // 환경 변수를 함수 내부에서 안전하게 확인
    const isDirect = process.env.NEXT_PUBLIC_AI_ROUTE?.trim() === "direct"

    if (isDirect) {
        try {
            return await callGeminiDirect(requestPayload)
        } catch (err) {
            console.error("[aiRoutineService] Gemini direct call failed — using fallback:", err)
            return makeFallback()
        }
    }

    // Backend proxy mode — propagate errors so callers can surface retry UI
    return await routineApiClient.generate(requestPayload)
}
