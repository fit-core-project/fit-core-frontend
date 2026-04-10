"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Bot, User, Loader2, Pill, ShieldAlert, Sparkles, ChevronRight } from "lucide-react"

// --- TypeScript 타입 정의 ---
interface SourceDetail {
    file: string
    id: string
    type: string
}

interface Message {
    id: string
    role: "user" | "ai"
    content: string
    sources?: SourceDetail[] // 기존 string[]에서 SourceDetail[]로 변경
}

// --- 추천 질문 (유저의 빠른 입력을 돕는 칩) ---
const SUGGESTED_QUESTIONS = [
    "타이레놀이랑 오메가3 같이 먹어도 돼?",
    "홍삼 복용 시 주의할 부작용이 뭐야?",
    "수술 전 피해야 할 영양제가 있을까?",
    "마그네슘과 칼슘의 올바른 복용 비율은?",
]

export default function SupplementChatPage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "1",
            role: "ai",
            content:
                "안녕하세요! 헬스케어 및 영양제 전문 AI 코치입니다.\n현재 복용 중인 영양제 조합, 부작용, 약물 상호작용에 대해 궁금한 점을 편하게 물어보세요.",
        },
    ])
    const [inputText, setInputText] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // 새 메시지가 추가될 때마다 맨 아래로 스크롤
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, isLoading])

    const handleSendMessage = async (textToSubmit: string = inputText) => {
        if (!textToSubmit.trim() || isLoading) return

        const newUserMsg: Message = { id: Date.now().toString(), role: "user", content: textToSubmit }
        setMessages((prev) => [...prev, newUserMsg])
        setInputText("")
        setIsLoading(true)

        try {
            const response = await fetch("http://localhost:8000/api/ai/supplement-chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question: textToSubmit }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.detail || "서버 응답 에러")
            }

            const data = await response.json()
            const newAiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: "ai",
                content: data.answer,
                sources: data.sources,
            }
            setMessages((prev) => [...prev, newAiMsg])
        } catch (error: any) {
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: "ai",
                content: `⚠️ 오류가 발생했습니다: ${error.message}\n잠시 후 다시 시도해 주세요.`,
            }
            setMessages((prev) => [...prev, errorMsg])
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <main className="min-h-screen bg-slate-50 flex flex-col items-center pt-8 pb-4 px-4 md:px-8">
            <div className="w-full max-w-3xl flex flex-col h-[90vh] bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden relative">
                {/* 1. 헤더 영역 */}
                <div className="bg-emerald-50/50 p-5 border-b border-emerald-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shadow-md shadow-emerald-200">
                            <Pill className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-extrabold text-slate-800">AI 약사 챗봇</h1>
                            <p className="text-xs text-emerald-600 font-medium">
                                검증된 약학 논문 & 식약처 데이터 기반
                            </p>
                        </div>
                    </div>
                </div>

                {/* 2. 대화 기록 영역 */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-50/50">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                        >
                            {/* AI 아바타 */}
                            {msg.role === "ai" && (
                                <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center mr-3 shrink-0 mt-1">
                                    <Bot className="w-5 h-5 text-emerald-600" />
                                </div>
                            )}

                            <div className="max-w-[85%] flex flex-col">
                                {/* 메시지 말풍선 */}
                                <div
                                    className={`p-4 text-[15px] leading-relaxed shadow-sm ${
                                        msg.role === "user"
                                            ? "bg-slate-800 text-white rounded-3xl rounded-tr-none"
                                            : "bg-white text-slate-700 border border-slate-100 rounded-3xl rounded-tl-none whitespace-pre-wrap"
                                    }`}
                                >
                                    {msg.content}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* 로딩 인디케이터 (고급 RAG 처리 대기용) */}
                    {isLoading && (
                        <div className="flex justify-start animate-in fade-in">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center mr-3 shrink-0">
                                <Bot className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div className="bg-white border border-slate-100 p-4 rounded-3xl rounded-tl-none shadow-sm flex items-center space-x-3">
                                <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                                <span className="text-sm font-medium text-slate-500">
                                    수만 건의 논문과 데이터를 교차 검증 중입니다...
                                </span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* 3. 입력 영역 */}
                <div className="p-4 bg-white border-t border-slate-100 shrink-0 relative">
                    {/* 추천 질문 칩 (첫 대화 시에만 표시) */}
                    {messages.length === 1 && (
                        <div className="absolute bottom-[88px] left-0 right-0 px-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {SUGGESTED_QUESTIONS.map((q, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSendMessage(q)}
                                    className="shrink-0 bg-white border border-slate-200 shadow-sm text-slate-600 text-xs py-2 px-4 rounded-full flex items-center hover:bg-emerald-50 hover:border-emerald-200 transition-colors"
                                >
                                    <Sparkles className="w-3 h-3 text-emerald-500 mr-1.5" />
                                    {q}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="relative flex items-center">
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault()
                                    handleSendMessage()
                                }
                            }}
                            placeholder="질문을 입력하세요... (Shift+Enter로 줄바꿈)"
                            className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl py-3.5 pl-5 pr-14 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none overflow-hidden h-[52px] max-h-32 text-[15px]"
                            rows={1}
                        />
                        <button
                            onClick={() => handleSendMessage()}
                            disabled={!inputText.trim() || isLoading}
                            className="absolute right-2 p-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white rounded-xl transition-colors"
                        >
                            <Send className="w-5 h-5 ml-0.5" />
                        </button>
                    </div>

                    {/* 면책 조항 */}
                    <p className="text-[10px] text-center text-slate-400 mt-3 font-medium">
                        AI의 답변은 의료적 진단을 대체할 수 없습니다. 건강에 관한 중요한 결정은 반드시 전문의 또는
                        약사와 상담하세요.
                    </p>
                </div>
            </div>
        </main>
    )
}
