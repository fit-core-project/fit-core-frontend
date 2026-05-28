import { RoutineDraft } from "@/types/routine"
import { RoutineGenerateRequest } from "@/utils/requestAssembler"
import { normalizeRoutineResponse } from "@/utils/routineAdapter"
import routineApiClient from "@/lib/api/routine/routineApiClient"

const TIMEOUT_MS = 60_000

type FallbackTemplate = {
    exerciseId: string
    exerciseName: string
    movementPattern: string
    primaryMuscles: string[]
    sets: number
    reps: number
    restSec: number
}

const FALLBACK_TEMPLATES: Record<string, FallbackTemplate> = {
    push: {
        exerciseId: "47",
        exerciseName: "Push-up",
        movementPattern: "horizontalPush",
        primaryMuscles: ["chest", "triceps"],
        sets: 3,
        reps: 10,
        restSec: 90,
    },
    pull: {
        exerciseId: "65",
        exerciseName: "Inverted Row",
        movementPattern: "horizontalPull",
        primaryMuscles: ["upper-back", "biceps"],
        sets: 3,
        reps: 10,
        restSec: 90,
    },
    legs: {
        exerciseId: "118",
        exerciseName: "Bodyweight Squat",
        movementPattern: "squat",
        primaryMuscles: ["quadriceps", "gluteal"],
        sets: 3,
        reps: 12,
        restSec: 75,
    },
    core: {
        exerciseId: "120",
        exerciseName: "Plank",
        movementPattern: "antiExtension",
        primaryMuscles: ["abs"],
        sets: 3,
        reps: 30,
        restSec: 60,
    },
}

function selectFallbackTemplates(req: RoutineGenerateRequest): FallbackTemplate[] {
    const split = req.targetSplitLabel?.trim().toLowerCase() ?? ""
    const selected = FALLBACK_TEMPLATES[split]
        ? [FALLBACK_TEMPLATES[split]]
        : Object.values(FALLBACK_TEMPLATES).filter((template) =>
              template.primaryMuscles.some((muscle) => req.targetMuscles.includes(muscle))
          )

    const candidates = selected.length > 0 ? selected : [FALLBACK_TEMPLATES.core]
    const painAreas = new Set(req.currentPainAreas)
    const safe = candidates.filter((template) => !template.primaryMuscles.some((muscle) => painAreas.has(muscle)))
    return safe.length > 0 ? safe : [FALLBACK_TEMPLATES.core]
}

function makeFallback(req: RoutineGenerateRequest): RoutineDraft {
    const blocks = selectFallbackTemplates(req).map((template, index) => ({
        order: index + 1,
        exerciseId: template.exerciseId,
        exerciseName: template.exerciseName,
        movementPattern: template.movementPattern,
        primaryMuscles: template.primaryMuscles,
        equipmentType: "BODYWEIGHT",
        defaultRestSec: template.restSec,
        exerciseRationale: "AI 응답 실패 시에도 부상 부위를 피하도록 구성한 저위험 대체 운동입니다.",
        substitutionCandidates: [],
        prescription: Array.from({ length: template.sets }, (_, setIndex) => ({
            setIndex: setIndex + 1,
            setType: "working",
            targetReps: template.reps,
            targetWeightKg: null,
            targetRir: 3,
            targetRestSec: template.restSec,
        })),
    }))
    const totalSeconds = blocks.reduce(
        (sum, block) => sum + block.prescription.reduce((inner, set) => inner + 45 + set.targetRestSec, 0),
        0
    )

    return {
        routineDraftId: `draft_fb_${Date.now()}`,
        generationStatus: "fallback",
        statusReasonCode: "llmTimeout",
        isFallback: true,
        summaryTitle: "안전 대체 루틴",
        rationaleSummary: ["AI 응답을 사용할 수 없어 요청 조건을 반영한 최소 안전 루틴으로 대체했습니다."],
        warnings: ["통증이 있거나 불편하면 즉시 중단하고 프로필의 부상 부위를 확인하세요."],
        totalEstimatedTime: Math.max(5, Math.ceil(totalSeconds / 60)),
        routineBlocks: blocks,
    }
}

// ??? Prompt builder ??????????????????????????????????????????????????????????

function buildPrompt(req: RoutineGenerateRequest): string {
    const domsInfo =
        req.currentDoms.length > 0 ? req.currentDoms.map((d) => `${d.bodyPart}(${d.level})`).join(", ") : "?놁쓬"

    return `?뱀떊? ?꾨Ц ?쇱뒪???몃젅?대꼫?낅땲?? ?꾨옒 議곌굔??留욌뒗 ?대룞 猷⑦떞???ㅺ퀎?섏꽭??

[?대룞 議곌굔]
- 紐⑺몴 洹쇱쑁: ${req.targetMuscles.join(", ") || "?꾩떊"}
- 媛???쒓컙: ${req.timeAvailableMin}遺?- ?덈젴 紐⑺몴: ${req.goal}
- ?ъ슜 遺덇? ?λ퉬: ${req.unavailableEquipment.join(", ") || "?놁쓬"}
- ?듭쬆/遺??遺??(?먭레 湲덉?): ${req.currentPainAreas.join(", ") || "?놁쓬"}
- DOMS 遺??(蹂쇰ⅷ 異뺤냼): ${domsInfo}${req.userNote ? `\n- 異붽? ?붿껌: ${req.userNote}` : ""}

[?섎뱶 猷?
1. ?듭쬆쨌遺??遺?꾨뒗 ?덈? ?먭레?섏? 留덉꽭??
2. ?ъ슜 遺덇? ?λ퉬???ъ슜?섏? 留덉꽭??
3. exercises 諛곗뿴? 2媛??댁긽?댁뼱???⑸땲??

[?뚰봽??猷?
1. DOMS moderate ?댁긽 遺?꾨뒗 ?명듃 ?섎? 20~30% 以꾩씠?몄슂.
2. totalEstimatedTime? ${req.timeAvailableMin}遺??댄븯濡?留욎텛?몄슂.

?꾨옒 JSON ?ㅽ궎留?洹몃?濡쒕쭔 異쒕젰?섏꽭?? 肄붾뱶釉붾줉쨌?ㅻ챸 ?띿뒪???놁씠 ?쒖닔 JSON留?異쒕젰:
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

// ??? Gemini direct call (dev/direct mode only) ???????????????????????????????
// NEXT_PUBLIC_AI_ROUTE=direct ???뚮쭔 吏꾩엯.
// fetch???몃? Gemini API(https://generativelanguage.googleapis.com)濡?媛???몄텧?대ŉ,
// ?곕━ 諛깆뿏???곷?寃쎈줈 fetch媛 ?꾨땲?? AxiosController ??곸씠 ?꾨떂.
// 諛깆뿏??寃쎈줈???꾨옒 generateRoutine()??else 遺꾧린?먯꽌 routineApiClient ??AxiosController濡?泥섎━.

async function callGeminiDirect(req: RoutineGenerateRequest): Promise<RoutineDraft> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
        // Next.js ?섍꼍 蹂???뚯떛 踰꾧렇 諛⑹? 諛?臾몄옄???뺣━
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

        // 留덊겕?ㅼ슫 諛깊떛 諛?json 湲???꾨꼍 ?쒓굅
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

// ??? Public API ??????????????????????????????????????????????????????????????

export async function generateRoutine(requestPayload: RoutineGenerateRequest): Promise<RoutineDraft> {
    // ?섍꼍 蹂?섎? ?⑥닔 ?대??먯꽌 ?덉쟾?섍쾶 ?뺤씤
    const isDirect =
        process.env.NODE_ENV !== "production" &&
        process.env.NEXT_PUBLIC_AI_ROUTE?.trim() === "direct"

    if (isDirect) {
        try {
            return await callGeminiDirect(requestPayload)
        } catch (err) {
            console.error("[aiRoutineService] Gemini direct call failed ??using fallback:", err)
            return makeFallback(requestPayload)
        }
    }

    // Backend proxy mode ??propagate errors so callers can surface retry UI
    return await routineApiClient.generate(requestPayload)
}
