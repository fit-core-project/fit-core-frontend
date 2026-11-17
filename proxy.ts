import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function proxy(request: NextRequest) {
    const role = request.cookies.get("fit-core-role")?.value ?? ""
    if (role.includes("ROLE_ADMIN")) return NextResponse.next()

    // No role cookie (e.g. browser restart): send through /login with a return path.
    // A still-valid persisted token re-sets the cookie on rehydrate and login returns here.
    if (!role) {
        const loginUrl = new URL("/login", request.url)
        loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`)
        return NextResponse.redirect(loginUrl)
    }

    return NextResponse.redirect(new URL("/", request.url))
}

export const config = {
    matcher: ["/admin/:path*"],
}
