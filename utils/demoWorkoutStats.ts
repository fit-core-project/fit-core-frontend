/**
 * Demo-mode stand-ins for GET /api/workouts/prs and /api/workouts/attendance, computed from the
 * demo workout history so the stats tab is not empty in a demo. Mirrors the backend rules:
 * PR = best Epley 1RM (weight x (1 + reps/30)) over working sets with a weight; attendance = distinct
 * workout days per week (Mon-Sun) over the last 4 weeks.
 */
import type { AttendanceWeekResponse, PrResponse, WorkoutSessionResponse } from "@/types/project"

const round1 = (n: number) => Math.round(n * 10) / 10
const dateOf = (value: string | Date): string => (value instanceof Date ? value.toISOString() : String(value)).slice(0, 10)

export function demoPrs(sessions: WorkoutSessionResponse[]): PrResponse[] {
    const best = new Map<string, PrResponse>()
    for (const session of sessions) {
        for (const set of session.sets ?? []) {
            if ((set.setType ?? "working") !== "working") continue
            if (!set.weightKg || set.weightKg <= 0 || !set.reps || set.reps <= 0) continue
            const e1rm = round1(set.weightKg * (1 + set.reps / 30))
            const current = best.get(set.exerciseId)
            if (!current || e1rm > current.estimated1RM) {
                best.set(set.exerciseId, {
                    exerciseId: set.exerciseId,
                    exerciseNameSnapshot: set.exerciseNameSnapshot,
                    estimated1RM: e1rm,
                    weightKg: set.weightKg,
                    reps: set.reps,
                    achievedDate: dateOf(session.workoutDate),
                })
            }
        }
    }
    return [...best.values()].sort((a, b) => b.estimated1RM - a.estimated1RM)
}

function mondayOf(date: Date): Date {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
    const day = d.getUTCDay() // 0 = Sun
    d.setUTCDate(d.getUTCDate() - ((day + 6) % 7))
    return d
}

const iso = (d: Date) => d.toISOString().slice(0, 10)

export function demoAttendance(
    sessions: WorkoutSessionResponse[],
    today: string,
    targetDays: number | null,
): AttendanceWeekResponse[] {
    const thisMonday = mondayOf(new Date(`${today}T00:00:00Z`))
    const days = new Set(sessions.map((s) => dateOf(s.workoutDate)))
    const weeks: AttendanceWeekResponse[] = []
    for (let i = 3; i >= 0; i--) {
        const start = new Date(thisMonday)
        start.setUTCDate(start.getUTCDate() - i * 7)
        const end = new Date(start)
        end.setUTCDate(end.getUTCDate() + 6)
        const s = iso(start)
        const e = iso(end)
        const actualDays = [...days].filter((d) => d >= s && d <= e).length
        weeks.push({
            weekStart: s,
            weekEnd: e,
            actualDays,
            targetDays,
            rate: targetDays && targetDays > 0 ? actualDays / targetDays : null, // same as the backend (not capped)
        })
    }
    return weeks
}
