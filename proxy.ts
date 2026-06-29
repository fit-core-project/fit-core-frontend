import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function proxy(request: NextRequest) {
    const role = request.cookies.get("fit-core-role")?.value ?? ""
    if (!role.includes("ROLE_ADMIN")) {
        return NextResponse.redirect(new URL("/", request.url))
    }
    return NextResponse.next()
}

export const config = {
    matcher: ["/admin/:path*"],
}
