"use client"

import { useEffect, useState } from "react"

async function startMSW() {
    const { worker } = await import("@/mocks/browser")
    await worker.start({ onUnhandledRequest: "bypass" })
}

export default function MSWProvider({ children }: { children: React.ReactNode }) {
    const [ready, setReady] = useState(false)

    useEffect(() => {
        startMSW().then(() => setReady(true))
    }, [])

    if (!ready) return null
    return <>{children}</>
}
