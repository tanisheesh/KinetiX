# Local Setup — KinetiX

> **Just want to try it?** Use the live deployment at [https://kinetix.tanisheesh.in](https://kinetix.tanisheesh.in) — zero setup needed.
> This guide covers running **KinetiX** locally with `pnpm`, verifying builds, flashing the Arduino UNO firmware, and fixing common local issues.

---

## Prerequisites & Versions

- **Node.js `22.x+`** (local tested on Node `26.13`)
- **pnpm `10.x+`** (`pnpm-lock.yaml` uses lockfile v9.0; CI uses `pnpm/action-setup@v6`)
- *(Optional, for physical robot)* **Arduino IDE 2.x** + **Arduino UNO R3** (ATmega328P)

---

## 1. Clone & Install

```bash
git clone https://github.com/tanisheesh/KinetiX
cd KinetiX
pnpm install --frozen-lockfile
```

---

## 2. Environment Variables

Copy `.env.example` to `.env.local` if you want to maintain a local env file:

```bash
cp .env.example .env.local
```

| Variable | Type / Format | Required | Scope | Local Default / Source |
|---|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Origin URL (`https://...`) | ❌ | Public | Optional override; app currently defaults statically to `https://kinetix.tanisheesh.in` |

> Never commit `.env`, `.env.local`, or `.env.*.local`. Linking the directory with Vercel CLI may populate `VERCEL_OIDC_TOKEN` inside `.env.local`, which is automatically gitignored.

---

## 3. Local Infrastructure & Seed Data

KinetiX has **no backend database, Docker containers, or migrations**. Preset warehouse scenarios (`SCEN_01`–`SCEN_03`), BOM datasheets, fault definitions, and Arduino firmware live statically in `src/lib/kinetix-data.ts`.

---

## 4. Run Locally

```bash
pnpm dev
```

App runs at `http://localhost:3000`:

- `http://localhost:3000/` — Specification landing page, 5-State DFA, 12-Step Matrix & architecture comparison
- `http://localhost:3000/playground` — 3D WebGL Digital Twin, PiP `NOSE_CAM`, C++ Firmware Patcher, oscilloscope, A/B Ghost Race, 3-Object Sorting & Blackbox Strip Chart
- `http://localhost:3000/hardware` — 6-subsystem datasheets, interactive 4-fault Common Ground schematic & `.ino` download
- `http://localhost:3000/how-it-works` — Mathematical kinematics equations, truth tables & v2 architecture roadmap

---

## 5. Run Verification Checks

Run the exact verification commands CI enforces before committing:

```bash
pnpm run typecheck   # tsc --noEmit
pnpm run build       # next build (Turbopack production build + static prerender)
```

> Note: `lint` (ESLint) and `test` / `test:e2e` (Vitest / Playwright) scripts are not yet configured in `package.json`. `.github/workflows/ci.yml` auto-detects and runs them as soon as they are added.

*(If `coderabbit` CLI is installed: `coderabbit review --agent --uncommitted`)*

---

## 6. Flashing the Arduino UNO Firmware (Optional Physical Build)

1. Open `http://localhost:3000/hardware` (or the Landing quickstart panel) and click **DOWNLOAD .INO ↓** to save `KinetiX_Autonomous_Pick_Place.ino`.
2. Wire all hardware over a **unified Common Ground (0 V)** bus:
   - **HC-SR04:** `VCC -> 5V`, `Trig -> D10`, `Echo -> D11`, `GND -> Common GND`
   - **L298N Channel A (Left):** `ENA -> D5~`, `IN1 -> D7`, `IN2 -> D8`
   - **L298N Channel B (Right):** `ENB -> D6~`, `IN3 -> D4`, `IN4 -> D2`
   - **SG90 Servo:** `Signal -> D9~`, `VCC -> 5V`, `Brown -> Common GND`
   - **Power:** `2×18650 (7.4 V) (+)` → `L298N +12V`; `Battery (–)` → `Common GND`
3. Open the `.ino` sketch in Arduino IDE, select **Board: Arduino Uno** and your serial port, then click **Upload**.

---

## 7. Known Local-Only Limitations

- Production HTTP security headers defined in `vercel.json` apply at the Vercel Edge layer and are not injected by `next dev`.
- Browser autoplay policies keep Web Audio (`soundEngine`) suspended until the first pointer click or keypress inside `/playground`.

---

## 8. Troubleshooting

| Symptom / Exact Error | Root Cause | Fix |
|---|---|---|
| `3D WebGL stage` stays blank or shows `INITIALIZING...` | Browser WebGL disabled / hardware acceleration off | Enable WebGL in browser flags or reload `/playground` |
| No gearbox / sonar audio on first load | Browser suspended `AudioContext` prior to user gesture | Click anywhere on `/playground` or toggle `SOUND: ON` |
| `next build` fails after switching branch/lockfile | Stale `.next/` Turbopack build cache | Remove `.next/` (`rm -rf .next`) and run `pnpm run build` |
| Physical HC-SR04 reads `400.0 cm` constantly | Missing Common GND or swapped `D10` (`Trig`) / `D11` (`Echo`) | Verify `D10 -> Trig`, `D11 -> Echo`, and tie Battery `(-)` to Arduino `GND` |

---

## 9. Deploy to Production

See [DEPLOY.md](DEPLOY.md) for Vercel hosting, custom subdomain wiring (`kinetix.tanisheesh.in`), smoke verification, and rollback steps.

---

<div align="center">

<h3>Tanish Poddar</h3>

<a href="https://tanisheesh.in"><img src="https://img.shields.io/badge/Website-tanisheesh.in-111111?style=flat-square&logo=googlechrome&logoColor=white" alt="Website"></a>
<a href="https://linkedin.com/in/tanisheesh"><img src="https://img.shields.io/badge/LinkedIn-tanisheesh-0A66C2?style=flat-square" alt="LinkedIn"></a>
<a href="https://github.com/tanisheesh"><img src="https://img.shields.io/badge/GitHub-tanisheesh-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub"></a>
<a href="mailto:hi@tanisheesh.in"><img src="https://img.shields.io/badge/Email-hi%40tanisheesh.in-EA4335?style=flat-square&logo=gmail&logoColor=white" alt="Email"></a>

</div>
