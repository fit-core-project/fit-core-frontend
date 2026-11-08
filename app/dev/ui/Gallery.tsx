"use client"

import { Check, GripVertical, ListChecks, Play } from "lucide-react"
import { useState } from "react"
import {
    Button,
    EmptyState,
    LineBadge,
    Notice,
    Route,
    RouteStrip,
    Section,
    Sheet,
    Skeleton,
    Surface,
    Tag,
    TextAreaField,
    TextField,
    ToggleChip,
} from "@/components/ui"
import type { RouteLine } from "@/utils/routeLine"

const LINES: RouteLine[] = ["push", "pull", "legs", "core", "mixed"]

export default function Gallery() {
    const [sheetOpen, setSheetOpen] = useState(false)
    const [equipment, setEquipment] = useState<string[]>(["바벨", "덤벨"])
    const [weight, setWeight] = useState("72.5")

    const toggle = (item: string) =>
        setEquipment((prev) => (prev.includes(item) ? prev.filter((value) => value !== item) : [...prev, item]))

    return (
        <div className="flex flex-col gap-8 bg-ground px-4 pb-24 pt-6">
            <h1 className="text-headline font-bold">공통 컴포넌트</h1>

            <Section title="노선 배지">
                <div className="flex flex-wrap gap-2">
                    {LINES.map((line) => (
                        <LineBadge key={line} line={line} />
                    ))}
                    <Tag>58분</Tag>
                    <Tag tone="danger">전면 어깨 보호</Tag>
                </div>
            </Section>

            <Section title="버튼">
                <div className="flex flex-col gap-2">
                    <Button variant="primary" size="lg" block line="push" icon={<Play className="size-4" aria-hidden />}>
                        출발하기
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="secondary">저장</Button>
                        <Button variant="primary">운동 시작</Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <Button variant="ghost">취소</Button>
                        <Button variant="danger">삭제</Button>
                        <Button variant="primary" loading>
                            생성 중
                        </Button>
                    </div>
                </div>
            </Section>

            <Section title="입력">
                <TextField
                    label="중량"
                    suffix="kg"
                    inputMode="decimal"
                    value={weight}
                    onChange={(event) => setWeight(event.target.value)}
                    error={weight.trim() === "" ? "중량을 입력하세요." : undefined}
                />
                <TextField label="닉네임" hint="나중에 마이페이지에서 바꿀 수 있어요." placeholder="헬스초보" autoComplete="nickname" />
                <TextAreaField label="AI 코치에게 남길 말" optional placeholder="무릎이 안 좋으니 스쿼트는 빼주세요." />
                <div className="flex flex-wrap gap-2" role="group" aria-label="사용 가능한 장비">
                    {["바벨", "덤벨", "머신", "스미스 머신", "케이블", "맨몸"].map((item) => (
                        <ToggleChip key={item} pressed={equipment.includes(item)} onClick={() => toggle(item)}>
                            {equipment.includes(item) && <Check className="size-4" aria-hidden />}
                            {item}
                        </ToggleChip>
                    ))}
                </div>
            </Section>

            <Section title="면">
                <Surface>
                    <p className="text-body-sm text-ink-2">오늘 영양</p>
                    <p className="text-title font-bold tabular-nums">
                        751 <span className="text-body-sm font-normal text-ink-2">/ 2,000 kcal</span>
                    </p>
                </Surface>
                <Surface tone="sunken">
                    <p className="text-body-sm">보조 면은 패널 안쪽 묶음에만 씁니다.</p>
                </Surface>
                <Notice title="전면 어깨 통증">머리 위로 미는 동작을 뺐어요.</Notice>
                <Notice tone="danger" title="프로필을 불러오지 못했어요">잠시 뒤 다시 시도하세요.</Notice>
            </Section>

            <Section title="오늘의 노선 (가로)">
                <Surface tone="sunken" className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                        <LineBadge line="push" />
                        <span className="text-title-sm font-bold">어깨 보호 밀기</span>
                    </div>
                    <RouteStrip line="push" label="오늘의 노선" stops={["벤치프레스", "인클라인", "딥스", "푸시다운"]} />
                </Surface>
            </Section>

            <Section title="루틴 (계획)">
                <Route
                    label="어깨 보호 밀기 루틴"
                    line="push"
                    stations={[
                        { key: "1", title: "바벨 벤치프레스", meta: "3세트 · 70–72.5kg · 8회", trailing: <GripVertical className="size-5 text-ink-3" aria-hidden /> },
                        { key: "2", title: "인클라인 덤벨프레스", meta: "2세트 · 18–20kg · 10회", trailing: <GripVertical className="size-5 text-ink-3" aria-hidden /> },
                        { key: "3", title: "케이블 푸시다운", meta: "2세트 · 25–27.5kg · 12회", trailing: <GripVertical className="size-5 text-ink-3" aria-hidden /> },
                    ]}
                />
            </Section>

            <Section title="루틴 (진행 중)">
                <Route
                    label="진행 중인 루틴"
                    line="push"
                    mode="progress"
                    stations={[
                        { key: "0", title: "푸시업", status: "done", meta: "2세트 완료" },
                        {
                            key: "1",
                            title: "바벨 벤치프레스",
                            status: "current",
                            content: (
                                <div className="flex items-baseline gap-2">
                                    <span className="text-display font-bold tabular-nums">72.5</span>
                                    <span className="text-body text-ink-2">kg × 8회</span>
                                </div>
                            ),
                        },
                        { key: "2", title: "인클라인 덤벨프레스", status: "upcoming" },
                        { key: "3", title: "케이블 푸시다운", status: "upcoming" },
                    ]}
                />
            </Section>

            <Section title="프로그램 (환승)">
                <Route
                    label="3분할 4주 프로그램"
                    mode="progress"
                    stations={[
                        { key: "a", title: "밀기 A", line: "push", status: "done" },
                        { key: "b", title: "당기기 A", line: "pull", status: "current", meta: "다음 회차" },
                        { key: "c", title: "하체 A", line: "legs", status: "upcoming" },
                        { key: "d", title: "밀기 B", line: "push", status: "upcoming" },
                    ]}
                />
                <Route
                    label="3분할 계획"
                    mode="plan"
                    stations={[
                        { key: "a", title: "밀기 A", line: "push" },
                        { key: "b", title: "당기기 A", line: "pull" },
                        { key: "c", title: "하체 A", line: "legs" },
                        { key: "d", title: "코어 A", line: "core" },
                    ]}
                />
            </Section>

            <Section title="상태">
                <Surface className="flex flex-col gap-2">
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-11 w-full" />
                </Surface>
                <Surface>
                    <EmptyState
                        icon={<ListChecks aria-hidden />}
                        title="아직 프로그램이 없어요"
                        body="저장한 루틴을 두 개 이상 골라 순서대로 묶어 보세요."
                        action={<Button variant="secondary">루틴 만들기</Button>}
                    />
                </Surface>
            </Section>

            <Section title="시트">
                <Button variant="secondary" onClick={() => setSheetOpen(true)}>
                    운동 교체 시트 열기
                </Button>
                <Sheet
                    open={sheetOpen}
                    onClose={() => setSheetOpen(false)}
                    title="다른 운동으로 교체"
                    description="같은 부위를 쓰는 운동만 보여줘요."
                    footer={
                        <Button variant="primary" block size="lg" onClick={() => setSheetOpen(false)}>
                            교체하기
                        </Button>
                    }
                >
                    <ul className="flex flex-col divide-y divide-hairline">
                        {["덤벨 벤치프레스", "머신 체스트프레스", "푸시업"].map((name) => (
                            <li key={name} className="py-3 text-body">
                                {name}
                            </li>
                        ))}
                    </ul>
                </Sheet>
            </Section>
        </div>
    )
}
