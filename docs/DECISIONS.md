# Engineering Decisions — KinetiX

---

## Decision 1 — Decoupling 60Hz Three.js Kinematics from 15Hz React Telemetry State

**Context:** Running a full 3D WebGL simulation alongside live React telemetry components (oscilloscope canvas, 120-sample strip chart, SVG H-Bridge schematic, C++ code highlighter, and projected 3D DOM badges) can cause severe frame drops if `setState` is invoked on every `requestAnimationFrame` tick (60 times per second).

**Decision:** Store all high-frequency kinematic, raycasting, OBB collision, and motor-pin variables inside a mutable `physRef` (`useRef`) updated at 60 FPS inside the Three.js loop, while throttling React telemetry state updates (`onTelemetryUpdate`) to once every `65 ms` (~15 Hz).

**Reason:** The human eye requires 60 FPS for smooth 3D motion and camera orbiting, but reads numeric telemetry gauges and code-line highlights comfortably at 15 Hz. Decoupling the two loops keeps WebGL frame times under `4 ms` even on mobile devices.

**Tradeoff:** React UI readouts lag the raw 3D physics position by at most `65 ms`, which is imperceptible to the user.

---

## Decision 2 — Orthogonal 90° Box-Bypass Maneuver + Solid OBB Collision Bounds

**Context:** When a differential-drive rover carrying an extended front payload (`+1.66` world units ahead of chassis center) steers diagonally around an obstacle crate, its side wheels or gripper tips can clip the obstacle corner.

**Decision:** Measure ultrasonic raycasts from the front-most payload contour, enforce hard Oriented Bounding Box (OBB) collision resolution against all obstacles, and execute a 4-step orthogonal bypass (`BRAKE` → `SPIN_90` → `DRIVE_CLEAR` → `SPIN_BACK` → `DRIVE_PAST`) in both `SEARCH` and `CARRY` states.

**Reason:** Spinning $90^\circ$ in place ($v = 0$, wheels opposite), driving perpendicular until the chassis + wheel width clears the obstacle's lateral footprint, spinning $90^\circ$ back to the corridor heading, and driving parallel until past the obstacle's back edge guarantees physical clearance without corner clipping.

**Tradeoff:** Orthogonal box-bypasses travel a slightly longer path than a curved spline trajectory, which is the exact real-world tradeoff of single-sensor ultrasonic rovers without a 360° LiDAR costmap.

---

## Decision 3 — Single-Canvas Scissor Multiplexing for Picture-in-Picture (`NOSE_CAM`)

**Context:** We wanted users to orbit the 3D arena freely while simultaneously viewing the rover's first-person onboard camera (`NOSE_CAM // POV`) in a corner monitor.

**Decision:** Render both `camera` (main view) and `pipCamera` (front HC-SR04 POV) inside the same `THREE.WebGLRenderer` instance using `renderer.setViewport()` and `renderer.setScissor()` in a two-pass render cycle.

**Reason:** Creating two separate `<canvas>` and `WebGLRenderer` instances requires duplicating every Three.js geometry, material, and shadow map in GPU memory. Scissor multiplexing reuses the exact same scene graph in under `0.6 ms` of extra GPU time.

**Tradeoff:** The PiP overlay must sit within the bounding rectangle of the primary WebGL canvas.

---

## Decision 4 — L298N Dual H-Bridge Isolation & Direct 50Hz PWM Servo Drive

**Context:** The rover must control four high-current 1:48 DC gearmotors alongside a closed-loop SG90 micro servo from an Arduino UNO (ATmega328P).

**Decision:** Route DC motor channels through an L298N Dual Full-Bridge driver (`D5, D7, D8` and `D6, D4, D2`) powered by the 7.4 V Li-ion pack, while driving the SG90 signal line directly from hardware PWM Pin `D9` with a unified Common Ground bus.

**Reason:** ATmega328P GPIO pins source at most ~20 mA at 5 V (`FAULT_04` demonstrates how direct motor connection causes a 480 mA overcurrent failure), whereas the SG90 houses its own internal H-bridge IC and potentiometer feedback loop, requiring only a `<5 mA` 50 Hz timing pulse (`1.17 ms` = $30^\circ$, `1.50 ms` = $90^\circ$) on Pin `D9`.

**Tradeoff:** The bipolar Darlington transistors inside the L298N drop `~2.0 V` thermally (`FAULT_03` demonstrates how battery sag to 4.8 V causes brownout stall).

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
