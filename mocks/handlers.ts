import { http, HttpResponse, delay } from "msw"

import generateGolden from "@/docs/ops/golden-examples/generate.response.success.golden.json"
import finalizeGolden from "@/docs/ops/golden-examples/finalize.response.golden.json"
import workoutGolden from "@/docs/ops/golden-examples/workout.save.response.golden.json"

const SIM_DELAY_MS = 1500

export const handlers = [
    http.post("/api/routines/generate", async () => {
        await delay(SIM_DELAY_MS)
        return HttpResponse.json(generateGolden)
    }),

    http.post("/api/routines/drafts/:routineDraftId/finalize", async () => {
        await delay(SIM_DELAY_MS)
        return HttpResponse.json(finalizeGolden)
    }),

    http.post("/api/workouts", async () => {
        await delay(SIM_DELAY_MS)
        return HttpResponse.json(workoutGolden, { status: 201 })
    }),
]
