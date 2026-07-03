import type { CoachInsight, CoachSignals } from "../types/coach"

export const LOW_ATTENDANCE_THRESHOLD = 0.6

export function deriveCoachState(s: CoachSignals): CoachInsight {
    // 1. 저장 루틴 없음
    if (s.finalsTotal === 0) {
        return {
            stateId: "NO_ROUTINE",
            focus: "routine",
            message: "저장된 루틴이 없어요. 오늘 할 루틴을 먼저 만들어볼까요?",
            action: { label: "운동 시작하기", href: "/workout" },
            isAlert: false,
        }
    }

    // 2. 칼로리 목표 미설정
    if (s.kcalGoal == null) {
        return {
            stateId: "NO_KCAL_GOAL",
            focus: "setup",
            message: "칼로리 목표를 설정하면 식단 피드백을 더 정확히 볼 수 있어요.",
            action: { label: "목표 설정하기", href: "/my?tab=nutrition" },
            isAlert: false,
        }
    }

    // 3. 오늘 운동 완료 — 세 서브케이스 모두 여기서 return
    if (s.todayWorkoutDone) {
        if (!s.todayDietLogged) {
            return {
                stateId: "WORKOUT_DONE_NO_DIET",
                focus: "diet",
                message: "오늘 운동을 완료했어요. 식단도 기록해 균형을 확인해볼까요?",
                action: { label: "식단 기록하기", href: "/ai_quicklog" },
                isAlert: false,
            }
        }
        if (s.totalKcal != null && s.totalKcal > s.kcalGoal) {
            const overKcal = s.totalKcal - s.kcalGoal
            return {
                stateId: "WORKOUT_DONE_DIET_OVER",
                focus: "diet",
                message: `목표보다 ${overKcal.toLocaleString()}kcal 초과했어요. 다음 식사는 가볍게 조절해볼까요?`,
                action: { label: "식단 보기", href: "/nutrition" },
                isAlert: true,
            }
        }
        const okMessage =
            s.totalKcal != null
                ? `${s.totalKcal.toLocaleString()}/${s.kcalGoal.toLocaleString()}kcal, 목표 안에 있어요. 오늘 흐름을 유지해볼까요?`
                : "오늘 식단을 목표 안에서 잘 채웠어요. 이 흐름을 유지해볼까요?"
        return {
            stateId: "WORKOUT_DONE_DIET_OK",
            focus: "done",
            message: okMessage,
            action: { label: "식단 보기", href: "/nutrition" },
            isAlert: false,
        }
    }

    // 4. 식단 기록 있으나 운동 없음 (오늘 운동X)
    if (s.todayDietLogged) {
        return {
            stateId: "NO_WORKOUT_DIET_LOGGED",
            focus: "workout",
            message: "식단은 기록했어요. 오늘 운동도 이어서 진행해볼까요?",
            action: { label: "운동 시작하기", href: "/workout" },
            isAlert: false,
        }
    }

    // 여기 도달 = 오늘 운동X + 식단X

    // 5. 주간 수행률 낮음
    if (s.weeklyRate != null && s.weeklyRate < LOW_ATTENDANCE_THRESHOLD) {
        const hasNumbers = s.actualDays != null && s.targetDays != null && s.targetDays > 0
        const message = hasNumbers
            ? `이번 주 ${s.actualDays}/${s.targetDays}회 완료했어요. 오늘 한 번 채워볼까요?`
            : "이번 주 운동이 조금 부족했어요. 오늘 한 번 채워볼까요?"
        return {
            stateId: "LOW_ATTENDANCE",
            focus: "workout",
            message,
            action: { label: "운동 시작하기", href: "/workout" },
            isAlert: true,
        }
    }

    // 6. 오늘 시작 전 (기본)
    return {
        stateId: "TODAY_NOT_STARTED",
        focus: "workout",
        message: "오늘 루틴으로 가볍게 시작해볼까요?",
        action: { label: "운동 시작하기", href: "/workout" },
        isAlert: false,
    }
}
