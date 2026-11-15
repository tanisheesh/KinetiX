# KinetiX — Product Requirements Document

| Field | Value |
|---|---|
| **Status** | v1.0 Live |
| **Owner** | Tanish Poddar |
| **Live URL** | [https://kinetix.tanisheesh.in](https://kinetix.tanisheesh.in) |
| **One-liner** | Interactive 3D WebGL Digital Twin, Live C++ Firmware Patcher, and Hardware Telemetry Workbench for an Autonomous Ultrasonic Pick-and-Place Mobile Robot (Arduino UNO ATmega328P + 40 kHz HC-SR04 Sonar + L298N Dual H-Bridge + 50 Hz SG90 Closed-Loop Gripper). |

---

## 1. Problem & Quantified Impact

Entry-level autonomous robotics builds suffer from two compounding failures: fixed-path line followers and open-loop timer bots collide and halt on the first unexpected obstacle, while physical breadboard rovers fail during live demonstrations from loose jumper wires, 4.8 V battery brownouts, or uncalibrated ultrasonic thresholds. Worse, spectators watching a rover cross a floor cannot inspect the ATmega328P state transitions, H-Bridge switch states, motor stall current spikes, or microsecond echo pulses driving every maneuver.

| Dimension | Before (Physical Breadboard / Open-Loop Bot) | After (KinetiX v1 Digital Twin & Firmware) |
|---|---|---|
| Time to demonstrate & tune thresholds | 15–25 min physical rewiring + USB re-flash per constant change | `< 1s` live C++ Firmware Patcher (`EDIT & FLASH C++`) in browser |
| Dynamic obstacle handling | Collides/stalls (`0%` recovery on fixed-path ghost bot) | Deterministic `57×31` C-Space A\* rerouting + `0.48s` `REVERSE_CLEAR` bypass |
| Pin-level visibility | Opaque black-box chassis motion without bench scope | Simultaneous 60 Hz 3D stage, 15 Hz oscilloscope, H-Bridge matrix & 120-sample CSV/JSON blackbox |
| Hosting & evaluation cost | Bench hardware ($24+ BOM) + physical arena setup | `$0/mo` zero-login static deployment on Vercel Edge CDN |

---

## 2. Goals (v1 / MVP)

1. Deliver a deterministic 60 Hz (`dt ≤ 50 ms`) 3D WebGL Digital Twin (`/playground`) simulating the 5-state autonomous pick-and-place DFA (`SEARCH` → `PICK` → `CARRY` → `PLACE` → `DONE`) with 5-ray `15°` ultrasonic raycasting (`2–120 cm`), `1.50`-unit standoff docking, 3-circle OBB collision physics, and a `57×31` C-Space A\* Pathfinder (`radii = [1.35, 1.15, 0.96]`).
2. Ship **Weight-Aware Pick-and-Place (`20KG vs 10KG DEMO`)**, live C++ Firmware Patching (`PICK_DIST_CM`, `AVOID_DIST_CM`, `GRIP_CLOSED_DEG`, `SPIN_DELAY_MS`, `MAX_LOAD_KG`, `CRUISE_PWM`), A/B Ghost Race, 3-Object Sorting, Click-to-Draw Maze Builder, and dual-viewport scissor `NOSE_CAM // POV`.
3. Expose synchronized pin-level hardware telemetry: dual-trace Canvas oscilloscope (`TRIG D10 10µs`, `ECHO D11 t µs`), interactive L298N H-Bridge switch matrix ($S_1\text{–}S_4$), 120-sample Blackbox Strip Chart with `.CSV`/`.JSON` export, and compressor-boosted 3-layer Web Audio API synth.
4. Provide a pin-verified Arduino UNO sketch (`KinetiX_Autonomous_Pick_Place.ino`), 6-subsystem interactive datasheets, 4-fault Common Ground schematic simulator (`/hardware`), and governing kinematics & truth tables (`/how-it-works`).

---

## 3. Non-Goals (Explicit Scope Cuts)

- **Cloud Backend / Database Persistence** — All rigid-body kinematics, A\* grid search, and oscilloscope rendering execute locally in browser memory at 60 Hz; revisit only if multi-user shared arena sessions or cloud telemetry logs are needed in v2.
- **Server-Side ROS / Gazebo Physics** — Heavy containerized physics servers require paid GPU instances and cold-start in minutes; revisit only if full multi-link 6-DOF URDF rigid dynamics are added.
- **User Accounts / Authentication** — Omitted so evaluators launch `/playground` and download `.ino` firmware in zero clicks; revisit only if users save custom maze/firmware workspaces to personal profiles.

---

## 4. Users & Personas

**Primary:** Robotics engineers, embedded students, and lab instructors inspecting autonomous mobile manipulation, ultrasonic ToF ranging, H-Bridge power isolation, and FSM control behavior.

**Secondary:** Technical reviewers and engineering hiring teams evaluating the live system at [https://kinetix.tanisheesh.in](https://kinetix.tanisheesh.in) and auditing the production Arduino C++ firmware alongside its 3D digital twin.

---

## 5. User Stories & Acceptance Criteria

### Story 1 — Autonomous Obstacle Bypass & Maze Replanning
*As an evaluator, I want to drag obstacles or draw maze walls in the 3D arena so that I can verify collision-free A\* navigation.*
- **Given** the RM-01 rover is in `SEARCH` or `CARRY`, **When** an obstacle enters `d ≤ AVOID_DIST_CM` (default `20 cm`, `1160 µs`) or a new wall is clicked onto the arena floor, **Then** the rover triggers a `0.25s` active brake (`IN1=1, IN2=1`), reverses `0.48s` (`REVERSE_CLEAR`), and computes a smoothed `#00e676` C-Space A\* trajectory.
- **Given** walls completely seal every corridor on the `57×31` grid, **When** `computeAStarPath` exhausts all `3` clearance radii (`1.35`, `1.15`, `0.96`), **Then** the rover halts safely (`PWM = 0`) and displays `NO VALID PATH // CORRIDOR 100% SEALED BY WALLS` instead of clipping through geometry.

### Story 2 — Overload Torque Rejection & Live Firmware Patching
*As a firmware developer, I want to patch control constants and test payload weights so that I can validate torque and grip limits.*
- **Given** `20KG vs 10KG DEMO` is active with `MAX_LOAD_KG = 15 kg`, **When** the rover approaches and clamps the `20.0 kg` drum, **Then** `PICK` senses overload (`20 > 15`), spikes current to `985 mA`, shudders the chassis for `0.90s`, sounds the overload alarm, opens jaws to `90°`, backs up `0.65s`, and reroutes to the valid `10.0 kg` payload.
- **Given** a user flashes `GRIP_CLOSED_DEG > 52°` in `EDIT & FLASH C++`, **When** the rover carries a valid payload for `> 0.8s`, **Then** the payload slips from the jaws at current world coordinates and logs `PAYLOAD SLIP FAULT`.

### Story 3 — Interactive Wiring Fault Injection
*As a hardware engineer, I want to inject electrical wiring faults so that I can verify schematic failure modes.*
- **Given** `/hardware` or `/playground` is active, **When** `DROP COMMON GND`, `SWAP IN1↔IN2`, `4.8V BROWNOUT`, or `BYPASS L298N` (`FAULT_04` on `/hardware`) is selected, **Then** the schematic highlights the broken rail/polarity in `#ff2a2a`, states the electrical consequence (`480 mA >> 20 mA`, `V_motor = 2.8 V`, etc.), and `/playground` reproduces the floating jitter, spin lock, or brownout stall in 3D.

### Story 4 — Telemetry Export & Ghost Benchmarking
*As a systems analyst, I want to benchmark sonar autonomy against fixed-path motion and export blackbox logs.*
- **Given** `A/B GHOST RACE` is active, **When** the fixed-path ghost rover crosses an obstacle without sonar avoidance, **Then** the ghost halts with `COLLIDED WITH <LABEL> (NO SONAR)` while the RM-01 rover completes delivery.
- **Given** at least `1` sample is buffered in `historyRef`, **When** `EXPORT .CSV ↓` or `EXPORT .JSON ↓` is clicked, **Then** the browser downloads up to `120` samples containing `timestamp,state,step,distance_cm,echo_us,grip_angle_deg,pwm,motor_current_ma,battery_v`.

---

## 6. Functional Requirements

### 6.1 3D Digital Twin Stage (`/playground`)
- Procedural RM-01 rover: dual-deck chassis, 4× 1:48 TT gearmotors, 65 mm wheels, Arduino UNO R3, L298N with heatsink, 2×18650 battery pack, HC-SR04 transducer cans, and pivoting SG90 2-jaw gripper.
- 5 camera views (`ORBIT 3D`, `CHASE CAM`, `SONAR POV`, `BLUEPRINT`, `X-RAY`), scissor-rect `PiP CAM`, 2-finger pinch-to-zoom, and `WASD` + Touch D-Pad teleop.

### 6.2 Pin-Level Telemetry, C++ Patcher & Blackbox Recorder
- HTML5 Canvas oscilloscope (`CH1: TRIG D10 10µs`, `CH2: ECHO D11 t µs`), SVG H-Bridge ($S_1\text{–}S_4$), C++ trace / live parameter patcher (`PICK_DIST_CM` `3–10`, `AVOID_DIST_CM` `12–35`, `GRIP_CLOSED_DEG` `20–75`, `SPIN_DELAY_MS` `250–900`, `MAX_LOAD_KG` `5–30`, `CRUISE_PWM` `115–255`), and 120-sample strip chart.

### 6.3 Hardware Datasheets, Fault Lab & Mathematical Reference (`/hardware`, `/how-it-works`)
- 6 interactive subsystem datasheets (`MOD_01`–`MOD_06`), 4-fault interactive Star/Bus schematic, production `.ino` viewer/downloader, 5 governing equations (`LAW 01`–`LAW 05`), L298N + differential drive truth tables, physical limits vs. v2 upgrades, and 6 architectural Q&As.

### 6.4 Hardware, Acoustic & Digital-Twin Simulation Parameters
- **Acoustic Sensor Model:** `5`-ray fan across `±7.5°` (`15°` cone), `WORLD_TO_CM = 15.0`, `2.0–120.0 cm` simulation range (`2–400 cm` physical HC-SR04), `d = t / 58`; unassisted `foam` (`1.85×`) and `angled` (`1.45×`) attenuation penalties neutralized when `YOLO HUD` or `360° SLAM` is toggled on.
- **Path Planner & OBB Physics:** `57 × 31` grid (`0.25`-unit resolution), C-Space radii `[1.35, 1.15, 0.96]`, string-pulling radius `0.95 × radius`, standoff point `1.50` units, 3-circle OBB capsule (`[-0.42, 0.15, 0.72]`).
- **Physical Firmware (`KinetiX_Autonomous_Pick_Place.ino`):** `16 MHz` ATmega328P target, `9600` baud Serial, `40 ms` loop interval (`25 Hz`), `30,000 µs` (`30 ms`) `pulseIn` timeout.

---

## 7. Edge-Case & Failure Behavior Matrix

| Scenario | Expected System Behavior | User Feedback / Status |
|---|---|---|
| Overweight payload (`weightKg > maxLoadKg`) | `0.45s` clamp -> `0.90s` `985 mA` stall shudder + alarm -> `90°` release + `0.65s` reverse -> reroute or halt | Red `LOAD` badge `[OVERWEIGHT!]`, status banner |
| Sealed maze (`computeAStarPath` blocked) | Exhausts radii `[1.35, 1.15, 0.96]`, zeroes `ENA`/`ENB` (`PWM = 0`) | `NO VALID PATH // CORRIDOR 100% SEALED BY WALLS` |
| Weak servo angle (`GRIP_CLOSED_DEG > 52°`) | Payload drops from jaws after `0.8s` of `CARRY` transport | `PAYLOAD SLIP FAULT` status + `DONE` halt |
| Foam / `45°` angled wall (sonar only) | Echo range inflated `1.85×` / `1.45×` until 3-circle OBB bumper contacts and triggers `REVERSE_CLEAR` | `BUMPER CLEARANCE REFLEX` banner; resolved cleanly when `YOLO HUD` / `SLAM` enabled |
| Empty telemetry buffer before first tick | Export handler returns cleanly without generating empty file | Disabled/no-op download until `>= 1` sample exists |
| Mobile viewport (`320px–375px`) | Responsive Tailwind grid stacking, `touch-action: none` canvas, horizontal scroll wrapper for schematic/code | `132×88 px` compact PiP (hidden at `<= 320 px` width) |

---

## 8. Non-Functional Requirements & Budgets

- **Latency & Frame Budget:** `60 Hz` WebGL render loop (`dt` clamped `<= 50 ms`) with `> 65 ms` (`~15 Hz`) throttled React telemetry sync.
- **Security:** Static prerendered output with zero server attack surface; `vercel.json` enforces `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, and `Strict-Transport-Security`.
- **Cost Ceiling:** `$0/mo` static Edge hosting (zero DB, zero serverless API/LLM calls).
- **Reliability:** Single `THREE.WebGLRenderer` scissor-multiplexed PiP + `devicePixelRatio` capped at `2` prevents mobile GPU context exhaustion.
- **Accessibility & Mobile:** Semantic navigation landmarks, touch D-pad for `WASD` teleop, and responsive scroll containers for wide SVG schematics and truth tables.

---

## 9. Unit Economics & Quota Budget

| Resource | Free-Tier / Plan Limit | Estimated Usage per 1,000 Visits | Headroom / Scaling Note |
|---|---|---|---|
| Compute & CDN (Vercel Hobby) | 100 GB Fast Data Transfer / mo · 100 GB-hrs serverless | `~1–2 GB` static JS/HTML/OG assets · `0 GB-hrs` runtime compute | All pages statically prerendered (`next build`); docs-only commits skipped via `ignoreBuildStep` |
| DNS (GoDaddy) | Included with `tanisheesh.in` | `0` extra cost | Single CNAME `kinetix` -> Vercel DNS |

---

## 10. Success Metrics & Instrumentation

| Metric | Target | How Measured |
|---|---|---|
| Static Typecheck & Production Build | `0` errors across all App Router & metadata routes | `pnpm run typecheck && pnpm run build` in GitHub Actions `ci.yml` |
| Interactive Render & Sync Cadence | `60 Hz` WebGL loop (`dt <= 50 ms`) + `15 Hz` UI push | `physRef` frame loop & `lastUi > 65 ms` throttle in `kinetix-stage-3d.tsx` |
| Subsystem & Simulation Coverage | `6` BOM modules, `5` DFA states, `12` steps, `4` faults, `3` scenarios | Verified in `src/lib/kinetix-data.ts` & `/hardware` |
| Supply-Chain & SAST Hygiene | `0` high/critical CodeQL or Gitleaks alerts | `.github/workflows/codeql.yml` + `secret-scan.yml` + `dependency-review.yml` |

---

## 11. Risks, Assumptions & Open Questions

| Item | Impact | Mitigation / Status |
|---|---|---|
| **WebGL context loss on low-RAM mobile GPUs** | High | Single `THREE.WebGLRenderer` scissor PiP + `devicePixelRatio` capped at `2` |
| **Missing automated unit & Playwright a11y suite** | Medium | Current CI verifies `tsc --noEmit` + `next build`; Vitest (A\*/ToF) + Playwright/axe-core tracked for next sprint |
| **Hardcoded canonical URL vs `NEXT_PUBLIC_SITE_URL`** | Low | `layout.tsx`, `sitemap.ts`, `robots.ts` currently hardcode `https://kinetix.tanisheesh.in`; wiring env override is a 3-line follow-up |

---

## 12. v2 Candidates

- **WebSerial Live Hardware Bridge** — Stream real `Serial.println()` telemetry from a USB-connected Arduino UNO into `/playground` via the browser WebSerial API.
- **Automated Test Suite (`Vitest` + `Playwright` + `@axe-core/playwright`)** — Unit-test `computeAStarPath` / ToF math and gate PRs on `375px` + `1280px` smoke & WCAG AA scans.
- **TB6612FNG + Quadrature Odometry Profile** — Add MOSFET driver efficiency (`~0.2 V` drop vs `2.0 V` BJT) and wheel-encoder feedback to the C++ sketch generator.

---

<div align="center">

<h3>Tanish Poddar</h3>

<a href="https://tanisheesh.in"><img src="https://img.shields.io/badge/Website-tanisheesh.in-111111?style=flat-square&logo=googlechrome&logoColor=white" alt="Website"></a>
<a href="https://linkedin.com/in/tanisheesh"><img src="https://img.shields.io/badge/LinkedIn-tanisheesh-0A66C2?style=flat-square" alt="LinkedIn"></a>
<a href="https://github.com/tanisheesh"><img src="https://img.shields.io/badge/GitHub-tanisheesh-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub"></a>
<a href="mailto:hi@tanisheesh.in"><img src="https://img.shields.io/badge/Email-hi%40tanisheesh.in-EA4335?style=flat-square&logo=gmail&logoColor=white" alt="Email"></a>

</div>
