# KinetiX — Product Requirements Document

**Status:** Final  
**Owner:** Tanish Poddar  
**One-liner:** Interactive 3D WebGL Digital Twin and Hardware Telemetry Workbench for an Autonomous Ultrasonic Pick-and-Place Mobile Robot (Arduino UNO ATmega328P + 40 kHz HC-SR04 Sonar + L298N Dual H-Bridge + 50 Hz SG90 Closed-Loop Gripper).

---

## 1. Problem

Entry-level autonomous robotics projects suffer from two compounding failure modes: pre-programmed fixed-path followers fail immediately when an unexpected obstacle blocks the corridor, while physical breadboard prototypes frequently malfunction during live academic reviews due to jumper-wire disconnects, battery brownout resets, or uncalibrated ultrasonic thresholds. Furthermore, spectators watching a physical rover move across a floor cannot see the internal microcontroller state transitions, H-Bridge switch states, or microsecond ultrasonic time-of-flight pulses driving the robot's decisions.

---

## 2. Goals (v1 / MVP)

1. Deliver a deterministic 60 FPS 3D WebGL Digital Twin (`/playground`) that simulates the complete 5-state autonomous pick-and-place cycle (`SEARCH` → `PICK` → `CARRY` → `PLACE` → `DONE`) with real-time 15° ultrasonic cone raycasting.
2. Allow live interactive manipulation of 3D obstacles (standard crates, 45° specular deflectors, and acoustic foam absorbers) and payload coordinates directly on the stage floor without restarting the simulation.
3. Expose pin-level hardware telemetry in real time: dual-trace HC-SR04 oscilloscope (`TRIG D10 10µs` and `ECHO D11 t µs`), L298N H-Bridge switch matrix ($S_1\text{–}S_4$), SG90 50 Hz PWM duty cycle, and line-by-line C++ code execution trace.
4. Ship a production-ready, pin-verified Arduino UNO sketch (`KinetiX_Autonomous_Pick_Place.ino`) alongside complete electrical datasheets, Star/Bus Common Ground schematics (`/hardware`), and mathematical Viva defense derivations (`/how-it-works`).

---

## 3. Non-Goals (explicit scope cuts)

- **Cloud Backend / Database Persistence** — All 3D rigid-body kinematics, ultrasonic raycasting, and oscilloscope rendering execute deterministically at 60 FPS inside the browser client; adding a server round-trip would introduce network jitter with zero benefit.
- **Full URDF / Gazebo Physics Server** — Heavy server-side ROS Gazebo containers require GPU cloud instances and cold-start in minutes; KinetiX implements an analytical differential-drive + Three.js raycast engine that loads instantaneously in any browser.
- **Multi-User Authentication** — KinetiX is an open engineering workbench and live demonstration platform requiring zero login friction.

---

## 4. Users

**Primary:** Robotics students, instructors, and examiners evaluating autonomous mobile manipulation, ultrasonic time-of-flight sensing, H-Bridge motor interfacing, and Finite State Machine control logic.

**Secondary:** Technical recruiters and engineers inspecting the project at `https://kinetix.tanisheesh.in` as an interactive cyber-physical systems portfolio piece.

---

## 5. User Stories

1. *As an examiner or student,* I can drag a 3D crate into the rover's path during the `CARRY` phase so that I can watch the HC-SR04 detect $d \le 20\text{ cm}$, trigger an active H-Bridge brake, and execute a zero-radius differential spin bypass in real time.
2. *As a hardware engineer,* I can toggle `EXPLODE X-RAY` mode in the 3D stage so that the 6 mechatronic subsystems separate in 3D space with interactive callouts showing their exact electrical ratings and Arduino pin mappings.
3. *As a student preparing for a hardware build,* I can inspect the Slide 18 Star/Bus Common Ground schematic and download `KinetiX_Autonomous_Pick_Place.ino` so that I can flash an Arduino UNO R3 without wiring mismatches.
4. *As an evaluator testing sensor edge cases,* I can spawn a 45° angled wall or soft foam block (Slide 26) and toggle the YOLOv8 / 360° SLAM upgrades (Slide 27) so that I can compare single-cone acoustic limitations against computer-vision and LiDAR upgrades.
5. *As an operator,* I can switch to `WASD TELEOP` mode and press `Spacebar` so that I can manually steer the differential drive and actuate the SG90 servo jaws between $90^\circ$ and $30^\circ$.

---

## 6. Functional Requirements

### 6.1 3D Digital Twin Stage (`/playground`)

- Render the procedural RM-01 rover (dual-deck chassis, 4× 1:48 TT gearmotors with rotating wheels, Arduino UNO R3, L298N with heatsink, 2×18650 battery pack, HC-SR04 transducer cans, and pivoting SG90 2-jaw gripper).
- Cast multi-ray 15° ultrasonic beams against the target cylinder and dynamic obstacle bounding boxes, converting world distance to centimeters ($d = t / 58\text{ cm}$).
- Support 5 camera modes (`ORBIT 3D`, `CHASE CAM`, `SONAR POV`, `BLUEPRINT TOP`, `EXPLODE X-RAY`) and real-time pointer plane-intersection dragging for obstacles and the cylinder.

### 6.2 Pin-Level Telemetry Workbench

- Render a real-time HTML5 Canvas oscilloscope plotting `CH1: TRIG (D10) 10µs` and `CH2: ECHO (D11)` pulse width $t\ (\mu\text{s})$.
- Render an interactive SVG H-Bridge diagram reflecting switches $S_1, S_2, S_3, S_4$ and `ENA/IN1/IN2/ENB/IN3/IN4` logic states.
- Highlight the currently executing C++ line inside the 5-state FSM loop and track progress across all 12 mission steps.

### 6.3 Hardware, Kinematics & Viva Reference (`/hardware` & `/how-it-works`)

- Provide interactive datasheets for all hardware modules, a complete Common Ground interconnect diagram, truth tables, mathematical derivations, and examiner Q&A.

---

## 7. Non-Functional Requirements

- **Frame Rate & Latency:** 60 FPS WebGL rendering (`requestAnimationFrame`) with throttled 15 Hz React state synchronization so UI updates never block the 3D render loop.
- **Responsiveness:** Fully responsive industrial brutalist grid supporting mobile (`375px`), tablet (`768px`), and desktop (`1400px+`) viewports.
- **Zero External Runtime Dependencies:** Runs 100% client-side on Vercel Edge/CDN with zero cold-start latency.

---

## 8. Success Metrics

| Metric | Target |
|---|---|
| Production Build & Typecheck | 0 TypeScript or Next.js build errors across all 13 static routes |
| Interactive Frame Rate | 60 FPS continuous WebGL simulation on desktop and mobile browsers |
| PPT Specification Coverage | 100% of slides (Slides 1–28) mapped to interactive UI and docs |

---

## 9. Risks & Open Questions

- **WebGL Context Loss on Low-Memory Mobile Devices** — Mitigated by capping `devicePixelRatio` at `2` and disposing geometries/renderers cleanly on component unmount.
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
