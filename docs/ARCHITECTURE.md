# KinetiX — Architecture

---

## 1. Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16.4 (App Router, TypeScript 5.9, Turbopack) |
| UI Runtime | React 19.3 |
| 3D Engine | Three.js r186 (`WebGLRenderer`, `Raycaster`, `PCFShadowMap`) |
| Styling | Tailwind CSS 4 (`@tailwindcss/postcss`) + Industrial Brutalist CSS Variables |
| Embedded Firmware | Arduino C/C++ (`Servo.h`, `pulseIn`, Hardware PWM) for ATmega328P |
| Hosting | Vercel (Static Prerendering + Edge CDN) |

---

## 2. Components

```
src/
  app/
    page.tsx                 [01] Specification landing page, hero telemetry & benchmark matrix
    playground/page.tsx      [02] Interactive 3D Digital Twin workbench & oscilloscope stack
    hardware/page.tsx        [03] 9-module datasheets, fault schematic & .ino studio
    how-it-works/page.tsx    [04] Mathematical derivations, truth tables & design rationale
    opengraph-image.tsx      Dynamic 1200x630 brutalist OpenGraph social card
  components/
    kinetix-stage-3d.tsx     Three.js 60 FPS rigid-body kinematics, 15° sonar raycaster & X-Ray
    navbar.tsx               Sticky brutalist navigation bar + 4-tab mobile strip
    footer.tsx               System metadata and navigation footer
  lib/
    kinetix-data.ts          Single source of truth for FSM states, 12 steps, BOM, and .ino code
```

### `kinetix-stage-3d.tsx` (3D Physics & Ultrasonic Raycasting Engine)

Maintains a persistent `THREE.Scene` and `WebGLRenderer`. Each animation frame (`dt` clamped to `50 ms`) executes the 5-state Deterministic Finite Automaton (`SEARCH`, `PICK`, `CARRY`, `PLACE`, `DONE`) or manual `WASD` teleop kinematics, casts a fan of rays across the $15^\circ$ (`±7.5°`) ultrasonic cone against obstacle meshes, animates wheel rotation and SG90 jaw angles, projects 3D world anchors into 2D screen coordinates for brutalist callout badges, and pushes throttled telemetry snapshots to React every `65 ms`.

### `playground/page.tsx` (Telemetry & Oscilloscope Workbench)

Hosts the dedicated 5-stage pipeline bar, the 3D stage panel, and three synchronized hardware instruments: a dual-channel HTML5 Canvas oscilloscope (`TRIG D10` & `ECHO D11`), an interactive SVG L298N H-Bridge switch matrix ($S_1\text{–}S_4$), and a live C++ code execution trace highlighting the active branch of the state machine.

---

## 3. Data Flow

```
[Three.js 60Hz Loop (physRef)]
   │
   ├─► 1. Cast 15° Raycaster Fan ──► Compute d_cm & echo_us = d_cm * 58
   │
   ├─► 2. Evaluate 5-State DFA (SEARCH → PICK → CARRY → PLACE → DONE)
   │      ├─► Set L298N Logic (ENA, IN1, IN2, ENB, IN3, IN4)
   │      ├─► Integrate Differential Drive Pose (x, z, heading, wheelRot)
   │      └─► Interpolate SG90 Closed-Loop Jaw Angle (90° ↔ 30°)
   │
   ├─► 3. Project 3D Coordinates ──► Render 2D Brutalist Callout Badges & YOLO Boxes
   │
   └─► 4. Throttled Push (15Hz) ──► [PlaygroundPage State]
                                       ├─► Canvas Oscilloscope (CH1 Trig / CH2 Echo)
                                       ├─► SVG H-Bridge Switches (S1, S2, S3, S4)
                                       └─► Active C++ Line & 12-Step Matrix Highlight
```

---

## 4. State Model (`StageTelemetry`)

- `state` (`"SEARCH" | "PICK" | "CARRY" | "PLACE" | "DONE"`) — Current node in the 5-state DFA.
- `stepNum` (`1..12`) — Active step across Phase 1 (Search & Pick `01–06`) and Phase 2 (Carry & Place `07–12`).
- `distanceCm` (`number`) & `echoUs` (`number`) — Real-time ultrasonic reading where $t_{\mu\text{s}} = \text{round}(d_{\text{cm}} \times 58)$.
- `in1, in2, in3, in4` (`0 | 1`) & `leftPwm, rightPwm` (`0..255`) — Exact pin states driving the L298N dual full-bridge.
- `gripAngle` (`30..90`) & `servoPulseMs` (`1.17..1.50`) — Instantaneous SG90 horn angle and 50 Hz pulse width.

---

## 5. Security

- **Zero Server Attack Surface:** All routes are statically prerendered at build time (`next build`); no user data is transmitted to or stored on a backend server.
- **Environment Isolation:** `.env*` files are strictly gitignored; only `.env.example` with variable names is tracked.
- **Automated Supply-Chain Hygiene:** GitHub Actions CI (`ci.yml`), weekly Dependabot updates (`dependabot.yml`), and automated CI-gated merges (`dependabot-auto-merge.yml`) keep dependencies patched.

---

## 6. Error Handling & Reliability

| Failure Mode | Behaviour |
|---|---|
| Obstacle dragged directly onto rover | Raycaster clamps minimum distance at `2.0 cm` (`116 µs`) and triggers immediate `BRAKE` → `SPIN` avoidance |
| Browser window resize / mobile orientation flip | `ResizeObserver` / `window.resize` recalculates camera aspect matrix and renderer viewport dimensions |
| High-DPI Retina/4K screen | `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))` prevents GPU fill-rate throttling |

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
