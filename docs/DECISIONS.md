# Engineering Decisions — KinetiX

---

## Decision 1 — Decoupling 60Hz Three.js Kinematics from 15Hz React Telemetry State

**Context:** Running a full 3D WebGL simulation alongside live React telemetry components (oscilloscope canvas, SVG H-Bridge schematic, C++ code highlighter, and projected 3D DOM badges) can cause severe frame drops if `setState` is invoked on every `requestAnimationFrame` tick (60 times per second).

**Decision:** Store all high-frequency kinematic, raycasting, and motor-pin variables inside a mutable `physRef` (`useRef`) updated at 60 FPS inside the Three.js loop, while throttling React telemetry state updates (`onTelemetryUpdate`) to once every `65 ms` (~15 Hz).

**Reason:** The human eye requires 60 FPS for smooth 3D motion and camera orbiting, but reads numeric telemetry gauges and code-line highlights comfortably at 15 Hz. Decoupling the two loops keeps WebGL frame times under `4 ms` even on mobile devices.

**Tradeoff:** React UI readouts lag the raw 3D physics position by at most `65 ms`, which is imperceptible to the user.

---

## Decision 2 — L298N Dual H-Bridge Isolation vs. Direct Microcontroller Drive

**Context:** In the hardware design (Slides 10–11), we needed bidirectional speed and direction control for four 1:48 geared DC motors controlled by an Arduino UNO (ATmega328P).

**Decision:** Place an L298N Dual Full-Bridge driver between the Arduino GPIO pins (`D5, D7, D8, D6, D4, D2`) and the DC motors, powered directly from the 7.4 V (2×18650 Li-ion) battery rail with a unified Common Ground bus.

**Reason:** An ATmega328P digital pin safely sources only ~20 mA at 5 V, whereas each geared DC motor draws 150–500 mA continuously and >1 A at stall while requiring 6–12 V. Additionally, inductive motor windings generate reverse voltage spikes during switching that would destroy the microcontroller without an H-Bridge power stage and flyback diodes.

**Tradeoff:** The bipolar Darlington switches inside the L298N introduce an internal thermal voltage drop of `~2.0 V`, requiring at least a 7.4 V battery pack to deliver ~5.4 V at the motor terminals.

---

## Decision 3 — Direct 50Hz PWM Drive for the SG90 Gripper Servo (Pin D9)

**Context:** While the wheel motors require the L298N power stage, the two-jaw mechanical gripper is actuated by an SG90 micro servo (Slides 13–15).

**Decision:** Drive the SG90 signal wire (Orange) directly from Arduino hardware PWM Pin `D9` while supplying `+5V` and `GND` from the regulated 5 V rail.

**Reason:** A hobby servo is already a self-contained closed-loop subsystem containing an internal H-bridge driver IC, reduction gear train, potentiometer shaft sensor, and error comparator. Pin `D9` only carries a low-current (<5 mA) 50 Hz timing pulse (`1.0 ms` = $0^\circ$, `1.17 ms` = $30^\circ$ closed, `1.50 ms` = $90^\circ$ open) rather than motor power.

**Tradeoff:** Heavy gripper stall loads on the 5 V rail can cause transient voltage dips (`brownout`) if the Arduino and servo share a weak regulator without decoupling capacitance.

---

## Decision 4 — Task-Phase Disambiguation in a 5-State Deterministic Finite Automaton

**Context:** The robot uses a single non-imaging HC-SR04 ultrasonic sensor (`d = t / 58 cm`) that reports distance only, yet must both approach and grip a target cylinder (`d ≤ 5 cm`) and avoid obstacles (`d ≤ 20 cm`).

**Decision:** Structure the firmware as a 5-state Deterministic Finite Automaton (`SEARCH` → `PICK` → `CARRY` → `PLACE` → `DONE`) where sensor readings are interpreted by state phase.

**Reason:** In `SEARCH`, the robot is oriented toward the pick zone, so the first acoustic reflection is treated as the target cylinder and approached at creep speed (`PWM=115`) down to `5.0 cm`. Once `PICK` locks the servo at `30°` and transitions to `CARRY`, the payload is already held in the jaws, so any subsequent reflection within `20.0 cm` is unambiguously an obstacle and triggers a differential spin bypass.

**Tradeoff:** If an unexpected obstacle is placed in front of the target cylinder inside the pick zone during `SEARCH`, a single ultrasonic sensor cannot visually distinguish it from the cylinder — a limitation explicitly demonstrated in `SCEN_03` and solved in v2 via YOLOv8 vision.

---

## What I'd do differently in v2

- **Replace L298N with a MOSFET TB6612FNG Driver** — Eliminates the `~2.0 V` BJT heat loss of the L298N, extending 18650 battery runtime by ~25%.
- **Add Quadrature Wheel Encoders + MPU6050 IMU** — Replaces open-loop travel-time target estimation with closed-loop dead-reckoning odometry immune to floor slip.
- **Integrate Companion Edge Vision (ESP32-CAM / Raspberry Pi + YOLOv8)** — Enables semantic classification of multiple object classes and color-coded drop zones.

---

## Explicit non-decisions (deferred to v2)

| Feature | Why deferred |
|---|---|
| Multi-DOF articulable robotic arm | A single-servo parallel jaw gripper demonstrates core pick-and-place autonomy at minimal weight and BOM cost |
| Full ROS 2 / LiDAR hardware stack | Requires an onboard Linux SBC (Raspberry Pi / Jetson) outside the low-cost ATmega328P microcontroller constraint |

---

<div align="center">

<h3>Tanish Poddar</h3>

<a href="https://tanisheesh.in"><img src="https://img.shields.io/badge/Website-tanisheesh.in-111111?style=flat-square&logo=googlechrome&logoColor=white" alt="Website"></a>
<a href="https://linkedin.com/in/tanisheesh"><img src="https://img.shields.io/badge/LinkedIn-tanisheesh-0A66C2?style=flat-square" alt="LinkedIn"></a>
<a href="https://github.com/tanisheesh"><img src="https://img.shields.io/badge/GitHub-tanisheesh-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub"></a>
<a href="mailto:hi@tanisheesh.in"><img src="https://img.shields.io/badge/Email-hi%40tanisheesh.in-EA4335?style=flat-square&logo=gmail&logoColor=white" alt="Email"></a>

</div>
