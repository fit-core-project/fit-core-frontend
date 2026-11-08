export type RouteLine = "push" | "pull" | "legs" | "core" | "mixed"

export const ROUTE_LINE_LABEL: Record<RouteLine, string> = {
    push: "밀기",
    pull: "당기기",
    legs: "하체",
    core: "코어·전신",
    mixed: "혼합",
}

export const ROUTE_LINE_COLOR_VAR: Record<RouteLine, string> = {
    push: "var(--color-line-push)",
    pull: "var(--color-line-pull)",
    legs: "var(--color-line-legs)",
    core: "var(--color-line-core)",
    mixed: "var(--color-ink)",
}

const SPLIT_TO_LINE: Record<string, RouteLine> = {
    push: "push",
    chest: "push",
    shoulder: "push",
    pull: "pull",
    back: "pull",
    legs: "legs",
    lower: "legs",
    core: "core",
    neck: "core",
    full_body: "core",
}

const MUSCLE_TO_LINE: Record<string, Exclude<RouteLine, "mixed">> = {
    chest: "push",
    "front-deltoids": "push",
    "side-deltoids": "push",
    triceps: "push",
    "upper-back": "pull",
    "back-deltoids": "pull",
    "lower-back": "core",
    trapezius: "pull",
    biceps: "pull",
    forearm: "pull",
    quadriceps: "legs",
    hamstring: "legs",
    gluteal: "legs",
    calves: "legs",
    adductor: "legs",
    abductors: "legs",
    abs: "core",
    obliques: "core",
    neck: "core",
}

/** Mixed splits (upper, chest_back, arm, custom) follow the muscle family with a strict majority. */
export function lineForRoutine(
    splitLabel: string | null | undefined,
    targetMuscles: readonly string[] = [],
): RouteLine {
    const key = splitLabel?.trim().toLowerCase()
    if (key && SPLIT_TO_LINE[key]) return SPLIT_TO_LINE[key]

    const counts = new Map<RouteLine, number>()
    for (const muscle of targetMuscles) {
        const line = MUSCLE_TO_LINE[muscle]
        if (line) counts.set(line, (counts.get(line) ?? 0) + 1)
    }
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1])
    if (ranked.length === 0) return "mixed"
    if (ranked.length > 1 && ranked[0][1] === ranked[1][1]) return "mixed"
    return ranked[0][0]
}
