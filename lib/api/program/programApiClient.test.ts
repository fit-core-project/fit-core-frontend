import { beforeEach, describe, expect, it, vi } from "vitest"
import AxiosController from "@/lib/axios/AxiosController"
import programApiClient from "@/lib/api/program/programApiClient"

vi.mock("@/lib/axios/AxiosController", () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        delete: vi.fn(),
        patch: vi.fn(),
    },
}))

const mockedAxios = AxiosController as unknown as {
    get: ReturnType<typeof vi.fn>
    post: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    patch: ReturnType<typeof vi.fn>
}

describe("programApiClient", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it("normalizes active program 204 empty body to null", async () => {
        mockedAxios.get.mockResolvedValueOnce("")

        await expect(programApiClient.getActiveProgram()).resolves.toBeNull()
        expect(mockedAxios.get).toHaveBeenCalledWith("/api/programs/active")
    })

    it("sends create program request shape unchanged", async () => {
        mockedAxios.post.mockResolvedValueOnce({ programId: "program-1" })
        const request = { name: "PPL", routineFinalIds: ["final-1", "final-2"] }

        await programApiClient.createProgram(request)

        expect(mockedAxios.post).toHaveBeenCalledWith("/api/programs", request)
    })

    it("sends update program request shape unchanged", async () => {
        mockedAxios.patch.mockResolvedValueOnce({ programId: "program-1", name: "PPL 2" })
        const request = { name: "PPL 2" }

        await programApiClient.updateProgram("program-1", request)

        expect(mockedAxios.patch).toHaveBeenCalledWith("/api/programs/program-1", request)
    })

    it("calls archive endpoint through DELETE", async () => {
        mockedAxios.delete.mockResolvedValueOnce({ programId: "program-1", status: "ARCHIVED" })

        await programApiClient.archiveProgram("program-1")

        expect(mockedAxios.delete).toHaveBeenCalledWith("/api/programs/program-1")
    })

    it("calls activate endpoint through PATCH", async () => {
        mockedAxios.patch.mockResolvedValueOnce({ programId: "program-1", status: "ACTIVE" })

        await programApiClient.activateProgram("program-1")

        expect(mockedAxios.patch).toHaveBeenCalledWith("/api/programs/program-1/activate")
    })

    it("calls permanent delete endpoint separately from archive", async () => {
        mockedAxios.delete.mockResolvedValueOnce(undefined)

        await programApiClient.deleteProgramPermanently("program-1")

        expect(mockedAxios.delete).toHaveBeenCalledWith("/api/programs/program-1/permanent")
    })
})
