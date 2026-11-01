# Changelog

All notable changes to **KinetiX** are documented here.

---

## [1.0.0] — 2026-10-30

### ✨ Added
- Interactive 3D WebGL Digital Twin stage (`/playground`) simulating the RM-01 autonomous pick-and-place rover with Three.js r186, volumetric 15° ultrasonic sonar raycasting, solid Oriented Bounding Box (OBB) collision physics, bidirectional orthogonal 90° obstacle bypass maneuvers, and Exploded 3D X-Ray mode.
- Dual-viewport Picture-in-Picture (`NOSE_CAM // POV`) onboard camera, A/B Ghost Fixed-Path Race comparison mode, 3-Object Warehouse Color Sorting mode, Click-to-Draw Maze Builder, and responsive mobile Touch Teleop D-Pad + 2-finger pinch-to-zoom.
- In-Browser C++ Firmware Patcher (`EDIT & FLASH C++ ⚡`) allowing live modification of `PICK_DIST_CM`, `AVOID_DIST_CM`, `GRIP_CLOSED_DEG` (with payload slip physics when `>52°`), `SPIN_DELAY_MS`, and `CRUISE_PWM`.
- Real-time hardware telemetry stack: dual-channel HC-SR04 Time-of-Flight oscilloscope (`TRIG D10 10µs` and `ECHO D11 t µs`), interactive L298N Dual H-Bridge switch matrix ($S_1\text{–}S_4$ with active brake visualization), Web Audio API procedural sonar/servo sound synthesis, and a 120-sample rolling Blackbox Strip Chart with `.CSV` and `.JSON` export.
- Hardware & Wiring workbench (`/hardware`) with interactive 6-subsystem / 9-component datasheets, Star/Bus Common Ground schematic, interactive 4-fault electrical simulator (`Disconnect Common GND`, `Swap IN1↔IN2`, `4.8V Brownout`, `Direct GPIO Overcurrent`), and downloadable production `KinetiX_Autonomous_Pick_Place.ino` Arduino UNO sketch.
- Kinematics & Mathematics specification (`/how-it-works`) covering governing mechatronic equations, L298N & differential drive truth tables, physical sensor constraints vs. v2 upgrades, and architectural design rationale.
- Full Next.js 16 SEO metadata suite (`opengraph-image`, `twitter-image`, `apple-icon`, `icon.svg`, `sitemap.xml`, `robots.txt`, `manifest.webmanifest`, and JSON-LD schema).

---

[1.0.0]: https://github.com/tanisheesh/KinetiX/releases/tag/v1.0.0

---

<div align="center">

<h3>Tanish Poddar</h3>

<a href="https://tanisheesh.in"><img src="https://img.shields.io/badge/Website-tanisheesh.in-111111?style=flat-square&logo=googlechrome&logoColor=white" alt="Website"></a>
<a href="https://linkedin.com/in/tanisheesh"><img src="https://img.shields.io/badge/LinkedIn-tanisheesh-0A66C2?style=flat-square" alt="LinkedIn"></a>
<a href="https://github.com/tanisheesh"><img src="https://img.shields.io/badge/GitHub-tanisheesh-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub"></a>
<a href="mailto:hi@tanisheesh.in"><img src="https://img.shields.io/badge/Email-hi%40tanisheesh.in-EA4335?style=flat-square&logo=gmail&logoColor=white" alt="Email"></a>

</div>
