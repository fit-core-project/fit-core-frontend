import { describe, expect, it } from "vitest"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const { findViolations, findReferencedFiles, isRootFile, isScannedFile } = require("../../scripts/check-prod-bundle.js")

describe("check-prod-bundle", () => {
    const contents = new Map<string, string>([
        ["build-manifest.json", JSON.stringify({ pages: { "/": ["static/chunks/main-abc.js"] } })],
        ["static/chunks/main-abc.js", "import(\"./lazy-def.js\")"],
        ["static/chunks/lazy-def.js", "const w = setupWorker(); // mockServiceWorker"],
        ["static/chunks/orphan-xyz.js", "setupWorker()"],
        ["static/chunks/dev-logs.js", "fetch(\"/api/dev/logs\")"],
    ])
    const roots = ["build-manifest.json"]
    const candidates = [
        "static/chunks/main-abc.js",
        "static/chunks/lazy-def.js",
        "static/chunks/orphan-xyz.js",
        "static/chunks/dev-logs.js",
    ]

    it("follows references transitively", () => {
        const referenced = findReferencedFiles(contents, roots, candidates)
        expect([...referenced].sort()).toEqual(["static/chunks/lazy-def.js", "static/chunks/main-abc.js"])
    })

    it("fails on MSW only in referenced chunks, and on dev APIs anywhere", () => {
        const violations = findViolations(contents, roots, candidates) as { file: string; needle: string }[]
        const summary = violations.map((v) => `${v.file}:${v.needle}`).sort()
        expect(summary).toEqual([
            "static/chunks/dev-logs.js:/api/dev/",
            "static/chunks/dev-logs.js:/api/dev/logs",
            "static/chunks/lazy-def.js:mockServiceWorker",
            "static/chunks/lazy-def.js:setupWorker",
        ])
    })

    it("classifies roots and scanned files", () => {
        expect(isRootFile("server/app/page_client-reference-manifest.js")).toBe(true)
        expect(isRootFile("server/app/admin.html")).toBe(true)
        expect(isRootFile("server/app/page.js.nft.json")).toBe(false)
        expect(isScannedFile("static/chunks/a.js")).toBe(true)
        expect(isScannedFile("static/chunks/a.js.map")).toBe(false)
        expect(isScannedFile("static/css/a.css")).toBe(false)
    })
})
