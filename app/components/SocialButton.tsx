import Image from "next/image"

interface SocialButtonProps {
    provider: "kakao" | "naver" | "google"
    imageSrc: string
    onClick: (provider: string) => void
    isLinked?: boolean
    isConnect?: boolean
}

// Brand colours follow each provider's login button guide; they are the one place outside the token palette.
const PROVIDER = {
    kakao: { name: "카카오", className: "border-transparent bg-[#FEE500] text-[#191919] hover:bg-[#F4DC00]", icon: "size-9" },
    naver: { name: "네이버", className: "border-transparent bg-[#03C75A] text-white hover:bg-[#02B350]", icon: "size-7" },
    google: { name: "구글", className: "border-rail bg-ground text-ink hover:bg-surface", icon: "size-7" },
} as const

export default function SocialButton({ provider, imageSrc, onClick, isLinked = false, isConnect = false }: SocialButtonProps) {
    const config = PROVIDER[provider]
    const label = isLinked ? `${config.name} 연동됨` : isConnect ? `${config.name} 연결하기` : `${config.name} 로그인`

    return (
        <button
            type="button"
            onClick={() => onClick(provider)}
            disabled={isLinked}
            className={`relative flex min-h-13 w-full items-center justify-center rounded-control border transition-colors duration-150 disabled:cursor-default disabled:opacity-60 ${config.className}`}
        >
            <span className="absolute left-3 flex w-12 items-center justify-center">
                <Image src={imageSrc} alt="" width={36} height={36} className={`${config.icon} object-contain`} />
            </span>
            <span className="text-body font-bold">{label}</span>
        </button>
    )
}
