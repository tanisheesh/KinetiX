"use client";

import React from "react";
import Link from "next/link";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { VIVA_DEFENSE_QA } from "@/lib/kinetix-data";

const MATHEMATICAL_LAWS = [
  {
    code: "LAW 01 // SLIDE 09",
    title: "ULTRASONIC TIME-OF-FLIGHT ACOUSTIC RANGING (HC-SR04)",
    formula: "d(cm) = (t_echo × c_air) / 2 = (t_µs × 0.0343 cm/µs) / 2 = t_µs ÷ 58",
    desc: "Arduino sets Pin D10 HIGH for 10 µs, triggering an 8-cycle 40 kHz burst. Pin D11 stays HIGH for the round-trip duration t_µs. Because the acoustic wave traverses 2d (to the obstacle and back), dividing by 58 converts microseconds directly into one-way centimeters.",
  },
  {
    code: "LAW 02 // SLIDES 10 & 11",
    title: "DUAL H-BRIDGE DIAGONAL SWITCHING & BJT VOLTAGE DROP (L298N)",
    formula: "V_motor = V_batt - V_drop(L298N) · (PWM / 255)   |   Fwd: S1∧S4, Rev: S3∧S2",
    desc: "Four power switches (S1–S4) surround the DC motor crossbar. Closing diagonal pair S1+S4 drives current left-to-right (Forward); closing S3+S2 reverses polarity (Reverse); closing both top or bottom switches dynamically brakes the rotor.",
  },
  {
    code: "LAW 03 // SLIDE 12",
    title: "1:48 GEAR REDUCTION & DIFFERENTIAL DRIVE KINEMATICS",
    formula: "v = (v_R + v_L) / 2   |   ω = (v_R - v_L) / L   |   τ_wheel ≈ 48 · η · τ_motor",
    desc: "The 1:48 spur gearbox steps down raw motor RPM (>6000 RPM) to ~140 RPM while multiplying shaft torque. Setting v_L = -v_R (left forward, right reverse) yields linear velocity v = 0 and pure angular spin ω around the chassis center.",
  },
  {
    code: "LAW 04 // SLIDES 13–15",
    title: "CLOSED-LOOP SERVO POTENTIOMETER FEEDBACK & 50HZ PWM (SG90)",
    formula: "T_period = 20 ms (50 Hz)   |   t_pulse(θ) = 1.0 ms + (θ / 180°) × 1.0 ms",
    desc: "An internal potentiometer measures actual horn angle θ_actual and compares it against the target pulse width on Pin D9: 1.0 ms = 0°, 1.17 ms = 30° (Gripper Closed), 1.5 ms = 90° (Gripper Open), 2.0 ms = 180°.",
  },
  {
    code: "LAW 05 // SLIDE 24",
    title: "5-STATE DETERMINISTIC FINITE AUTOMATON (DFA) CONTROL LOOP",
    formula: "δ(SEARCH, d≤5) → PICK → CARRY   |   δ(CARRY, d≤20) → SPIN_AVOID   |   δ(CARRY, atTarget) → PLACE → DONE",
    desc: "With a single ultrasonic transducer, object-vs-obstacle classification is resolved deterministically by state phase: detections in SEARCH are approached and gripped at d ≤ 5 cm, whereas detections in CARRY trigger obstacle avoidance at d ≤ 20 cm.",
  },
];

const LIMITATIONS_VS_FUTURE = [
  {
    id: "LIM_01",
    limitation: "Narrow 15° Single-Sensor Cone (Slide 26)",
    cause: "HC-SR04 only samples a 15° acoustic cone straight ahead; thin chair legs or off-axis obstacles outside the cone can clip the wheels.",
    upgrade: "360° 2D LiDAR + ROS SLAM Occupancy Grid (Slide 27)",
    solution: "Replaces single-ray ranging with continuous 360° laser scans, building a real-time Simultaneous Localization and Mapping (SLAM) costmap.",
  },
  {
    id: "LIM_02",
    limitation: "Soft / Angled Surface Acoustic Loss (Slide 26)",
    cause: "Foam/cloth absorbs 40 kHz ultrasound and walls angled >45° deflect the echo away from the receiver, causing false 400 cm clear readings.",
    upgrade: "RGB Camera + YOLOv8 Real-Time Vision (Slide 27)",
    solution: "Adds visual bounding-box classification on a Raspberry Pi / Jetson companion board so obstacles and payloads are recognized optically.",
  },
  {
    id: "LIM_03",
    limitation: "Phase-Only Object vs. Obstacle Distinction (Slide 26)",
    cause: "Ultrasonic time-of-flight measures distance only, relying on SEARCH vs. CARRY state phase to tell the target cylinder from an obstacle.",
    upgrade: "Multi-Class YOLO Object Recognition & Sorting (Slide 27)",
    solution: "Distinguishes target cylinders, warehouse crates, and color-coded drop zones simultaneously for multi-object sorting.",
  },
  {
    id: "LIM_04",
    limitation: "Open-Loop Target Finding & Wheel Slip (Slide 26)",
    cause: "Target arrival relies on travel time/distance estimation; smooth floors or battery sag cause dead-reckoning drift.",
    upgrade: "Quadrature Wheel Odometry + Closed-Loop Nav2 (Slide 27)",
    solution: "Optical/magnetic shaft encoders fuse wheel ticks with IMU/LiDAR odometry to guarantee millimeter-accurate target docking.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <Navbar />

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-3 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-6 sm:space-y-8">
        {/* Page Header */}
        <div className="border border-[#222220] bg-[#0e0e0e] p-5 sm:p-8 lg:p-10">
          <div className="font-mono text-[11px] sm:text-xs text-[#ffb300] uppercase tracking-widest mb-2">
            // MATHEMATICAL &amp; CONTROL SYSTEMS SPECIFICATION (SLIDES 08–27)
          </div>
          <h1 className="font-display font-black text-3xl sm:text-5xl lg:text-6xl uppercase text-[#f2efe9]">
            KINEMATICS, CONTROL LAWS &amp; VIVA DEFENSE
          </h1>
          <p className="text-xs sm:text-base text-[#88857e] mt-3 max-w-3xl leading-relaxed">
            Governing acoustic time-of-flight equations, H-Bridge switching truth tables,
            differential drive kinematics, SG90 PWM closed-loop feedback, and complete Viva
            technical defense answers.
          </p>
        </div>

        {/* ================= 1. GOVERNING EQUATIONS & LAWS ================= */}
        <section className="panel-frame">
          <div className="panel-header">
            <span>GOVERNING MECHATRONIC &amp; CONTROL EQUATIONS</span>
            <span>DETERMINISTIC REAL-TIME LOOP</span>
          </div>

          <div className="divide-y divide-[#222220]">
            {MATHEMATICAL_LAWS.map((item) => (
              <div
                key={item.code}
                className="p-4 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 min-w-0"
              >
                <div className="space-y-1.5 max-w-2xl min-w-0">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 font-mono">
                    <span className="px-2 py-0.5 bg-[#ffb300] text-[#080808] text-[11px] sm:text-xs font-bold shrink-0">
                      {item.code}
                    </span>
                    <h3 className="text-xs sm:text-sm font-bold text-[#f2efe9]">{item.title}</h3>
                  </div>
                  <p className="text-xs sm:text-sm text-[#88857e] leading-relaxed">{item.desc}</p>
                </div>
                <div className="p-3 sm:p-3.5 bg-[#080808] border border-[#222220] font-mono text-[11px] sm:text-xs text-[#00e676] overflow-x-auto custom-scrollbar whitespace-nowrap">
                  {item.formula}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ================= 2. SLIDE 11 & 12 TRUTH TABLES ================= */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* L298N Truth Table (Slide 11) */}
          <div className="panel-frame">
            <div className="panel-header">
              <span>L298N H-BRIDGE LOGIC TRUTH TABLE (SLIDE 11)</span>
              <span>MOTOR A (ENA, IN1, IN2)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="border-b border-[#222220] bg-[#0b0b0b] text-[#88857e]">
                    <th className="p-3">ENA</th>
                    <th className="p-3">IN1</th>
                    <th className="p-3">IN2</th>
                    <th className="p-3">ACTIVE SWITCHES</th>
                    <th className="p-3">MOTOR RESPONSE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222220]">
                  <tr>
                    <td className="p-3 text-[#00e676]">HIGH</td>
                    <td className="p-3">1</td>
                    <td className="p-3">0</td>
                    <td className="p-3 text-[#ffb300]">S1 + S4 Closed</td>
                    <td className="p-3 font-bold text-[#f2efe9]">Forward (Full Speed)</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-[#00e676]">HIGH</td>
                    <td className="p-3">0</td>
                    <td className="p-3">1</td>
                    <td className="p-3 text-[#ff2a2a]">S3 + S2 Closed</td>
                    <td className="p-3 font-bold text-[#f2efe9]">Reverse (Full Speed)</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-[#88857e]">HIGH</td>
                    <td className="p-3">0</td>
                    <td className="p-3">0</td>
                    <td className="p-3 text-[#88857e]">All Open</td>
                    <td className="p-3 text-[#88857e]">Stop (Free Coast)</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-[#ff2a2a]">HIGH</td>
                    <td className="p-3">1</td>
                    <td className="p-3">1</td>
                    <td className="p-3 text-[#ff2a2a]">Low-Side Short</td>
                    <td className="p-3 font-bold text-[#ff2a2a]">Dynamic Active Brake</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-[#ffb300]">PWM (0–255)</td>
                    <td className="p-3">1</td>
                    <td className="p-3">0</td>
                    <td className="p-3 text-[#ffb300]">S1 + S4 Duty</td>
                    <td className="p-3 font-bold text-[#ffb300]">Forward (Speed Modulated)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Differential Drive Steering Table (Slide 12) */}
          <div className="panel-frame">
            <div className="panel-header">
              <span>DIFFERENTIAL DRIVE STEERING MATRIX (SLIDE 12)</span>
              <span>CHASSIS KINEMATICS</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="border-b border-[#222220] bg-[#0b0b0b] text-[#88857e]">
                    <th className="p-3">CHASSIS MANEUVER</th>
                    <th className="p-3">LEFT MOTOR (A)</th>
                    <th className="p-3">RIGHT MOTOR (B)</th>
                    <th className="p-3">USE IN KINETIX FSM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222220]">
                  <tr>
                    <td className="p-3 font-bold text-[#00e676]">Drive Straight Forward</td>
                    <td className="p-3">Forward (IN1=1, IN2=0)</td>
                    <td className="p-3">Forward (IN3=1, IN4=0)</td>
                    <td className="p-3 text-[#88857e]">SEARCH &amp; CARRY Cruise</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-[#ffb300]">Turn Left Arc</td>
                    <td className="p-3">Stop / Slow PWM</td>
                    <td className="p-3">Forward</td>
                    <td className="p-3 text-[#88857e]">Heading Alignment</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-[#ffb300]">Turn Right Arc</td>
                    <td className="p-3">Forward</td>
                    <td className="p-3">Stop / Slow PWM</td>
                    <td className="p-3 text-[#88857e]">Heading Alignment</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-[#00e5ff]">Spin in Place (Zero Radius)</td>
                    <td className="p-3">Forward (IN1=1, IN2=0)</td>
                    <td className="p-3">Reverse (IN3=0, IN4=1)</td>
                    <td className="p-3 text-[#f2efe9]">d ≤ 20 cm Obstacle Bypass</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-[#ff2a2a]">Reverse Clearance</td>
                    <td className="p-3">Reverse (IN1=0, IN2=1)</td>
                    <td className="p-3">Reverse (IN3=0, IN4=1)</td>
                    <td className="p-3 text-[#88857e]">Step 11 Post-Place Backup</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ================= 3. LIMITATIONS (SLIDE 26) VS FUTURE SCOPE (SLIDE 27) ================= */}
        <section className="panel-frame">
          <div className="panel-header">
            <span>ENGINEERING LIMITATIONS (SLIDE 26) VS. V2 FUTURE SCOPE UPGRADES (SLIDE 27)</span>
            <Link href="/playground" className="text-[#ffb300] hover:underline">
              SIMULATE UPGRADES IN 3D STAGE →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#222220]">
            {LIMITATIONS_VS_FUTURE.map((item) => (
              <div key={item.id} className="p-5 space-y-3 border-b border-[#222220]">
                <div className="space-y-1">
                  <div className="font-mono text-[10px] text-[#ff2a2a] font-bold uppercase">
                    [{item.id}] CURRENT HARDWARE LIMITATION
                  </div>
                  <h4 className="font-display font-black text-xl uppercase text-[#f2efe9]">
                    {item.limitation}
                  </h4>
                  <p className="text-xs text-[#88857e] leading-relaxed">{item.cause}</p>
                </div>

                <div className="border border-[#00e676]/40 bg-[#00e676]/10 p-3 space-y-1">
                  <div className="font-mono text-[10px] text-[#00e676] font-bold uppercase">
                    → V2 ARCHITECTURAL SOLUTION: {item.upgrade}
                  </div>
                  <p className="text-xs text-[#f2efe9] leading-relaxed">{item.solution}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ================= 4. VIVA DEFENSE Q&A BANK ================= */}
        <section className="panel-frame">
          <div className="panel-header">
            <span>PRESENTATION &amp; VIVA TECHNICAL DEFENSE BANK</span>
            <span>6 CORE EXAMINER QUESTIONS</span>
          </div>

          <div className="divide-y divide-[#222220]">
            {VIVA_DEFENSE_QA.map((q) => (
              <div key={q.code} className="p-5 sm:p-6 space-y-2 bg-[#0e0e0e]">
                <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
                  <span className="text-[#ffb300] font-bold">
                    [{q.code}] // {q.slide}
                  </span>
                </div>
                <h3 className="font-display font-black text-xl sm:text-2xl uppercase text-[#f2efe9]">
                  {q.question}
                </h3>
                <p className="text-xs sm:text-sm text-[#88857e] leading-relaxed max-w-4xl">
                  {q.answer}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
