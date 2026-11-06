<p align="center">
  <img src="docs/logo.svg" width="64" height="64" alt="KinetiX logo">
</p>

<h1 align="center">KinetiX</h1>

<p align="center">
  <strong>Interactive 3D WebGL Digital Twin, Live C++ Firmware Patcher, and Hardware Telemetry Workbench for an Autonomous Ultrasonic Pick-and-Place Mobile Robot (Arduino UNO ATmega328P + 40 kHz HC-SR04 Sonar + L298N Dual H-Bridge + 50 Hz SG90 Closed-Loop Gripper).</strong>
</p>

<p align="center">
  <a href="https://kinetix.tanisheesh.in">
    <img src="https://img.shields.io/badge/live_demo-FFB300-FFB300?style=flat-square" alt="Live Demo">
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

Fixed-path line followers and open-loop timer bots fail the moment an obstacle blocks their corridor, while physical breadboard prototypes suffer from loose jumper wires and brownout resets during live demonstrations. **KinetiX** is a real-time **3D WebGL Digital Twin, In-Browser C++ Firmware Patcher, and Hardware Telemetry Workbench** alongside production **Arduino UNO (ATmega328P)** firmware for an autonomous obstacle-avoiding pick-and-place rover. It simulates a 5-state Deterministic Finite Automaton (`SEARCH` → `PICK` → `CARRY` → `PLACE` → `DONE`), 40 kHz ultrasonic time-of-flight raycasting ($d = t / 58\text{ cm}$), a **2D Occupancy Grid ($57\times31$) + C-Space A\* Pathfinder** with line-of-sight string-pulling and reverse-clear reflexes, solid Oriented Bounding Box (OBB) collision physics, L298N dual full-bridge switching ($S_1\text{–}S_4$), and 50 Hz closed-loop SG90 servo manipulation at 60 FPS.

> **Live demo →** [https://kinetix.tanisheesh.in](https://kinetix.tanisheesh.in)

---

## What you get

- **Interactive 3D WebGL Digital Twin & A\* Maze Stage** — procedural 3D RM-01 rover with real-time C-Space A\* pathfinding (`#00e676` floor route overlay), standoff pre-grasp docking (`1.50` units outside payloads), **20 kg vs. 10 kg Overload Torque Rejection (`MAX_LOAD_KG`)**, dual-viewport Picture-in-Picture (`NOSE_CAM // POV`), A/B Ghost Fixed-Path Race comparison, 3-Object Warehouse Color Sorting, Click-to-Draw Maze Builder, Exploded 3D X-Ray hardware inspection, and live YOLOv8 / 360° ROS SLAM overlays.
- **In-Browser C++ Firmware Patcher, Oscilloscope & Multi-Channel Audio Synth** — modify control constants (`MAX_LOAD_KG`, `PICK_DIST_CM`, `AVOID_DIST_CM`, `GRIP_CLOSED_DEG`, `SPIN_DELAY_MS`, `CRUISE_PWM`) and flash them live to the virtual ATmega328P while monitoring the dual-trace HC-SR04 oscilloscope (`CH1: TRIG D10`, `CH2: ECHO D11`), L298N H-Bridge switch matrix ($S_1\text{–}S_4$), and compressor-boosted multi-channel Web Audio API synthesizer (1:48 DC gearbox harmonics, `1120 Hz` reverse beeper, brake screech, `340 ms` SG90 gear zip, overload stall groan, and sonar pings).
- **Interactive Electrical Fault Injector & Datasheet Workbench** — inject live hardware faults (`Disconnect Common GND`, `Swap IN1↔IN2 Polarity`, `4.8V Battery Sag Brownout`, `Direct GPIO Overcurrent`) across both the 3D rover and the Star/Bus Common Ground SVG schematic, or download the production `.ino` sketch.
- **120-Sample Blackbox Strip Chart & Kinematics Specification** — real-time 3-channel rolling strip chart (`Sonar d(cm)`, `Motor Current I(mA)`, `Battery Bus V(volts)`) with one-click `.CSV` / `.JSON` telemetry export alongside complete mechatronic equations and truth tables.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend & Digital Twin | Next.js 16 (App Router) · React 19 · TypeScript · Three.js (r186 WebGL) · Tailwind CSS 4 |
| Audio & Telemetry | Web Audio API Procedural Synthesizer · HTML5 Canvas Oscilloscope & Strip Chart |
| Embedded Firmware | C/C++ (`Arduino.h`, `Servo.h`) · ATmega328P (16 MHz) · 5-State Deterministic Finite Automaton |
| Mechatronics & Sensing | HC-SR04 (40 kHz Sonar) · L298N Dual Full-Bridge · 1:48 Geared DC Motors · SG90 Micro Servo |
| Infra & Deployment | Vercel · GitHub Actions CI · Dependabot Auto-Merge |

---

## Engineering Decisions

**Why isolate the DC motors behind an L298N Dual H-Bridge instead of driving them from Arduino GPIO pins?**
Each ATmega328P digital pin safely sources at most ~20 mA at 5 V, whereas a 1:48 geared DC motor draws 150–500 mA continuously and over 1 A at stall while requiring 6–12 V. Furthermore, switching inductive motor windings produces reverse back-EMF voltage spikes; the L298N isolates the 5 V logic domain from the 7.4 V battery bus and provides four-quadrant diagonal switching ($S_1+S_4$ forward, $S_3+S_2$ reverse, $S_2+S_4$ low-side active braking).

**Why combine C-Space A\* Grid Pathfinding ($57\times31$) with a Reverse-Clear Reflex and Line-of-Sight String-Pulling?**
A differential-drive rover spans roughly $5 \times 3.5$ arena grid squares (`1.28` world-unit clearance radius including its front gripper). Naive single-obstacle reactive turns get trapped when users construct multi-wall custom mazes. Inflating obstacles in Configuration Space (`radii = [1.28, 1.06, 0.86, 0.68]`) with a soft proximity cost halo, executing a `0.48s` `REVERSE_CLEAR` backup before zero-radius spins, and smoothing the 8-directional A\* path via line-of-sight string-pulling guarantees collision-free navigation through arbitrary user-drawn mazes.

**Why render the Picture-in-Picture (`NOSE_CAM`) via `WebGLRenderer.setViewport` / `setScissor` on a single canvas?**
Spawning a second `THREE.WebGLRenderer` instance duplicates GPU scene buffers and halves mobile frame rates. Multiplexing both the primary orbit camera and the front-mounted HC-SR04 POV camera onto a single WebGL context using scissor-rect passes delivers a real-time dual-camera ground control station with zero additional memory overhead.

**What would you do differently in v2?**
Replace single-axis ultrasonic ranging and open-loop target timing with a companion Raspberry Pi / Jetson running YOLOv8 object detection and 360° 2D LiDAR + quadrature wheel encoders under ROS 2 Nav2 SLAM to eliminate acoustic absorption blind spots on soft/angled surfaces and wheel-slip drift.

---

## Docs

| Document | Description |
|---|---|
| [PRD](docs/PRD.md) | Product requirements — problem statement, goals, user stories, non-goals |
| [Architecture](docs/ARCHITECTURE.md) | System design, 3D physics loop, dual-viewport rendering & data flow |
| [Decisions](docs/DECISIONS.md) | Every major mechatronic and software decision and why |
| [Setup](docs/SETUP.md) | Local dev setup and Arduino UNO firmware flashing guide |
| [Deploy](docs/DEPLOY.md) | Production deployment on Vercel, custom domain, rollback |
| [Contributing](CONTRIBUTING.md) | How to propose changes |
| [Changelog](CHANGELOG.md) | What changed in each release |
| [Security](SECURITY.md) | How to report a vulnerability |

---

<div align="center">

<h3>Tanish Poddar</h3>

<a href="https://tanisheesh.in"><img src="https://img.shields.io/badge/Website-tanisheesh.in-111111?style=flat-square&logo=googlechrome&logoColor=white" alt="Website"></a>
<a href="https://linkedin.com/in/tanisheesh"><img src="https://img.shields.io/badge/LinkedIn-tanisheesh-0A66C2?style=flat-square" alt="LinkedIn"></a>
<a href="https://github.com/tanisheesh"><img src="https://img.shields.io/badge/GitHub-tanisheesh-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub"></a>
<a href="mailto:hi@tanisheesh.in"><img src="https://img.shields.io/badge/Email-hi%40tanisheesh.in-EA4335?style=flat-square&logo=gmail&logoColor=white" alt="Email"></a>

</div>
