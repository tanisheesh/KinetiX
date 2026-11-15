# KinetiX — Agent Development Guidelines

Follow these rules strictly on every file you create or modify in **KinetiX**.

---

## 1. File Organization & Architecture

- **File naming:**
  - TypeScript / React: ALWAYS use `kebab-case` (`kinetix-stage-3d.tsx`, `sound-engine.ts`, `kinetix-data.ts`), except framework-required App Router files (`page.tsx`, `layout.tsx`, `opengraph-image.tsx`, `twitter-image.tsx`, `apple-icon.tsx`, `sitemap.ts`, `robots.ts`, `manifest.ts`, `route.ts`).
- **File size limit:** Keep new and refactored files focused and **under 300 lines**. Extract cohesive modules out of existing large files (`src/components/kinetix-stage-3d.tsx`, `src/app/playground/page.tsx`) rather than growing them further.
- **Layered separation:**
  - `src/components/ui/` — pure, domain-agnostic UI primitives (`Button`, `Badge`, `PanelFrame`, `DataTable`). No `fetch()`, Three.js mutations, or business logic inside `ui/`.
  - `src/components/features/` — domain UI composed from `ui/` primitives (`kinetix-stage-3d.tsx`, oscilloscope, H-bridge schematic, C++ firmware patcher).
  - `src/hooks/` — reusable client hooks (keyboard/pointer teleop, telemetry ring buffer, audio unlock).
  - `src/lib/` — pure kinematics, C-Space A\* pathfinding, OBB collision math, hardware specifications (`kinetix-data.ts`), and Web Audio synth (`sound-engine.ts`).
  - `src/app/` — thin App Router pages (`page.tsx`, `playground/page.tsx`, `hardware/page.tsx`, `how-it-works/page.tsx`) and static metadata routes.
- **Reusability (Rule of Two):** Extract any repeated UI pattern (e.g., SVG logo, `.ino` file downloader, panel header) or helper used 2+ times into a shared primitive/module. Prefer props composition over boolean flag explosion.
- **App Router only (Next.js):** Never add or expand routes in `pages/`. Always use `src/app/`.
- **Digital Twin & Firmware Invariants:**
  - Always load Three.js WebGL components via `next/dynamic(..., { ssr: false })` so SSR never accesses `window` or `WebGLRenderer`.
  - Keep 60 Hz Three.js physics (`physRef`, `dt` clamped `<= 0.05s`) decoupled from throttled 15 Hz React telemetry updates (`> 65 ms`).
  - Multiplex `NOSE_CAM // POV` PiP through the single `THREE.WebGLRenderer` using `setViewport()` and `setScissor()` instead of spawning a second WebGL context.
  - Keep pin assignments (`D10`/`D11` sonar, `D5`/`D7`/`D8` & `D6`/`D4`/`D2` L298N, `D9` SG90) synchronized across `src/lib/kinetix-data.ts`, `FULL_ARDUINO_SKETCH`, and `/hardware` SVG schematics.

---

## 2. Code Style & Strictness

- **No dead code or debug clutter:** Never leave unused imports, unused npm dependencies, commented-out blocks, or stray `console.log` statements.
- **Named exports at definition:** Prefer `export async function foo()` / `export function bar()` at definition point. Only use `export default` where Next.js requires it (`page.tsx`, `layout.tsx`, `next.config.ts`, metadata image routes).
- **Control flow & async:** Use `async/await` (no raw `.then()` chains or nested callbacks). Prefer early returns with `if/else` and lookup objects over sprawling `switch` blocks. Use `for...of` for async iteration (`Array.prototype.forEach` does not await).
- **Strict equality:** Always use `===` and `!==` (never `==` / `!=`).
- **Type safety:** NEVER use `@ts-ignore`, `@ts-expect-error`, or `@ts-nocheck`. Avoid `any` — use `unknown` + type-guard or Zod narrowing.
- **Error handling:** Let pure helpers throw descriptive `Error` instances. Catch explicitly at I/O, Web Audio, WebGL, and UI boundaries — NEVER leave empty or silent `catch {}` blocks.
- **Directives first:** In Next.js/React client modules needing `'use client'` or `'use server'`, put the directive on **line 1** before any imports or comments.

---

## 3. UI Craft & Anti-AI-Slop Rules

- **Banned clichés:**
  - No generic purple/indigo/pink linear gradients, neon box-shadow glows, or rainbow badge spam.
  - No cookie-cutter 3-column icon-in-circle marketing grids inside dashboards or workbenches.
  - No hype copy (*"Supercharge..."*, *"Revolutionize..."*), hardcoded fake stats, dead buttons (`onClick={() => {}}`), or `window.alert()`.
- **Industrial Brutalist Design Discipline:** Stick to KinetiX's CSS variables in `src/app/globals.css` (`#080808` canvas, `#0E0E0E` surface, `#222220` `1px` borders, `0px` border radius, `#FFB300` amber primary signal, `#00E676` ok, `#FF2A2A` danger, `#00E5FF` cyan), Barlow Condensed / IBM Plex Sans / IBM Plex Mono fonts, `lucide-react` for UI icons (avoid mixing icon packs or emoji UI labels), and `tabular-nums` on telemetry metrics.
- **Mandatory 4 states:** Any async data view, device connection, or simulation load state must handle **Loading** (layout-matched skeleton), **Empty** (actionable CTA), **Error** (clear retry banner), and **Populated**.
- **Accessibility & responsiveness:** Semantic HTML (`<button>`, `<label htmlFor>`, `<main>`), keyboard access alongside 3D pointer controls, visible `focus-visible` rings, WCAG AA contrast, zero horizontal scroll at `375px` and `1280px`.

---

## 4. Security Rules

- **Secrets isolation:** Never expose server tokens via `NEXT_PUBLIC_`. Never commit `.env` or `.env.local` files; document every env variable in `.env.example` with empty values. Never log tokens or credentials.
- **XSS & safe rendering:** Never pass untrusted input into `dangerouslySetInnerHTML`, `eval()`, or `new Function()`. Validate any future API/WebSerial/URL inputs at boundaries with Zod before processing.
- **HTTP security headers:** Preserve `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and `Strict-Transport-Security` in `vercel.json`.
- **Backend / API readiness (if server routes are added in v2):** Enforce Zod boundary validation, session + ownership/IDOR checks failing closed (`401`/`403`), HMAC-SHA256 `crypto.timingSafeEqual` over raw webhook bodies, and HTTPS-only SSRF allowlisting.

---

## 5. Testing & Verification

- **No work is complete without verification:**
  - New pure helpers (`computeAStarPath`, `minSignedDistToObstacles`, `readDistanceCm` conversions, telemetry formatters) → unit tests covering happy path + boundary/null/blocked cases.
  - Bugfixes → regression test reproducing the issue before fixing.
  - UI changes → verify mobile (`375px`) & desktop (`1280px`), zero console/page errors, and Playwright + `@axe-core/playwright` checks when configured.
- **Never bypass checks:** Never delete tests, add `.skip`, or weaken TypeScript/lint rules to force green CI.

### Verification Commands (Run Before Finishing)

Exact scripts currently defined in `package.json`:

```bash
pnpm run typecheck   # tsc --noEmit
pnpm run build       # next build (Turbopack production build + static route prerender)
```

> **Note:** `lint` (ESLint) and automated `test` / `test:e2e` (Vitest + Playwright + `@axe-core/playwright`) scripts are not yet configured in `package.json`. Once added, CI (`.github/workflows/ci.yml`) auto-discovers and runs `lint`, `format:check`, `typecheck`, `build`, `test`, and `playwright.config.ts` automatically.

If `coderabbit` CLI is installed locally, optionally run a pre-PR review on your changes:

```bash
coderabbit review --agent --uncommitted
```

---

## 6. Git & Commit Rules

- **Atomic commits:** `<emoji> [#issue] [scope:] <present tense lowercase message>` (see `CONTRIBUTING.md`).
- **PRs:** Use plain-English **past-tense** PR titles, fill `.github/PULL_REQUEST_TEMPLATE.md`, and include docs / `.env.example` / tests in the same PR.
- **Safety:** Never force-push or run `git reset --hard` on `main`. Record any production rollback SHA and reason in a commit or PR.

---

<div align="center">

<h3>Tanish Poddar</h3>

<a href="https://tanisheesh.in"><img src="https://img.shields.io/badge/Website-tanisheesh.in-111111?style=flat-square&logo=googlechrome&logoColor=white" alt="Website"></a>
<a href="https://linkedin.com/in/tanisheesh"><img src="https://img.shields.io/badge/LinkedIn-tanisheesh-0A66C2?style=flat-square" alt="LinkedIn"></a>
<a href="https://github.com/tanisheesh"><img src="https://img.shields.io/badge/GitHub-tanisheesh-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub"></a>
<a href="mailto:hi@tanisheesh.in"><img src="https://img.shields.io/badge/Email-hi%40tanisheesh.in-EA4335?style=flat-square&logo=gmail&logoColor=white" alt="Email"></a>

</div>
