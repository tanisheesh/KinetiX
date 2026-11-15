<p align="center">
  <img src="docs/logo.svg" width="64" height="64" alt="KinetiX logo">
</p>

<h1 align="center">KinetiX</h1>

<p align="center">
  <strong>Interactive 3D WebGL Digital Twin, Live C++ Firmware Patcher, and Hardware Telemetry Workbench for an Autonomous Ultrasonic Pick-and-Place Mobile Robot (Arduino UNO ATmega328P + 40 kHz HC-SR04 Sonar + L298N Dual H-Bridge + 50 Hz SG90 Closed-Loop Gripper).</strong>
</p>

<p align="center">
  <a href="https://kinetix.tanisheesh.in">
    <img src="https://img.shields.io/badge/live_demo-visit-FFB300?style=flat-square" alt="Live Demo">
  </a>
  <a href="https://github.com/tanisheesh/KinetiX/actions/workflows/ci.yml">
    <img src="https://github.com/tanisheesh/KinetiX/actions/workflows/ci.yml/badge.svg" alt="CI">
  </a>
  <a href="https://github.com/tanisheesh/KinetiX/actions/workflows/codeql.yml">
    <img src="https://github.com/tanisheesh/KinetiX/actions/workflows/codeql.yml/badge.svg" alt="CodeQL">
  </a>
  <img src="https://img.shields.io/badge/Next.js-black?style=flat-square&logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Three.js-000000?style=flat-square&logo=threedotjs&logoColor=white" alt="Three.js">
  <img src="https://img.shields.io/badge/Arduino-00878F?style=flat-square&logo=arduino&logoColor=white" alt="Arduino">
  <img src="https://img.shields.io/badge/C++-00599C?style=flat-square&logo=cplusplus&logoColor=white" alt="C++">
  <img src="https://img.shields.io/badge/license-GPL--3.0-FFB300?style=flat-square" alt="License">
</p>

---

## What is KinetiX?

Fixed-path line followers and open-loop timer bots fail the moment an obstacle blocks their corridor, while physical breadboard prototypes hide microcontroller state transitions and suffer from jumper disconnects or brownout resets. **KinetiX** pairs production **Arduino UNO (ATmega328P)** firmware with a deterministic **3D WebGL Digital Twin, In-Browser C++ Firmware Patcher, and Pin-Level Telemetry Workbench** simulating a 5-state Finite State Machine (`SEARCH` → `PICK` → `CARRY` → `PLACE` → `DONE`), 40 kHz acoustic raycasting ($d = t / 58\text{ cm}$), C-Space A\* pathfinding, L298N full-bridge switching, and 50 Hz SG90 servo manipulation in real time.

> **Live demo →** [https://kinetix.tanisheesh.in](https://kinetix.tanisheesh.in)

---

## What you get

- **3D WebGL Digital Twin & C-Space A\* Maze Stage** — Procedural RM-01 rover with `57×31` C-Space A\* route overlay, `1.50`-unit standoff docking, `20 kg vs. 10 kg` overload torque rejection, dual-viewport `NOSE_CAM // POV` PiP, A/B Ghost Race, 3-Object Sorting, Click-to-Draw Maze Builder, Exploded X-Ray mode, and optional YOLOv8 / 360° SLAM overlays.
- **In-Browser C++ Patcher, Oscilloscope & Mechatronic Synth** — Live-patch `MAX_LOAD_KG`, `PICK_DIST_CM`, `AVOID_DIST_CM`, `GRIP_CLOSED_DEG`, `SPIN_DELAY_MS`, and `CRUISE_PWM` while monitoring the dual-trace HC-SR04 oscilloscope (`TRIG D10`, `ECHO D11`), L298N switch matrix ($S_1\text{–}S_4$), and 3-layer Web Audio synthesizer.
- **Interactive Wiring Fault Injector & Datasheet Lab** — Inject `Disconnect Common GND`, `Swap IN1↔IN2`, `4.8V Brownout`, and `Direct GPIO Overcurrent` across the 3D stage and Star/Bus schematic, or export the production `KinetiX_Autonomous_Pick_Place.ino` sketch.
- **120-Sample Blackbox Strip Chart & Kinematics Reference** — Real-time rolling strip chart (`Sonar d(cm)`, `Motor I(mA)`, `Battery V`) with `.CSV`/`.JSON` export alongside complete governing equations and truth tables.

---

## By the numbers

| Metric | Value | Source |
|---|---|---|
| A\* Occupancy Grid & C-Space | `57 × 31` (`1,767` cells, `0.25`-unit step, radii `[1.35, 1.15, 0.96]`) | `src/components/kinetix-stage-3d.tsx` |
| Ultrasonic Raycaster & ToF | `5` rays across `15°` cone (`±7.5°`), `2–120 cm` sim (`d = t / 58`) | `src/components/kinetix-stage-3d.tsx` |
| Render Loop & Telemetry Sync | `60 Hz` (`dt ≤ 50 ms`) physics · `15 Hz` (`> 65 ms`) UI push | `src/components/kinetix-stage-3d.tsx` |
| Blackbox & Path Ring Buffers | `120` strip-chart samples · `350` trail pts · `120` A\* route pts | `src/app/playground/page.tsx` |
| Subsystems, FSM & Faults | `5` DFA states · `12` steps · `6` BOM modules · `4` wiring faults | `src/lib/kinetix-data.ts`, `hardware/page.tsx` |
| Arduino Firmware Cadence | `25 Hz` loop (`40 ms` delay) · `30 ms` echo timeout · `9600` baud | `src/lib/kinetix-data.ts` |

---

## Stack

| Layer | Tech |
|---|---|
| Frontend & Digital Twin | Next.js 16.4 (App Router) · React 19.3 · TypeScript 7.0 · Three.js r187 · Tailwind CSS 4.3 |
| Audio & Telemetry | Web Audio API (`DynamicsCompressorNode` + 3-Layer Synth) · HTML5 Canvas Oscilloscope & Strip Chart |
| Embedded Firmware | Arduino C/C++ (`Arduino.h`, `Servo.h`) · ATmega328P (16 MHz) · 5-State DFA |
| Mechatronics & Sensing | HC-SR04 (40 kHz Sonar) · L298N Dual Full-Bridge · 1:48 Geared DC Motors · SG90 Servo |
| Infra & Security | Vercel Edge CDN (`vercel.json` CSP/HSTS headers) · GitHub Actions CI · CodeQL · Gitleaks · Renovate |

---

## Engineering Decisions

**Why isolate the DC motors behind an L298N Dual H-Bridge instead of Arduino GPIO pins?**
ATmega328P digital pins source at most ~20 mA at 5 V, whereas a 1:48 geared DC motor draws 150–500 mA continuously and >1 A at stall at 6–12 V while generating inductive back-EMF spikes. The L298N isolates the 5 V logic domain from the 7.4 V Li-ion bus via four-quadrant diagonal switching ($S_1+S_4$ forward, $S_3+S_2$ reverse, $S_2+S_4$ dynamic brake).

**Why combine a `57×31` C-Space A\* grid with `REVERSE_CLEAR` and line-of-sight string-pulling?**
At `~2.6 × 1.65` world units including its front gripper, the RM-01 rover gets trapped by reactive single-obstacle turns in multi-wall user mazes. Inflating obstacles with adaptive radii `[1.35, 1.15, 0.96]`, backing up `0.48s` (`REVERSE_CLEAR`) before zero-radius spins, and string-pulling at `0.95 × radius` keeps trajectories collision-free down corridor centers.

**Why multiplex `NOSE_CAM // POV` via `setViewport` / `setScissor` on one WebGL canvas?**
Spawning a second `THREE.WebGLRenderer` duplicates scene geometries, textures, and `2048×2048` shadow maps in GPU memory. Scissor multiplexing renders the secondary `196×128 px` POV feed from the exact same scene graph with negligible GPU overhead.

**What would you do differently in v2?**
Replace the L298N BJT driver (`~2.0 V` heat drop) with a MOSFET `TB6612FNG`, add quadrature wheel encoders + MPU6050 IMU to eliminate open-loop slip drift, and pair an onboard Raspberry Pi / ESP32-CAM running YOLOv8 + 360° 2D LiDAR to cover acoustic blind spots on soft foam and angled walls.

---

## Docs

| Document | Description |
|---|---|
| [PRD](docs/PRD.md) | Product requirements — quantified impact, acceptance criteria, edge cases, unit economics |
| [Architecture](docs/ARCHITECTURE.md) | System topology (Mermaid), 3D/audio/firmware pipelines, state model, scale ceilings |
| [Decisions](docs/DECISIONS.md) | Technical ADRs — comparison matrices, tradeoffs, and reversal triggers |
| [Setup](docs/SETUP.md) | Local `pnpm` dev setup, env var matrix, Arduino UNO flashing, and troubleshooting |
| [Deploy](docs/DEPLOY.md) | Vercel production topology, security headers, smoke checks, and rollback runbooks |
| [Contributing](CONTRIBUTING.md) | Branching, emoji commit style, and PR checklist |
| [Changelog](CHANGELOG.md) | Release history mapped to commit history |
| [Security](SECURITY.md) | Vulnerability reporting policy and security scope |

---

<div align="center">

<h3>Tanish Poddar</h3>

<a href="https://tanisheesh.in"><img src="https://img.shields.io/badge/Website-tanisheesh.in-111111?style=flat-square&logo=googlechrome&logoColor=white" alt="Website"></a>
<a href="https://linkedin.com/in/tanisheesh"><img src="https://img.shields.io/badge/LinkedIn-tanisheesh-0A66C2?style=flat-square" alt="LinkedIn"></a>
<a href="https://github.com/tanisheesh"><img src="https://img.shields.io/badge/GitHub-tanisheesh-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub"></a>
<a href="mailto:hi@tanisheesh.in"><img src="https://img.shields.io/badge/Email-hi%40tanisheesh.in-EA4335?style=flat-square&logo=gmail&logoColor=white" alt="Email"></a>

</div>
