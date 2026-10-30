# KinetiX — Architecture

---

## 1. Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16.4 (App Router, TypeScript 5.9, Turbopack) |
| UI Runtime | React 19.3 |
| 3D Engine | Three.js r186 (`WebGLRenderer`, Dual-Viewport Scissor Pass, `Raycaster`, `PCFShadowMap`) |
| Audio Engine | Web Audio API Procedural Synthesizer (`src/lib/sound-engine.ts`) |
| Styling | Tailwind CSS 4 (`@tailwindcss/postcss`) + Industrial Brutalist CSS Variables |
| Embedded Firmware | Arduino C/C++ (`Servo.h`, `pulseIn`, Hardware PWM) for ATmega328P |
| Hosting | Vercel (Static Prerendering + Edge CDN) |

---

## 2. Components

```
src/
  app/
    page.tsx                 [01] Specification landing page, hero telemetry & benchmark matrix
    playground/page.tsx      [02] 3D Digital Twin stage, C++ patcher, oscilloscope & strip chart
    hardware/page.tsx        [03] 9-module datasheets, interactive fault schematic & .ino studio
    how-it-works/page.tsx    [04] Mathematical derivations, truth tables & design rationale
    opengraph-image.tsx      Dynamic 1200x630 brutalist OpenGraph social card
  components/
    kinetix-stage-3d.tsx     Three.js 60 FPS rigid-body kinematics, OBB collisions & PiP camera
    navbar.tsx               Sticky brutalist navigation bar + 4-tab mobile strip
    footer.tsx               System metadata and navigation footer
  lib/
    kinetix-data.ts          Single source of truth for FSM states, 12 steps, BOM, and .ino code
    sound-engine.ts          Web Audio API ultrasonic radar ping, alert & servo sound synth
```

### `kinetix-stage-3d.tsx` (3D Physics, OBB Collision & Dual-Viewport Engine)

Maintains a persistent `THREE.Scene` and single `WebGLRenderer`. Each animation frame (`dt` clamped to `50 ms`):
1. Casts a 5-ray fan across the $15^\circ$ (`±7.5°`) ultrasonic cone from the front-most contour (`+1.66` with payload, `+1.02` unloaded), separating `obsCm` (obstacle range) from `dCm` (payload range).
2. Evaluates either electrical fault overrides (`noCommonGnd`, `swapLeftPolarity`, `lowBatteryBrownout`), manual `WASD`/Touch teleop, or the 5-state Deterministic Finite Automaton (`SEARCH`, `PICK`, `CARRY`, `PLACE`, `DONE`) with a 4-step orthogonal $90^\circ$ box-bypass routine (`BRAKE` → `SPIN_90` → `DRIVE_CLEAR` → `SPIN_BACK` → `DRIVE_PAST`).
3. Enforces solid Oriented Bounding Box (OBB) collision resolution so neither the chassis nor the front gripper can clip through any obstacle.
4. Renders the main camera across the full canvas, then clears depth on a bottom-right scissor rectangle to render `pipCamera` (`NOSE_CAM // POV`) in the same frame.

### `playground/page.tsx` (Telemetry, C++ Patcher & Blackbox Recorder)

Hosts the dedicated 5-stage pipeline bar, the 3D stage panel, the dual-channel HTML5 Canvas oscilloscope (`TRIG D10` & `ECHO D11`), the interactive SVG L298N H-Bridge switch matrix ($S_1\text{–}S_4$), the In-Browser C++ Firmware Patcher, and the 120-sample rolling 3-trace Blackbox Strip Chart with `.CSV` / `.JSON` export.

---

## 3. Data Flow

```
[Three.js 60Hz Loop (physRef)]
   │
   ├─► 1. Cast 15° Raycaster Fan ──► Compute obsCm, dCm & echoUs = cm * 58
   │
   ├─► 2. Evaluate Faults / Teleop / 5-State DFA + Orthogonal 90° Bypass
   │      ├─► Set L298N Logic (ENA, IN1, IN2, ENB, IN3, IN4)
   │      ├─► Integrate Pose + Enforce Solid OBB Obstacle Collisions
   │      └─► Interpolate SG90 Closed-Loop Jaw Angle (90° ↔ gripClosedDeg)
   │
   ├─► 3. Dual-Viewport Render (Main Camera + Scissor PiP Nose-Cam)
   │
   └─► 4. Throttled Push (15Hz) ──► [PlaygroundPage State & History Buffer]
                                       ├─► Canvas Oscilloscope (CH1 Trig / CH2 Echo)
                                       ├─► SVG H-Bridge Switches (S1, S2, S3, S4)
                                       ├─► 120-Sample Strip Chart (d_cm, I_mA, V_batt)
                                       └─► Active C++ Line & 12-Step Matrix Highlight
```

---

## 4. State Model (`StageTelemetry`)

- `state` (`"SEARCH" | "PICK" | "CARRY" | "PLACE" | "DONE"`) — Current node in the 5-state DFA.
- `stepNum` (`1..12`) — Active step across Phase 1 (Search & Pick `01–06`) and Phase 2 (Carry & Place `07–12`).
- `distanceCm` (`number`) & `echoUs` (`number`) — Real-time ultrasonic reading where $t_{\mu\text{s}} = \text{round}(d_{\text{cm}} \times 58)$.
- `in1, in2, in3, in4` (`0 | 1`) & `leftPwm, rightPwm` (`0..255`) — Exact pin states driving the L298N dual full-bridge.
- `motorCurrentMa` (`number`) & `batteryVoltage` (`number`) — Simulated load current (`35–920 mA`) and 2×18650 bus voltage sag (`7.40 V` down to `4.80 V` brownout).
- `sortedCount` & `totalPayloads` — Progress counter in 3-Object Warehouse Sorting mode.

---

## 5. Security

- **Zero Server Attack Surface:** All routes are statically prerendered at build time (`next build`); no user data is transmitted to or stored on a backend server.
- **Environment Isolation:** `.env*` files are strictly gitignored; only `.env.example` with variable names is tracked.
- **Automated Supply-Chain Hygiene:** GitHub Actions CI (`ci.yml`), weekly Dependabot updates (`dependabot.yml`), and automated CI-gated merges (`dependabot-auto-merge.yml`) keep dependencies patched.

---

## 6. Error Handling & Reliability

| Failure Mode | Behaviour |
|---|---|
| Acoustic blind-spot contact on 45° / foam obstacle | Solid OBB collider prevents clipping, backs up `0.45` units, and triggers orthogonal 90° bypass |
| Weak flashed gripper angle (`GRIP_CLOSED_DEG > 52°`) | Payload slips from jaws after `0.8s` of transport, drops at current world coordinates, and logs `PAYLOAD SLIP FAULT` |
| Browser window resize / mobile orientation flip | Aspect-aware camera controller adjusts orbit radius (`14.8` portrait vs `10.8` landscape) and updates projection matrices |

---

## 7. Deployment

1. Vercel project linked to `tanisheesh/KinetiX` on GitHub — automatic production deployment on every push to `main`.
2. Custom subdomain `kinetix.tanisheesh.in` routed via GoDaddy CNAME to Vercel DNS (`cname.vercel-dns.com`).

---

## 8. Explicit Scope Cuts

- **Server-Side Physics Streaming** — Rejected in favor of deterministic in-browser Three.js kinematics for zero-latency interaction.
- **User Accounts** — Omitted so evaluators can launch `/playground` and download `.ino` firmware in one click.

---

<div align="center">

<h3>Tanish Poddar</h3>

<a href="https://tanisheesh.in"><img src="https://img.shields.io/badge/Website-tanisheesh.in-111111?style=flat-square&logo=googlechrome&logoColor=white" alt="Website"></a>
<a href="https://linkedin.com/in/tanisheesh"><img src="https://img.shields.io/badge/LinkedIn-tanisheesh-0A66C2?style=flat-square" alt="LinkedIn"></a>
<a href="https://github.com/tanisheesh"><img src="https://img.shields.io/badge/GitHub-tanisheesh-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub"></a>
<a href="mailto:hi@tanisheesh.in"><img src="https://img.shields.io/badge/Email-hi%40tanisheesh.in-EA4335?style=flat-square&logo=gmail&logoColor=white" alt="Email"></a>

</div>
