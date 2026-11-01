"use client";

import React, { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import {
  FSM_STAGES,
  FULL_ARDUINO_SKETCH,
  HARDWARE_MODULES,
  TWELVE_STEPS,
} from "@/lib/kinetix-data";

const QUICKSTART_TABS = {
  sketch: {
    label: "ARDUINO UNO .INO",
    code: `// Flash directly to Arduino UNO R3 (ATmega328P @ 16 MHz) via Arduino IDE
// HC-SR04: D10 (Trig), D11 (Echo) | L298N: D5/D7/D8 & D6/D4/D2 | SG90: D9
#include <Servo.h>

float readDistanceCm() {
  digitalWrite(10, LOW);  delayMicroseconds(2);
  digitalWrite(10, HIGH); delayMicroseconds(10); // 10 µs trigger pulse
  digitalWrite(10, LOW);
  long t_us = pulseIn(11, HIGH, 30000);          // 40 kHz echo duration
  return (t_us == 0) ? 400.0 : (float)t_us / 58.0;
}`,
  },
  pinout: {
    label: "HARDWARE PIN MAP",
    code: `# KINETIX HARDWARE INTERCONNECT & COMMON GROUND TOPOLOGY
HC-SR04 SONAR    ->  VCC: 5V   | Trig: D10   | Echo: D11   | GND: Common GND
L298N CHANNEL A  ->  ENA: D5~  | IN1:  D7    | IN2:  D8    | OUT1/2: Left Motors
L298N CHANNEL B  ->  ENB: D6~  | IN3:  D4    | IN4:  D2    | OUT3/4: Right Motors
SG90 GRIPPER     ->  SIG: D9~  | VCC:  5V    | GND:  Common GND (50Hz: 90°=1.5ms, 30°=1.17ms)
POWER BUS        ->  2x18650 (7.4V) (+) -> L298N 12V | Battery (-) -> Unified GND Bus`,
  },
  webapp: {
    label: "3D DIGITAL TWIN",
    code: `# Run the KinetiX 3D WebGL Digital Twin & Telemetry Workbench locally
git clone https://github.com/tanisheesh/KinetiX.git
cd KinetiX
npm install
npm run dev

# Open http://localhost:3000 -> /playground (3D Stage) or /hardware (Pinout)`,
  },
};

const BENCHMARK_ROWS = [
  {
    arch: "FIXED-PATH LINE FOLLOWER",
    sensing: "IR Reflectance Only",
    obstacleHandling: "COLLIDES / HALTS PERMANENTLY",
    pickPrecision: "Fixed Track Only",
    cost: "$18",
    autonomy: "LOW (Static)",
    win: false,
  },
  {
    arch: "MANUAL RC TELEOP ROVER",
    sensing: "Human Line-of-Sight",
    obstacleHandling: "OPERATOR STEERED (HIGH LATENCY)",
    pickPrecision: "Operator Dependent",
    cost: "$32",
    autonomy: "NONE (0%)",
    win: false,
  },
  {
    arch: "OPEN-LOOP TIMER BOT",
    sensing: "Dead-Reckoning Delay()",
    obstacleHandling: "BLIND TO DYNAMIC OBSTACLES",
    pickPrecision: "Drifts on Wheel Slip",
    cost: "$20",
    autonomy: "FRAGILE",
    win: false,
  },
  {
    arch: "KINETIX (SONAR + 5-STATE FSM)",
    sensing: "40 kHz HC-SR04 (d = t / 58 cm)",
    obstacleHandling: "AUTONOMOUS ≤ 20 cm SPIN BYPASS",
    pickPrecision: "≤ 5.0 cm Creep + 30° Servo Lock",
    cost: "$24",
    autonomy: "FULL 5-STATE DFA",
    win: true,
  },
];

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<"sketch" | "pinout" | "webapp">("sketch");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(QUICKSTART_TABS[activeTab].code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const handleDownloadIno = () => {
    const blob = new Blob([FULL_ARDUINO_SKETCH], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "KinetiX_Autonomous_Pick_Place.ino";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <Navbar />

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-3 sm:px-6 lg:px-8">
        {/* ================= HERO GRID ================= */}
        <section className="grid grid-cols-1 lg:grid-cols-12 border-x border-b border-[#222220]">
          {/* Left 7 Cols */}
          <div className="lg:col-span-7 p-5 sm:p-8 lg:p-12 border-b lg:border-b-0 lg:border-r border-[#222220] flex flex-col justify-between min-w-0">
            <div>
              <div className="inline-flex items-center gap-2 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.14em] sm:tracking-[0.18em] text-[#ffb300] mb-4 sm:mb-6">
                <span className="w-2 h-2 shrink-0 bg-[#ffb300] inline-block" />
                <span>ATMEGA328P // 40KHZ HC-SR04 SONAR // L298N H-BRIDGE // SG90 PWM</span>
              </div>

              <h1 className="font-display font-black uppercase text-[clamp(42px,9.5vw,98px)] leading-[0.9] tracking-tight text-[#f2efe9] mb-5 sm:mb-6 break-words">
                FIXED-PATH
                <br />
                ROBOTS FAIL ON
                <br />
                <span className="text-[#ffb300]">FIRST CONTACT.</span>
              </h1>

              <p className="text-sm sm:text-base lg:text-lg text-[#88857e] max-w-xl leading-relaxed mb-6 sm:mb-8">
                Pre-programmed line followers and open-loop timers break the moment an unexpected
                crate blocks the corridor.{" "}
                <strong className="text-[#f2efe9] font-semibold">KinetiX</strong> is an autonomous
                mobile pick-and-place platform and real-time{" "}
                <strong className="text-[#f2efe9] font-semibold">3D WebGL Digital Twin</strong>{" "}
                driven by a deterministic{" "}
                <strong className="text-[#f2efe9] font-semibold">5-State Finite State Machine</strong>{" "}
                on an Arduino UNO — combining{" "}
                <code className="text-[#ffb300]">40 kHz</code> ultrasonic time-of-flight ranging (
                <code className="text-[#00e676]">d = t / 58 cm</code>),{" "}
                <strong className="text-[#f2efe9] font-semibold">L298N dual H-Bridge</strong>{" "}
                differential steering, and{" "}
                <strong className="text-[#f2efe9] font-semibold">50 Hz closed-loop SG90</strong>{" "}
                servo manipulation.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 pt-2">
              <Link href="/playground" className="brutal-btn brutal-btn-primary w-full sm:w-auto">
                LAUNCH 3D PLAYGROUND →
              </Link>
              <Link href="/hardware" className="brutal-btn w-full sm:w-auto">
                HARDWARE &amp; PINOUT →
              </Link>
              <Link href="/how-it-works" className="brutal-btn w-full sm:w-auto">
                KINEMATICS &amp; MATH →
              </Link>
            </div>
          </div>

          {/* Right 5 Cols: Raw Hardware Telemetry Snapshot */}
          <div className="lg:col-span-5 bg-[#0b0b0b] flex flex-col justify-between min-w-0">
            <div className="panel-header">
              <span>MECHATRONIC_BUS // REALTIME SUBSYSTEM STATUS</span>
              <span className="text-[#00e676] font-bold">● FSM: 25Hz LOOP</span>
            </div>

            <div className="p-4 sm:p-6 space-y-4 font-mono text-xs">
              <div className="space-y-2.5">
                {[
                  {
                    id: "SYS_01 // HC-SR04_SONAR",
                    spec: "D10 Trig · D11 Echo",
                    val: 94,
                    metric: "40 kHz · 15° Cone",
                    state: "RANGING",
                    bar: "bg-[#ffb300]",
                  },
                  {
                    id: "SYS_02 // L298N_HBRIDGE",
                    spec: "ENA D5~ · ENB D6~",
                    val: 78,
                    metric: "2A/Ch · S1+S4 Closed",
                    state: "DIFF_DRIVE",
                    bar: "bg-[#00e676]",
                  },
                  {
                    id: "SYS_03 // SG90_GRIPPER",
                    spec: "Pin D9~ · 50Hz PWM",
                    val: 88,
                    metric: "90° (1.5ms) ↔ 30° (1.17ms)",
                    state: "CLOSED_LOOP",
                    bar: "bg-[#00e5ff]",
                  },
                  {
                    id: "SYS_04 // ATMEGA328P_MCU",
                    spec: "16 MHz · 5V Logic",
                    val: 100,
                    metric: "SEARCH→PICK→CARRY→PLACE",
                    state: "AUTONOMOUS",
                    bar: "bg-[#00e676]",
                  },
                ].map((s) => (
                  <div key={s.id} className="border border-[#222220] bg-[#111111] p-2.5 sm:p-3">
                    <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                      <div className="truncate">
                        <span className="text-[#f2efe9] font-bold">{s.id}</span>
                        <span className="text-[#88857e] ml-1.5 text-[11px]">[{s.spec}]</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 border border-[#00e676] text-[#00e676] shrink-0">
                        {s.state}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#88857e] mb-1.5">
                      <span>{s.metric}</span>
                      <span className="text-[#f2efe9] font-bold">BUS: {s.val}%</span>
                    </div>
                    <div className="w-full h-2 bg-[#1c1c1a]">
                      <div className={`h-full ${s.bar}`} style={{ width: `${s.val}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="border border-[#222220] bg-[#080808] p-3 sm:p-3.5 space-y-1">
                <div className="text-[10px] text-[#ffb300] uppercase tracking-wider">
                  GOVERNING TIME-OF-FLIGHT EQUATION [40 kHz · v = 343 m/s]
                </div>
                <div className="text-[#00e676] text-[11px] sm:text-xs overflow-x-auto custom-scrollbar whitespace-nowrap pb-1">
                  d(cm) = (t_echo × 0.0343 cm/µs) / 2 = t_echo(µs) ÷ 58
                </div>
              </div>
            </div>

            <div className="border-t border-[#222220] px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] sm:text-[11px] text-[#88857e]">
              <span>AVOID THRESHOLD: d ≤ 20.0 cm (1160 µs)</span>
              <Link href="/playground" className="text-[#ffb300] hover:underline font-bold">
                DRAG 3D OBSTACLES LIVE →
              </Link>
            </div>
          </div>
        </section>

        {/* ================= 4-KPI METRICS STRIP ================= */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-x border-b border-[#222220] bg-[#0b0b0b]">
          {[
            {
              num: "40 kHz",
              label: "ULTRASONIC SONAR BURST",
              sub: "8 pulses · 15° cone · 2–400 cm range",
            },
            {
              num: "d = t / 58",
              label: "TIME-OF-FLIGHT PRECISION",
              sub: "1160 µs echo = 20.0 cm stop threshold",
            },
            {
              num: "1:48 GEAR",
              label: "DIFFERENTIAL TORQUE DRIVE",
              sub: "L298N dual H-Bridge · 2A/ch continuous",
            },
            {
              num: "50 Hz PWM",
              label: "CLOSED-LOOP SERVO GRIP",
              sub: "1.50ms (90° Open) ↔ 1.17ms (30° Clamp)",
            },
          ].map((m, idx) => (
            <div
              key={m.label}
              className={`p-5 sm:p-6 border-[#222220] ${
                idx < 3 ? "border-b lg:border-b-0 lg:border-r" : ""
              } ${idx % 2 === 0 ? "sm:border-r" : ""} ${
                idx >= 2 ? "sm:border-b-0" : "sm:border-b"
              }`}
            >
              <div className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-[#ffb300] tracking-tight">
                {m.num}
              </div>
              <div className="font-mono text-xs font-bold text-[#f2efe9] mt-2 tracking-wider">
                {m.label}
              </div>
              <div className="font-mono text-[11px] text-[#88857e] mt-1">{m.sub}</div>
            </div>
          ))}
        </section>

        {/* ================= 5-STATE DETERMINISTIC FINITE AUTOMATON ================= */}
        <section className="border-x border-b border-[#222220] bg-[#0e0e0e]">
          <div className="panel-header">
            <span>AUTONOMOUS CONTROL LOOP // 5-STATE DETERMINISTIC FINITE AUTOMATON</span>
            <span className="text-[#ffb300]">SENSE → THINK → POWER STAGE → ACT</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 border-t border-[#222220]">
            {FSM_STAGES.map((st, idx) => (
              <div
                key={st.id}
                className={`p-4 sm:p-5 border-b border-r border-[#222220] flex flex-col justify-between space-y-3 ${
                  idx === 4 ? "sm:col-span-2 lg:col-span-1" : ""
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <span className="px-2 py-0.5 bg-[#ffb300] text-[#080808] font-bold">
                      {st.code}
                    </span>
                    <span className="text-[#00e676]">{st.condition}</span>
                  </div>
                  <h3 className="font-display font-black text-xl uppercase text-[#f2efe9]">
                    {st.id} // {st.label}
                  </h3>
                  <p className="text-xs text-[#88857e] leading-relaxed">{st.action}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ================= 12-STEP EXECUTION MATRIX ================= */}
        <section className="border-x border-b border-[#222220] bg-[#080808]">
          <div className="panel-header">
            <span>MISSION EXECUTION PIPELINE // 12-STEP AUTONOMOUS CYCLE</span>
            <span>PHASE 1: SEARCH &amp; PICK [01–06] · PHASE 2: CARRY &amp; PLACE [07–12]</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 border-t border-[#222220]">
            {TWELVE_STEPS.map((s) => (
              <div
                key={s.step}
                className="p-4 sm:p-5 border-b border-r border-[#222220] bg-[#0e0e0e] hover:bg-[#141414] transition flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <span className="text-[#ffb300] font-bold">
                      STEP {String(s.step).padStart(2, "0")} // PHASE {s.phase}
                    </span>
                    <span className="px-1.5 py-0.5 border border-[#3a3834] text-[#f2efe9]">
                      {s.state}
                    </span>
                  </div>
                  <h4 className="font-mono text-xs sm:text-sm font-bold text-[#f2efe9]">
                    {s.title}
                  </h4>
                  <p className="text-xs text-[#88857e] leading-relaxed">{s.desc}</p>
                </div>
                <div className="pt-2 border-t border-[#222220] font-mono text-[10px] text-[#00e676]">
                  HW: {s.hw}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ================= 6 HARDWARE SUBSYSTEMS SUMMARY + QUICKSTART ================= */}
        <section className="grid grid-cols-1 lg:grid-cols-12 border-x border-b border-[#222220]">
          {/* Left 6 Cols: Hardware Stack */}
          <div className="lg:col-span-6 border-b lg:border-b-0 lg:border-r border-[#222220] bg-[#0e0e0e] flex flex-col justify-between">
            <div className="panel-header">
              <span>MECHATRONIC BILL OF MATERIALS // CORE SUBSYSTEMS</span>
              <Link href="/hardware" className="text-[#ffb300] hover:underline">
                FULL SCHEMATIC →
              </Link>
            </div>
            <div className="divide-y divide-[#222220]">
              {HARDWARE_MODULES.map((hw) => (
                <div key={hw.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="text-[#ffb300] font-bold">[{hw.code}]</span>
                      <span className="text-[#f2efe9] font-bold">{hw.name}</span>
                    </div>
                    <p className="text-xs text-[#88857e] line-clamp-2">{hw.role}</p>
                  </div>
                  <span className="font-mono text-[10px] px-2 py-1 bg-[#151515] border border-[#222220] text-[#88857e] shrink-0 self-start sm:self-center">
                    {hw.busTag}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right 6 Cols: Quickstart & Arduino Firmware Downloader */}
          <div className="lg:col-span-6 bg-[#0b0b0b] flex flex-col justify-between min-w-0">
            <div>
              <div className="panel-header">
                <span>FIRMWARE &amp; QUICKSTART // ARDUINO IDE / CLI</span>
                <div className="flex items-center gap-1">
                  {(Object.keys(QUICKSTART_TABS) as Array<keyof typeof QUICKSTART_TABS>).map(
                    (key) => (
                      <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={`px-2 py-0.5 font-mono text-[10px] border transition ${
                          activeTab === key
                            ? "bg-[#ffb300] text-[#080808] border-[#ffb300] font-bold"
                            : "bg-[#111111] text-[#88857e] border-[#222220] hover:text-[#f2efe9]"
                        }`}
                      >
                        {QUICKSTART_TABS[key].label}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="p-4 sm:p-6">
                <div className="border border-[#222220] bg-[#080808] p-4 font-mono text-xs text-[#f2efe9] overflow-x-auto custom-scrollbar">
                  <pre className="leading-relaxed">{QUICKSTART_TABS[activeTab].code}</pre>
                </div>
              </div>
            </div>

            <div className="px-4 sm:px-6 pb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={handleCopy} className="brutal-btn !py-2 !px-3.5 !text-xs">
                  {copied ? "COPIED TO CLIPBOARD ✓" : "COPY SNIPPET"}
                </button>
                <button
                  onClick={handleDownloadIno}
                  className="brutal-btn brutal-btn-primary !py-2 !px-4 !text-xs"
                >
                  DOWNLOAD FULL .INO SKETCH ↓
                </button>
              </div>
              <Link
                href="/playground"
                className="font-mono text-xs text-[#ffb300] hover:underline font-bold"
              >
                TEST IN 3D STAGE →
              </Link>
            </div>
          </div>
        </section>

        {/* ================= ARCHITECTURE COMPARISON TABLE ================= */}
        <section className="border-x border-b border-[#222220] bg-[#0e0e0e]">
          <div className="panel-header">
            <span>COMPARATIVE EVALUATION // MOBILE PICK-AND-PLACE ARCHITECTURES</span>
            <span>DETERMINISTIC CONTROL BENCHMARK</span>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b border-[#222220] bg-[#0b0b0b] text-[#88857e] text-[11px]">
                  <th className="p-3.5 sm:p-4">ARCHITECTURE</th>
                  <th className="p-3.5 sm:p-4">SENSING MODALITY</th>
                  <th className="p-3.5 sm:p-4">DYNAMIC OBSTACLE RESPONSE</th>
                  <th className="p-3.5 sm:p-4">PICK PRECISION</th>
                  <th className="p-3.5 sm:p-4">BOM COST</th>
                  <th className="p-3.5 sm:p-4">AUTONOMY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222220]">
                {BENCHMARK_ROWS.map((r) => (
                  <tr
                    key={r.arch}
                    className={
                      r.win
                        ? "bg-[#ffb300]/10 text-[#f2efe9] font-bold"
                        : "text-[#88857e] hover:bg-[#121212]"
                    }
                  >
                    <td className="p-3.5 sm:p-4 whitespace-nowrap">
                      {r.win && <span className="text-[#ffb300] mr-1.5">★</span>}
                      <span className={r.win ? "text-[#ffb300]" : "text-[#f2efe9]"}>{r.arch}</span>
                    </td>
                    <td className="p-3.5 sm:p-4 whitespace-nowrap">{r.sensing}</td>
                    <td className="p-3.5 sm:p-4 whitespace-nowrap">{r.obstacleHandling}</td>
                    <td className="p-3.5 sm:p-4 whitespace-nowrap">{r.pickPrecision}</td>
                    <td className="p-3.5 sm:p-4 whitespace-nowrap">{r.cost}</td>
                    <td className="p-3.5 sm:p-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 border text-[10px] ${
                          r.win
                            ? "border-[#00e676] text-[#00e676] bg-[#00e676]/10"
                            : "border-[#3a3834] text-[#88857e]"
                        }`}
                      >
                        {r.autonomy}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
