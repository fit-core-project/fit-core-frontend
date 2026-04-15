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
            {
                protocol: "https",
                hostname: "lh3.googleusercontent.com", // 구글 프로필 이미지용
            },
            {
                protocol: "https",
                hostname: "phinf.pstatic.net", // 네이버 프로필 이미지용
            },
            {
                protocol: "https",
                hostname: "k.kakaocdn.net", // 카카오 프로필 이미지용
            },
            {
                protocol: "http",
                hostname: "k.kakaocdn.net", // 카카오 일부 환경 대비
            },
            {
                protocol: "http",
                hostname: "lh3.googleusercontent.com", // 구글 일부 환경 대비
            },
        ],
    },
}

export default nextConfig
