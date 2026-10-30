<p align="center">
  <img src="docs/logo.svg" width="64" height="64" alt="KinetiX logo">
</p>

<h1 align="center">KinetiX</h1>

<p align="center">
  <strong>Interactive 3D WebGL Digital Twin and Hardware Telemetry Workbench for an Autonomous Ultrasonic Pick-and-Place Mobile Robot (Arduino UNO ATmega328P + 40 kHz HC-SR04 Sonar + L298N Dual H-Bridge + 50 Hz SG90 Closed-Loop Gripper).</strong>
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

Fixed-path line followers and open-loop timer bots fail the moment an obstacle blocks their corridor, while physical breadboard prototypes suffer from loose jumper wires and brownout resets during live demonstrations. **KinetiX** is a real-time **3D WebGL Digital Twin and Hardware Telemetry Workbench** alongside production **Arduino UNO (ATmega328P)** C++ firmware for an autonomous obstacle-avoiding pick-and-place rover. It simulates a 5-state Deterministic Finite Automaton (`SEARCH` → `PICK` → `CARRY` → `PLACE` → `DONE`), 40 kHz ultrasonic time-of-flight raycasting ($d = t / 58\text{ cm}$), L298N dual full-bridge switching ($S_1\text{–}S_4$), and 50 Hz closed-loop SG90 servo manipulation at 60 FPS.

> **Live demo →** [https://kinetix.tanisheesh.in](https://kinetix.tanisheesh.in)

---

## What you get

- **Interactive 3D WebGL Digital Twin Stage** — procedural 3D RM-01 rover with rotating 1:48 TT gearmotor wheels, volumetric 15° ultrasonic sonar cone, draggable warehouse obstacles, Exploded 3D X-Ray hardware inspection, and live YOLOv8 / 360° ROS SLAM upgrade overlays.
- **Pin-Level Hardware Telemetry & Oscilloscope** — real-time dual-trace canvas oscilloscope (`CH1: TRIG D10 10µs`, `CH2: ECHO D11 t µs`), interactive L298N H-Bridge switch schematic ($S_1+S_4$ vs $S_3+S_2$), and line-by-line C++ state machine execution debugger.
- **Complete 9-Module Datasheet & Pinout Workbench** — electrical ratings, Common Ground bus topology schematic, H-Bridge & differential drive truth tables, and one-click `.ino` firmware download ready for Arduino IDE.
- **Acoustic Stress-Test & Kinematics Specification** — simulate physical HC-SR04 limitations (45° specular deflection and soft foam absorption) alongside complete mechatronic derivations and architectural rationale.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend & Digital Twin | Next.js 16 (App Router) · React 19 · TypeScript · Three.js (r186 WebGL) · Tailwind CSS 4 |
| Embedded Firmware | C/C++ (`Arduino.h`, `Servo.h`) · ATmega328P (16 MHz) · 5-State Deterministic Finite Automaton |
| Mechatronics & Sensing | HC-SR04 (40 kHz Sonar) · L298N Dual Full-Bridge · 1:48 Geared DC Motors · SG90 Micro Servo |
| Infra & Deployment | Vercel · GitHub Actions CI · Dependabot Auto-Merge |

---

## Engineering Decisions

**Why isolate the DC motors behind an L298N Dual H-Bridge instead of driving them from Arduino GPIO pins?**
Each ATmega328P digital pin safely sources at most ~20 mA at 5 V, whereas a 1:48 geared DC motor draws 150–500 mA continuously and over 1 A at stall while requiring 6–12 V. Furthermore, switching inductive motor windings produces reverse back-EMF voltage spikes; the L298N isolates the 5 V logic domain from the 7.4 V battery bus and provides four-quadrant diagonal switching ($S_1+S_4$ forward, $S_3+S_2$ reverse, low-side active braking).

**Why drive the SG90 gripper servo directly from Pin D9 PWM instead of routing it through the L298N?**
Unlike a bare two-wire DC motor, the SG90 houses its own internal H-bridge driver IC, reduction gear train, and feedback potentiometer. Pin D9 only supplies a low-current (<5 mA) 50 Hz timing pulse ($1.0\text{ ms} = 0^\circ$, $1.17\text{ ms} = 30^\circ\text{ closed}$, $1.50\text{ ms} = 90^\circ\text{ open}$) to the internal error comparator while power is drawn from the regulated 5 V rail.

**How does a single non-imaging ultrasonic sensor distinguish the target cylinder from an obstacle?**
Classification is resolved deterministically by task phase inside the 5-state Finite State Machine. In the `SEARCH` state, the arena pick zone lies directly ahead, so the first acoustic reflection is approached at creep speed (`PWM=115`) down to $d \le 5.0\text{ cm}$ and gripped; once the state transitions to `CARRY`, any reflection within $d \le 20.0\text{ cm}$ ($t \le 1160\ \mu\text{s}$) is classified as an obstacle and triggers a zero-radius differential spin bypass.

**What would you do differently in v2?**
Replace single-axis ultrasonic ranging and open-loop target timing with a companion Raspberry Pi / Jetson running YOLOv8 object detection and 360° 2D LiDAR + quadrature wheel encoders under ROS 2 Nav2 SLAM to eliminate acoustic absorption blind spots on soft/angled surfaces and wheel-slip drift.

---

## Docs

| Document | Description |
|---|---|
| [PRD](docs/PRD.md) | Product requirements — problem statement, goals, user stories, non-goals |
| [Architecture](docs/ARCHITECTURE.md) | System design, 3D physics loop, hardware pinout & data flow |
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
