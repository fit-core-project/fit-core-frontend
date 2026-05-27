#!/usr/bin/env node
/**
 * Postbuild assertion: fails CI if dev-only strings leak into the production bundle.
 * Run automatically via the "postbuild" npm script after `next build`.
 */

const fs = require("fs")
const path = require("path")

const BUILD_DIR = path.join(__dirname, "..", ".next")

// Strings that must never appear in a production bundle
const FORBIDDEN = [
    "테스트 모드 로그인",
    "PORTFOLIO DEMO",
    "/api/dev/logs",
    "/api/dev/",
]

// Directories to scan within .next
const SCAN_DIRS = [
    path.join(BUILD_DIR, "static", "chunks"),
    path.join(BUILD_DIR, "server"),
]

const SCAN_EXTS = new Set([".js", ".html"])

function* walkFiles(dir) {
    if (!fs.existsSync(dir)) return
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
            yield* walkFiles(full)
        } else if (SCAN_EXTS.has(path.extname(entry.name))) {
            yield full
        }
    }
}

let violations = 0

for (const scanDir of SCAN_DIRS) {
    for (const file of walkFiles(scanDir)) {
        const content = fs.readFileSync(file, "utf8")
        for (const needle of FORBIDDEN) {
            if (content.includes(needle)) {
                const rel = path.relative(BUILD_DIR, file)
                console.error(`[check-prod-bundle] FAIL  "${needle}"  found in  .next/${rel}`)
                violations++
            }
        }
    }
}

if (violations > 0) {
    console.error(
        `\n[check-prod-bundle] ${violations} dev string(s) leaked into the production bundle. ` +
            "Build rejected.\n"
    )
    process.exit(1)
}

console.log("[check-prod-bundle] OK — no dev strings found in the production bundle.")
