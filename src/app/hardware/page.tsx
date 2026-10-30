"use client";

import React, { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { FULL_ARDUINO_SKETCH, HARDWARE_MODULES } from "@/lib/kinetix-data";

type FaultType = "none" | "no_gnd" | "swap_in1_in2" | "brownout" | "direct_gpio";

const WIRING_FAULTS: Record<
  FaultType,
  {
    code: string;
    label: string;
    slide: string;
    status: string;
    diagnosis: string;
    electricalEffect: string;
  }
> = {
  none: {
    code: "NOMINAL",
    label: "ALL WIRES NOMINAL (SLIDE 18)",
    slide: "Slide 18",
    status: "PASS // BUS HEALTHY",
    diagnosis:
      "All 9 modules share a unified 0V Common Ground reference. L298N receives 7.4V from the 2x18650 pack (delivering ~5.4V to motors after the 2V BJT drop), while Arduino GPIO pins source <5mA logic signals.",
    electricalEffect: "Vin = 7.4V | V_logic = 5.0V | I_gpio = 4.2mA (<20mA limit)",
  },
  no_gnd: {
    code: "FAULT_01",
    label: "DISCONNECT COMMON GND",
    slide: "Slide 18",
    status: "CRITICAL // FLOATING REFERENCE",
    diagnosis:
      "Arduino GND and L298N Battery (–) are isolated. Because digital HIGH (5V) is measured relative to 0V GND, the L298N input gates see floating random potentials and trigger erratic, uncontrollable motor switching.",
    electricalEffect: "V_ref(UNO) ≠ V_ref(L298N) → IN1..IN4 Float Indeterminately",
  },
  swap_in1_in2: {
    code: "FAULT_02",
    label: "SWAP IN1 ↔ IN2 POLARITY",
    slide: "Slides 10 & 11",
    status: "ERROR // H-BRIDGE REVERSED",
    diagnosis:
      "Pin D7 and D8 are crossed on Channel A. When forward() sets D7=HIGH and D8=LOW, the L298N closes S3+S2 instead of S1+S4, spinning the left wheels in reverse while right wheels drive forward — locking the rover in a continuous left spin.",
    electricalEffect: "Channel A: S3+S2 Closed (Reverse) | Channel B: S1+S4 Closed (Forward)",
  },
  brownout: {
    code: "FAULT_03",
    label: "BATTERY SAG (4.8V < 7.0V)",
    slide: "Slides 11 & 16",
    status: "BROWNOUT // MCU RESET LOOP",
    diagnosis:
      "The L298N drops ~2.0V internally across its bipolar transistors and its 78M05 5V regulator requires Vin > 7.0V. At 4.8V input, motors receive only ~2.8V (stalling under load) and motor start-up current dips Vcc below the ATmega328P brownout threshold, resetting the Arduino.",
    electricalEffect: "V_motor = 4.8V - 2.0V = 2.8V (Stall) | 5V Rail Collapses → MCU Reset",
  },
  direct_gpio: {
    code: "FAULT_04",
    label: "BYPASS L298N (DIRECT GPIO)",
    slide: "Slides 7 & 10",
    status: "DAMAGE // PIN D7 OVERCURRENT",
    diagnosis:
      "Connecting a 1:48 DC gearmotor directly to Arduino Pin D7 draws 150–500 mA (and >1A at stall) from a pin rated for 20 mA absolute continuous output, burning out the ATmega328P output transistor and injecting inductive back-EMF spikes into the 5V rail.",
    electricalEffect: "I_load = 480 mA >> 20 mA Max Rating → ATmega328P I/O Pin Thermal Failure",
  },
};

export default function HardwarePage() {
  const [selectedId, setSelectedId] = useState("arduino");
  const [activeFault, setActiveFault] = useState<FaultType>("none");
  const [copied, setCopied] = useState(false);

  const activeModule =
    HARDWARE_MODULES.find((m) => m.id === selectedId) || HARDWARE_MODULES[0];
  const faultInfo = WIRING_FAULTS[activeFault];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(FULL_ARDUINO_SKETCH);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
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

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-3 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-6 sm:space-y-8">
        {/* Page Header */}
        <div className="border border-[#222220] bg-[#0e0e0e] p-5 sm:p-8 lg:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="font-mono text-[11px] sm:text-xs text-[#ffb300] uppercase tracking-widest mb-2">
              // MECHATRONIC ARCHITECTURE &amp; PINOUT TOPOLOGY (SLIDES 05–18)
            </div>
            <h1 className="font-display font-black text-3xl sm:text-5xl lg:text-6xl uppercase text-[#f2efe9]">
              HARDWARE &amp; WIRING SPECIFICATION
            </h1>
            <p className="text-xs sm:text-base text-[#88857e] mt-3 max-w-3xl leading-relaxed">
              Complete electrical ratings, pin-level signal mapping, interactive wiring fault
              validator, and unified Common Ground bus topology for the KinetiX mobile
              pick-and-place platform.
            </p>
          </div>
          <Link href="/playground" className="brutal-btn brutal-btn-primary shrink-0">
            INSPECT IN 3D X-RAY →
          </Link>
        </div>

        {/* ================= 1. INTERACTIVE 6-MODULE DATASHEET INSPECTOR ================= */}
        <section className="grid grid-cols-1 lg:grid-cols-12 border border-[#222220] bg-[#0e0e0e]">
          {/* Left 4 Cols: Module Selector List */}
          <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-[#222220] divide-y divide-[#222220]">
            <div className="panel-header">
              <span>SUBSYSTEM SELECTOR [01–06]</span>
              <span>SLIDES 6–16</span>
            </div>
            {HARDWARE_MODULES.map((m) => {
              const active = m.id === selectedId;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedId(m.id)}
                  className={`w-full p-4 text-left transition flex items-center justify-between cursor-pointer ${
                    active
                      ? "bg-[#ffb300] text-[#080808]"
                      : "bg-[#0e0e0e] text-[#f2efe9] hover:bg-[#141413]"
                  }`}
                >
                  <div>
                    <div
                      className={`font-mono text-[10px] ${
                        active ? "text-[#080808] font-bold" : "text-[#ffb300]"
                      }`}
                    >
                      [{m.code}] // {m.category}
                    </div>
                    <div className="font-display font-black text-lg uppercase mt-0.5">
                      {m.name}
                    </div>
                  </div>
                  <span
                    className={`font-mono text-[10px] px-2 py-0.5 border ${
                      active
                        ? "border-[#080808] text-[#080808] font-bold"
                        : "border-[#3a3834] text-[#88857e]"
                    }`}
                  >
                    {m.slideRef}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right 8 Cols: Selected Module Deep-Dive */}
          <div className="lg:col-span-8 bg-[#0b0b0b] flex flex-col justify-between">
            <div>
              <div className="panel-header">
                <span>DATASHEET // {activeModule.name}</span>
                <span className="text-[#00e676] font-bold">{activeModule.slideRef}</span>
              </div>

              <div className="p-5 sm:p-8 space-y-6">
                <div>
                  <div className="font-mono text-xs text-[#ffb300] uppercase font-bold mb-1">
                    [{activeModule.code}] {activeModule.category}
                  </div>
                  <h2 className="font-display font-black text-3xl sm:text-4xl uppercase text-[#f2efe9]">
                    {activeModule.name}
                  </h2>
                  <p className="text-sm sm:text-base text-[#88857e] mt-2 leading-relaxed">
                    {activeModule.role}
                  </p>
                </div>

                <div className="border border-[#ffb300]/40 bg-[#ffb300]/10 p-4 font-mono text-xs text-[#f2efe9] leading-relaxed">
                  <span className="text-[#ffb300] font-bold uppercase mr-2">
                    [ENGINEERING CONSTRAINT]:
                  </span>
                  {activeModule.engineeringNote}
                </div>

                <div>
                  <div className="font-mono text-xs text-[#88857e] uppercase tracking-wider mb-3">
                    ELECTRICAL &amp; MECHANICAL PARAMETERS
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-mono">
                    {activeModule.specs.map((s) => (
                      <div key={s.label} className="border border-[#222220] bg-[#111111] p-3">
                        <div className="text-[10px] text-[#88857e] uppercase">{s.label}</div>
                        <div className="text-xs sm:text-sm text-[#f2efe9] font-bold mt-1">
                          {s.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="font-mono text-xs text-[#00e676] uppercase tracking-wider mb-2.5">
                    ACTIVE SIGNAL &amp; POWER TERMINALS (SLIDE 18)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-xs">
                    {activeModule.pinsUsed.map((pin) => (
                      <div
                        key={pin}
                        className="border border-[#222220] bg-[#080808] px-3 py-2 text-[#f2efe9]"
                      >
                        <span className="text-[#ffb300] mr-2">▸</span>
                        {pin}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-[#222220] px-5 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-[#88857e]">
              <span>COMMON GROUND REFERENCE: MANDATORY (0V BUS)</span>
              <Link href="/playground" className="text-[#ffb300] hover:underline font-bold">
                VIEW IN 3D EXPLODED MODE →
              </Link>
            </div>
          </div>
        </section>

        {/* ================= 2. INTERACTIVE WIRING VALIDATOR & FAULT INJECTION LAB (UPGRADE #4) ================= */}
        <section className="panel-frame">
          <div className="panel-header">
            <span>
              INTERACTIVE WIRING SCHEMATIC &amp; FAULT SIMULATOR (SLIDES 10, 16, 17, 18)
            </span>
            <span
              className={
                activeFault === "none"
                  ? "text-[#00e676] font-bold"
                  : "text-[#ff2a2a] font-bold"
              }
            >
              ● {faultInfo.status}
            </span>
          </div>

          {/* Fault Selector Strip */}
          <div className="p-3.5 border-b border-[#222220] bg-[#111111] flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
            <span className="text-[#88857e] text-[11px]">
              INJECT WIRING FAULT FOR VIVA DEMO:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {(Object.keys(WIRING_FAULTS) as FaultType[]).map((fKey) => {
                const f = WIRING_FAULTS[fKey];
                const isSel = activeFault === fKey;
                return (
                  <button
                    key={fKey}
                    onClick={() => setActiveFault(fKey)}
                    className={`px-2.5 py-1.5 border text-[10px] cursor-pointer transition ${
                      isSel
                        ? fKey === "none"
                          ? "bg-[#00e676] text-[#080808] border-[#00e676] font-bold"
                          : "bg-[#ff2a2a] text-[#f2efe9] border-[#ff2a2a] font-bold"
                        : "bg-[#080808] text-[#88857e] border-[#222220] hover:text-[#f2efe9]"
                    }`}
                  >
                    [{f.code}] {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Fault Diagnosis Box */}
          <div
            className={`px-5 py-3.5 border-b border-[#222220] font-mono text-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
              activeFault === "none" ? "bg-[#0b120e]" : "bg-[#1f0909]"
            }`}
          >
            <div className="space-y-1 max-w-4xl">
              <div className="flex items-center gap-2">
                <span
                  className={`font-bold ${
                    activeFault === "none" ? "text-[#00e676]" : "text-[#ff2a2a]"
                  }`}
                >
                  [{faultInfo.code} // {faultInfo.slide}]:
                </span>
                <span className="text-[#f2efe9] font-bold">{faultInfo.label}</span>
              </div>
              <p className="text-[#88857e] font-sans text-xs leading-relaxed">
                {faultInfo.diagnosis}
              </p>
            </div>
            <div className="px-3 py-2 bg-[#080808] border border-[#222220] text-[#ffb300] text-[11px] shrink-0">
              {faultInfo.electricalEffect}
            </div>
          </div>

          {/* Interactive SVG Schematic */}
          <div className="p-4 sm:p-6 bg-[#080808] overflow-x-auto custom-scrollbar">
            <svg viewBox="0 0 920 330" className="w-full min-w-[760px] h-auto font-mono">
              {/* Unified Common Ground Bar */}
              <rect
                x="20"
                y="286"
                width="880"
                height="30"
                fill="#111111"
                stroke={activeFault === "no_gnd" ? "#ff2a2a" : "#00e676"}
                strokeWidth="2"
                strokeDasharray={activeFault === "no_gnd" ? "8,6" : "none"}
              />
              <text
                x="460"
                y="305"
                textAnchor="middle"
                fill={activeFault === "no_gnd" ? "#ff2a2a" : "#00e676"}
                fontSize="11"
                fontWeight="bold"
              >
                {activeFault === "no_gnd"
                  ? "✖ COMMON GROUND DISCONNECTED — FLOATING LOGIC REFERENCE FAULT (SLIDE 18)"
                  : "UNIFIED COMMON GROUND BUS (0V REFERENCE) — Battery (–) · Arduino GND · L298N GND · HC-SR04 GND · SG90 Brown"}
              </text>

              {/* HC-SR04 */}
              <rect
                x="25"
                y="25"
                width="195"
                height="135"
                fill="#111111"
                stroke="#ffb300"
                strokeWidth="2"
              />
              <text x="122" y="48" textAnchor="middle" fill="#ffb300" fontSize="13" fontWeight="bold">
                HC-SR04 SONAR
              </text>
              <text x="122" y="65" textAnchor="middle" fill="#88857e" fontSize="10">
                40 kHz · 15° Cone · 2–400cm
              </text>
              <text x="40" y="90" fill="#f2efe9" fontSize="10">VCC  → Arduino 5V</text>
              <text x="40" y="108" fill="#ffb300" fontSize="10">Trig → Pin D10 (10µs)</text>
              <text x="40" y="126" fill="#00e676" fontSize="10">Echo → Pin D11 (t µs)</text>
              <text x="40" y="144" fill="#88857e" fontSize="10">GND  → Common GND</text>

              <line x1="220" y1="104" x2="335" y2="104" stroke="#ffb300" strokeWidth="2.5" />
              <line x1="220" y1="122" x2="335" y2="122" stroke="#00e676" strokeWidth="2.5" />
              <line x1="122" y1="160" x2="122" y2="286" stroke="#88857e" strokeWidth="2" />

              {/* SG90 SERVO */}
              <rect
                x="25"
                y="180"
                width="195"
                height="86"
                fill="#111111"
                stroke="#00e5ff"
                strokeWidth="2"
              />
              <text x="122" y="202" textAnchor="middle" fill="#00e5ff" fontSize="12" fontWeight="bold">
                SG90 SERVO GRIPPER
              </text>
              <text x="40" y="222" fill="#00e5ff" fontSize="10">Orange (Sig) → Pin D9~</text>
              <text x="40" y="238" fill="#f2efe9" fontSize="10">Red (+VCC)   → 5V Rail</text>
              <text x="40" y="254" fill="#88857e" fontSize="10">Brown (GND)  → Common GND</text>

              <path d="M 335 150 L 275 150 L 275 218 L 220 218" fill="none" stroke="#00e5ff" strokeWidth="2.5" />
              <line x1="122" y1="266" x2="122" y2="286" stroke="#88857e" strokeWidth="2" />

              {/* ARDUINO UNO */}
              <rect
                x="335"
                y="25"
                width="245"
                height="241"
                fill="#151515"
                stroke={
                  activeFault === "direct_gpio" || activeFault === "brownout"
                    ? "#ff2a2a"
                    : "#f2efe9"
                }
                strokeWidth="2.5"
              />
              <text x="457" y="50" textAnchor="middle" fill="#f2efe9" fontSize="14" fontWeight="bold">
                ARDUINO UNO R3
              </text>
              <text x="457" y="68" textAnchor="middle" fill="#ffb300" fontSize="10">
                {activeFault === "brownout"
                  ? "BROWNOUT RESET LOOP (<5V)"
                  : activeFault === "direct_gpio"
                  ? "OVERCURRENT FAULT (480mA > 20mA)"
                  : "ATmega328P · 16 MHz · 5V Logic"}
              </text>
              <text x="352" y="104" fill="#ffb300" fontSize="10">D10 (OUT) : Sonar Trig</text>
              <text x="352" y="122" fill="#00e676" fontSize="10">D11 (IN)  : Sonar Echo</text>
              <text x="352" y="150" fill="#00e5ff" fontSize="10">D9  (PWM) : Servo 50Hz</text>
              <text x="352" y="182" fill="#ff2a2a" fontSize="10">D5 (PWM)  : L298N ENA</text>
              <text x="352" y="200" fill="#ff2a2a" fontSize="10">
                {activeFault === "swap_in1_in2"
                  ? "D7 / D8   : SWAPPED (IN2/IN1)!"
                  : "D7 / D8   : L298N IN1/IN2"}
              </text>
              <text x="352" y="220" fill="#ff2a2a" fontSize="10">D6 (PWM)  : L298N ENB</text>
              <text x="352" y="238" fill="#ff2a2a" fontSize="10">D4 / D2   : L298N IN3/IN4</text>

              <line
                x1="457"
                y1="266"
                x2="457"
                y2="286"
                stroke={activeFault === "no_gnd" ? "#ff2a2a" : "#00e676"}
                strokeWidth="2.5"
                strokeDasharray={activeFault === "no_gnd" ? "4,4" : "none"}
              />

              {/* L298N DRIVER */}
              <rect
                x="670"
                y="25"
                width="225"
                height="145"
                fill="#111111"
                stroke="#ff2a2a"
                strokeWidth="2"
                opacity={activeFault === "direct_gpio" ? 0.3 : 1}
              />
              <text x="782" y="48" textAnchor="middle" fill="#ff2a2a" fontSize="13" fontWeight="bold">
                {activeFault === "direct_gpio" ? "BYPASSED (NO DRIVER!)" : "L298N DUAL H-BRIDGE"}
              </text>
              <text x="685" y="72" fill="#f2efe9" fontSize="10">ENA(D5) IN1(D7) IN2(D8)</text>
              <text x="685" y="90" fill="#f2efe9" fontSize="10">ENB(D6) IN3(D4) IN4(D2)</text>
              <text x="685" y="114" fill="#ffb300" fontSize="10">OUT1/OUT2 → Left Motors</text>
              <text x="685" y="132" fill="#ffb300" fontSize="10">OUT3/OUT4 → Right Motors</text>
              <text x="685" y="152" fill="#00e676" fontSize="10">12V In · 5V Reg Out · GND</text>

              <line
                x1="580"
                y1="185"
                x2="670"
                y2={activeFault === "swap_in1_in2" ? "95" : "75"}
                stroke="#ff2a2a"
                strokeWidth="2.5"
              />
              <line
                x1="580"
                y1="220"
                x2="670"
                y2={activeFault === "swap_in1_in2" ? "75" : "95"}
                stroke="#ff2a2a"
                strokeWidth="2.5"
              />
              <line x1="782" y1="170" x2="782" y2="286" stroke="#88857e" strokeWidth="2" />

              {/* Direct GPIO Fault Wire */}
              {activeFault === "direct_gpio" && (
                <path
                  d="M 580 200 L 625 200 L 625 225 L 670 225"
                  fill="none"
                  stroke="#ff2a2a"
                  strokeWidth="3.5"
                  strokeDasharray="6,3"
                />
              )}

              {/* MOTORS & BATTERY */}
              <rect
                x="670"
                y="188"
                width="225"
                height="78"
                fill="#111111"
                stroke={activeFault === "brownout" ? "#ff2a2a" : "#00e676"}
                strokeWidth="2"
              />
              <text x="782" y="210" textAnchor="middle" fill="#00e676" fontSize="12" fontWeight="bold">
                1:48 MOTORS + 7.4V PACK
              </text>
              <text x="685" y="230" fill="#f2efe9" fontSize="10">4x Geared DC Motors (65mm)</text>
              <text
                x="685"
                y="248"
                fill={activeFault === "brownout" ? "#ff2a2a" : "#ffb300"}
                fontSize="10"
              >
                {activeFault === "brownout"
                  ? "SAG FAULT: 4.8V (<7.0V MIN!)"
                  : "2x18650 Li-Ion → L298N 12V"}
              </text>
            </svg>
          </div>
        </section>

        {/* ================= 3. PRODUCTION ARDUINO .INO FIRMWARE ================= */}
        <section className="panel-frame">
          <div className="panel-header">
            <span>PRODUCTION FIRMWARE // KinetiX_Autonomous_Pick_Place.ino (SLIDE 24)</span>
            <div className="flex items-center gap-2">
              <button onClick={handleCopyCode} className="brutal-btn !py-1 !px-3 !text-[10px]">
                {copied ? "COPIED ✓" : "COPY SKETCH"}
              </button>
              <button
                onClick={handleDownloadIno}
                className="brutal-btn brutal-btn-primary !py-1 !px-3 !text-[10px]"
              >
                DOWNLOAD .INO ↓
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-6 bg-[#080808] font-mono text-xs text-[#f2efe9] overflow-x-auto custom-scrollbar max-h-[520px]">
            <pre className="leading-relaxed select-text">{FULL_ARDUINO_SKETCH}</pre>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
