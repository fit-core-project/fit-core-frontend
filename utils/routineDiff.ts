import { RoutineBlock } from "@/types/routine"

export function generateEditSummary(initialBlocks: RoutineBlock[], currentBlocks: RoutineBlock[]): string[] {
    const summary: string[] = []

    const initialById = new Map(initialBlocks.map((b) => [b.exerciseId, b]))
    const currentById = new Map(currentBlocks.map((b) => [b.exerciseId, b]))

    // Exercise replacement: same position, different exerciseId
    const minLen = Math.min(initialBlocks.length, currentBlocks.length)
    for (let i = 0; i < minLen; i++) {
        const init = initialBlocks[i]
        const curr = currentBlocks[i]
        if (init.exerciseId !== curr.exerciseId) {
            summary.push(`${init.exerciseName} → ${curr.exerciseName}으로 교체`)
        }
    }

    // Set count change: exercise present in both snapshots with different prescription length
    for (const [id, curr] of currentById) {
        const init = initialById.get(id)
        if (!init) continue
        if (init.prescription.length !== curr.prescription.length) {
            summary.push(
                `${curr.exerciseName}: ${init.prescription.length}세트 → ${curr.prescription.length}세트로 변경`
            )
        }
    }

    // Exercises appended beyond the original length
    for (let i = minLen; i < currentBlocks.length; i++) {
        summary.push(`${currentBlocks[i].exerciseName} 추가됨`)
    }

    // Exercises removed from the tail of the original list
    for (let i = minLen; i < initialBlocks.length; i++) {
        summary.push(`${initialBlocks[i].exerciseName} 제거됨`)
    }

    return summary
}
