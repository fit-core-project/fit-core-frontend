export function getKstToday(): string {
    return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

/** YYYY-MM-DD for a calendar date. A Date uses its local date parts; toISOString would shift it to UTC. */
export function toYmd(value: string | Date): string {
    if (typeof value === "string") return value.slice(0, 10)
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
}
