# Engineering Decisions — KinetiX

---

## ADR-01 — Decoupling 60 Hz Three.js Kinematics from 15 Hz React Telemetry State

**Context:** Running a continuous WebGL simulation alongside live React DOM/Canvas panels (HC-SR04 oscilloscope, 120-sample strip chart, SVG H-Bridge matrix, C++ line highlighter, and 3D world callout tags) causes severe React reconciliation jank if `setState` is triggered on every 60 Hz animation frame.

### Options Considered

| Option | Frame / UI Latency | Monthly Cost | Runtime Complexity | Verdict |
|---|---|---|---|---|
| **`physRef` (60 Hz) + Throttled `onTelemetryUpdate` (`> 65 ms` / ~15 Hz)** | `< 4 ms` WebGL · `<= 65 ms` UI lag | `$0` | Low | ✅ **Chosen** |
| React `useState` pushed at full 60 Hz (`requestAnimationFrame`) | `16–40 ms` jank spikes on mobile | `$0` | Low | ❌ Rejected |
| External Zustand / Redux store with per-panel selectors | `~6–10 ms` React reconcile overhead | `$0` | Medium | ❌ Rejected |

**Decision & Reason:** Keep all mutable 3D kinematics, sonar raycasting, OBB collision, and motor-pin state inside `physRef` (`useRef`) at 60 Hz (`dt <= 50 ms`), and emit `StageTelemetry` snapshots to React only when `now - lastUi > 65 ms` (~15 Hz). Numeric readouts and oscilloscope waveforms remain visually responsive at 15 Hz while keeping Three.js frame times consistently smooth on mobile and desktop.

**Tradeoff Accepted:** DOM badges and strip-chart plots trail raw 3D physics by at most `65 ms`, which is imperceptible to operators.

**Reversal Trigger:** Revisit and adopt fine-grained React external store subscriptions (`useSyncExternalStore`) or Canvas-only HUD rendering if telemetry channels exceed `50` widgets or high-speed oscilloscope rendering requires `>= 30 Hz` refresh.

---

## ADR-02 — `57×31` C-Space A\* Pathfinder + Line-of-Sight String-Pulling & `REVERSE_CLEAR`

**Context:** At `~2.6 × 1.65` world units including its extended front gripper, the RM-01 rover cannot clear complex multi-wall user mazes using simple single-obstacle reactive turns without clipping corners or stalling in forward/reverse oscillations.

### Options Considered

| Option | Planning Time | Monthly Cost | Failure / Trap Risk | Verdict |
|---|---|---|---|---|
| **`57×31` C-Space A\* (`[1.35, 1.15, 0.96]`) + String-Pull + `0.48s` `REVERSE_CLEAR`** | `~0.25 ms` event-driven | `$0` | Low (resolves multi-wall mazes) | ✅ **Chosen** |
| Pure reactive Braitenberg / `d <= 20 cm` 90° spin only | `< 0.02 ms` | `$0` | High (traps in U-shaped walls) | ❌ Rejected |
| Continuous RRT\* / Dynamic Window Approach (DWA) | `4–12 ms` per replan | `$0` | High tuning complexity | ❌ Rejected |

**Decision & Reason:** Discretize `X ∈ [-7.25, 6.75]`, `Z ∈ [-3.75, 3.75]` into `0.25`-unit cells (`57×31 = 1,767` cells), inflate obstacles across adaptive C-Space radii `[1.35, 1.15, 0.96]` with a proximity cost halo (`+4.5`) and outward-only escape constraint (`obsDist > curObsDist + 0.01`), smooth paths via `0.95 × radius` line-of-sight string-pulling, and run `0.25s BRAKE` + `0.48s REVERSE_CLEAR` before zero-radius spins.

**Tradeoff Accepted:** Requires signature-gated replanning (`lastPlanSig`) so A\* only runs when obstacles, goals, or state change rather than resetting `pathIdx` every frame.

**Reversal Trigger:** Revisit and replace the linear `openList` scan with a binary min-heap + Jump Point Search if arena grid resolution increases `>= 4×` (`> 7,000` cells) or real-time moving obstacles force replanning every frame (`> 2 ms` per search).

---

## ADR-03 — Single-Canvas Scissor Multiplexing for Picture-in-Picture (`NOSE_CAM`)

**Context:** Operators orbiting the 3D arena need simultaneous visibility of the front HC-SR04 first-person camera (`NOSE_CAM // POV`) without doubling GPU memory consumption or halving mobile frame rates.

### Options Considered

| Option | Extra Frame Cost | GPU Memory | Implementation Complexity | Verdict |
|---|---|---|---|---|
| **Single `WebGLRenderer` with `setViewport` / `setScissor`** | `< 0.6 ms` | `1×` scene & shadow map | Low | ✅ **Chosen** |
| Second `<canvas>` + second `THREE.WebGLRenderer` | `4–10 ms` | `2×` meshes, materials, shadows | Medium (context limit risk) | ❌ Rejected |
| Render-to-Texture (`WebGLRenderTarget`) + 2D Canvas copy | `2–4 ms` | `1.3×` + FBO readback | High | ❌ Rejected |

**Decision & Reason:** Render `camera` across the primary viewport, then clear depth on the bottom-right scissor rect (`196×128 px` desktop, `132×88 px` mobile `< 640 px`) and render `pipCamera` from the exact same `THREE.Scene` in one frame.

**Tradeoff Accepted:** The PiP monitor is visually anchored inside the primary WebGL `<canvas>` bounds and hidden when container width drops `<= 320 px` or main camera is already in `pov` mode.

**Reversal Trigger:** Switch to `WebGLRenderTarget` texture compositing if users ever need to undock `NOSE_CAM // POV` into a separate draggable dashboard panel outside the main canvas.

---

## ADR-04 — L298N Dual H-Bridge Isolation & Direct 50 Hz PWM Servo Drive

**Context:** The physical rover must power four 1:48 geared DC motors (6–12 V, 150–500 mA nominal, >1 A stall) and a closed-loop SG90 micro servo from an Arduino UNO (`~20 mA` max continuous GPIO limit per pin at 5 V).

### Options Considered

| Option | Voltage Drop / Efficiency | Hardware Cost | Protection / Control | Verdict |
|---|---|---|---|---|
| **L298N Dual H-Bridge (DC) + Pin `D9` 50 Hz PWM (SG90)** | `~2.0 V` BJT drop | `~$3` (common lab BOM) | Isolates inductive back-EMF & stall load | ✅ **Chosen (v1)** |
| Direct ATmega328P GPIO drive | N/A | `$0` | Destructive (`480 mA >> 20 mA` `FAULT_04`) | ❌ Rejected |
| MOSFET `TB6612FNG` driver | `~0.2 V` MOSFET drop | `~$5` | Higher runtime efficiency, less ubiquitous in starter kits | ⏳ Deferred to v2 |

**Decision & Reason:** Route Channel A (`D5/D7/D8`) and Channel B (`D6/D4/D2`) through the L298N powered by the `7.4 V` 2×18650 pack over a unified Common Ground bus, while sending `< 5 mA` 50 Hz PWM pulses (`1.17 ms` = `30°`, `1.50 ms` = `90°`) on `D9` directly to the SG90's internal closed-loop comparator.

**Tradeoff Accepted:** Bipolar Darlington drops inside the L298N dissipate `~2.0 V` as heat, causing brownout stalls if the battery pack sags to `4.8 V` (`FAULT_03`).

**Reversal Trigger:** Migrate physical BOM and `hardware/page.tsx` schematic to `TB6612FNG` once battery endurance > `45 min` continuous duty or `3.7 V–5 V` single-cell packs become the target hardware profile.

---

## ADR-05 — Standoff Pre-Grasp Docking (`1.50` Units) & Torque Overload Rejection (`15 kg`)

**Context:** Driving the rover's center `(rp.x, rp.z)` directly to a cylinder's center rolls the front axle over the payload before the front gripper (`+1.38` units ahead) can close. Furthermore, the gripper must fail safely when encountering loads above `MAX_LOAD_KG` (default `15 kg`, e.g., `20 kg` vs `10 kg`).

### Options Considered

| Option | Pick Cycle Time | Collision / Stall Safety | Complexity | Verdict |
|---|---|---|---|---|
| **`1.50`-unit Standoff Point + `0.90s` Torque Check (`MAX_LOAD_KG`)** | `+0.90s` check dwell | Zero chassis overlap; auto-reroutes on overload | Medium | ✅ **Chosen** |
| Direct centroid targeting without cylinder disks | `~0s` | High (chassis clips over cylinder; infinite stall on heavy loads) | Low | ❌ Rejected |

**Decision & Reason:** Compute an unobstructed `1.50`-unit standoff coordinate around the payload (`8` candidate angles requiring `minSignedDistToObstacles > 0.95`), execute a zero-radius spin to align jaws, creep forward to `d ≤ PICK_DIST_CM`, and evaluate `weightKg > maxLoadKg` in `PICK`: overweight triggers a `985 mA` stall spike + chassis shudder, releases jaws to `90°`, backs up `0.65s`, marks `rejected = true`, and reroutes A\* to the next valid payload.

**Tradeoff Accepted:** Adds `0.90s` of load-sensing dwell during `PICK` (total `~1.05s` valid / `~2.0s` rejected).

**Reversal Trigger:** Replace simulated weight checks with real INA219 current-sensor feedback in `.ino` firmware if physical load-rejection hardware is added in v2.

---

## What I'd do differently in v2

- **Modularize Large Client Files (`kinetix-stage-3d.tsx` & `playground/page.tsx`)** — Split the `2,831`-line Three.js component into `src/lib/astar-planner.ts`, `src/lib/obb-physics.ts`, `src/lib/rover-mesh.ts`, and focused `src/components/features/` panels under `300` lines each.
- **Swap L298N for MOSFET `TB6612FNG` + Quadrature Encoders** — Eliminates the `~2.0 V` thermal drop (~25% longer battery runtime) and replaces `TARGET_REACH_MS = 8000` open-loop timing with closed-loop wheel odometry.
- **Ship Unit & Playwright E2E/A11y Regression Gates** — Add Vitest coverage for A\* pathing/ToF math and Playwright + `@axe-core/playwright` verification on `375px` & `1280px` viewports.

---

## Explicit Non-Decisions (Deferred to v2)

| Feature | Why Deferred | Trigger to Build |
|---|---|---|
| WebSerial live physical Arduino telemetry | Browser sandbox testing needs zero hardware dependencies | When physical USB rover debugging inside `/playground` is requested |
| Multi-DOF articulable robotic arm | Single-servo parallel jaw gripper proves pick-and-place autonomy at minimal BOM | When vertical Z-axis stacking or multi-height shelf sorting is required |
| Full ROS 2 + 2D LiDAR hardware stack | Requires onboard Linux SBC (Raspberry Pi / Jetson) outside ATmega328P BOM | When migrating physical rover from UNO R3 to ROS 2 Nav2 |

---

<div align="center">

<h3>Tanish Poddar</h3>

<a href="https://tanisheesh.in"><img src="https://img.shields.io/badge/Website-tanisheesh.in-111111?style=flat-square&logo=googlechrome&logoColor=white" alt="Website"></a>
<a href="https://linkedin.com/in/tanisheesh"><img src="https://img.shields.io/badge/LinkedIn-tanisheesh-0A66C2?style=flat-square" alt="LinkedIn"></a>
<a href="https://github.com/tanisheesh"><img src="https://img.shields.io/badge/GitHub-tanisheesh-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub"></a>
<a href="mailto:hi@tanisheesh.in"><img src="https://img.shields.io/badge/Email-hi%40tanisheesh.in-EA4335?style=flat-square&logo=gmail&logoColor=white" alt="Email"></a>

</div>
