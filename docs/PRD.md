# KinetiX — Product Requirements Document

**Status:** Final  
**Owner:** Tanish Poddar  
**One-liner:** Interactive 3D WebGL Digital Twin, Live C++ Firmware Patcher, and Hardware Telemetry Workbench for an Autonomous Ultrasonic Pick-and-Place Mobile Robot (Arduino UNO ATmega328P + 40 kHz HC-SR04 Sonar + L298N Dual H-Bridge + 50 Hz SG90 Closed-Loop Gripper).

---

## 1. Problem

Entry-level autonomous robotics systems suffer from two compounding failure modes: pre-programmed fixed-path followers fail immediately when an unexpected obstacle blocks the corridor, while physical breadboard prototypes frequently malfunction during live reviews due to jumper-wire disconnects, battery brownout resets, or uncalibrated ultrasonic thresholds. Furthermore, spectators watching a physical rover move across a floor cannot see the internal microcontroller state transitions, H-Bridge switch states, motor current spikes, or microsecond ultrasonic time-of-flight pulses driving the robot's decisions.

---

## 2. Goals (v1 / MVP)

1. Deliver a deterministic 60 FPS 3D WebGL Digital Twin (`/playground`) that simulates the complete 5-state autonomous pick-and-place cycle (`SEARCH` → `PICK` → `CARRY` → `PLACE` → `DONE`) with real-time 15° ultrasonic cone raycasting, solid Oriented Bounding Box (OBB) collision physics, and orthogonal $90^\circ$ box-bypass maneuvers.
2. Provide an In-Browser C++ Firmware Patcher (`EDIT & FLASH C++ ⚡`), A/B Ghost Fixed-Path Race comparison, 3-Object Warehouse Color Sorting, Click-to-Draw Maze Builder, and dual-viewport Picture-in-Picture (`NOSE_CAM // POV`) camera.
3. Expose pin-level hardware telemetry in real time: dual-trace HC-SR04 oscilloscope (`TRIG D10 10µs` and `ECHO D11 t µs`), L298N H-Bridge switch matrix ($S_1\text{–}S_4$), 120-sample rolling Blackbox Strip Chart (`Sonar d(cm)`, `Motor Current I(mA)`, `Battery V(volts)`) with `.CSV`/`.JSON` export, and Web Audio API procedural sound synthesis.
4. Ship a production-ready, pin-verified Arduino UNO sketch (`KinetiX_Autonomous_Pick_Place.ino`) alongside interactive electrical fault simulation (`Disconnect Common GND`, `Swap IN1↔IN2`, `4.8V Brownout`, `Direct GPIO Overcurrent`) on `/hardware` and complete mathematical kinematics derivations on `/how-it-works`.

---

## 3. Non-Goals (explicit scope cuts)

- **Cloud Backend / Database Persistence** — All 3D rigid-body kinematics, ultrasonic raycasting, and oscilloscope rendering execute deterministically at 60 FPS inside the browser client; adding a server round-trip would introduce network jitter with zero benefit.
- **Full URDF / Gazebo Physics Server** — Heavy server-side ROS Gazebo containers require GPU cloud instances and cold-start in minutes; KinetiX implements an analytical differential-drive + Three.js raycast engine that loads instantaneously in any browser.
- **Multi-User Authentication** — KinetiX is an open engineering workbench and live demonstration platform requiring zero login friction.

---

## 4. Users

**Primary:** Robotics engineers, students, and instructors evaluating autonomous mobile manipulation, ultrasonic time-of-flight sensing, H-Bridge motor interfacing, and Finite State Machine control logic.

**Secondary:** Technical recruiters and engineers inspecting the project at `https://kinetix.tanisheesh.in` as an interactive cyber-physical systems portfolio piece.

---

## 5. User Stories

1. *As an evaluator,* I can drag a 3D crate into the rover's path or draw custom maze walls so that I can watch the HC-SR04 detect $d \le 20\text{ cm}$, trigger an active H-Bridge brake, and execute a 4-step orthogonal $90^\circ$ box-bypass maneuver in real time.
2. *As a firmware developer,* I can modify `PICK_DIST_CM`, `AVOID_DIST_CM`, `GRIP_CLOSED_DEG`, and `CRUISE_PWM` in the C++ Firmware Patcher and flash the virtual ATmega328P so that I can test edge cases like payload slip when `GRIP_CLOSED_DEG > 52°`.
3. *As a hardware engineer,* I can inject electrical wiring faults (`Disconnect Common GND`, `Swap IN1↔IN2`, `4.8V Battery Sag`, `Direct GPIO Overcurrent`) so that I can observe floating logic jitter, phase inversion, or MCU brownout resets both on the schematic and in 3D.
4. *As a systems analyst,* I can enable `A/B GHOST RACE` or `3-OBJECT SORT` and export the 120-sample Blackbox Telemetry Log as `.CSV` or `.JSON` so that I can benchmark autonomous sonar navigation against legacy fixed-path bots.
5. *As a mobile or desktop user,* I can switch to `WASD TELEOP` mode and use either keyboard controls or the on-screen Touch D-Pad to manually steer the rover and actuate the SG90 servo jaws.

---

## 6. Functional Requirements

### 6.1 3D Digital Twin Stage (`/playground`)

- Render the procedural RM-01 rover (dual-deck chassis, 4× 1:48 TT gearmotors with rotating wheels, Arduino UNO R3, L298N with heatsink, 2×18650 battery pack, HC-SR04 transducer cans, and pivoting SG90 2-jaw gripper).
- Cast multi-ray 15° ultrasonic beams from the front-most contour against target payloads and dynamic obstacle bounding boxes ($d = t / 58\text{ cm}$), enforcing solid OBB collision resolution.
- Support 5 primary camera views (`ORBIT 3D`, `CHASE CAM`, `SONAR POV`, `BLUEPRINT`, `X-RAY`), a secondary scissor-rect `PiP CAM`, 2-finger touch pinch-to-zoom, and on-screen touch teleop controls.

### 6.2 Pin-Level Telemetry, C++ Patcher & Blackbox Recorder

- Render a real-time HTML5 Canvas oscilloscope plotting `CH1: TRIG (D10) 10µs` and `CH2: ECHO (D11)` pulse width $t\ (\mu\text{s})$.
- Render an interactive SVG H-Bridge diagram reflecting switches $S_1, S_2, S_3, S_4$ (`FWD`, `REV`, `BRAKE`, `STOP`) and live motor current / voltage sag.
- Provide a 3-trace rolling Blackbox Strip Chart with `.CSV` and `.JSON` export and procedural Web Audio API sound synthesis.

### 6.3 Hardware, Fault Simulator & Mathematical Reference (`/hardware` & `/how-it-works`)

- Provide interactive datasheets for all hardware modules, a 4-fault interactive Star/Bus Common Ground schematic, truth tables, mathematical derivations, and architectural design rationale.

---

## 7. Non-Functional Requirements

- **Frame Rate & Latency:** 60 FPS WebGL rendering (`requestAnimationFrame`) with throttled 15 Hz React state synchronization so UI updates never block the 3D render loop.
- **Responsiveness:** Fully responsive industrial brutalist grid supporting mobile (`320px–375px`), tablet (`768px`), and desktop (`1400px+`) viewports with touch-action isolation.
- **Zero External Runtime Dependencies:** Runs 100% client-side on Vercel Edge/CDN with zero cold-start latency.

---

## 8. Success Metrics

| Metric | Target |
|---|---|
| Production Build & Typecheck | 0 TypeScript or Next.js build errors across all 13 static routes |
| Interactive Frame Rate | 60 FPS continuous dual-viewport WebGL simulation on desktop and mobile |
| Subsystem & Telemetry Coverage | All 9 hardware modules, 5 FSM states, 12 mission steps, and 4 fault modes simulated |

---

## 9. Risks & Open Questions

- **WebGL Context Loss on Low-Memory Mobile Devices** — Mitigated by rendering both main and PiP cameras inside a single `THREE.WebGLRenderer` using `setViewport`/`setScissor` and capping `devicePixelRatio` at `2`.
- **React Re-render Overhead at 60 FPS** — Mitigated by storing high-frequency kinematic state in mutable `useRef` structures inside the Three.js loop and pushing UI telemetry snapshots every `65 ms` (~15 Hz).

---

## 10. v2 Candidates

- **WebSerial Live Hardware Bridge** — Stream real `Serial.println()` telemetry from a physical USB-connected Arduino UNO directly into the 3D Digital Twin via the browser WebSerial API.
- **Custom STL / URDF Mesh Importer** — Allow users to drop custom CAD gripper jaws or chassis plates into the 3D stage.

---

<div align="center">

<h3>Tanish Poddar</h3>

<a href="https://tanisheesh.in"><img src="https://img.shields.io/badge/Website-tanisheesh.in-111111?style=flat-square&logo=googlechrome&logoColor=white" alt="Website"></a>
<a href="https://linkedin.com/in/tanisheesh"><img src="https://img.shields.io/badge/LinkedIn-tanisheesh-0A66C2?style=flat-square" alt="LinkedIn"></a>
<a href="https://github.com/tanisheesh"><img src="https://img.shields.io/badge/GitHub-tanisheesh-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub"></a>
<a href="mailto:hi@tanisheesh.in"><img src="https://img.shields.io/badge/Email-hi%40tanisheesh.in-EA4335?style=flat-square&logo=gmail&logoColor=white" alt="Email"></a>

</div>
