export type ProgramStatus = "ACTIVE" | "COMPLETED" | "ARCHIVED"

export type ProgramItemState = "DONE" | "CURRENT" | "UPCOMING"

export interface ProgramCreateRequest {
    name: string
    routineFinalIds: string[]
}

export interface ProgramUpdateRequest {
    name: string
}

export interface ProgramItemResponse {
    programItemId: string
    position: number
    routineFinalId: string
    title: string
    targetSplitLabel: string | null
    estimatedTime: number | null
    state: ProgramItemState
}

export interface ProgramSummaryResponse {
    programId: string
    name: string
    status: ProgramStatus
    currentPosition: number
    totalItems: number
    completedAt: string | null
    nextItem: ProgramItemResponse | null
}

export interface ProgramDetailResponse extends ProgramSummaryResponse {
    items: ProgramItemResponse[]
}

export interface ProgramPlayerContext {
    programId: string
    programItemId: string
    routineFinalId: string
}
