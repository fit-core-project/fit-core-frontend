import type { CoachInsight, CoachSignals } from "../types/coach"

export const LOW_ATTENDANCE_THRESHOLD = 0.6

export function deriveCoachState(s: CoachSignals): CoachInsight {
    // 0. 장비 미설정
    if (s.equipmentEmpty) {
        return {
            stateId: "NO_EQUIPMENT",
            focus: "setup",
            message: "운동 장비를 설정하면 더 맞는 루틴을 추천받을 수 있어요.",
            action: { label: "장비 설정하기", href: "/my?tab=workout" },
            isAlert: false,
        }
    }

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
                message: "오늘 운동 기록했어요. 식단도 남기면 하루가 완성돼요.",
                action: { label: "식단 기록하기", href: "/ai_quicklog" },
                isAlert: false,
            }
        }
        if (s.totalKcal != null && s.totalKcal > s.kcalGoal) {
            const overKcal = s.totalKcal - s.kcalGoal
            return {
                stateId: "WORKOUT_DONE_DIET_OVER",
                focus: "diet",
                message: `오늘 목표보다 ${overKcal.toLocaleString()}kcal 더 먹었어요. 다음 끼는 가볍게 가볼까요?`,
                action: { label: "식단 보기", href: "/nutrition" },
                isAlert: true,
            }
        }
        const okMessage =
            s.totalKcal != null
                ? `오늘 ${s.totalKcal.toLocaleString()}/${s.kcalGoal.toLocaleString()}kcal, 목표 안이에요. 이 페이스 좋아요.`
                : "오늘 목표 안에서 잘 채웠어요. 이 페이스 좋아요."
        return {
            stateId: "WORKOUT_DONE_DIET_OK",
            focus: "done",
            message: okMessage,
            action: { label: "식단 보기", href: "/nutrition" },
            isAlert: false,
        }
    }

    // 4. 식단 기록 있으나 운동 없음 (오늘 운동X)
    if (s.activeProgram) {
        const timeText =
            s.activeProgram.estimatedTime != null
                ? ` 예상 소요 시간은 약 ${s.activeProgram.estimatedTime}분이에요.`
                : ""
        return {
            stateId: "PROGRAM_NEXT_UP",
            focus: "workout",
            message: `다음은 ${s.activeProgram.nextRoutineName ?? "다음 루틴"} 차례예요`,
            description: `현재 ${s.activeProgram.currentPosition}/${s.activeProgram.totalItems} 순서까지 진행 중이에요.${timeText}`,
            action: { label: "프로그램 보기", href: `/workout/programs/${s.activeProgram.programId}` },
            isAlert: false,
            showAction: true,
        }
    }

    if (s.todayDietLogged) {
        return {
            stateId: "NO_WORKOUT_DIET_LOGGED",
            focus: "workout",
            message: "식단 기록했어요. 오늘 운동도 채우면 완벽해요.",
            action: { label: "운동 시작하기", href: "/workout" },
            isAlert: false,
        }
    }

    // 여기 도달 = 오늘 운동X + 식단X

    // 5. 주간 수행률 낮음
    if (s.weeklyRate != null && s.weeklyRate < LOW_ATTENDANCE_THRESHOLD) {
        const hasNumbers = s.actualDays != null && s.targetDays != null && s.targetDays > 0
        const message = hasNumbers
            ? `이번 주 운동 ${s.actualDays}번 했어요 (목표 ${s.targetDays}번). 오늘 한 번 더 어때요?`
            : "이번 주 운동이 조금 부족했어요. 오늘 한 번 더 어때요?"
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
        message: "오늘은 아직 시작 전이에요. 가볍게 몸 풀어볼까요?",
        action: { label: "운동 시작하기", href: "/workout" },
        isAlert: false,
    }
}
