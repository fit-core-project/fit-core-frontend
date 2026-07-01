import React from "react"
import Image from "next/image"

interface SocialButtonProps {
    provider: "kakao" | "naver" | "google"
    imageSrc: string
    onClick: (provider: string) => void
    isLinked?: boolean
    isConnect?: boolean
}

export default function SocialButton({
    provider,
    imageSrc,
    onClick,
    isLinked = false,
    isConnect = false,
}: SocialButtonProps) {
    const getProviderStyle = () => {
        switch (provider) {
            case "kakao":
                return {
                    bg: "bg-[#FEE500] hover:bg-[#F4DC00]",
                    text: "text-[#000000] opacity-85",
                    label: isLinked ? "연동됨" : isConnect ? "카카오 연결하기" : "카카오 로그인",
                    border: "border-transparent",
                    iconSize: "w-9 h-9",
                }
            case "naver":
                return {
                    bg: "bg-[#03C75A] hover:bg-[#02b350]",
                    text: "text-white",
                    label: isLinked ? "연동됨" : isConnect ? "네이버 연결하기" : "네이버 로그인",
                    border: "border-transparent",
                    iconSize: "w-7 h-7",
                }
            case "google":
                return {
                    bg: "bg-white hover:bg-slate-50",
                    text: "text-slate-700",
                    label: isLinked ? "연동됨" : isConnect ? "구글 연결하기" : "구글 로그인",
                    border: "border-slate-200",
                    iconSize: "w-7 h-7",
                }
        }
    }

    const style = getProviderStyle()

    return (
        <button
            onClick={() => onClick(provider)}
            disabled={isLinked}
            className={`relative w-full h-[52px] flex items-center justify-center rounded-2xl border transition-all duration-200 active:scale-[0.98] shadow-sm ${style.bg} ${style.border}`}
        >
            <div className="absolute left-3 w-12 flex items-center justify-center">
                <Image
                    src={imageSrc}
                    alt={`${provider} logo`}
                    width={36}
                    height={36}
                    className={`${style.iconSize} object-contain`}
                />
            </div>

            <span className={`font-semibold text-[15px] tracking-tight ${style.text}`}>{style.label}</span>
        </button>
    )
}
