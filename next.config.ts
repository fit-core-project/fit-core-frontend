import type { NextConfig } from "next"

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "www.gstatic.com", // 구글 로고
            },
            {
                protocol: "https",
                hostname: "www.static.nid.naver.com", // 네이버 로고
            },
            {
                protocol: "https",
                hostname: "www.k.kakaocdn.net", // 카카오 로고
            },
        ],
    },
}

export default nextConfig
