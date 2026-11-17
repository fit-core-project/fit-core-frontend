#!/usr/bin/env node
/**
 * Postbuild assertion: fails CI if dev-only strings leak into the production bundle.
 * Run automatically via the "postbuild" npm script after `next build`.
 *
 * Two rule sets:
 * - FORBIDDEN: must never appear in any scanned chunk.
 * - FORBIDDEN_IF_REFERENCED: dev/mock code (MSW). An orphan chunk nobody loads is tolerated, but a
 *   chunk that is reachable from a manifest, page, HTML/RSC payload or another reachable chunk fails.
 */

const fs = require("fs")
const path = require("path")

const BUILD_DIR = path.join(__dirname, "..", ".next")

// Strings that must never appear in a production bundle.
// Note: "테스트 모드 로그인" and "PORTFOLIO DEMO" are intentionally allowed in prod
// when NEXT_PUBLIC_ENABLE_DEMO_LOGIN is not 'false' (demo deployment use case).
const FORBIDDEN = ["/api/dev/logs", "/api/dev/"]

// MSW must not ship in a chunk the app can load. Kept specific: a bare "msw" substring
// false-positives in minified code.
const FORBIDDEN_IF_REFERENCED = ["setupWorker", "mockServiceWorker", "msw/browser"]

// Directories whose chunks are checked.
const SCAN_DIRS = ["static/chunks", "server"]
const SCAN_EXTS = new Set([".js", ".html"])

// Files that reference chunks (entry points for reachability).
const ROOT_EXTS = new Set([".json", ".js", ".html", ".rsc", ".txt"])
const IGNORED_DIRS = new Set(["cache", "dev", "diagnostics", "trace"])

function isIgnoredFile(rel) {
    return rel.endsWith(".map") || rel.endsWith(".nft.json")
}

function* walkFiles(dir, root = dir) {
    if (!fs.existsSync(dir)) return
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        const rel = path.relative(root, full).split(path.sep).join("/")
        if (entry.isDirectory()) {
            if (dir === root && IGNORED_DIRS.has(entry.name)) continue
            yield* walkFiles(full, root)
        } else {
            yield rel
        }
    }
}

/** Root files: manifests, page entries, prerendered HTML/RSC. */
function isRootFile(rel) {
    if (isIgnoredFile(rel)) return false
    const base = path.posix.basename(rel)
    if (/manifest/i.test(base)) return true
    if (rel.startsWith("server/app/") || rel.startsWith("server/pages/")) {
        return ROOT_EXTS.has(path.posix.extname(rel)) && !rel.includes("/chunks/")
    }
    return false
}

function isScannedFile(rel) {
    if (isIgnoredFile(rel)) return false
    if (!SCAN_EXTS.has(path.posix.extname(rel))) return false
    return SCAN_DIRS.some((dir) => rel === dir || rel.startsWith(dir + "/"))
}

/**
 * Returns the set of scanned file paths reachable from the roots: a file is reachable when its
 * basename appears in a root file or in another reachable file.
 * @param {Map<string,string>} contents rel path -> content (roots and scanned files)
 * @param {string[]} roots
 * @param {string[]} candidates scanned files
 */
function findReferencedFiles(contents, roots, candidates) {
    const referenced = new Set()
    const pending = new Set(candidates)
    const queue = [...roots]
    const seen = new Set()
    while (queue.length > 0) {
        const source = queue.shift()
        if (seen.has(source)) continue
        seen.add(source)
        const text = contents.get(source) ?? ""
        for (const candidate of [...pending]) {
            if (candidate === source) continue
            const base = path.posix.basename(candidate)
            if (text.includes(base)) {
                pending.delete(candidate)
                referenced.add(candidate)
                queue.push(candidate)
            }
        }
    }
    // Roots that are themselves scanned (e.g. server/app/**/page.js) are reachable by definition.
    for (const root of roots) if (candidates.includes(root)) referenced.add(root)
    return referenced
}

/**
 * @returns {{file: string, needle: string, rule: "always" | "referenced"}[]}
 */
function findViolations(contents, roots, candidates) {
    const referenced = findReferencedFiles(contents, roots, candidates)
    const violations = []
    for (const file of candidates) {
        const text = contents.get(file) ?? ""
        for (const needle of FORBIDDEN) {
            if (text.includes(needle)) violations.push({ file, needle, rule: "always" })
        }
        if (!referenced.has(file)) continue
        for (const needle of FORBIDDEN_IF_REFERENCED) {
            if (text.includes(needle)) violations.push({ file, needle, rule: "referenced" })
        }
    }
    return violations
}

function main() {
    if (!fs.existsSync(BUILD_DIR)) {
        console.error("[check-prod-bundle] .next not found. Run `next build` first.")
        process.exit(1)
    }

    const all = [...walkFiles(BUILD_DIR)]
    const roots = all.filter(isRootFile)
    const candidates = all.filter(isScannedFile)
    const contents = new Map()
    for (const rel of new Set([...roots, ...candidates])) {
        contents.set(rel, fs.readFileSync(path.join(BUILD_DIR, rel), "utf8"))
    }

    const violations = findViolations(contents, roots, candidates)
    for (const v of violations) {
        const why = v.rule === "referenced" ? " (referenced chunk)" : ""
        console.error(`[check-prod-bundle] FAIL  "${v.needle}"  found in  .next/${v.file}${why}`)
    }

    if (violations.length > 0) {
        console.error(
            `\n[check-prod-bundle] ${violations.length} dev string(s) leaked into the production bundle. ` +
                "Build rejected.\n"
        )
        process.exit(1)
    }

    console.log("[check-prod-bundle] OK — no dev strings found in the production bundle.")
}

module.exports = { FORBIDDEN, FORBIDDEN_IF_REFERENCED, findReferencedFiles, findViolations, isRootFile, isScannedFile }

if (require.main === module) main()
