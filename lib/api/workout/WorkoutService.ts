import AxiosController from "@/lib/axios/AxiosController"
import { Page, WorkoutSessionResponse } from "@/types/project"

const prefixUri = `/api/workouts`

/**
 * 최근 운동 세션 페이징 조회
 * @param page - 조회할 페이지 번호 (0부터 시작)
 * @param size - 한 페이지에 담길 데이터 개수
 */
const getRecentWorkouts = (page: number = 0, size: number = 10) =>
    AxiosController.get<Page<WorkoutSessionResponse>>(`${prefixUri}/recent?page=${page}&size=${size}`)

export default { getRecentWorkouts }
