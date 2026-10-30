"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import KinetiXStage3D, { StageTelemetry } from "@/components/kinetix-stage-3d";
import {
  ArenaObstacle,
  FSM_STAGES,
  HARDWARE_MODULES,
  PRESET_SCENARIOS,
  STATE_MACHINE_CODE,
  TWELVE_STEPS,
} from "@/lib/kinetix-data";

export default function PlaygroundPage() {
  const [isRunning, setIsRunning] = useState(true);
  const [simSpeed, setSimSpeed] = useState(1);
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [resetId, setResetId] = useState(1);

  const [obstacleThresholdCm, setObstacleThresholdCm] = useState(20);
  const [pickDistCm] = useState(5);
  const [motorPwm, setMotorPwm] = useState(170);

  const [scenarioId, setScenarioId] = useState("standard");
  const [obstacles, setObstacles] = useState<ArenaObstacle[]>(
    PRESET_SCENARIOS[0].obstacles
  );
  const [cylinderPos, setCylinderPos] = useState(PRESET_SCENARIOS[0].cylinderPos);
  const [targetPos, setTargetPos] = useState(PRESET_SCENARIOS[0].targetPos);

  const [cameraMode, setCameraMode] = useState<
    "orbit" | "chase" | "pov" | "top" | "xray"
  >("orbit");
  const [selectedPart, setSelectedPart] = useState("arduino");

  const [yoloEnabled, setYoloEnabled] = useState(false);
  const [slamEnabled, setSlamEnabled] = useState(false);

  const [manualKeys, setManualKeys] = useState({
    w: false,
    a: false,
    s: false,
    d: false,
    gripClosed: false,
  });

  const [telemetry, setTelemetry] = useState<StageTelemetry>({
    x: -6.4,
    z: 0,
    headingDeg: 0,
    state: "SEARCH",
    subStageText: "SCANNING CORRIDOR // DRIVING TO PICK ZONE",
    stepNum: 2,
    activeCodeLine: 3,
    distanceCm: 32.0,
    echoUs: 1856,
    gripAngle: 90,
    servoPulseMs: 1.5,
    hasCylinder: false,
    leftPwm: 170,
    rightPwm: 170,
    in1: 1,
    in2: 0,
    in3: 1,
    in4: 0,
  });

  const scopeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleTelemetryUpdate = useCallback((t: StageTelemetry) => {
    setTelemetry(t);
  }, []);

  // Draw HC-SR04 Time-of-Flight Oscilloscope Waveform
  useEffect(() => {
    const canvas = scopeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = "#1c1c1a";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 18) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // CH1: TRIG (D10) 10µs HIGH Pulse
    ctx.strokeStyle = "#ffb300";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(6, 26);
    ctx.lineTo(24, 26);
    ctx.lineTo(24, 8);
    ctx.lineTo(40, 8);
    ctx.lineTo(40, 26);
    ctx.lineTo(w - 6, 26);
    ctx.stroke();

    ctx.fillStyle = "#ffb300";
    ctx.font = "10px 'IBM Plex Mono', monospace";
    ctx.fillText("CH1: TRIG (D10) 10µs", 48, 20);

    // CH2: ECHO (D11) Time-of-Flight Pulse
    const echoPx = Math.max(14, Math.min(w - 80, (telemetry.distanceCm / 120) * (w - 80)));
    const isClose = telemetry.distanceCm <= obstacleThresholdCm;
    const echoCol = isClose ? "#ff2a2a" : "#00e676";

    ctx.strokeStyle = echoCol;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(6, 62);
    ctx.lineTo(48, 62);
    ctx.lineTo(48, 40);
    ctx.lineTo(48 + echoPx, 40);
    ctx.lineTo(48 + echoPx, 62);
    ctx.lineTo(w - 6, 62);
    ctx.stroke();

    ctx.fillStyle = isClose ? "rgba(255, 42, 42, 0.2)" : "rgba(0, 230, 118, 0.16)";
    ctx.fillRect(48, 40, echoPx, 22);

    ctx.fillStyle = echoCol;
    ctx.fillText(`CH2: ECHO (D11) t = ${telemetry.echoUs} µs`, 54, 55);
  }, [telemetry.distanceCm, telemetry.echoUs, obstacleThresholdCm]);

  const handleSelectScenario = (id: string) => {
    const found = PRESET_SCENARIOS.find((s) => s.id === id);
    if (!found) return;
    setScenarioId(id);
    setObstacles(found.obstacles.map((o) => ({ ...o })));
    setCylinderPos({ ...found.cylinderPos });
    setTargetPos({ ...found.targetPos });
    setMode("auto");
    setIsRunning(true);
    setResetId((r) => r + 1);
  };

  const handleReset = () => {
    const found =
      PRESET_SCENARIOS.find((s) => s.id === scenarioId) || PRESET_SCENARIOS[0];
    setCylinderPos({ ...found.cylinderPos });
    setIsRunning(true);
    setResetId((r) => r + 1);
  };

  const handleAddObstacle = (type: "crate" | "angled" | "foam") => {
    const id = `obs-${Date.now().toString().slice(-4)}`;
    const rx = Number((Math.random() * 2.8 - 0.2).toFixed(2));
    const rz = Number((Math.random() * 2.2 - 1.1).toFixed(2));
    setObstacles((prev) => [
      ...prev,
      {
        id,
        x: rx,
        z: rz,
        w: type === "angled" ? 1.35 : 1.2,
        d: type === "angled" ? 0.5 : 1.3,
        h: 1.1,
        type,
        label:
          type === "angled"
            ? "45° DEFLECTOR"
            : type === "foam"
            ? "FOAM ABSORBER"
            : `OBSTACLE_0${prev.length + 1}`,
        angle: type === "angled" ? Math.PI / 4 : 0,
      },
    ]);
  };

  // Manual WASD Keyboard Control
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (mode !== "manual") return;
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d"].includes(k)) {
        setManualKeys((p) => ({ ...p, [k]: true }));
      } else if (e.code === "Space") {
        e.preventDefault();
        setManualKeys((p) => ({ ...p, gripClosed: !p.gripClosed }));
      }
    };
    const up = (e: KeyboardEvent) => {
      if (mode !== "manual") return;
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d"].includes(k)) {
        setManualKeys((p) => ({ ...p, [k]: false }));
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [mode]);

  const s1Closed = telemetry.in1 === 1 && telemetry.in2 === 0;
  const s4Closed = telemetry.in1 === 1 && telemetry.in2 === 0;
  const s3Closed = telemetry.in1 === 0 && telemetry.in2 === 1;
  const s2Closed = telemetry.in1 === 0 && telemetry.in2 === 1;

  const activeStepObj =
    TWELVE_STEPS.find((s) => s.step === telemetry.stepNum) || TWELVE_STEPS[0];

  const activePartObj =
    HARDWARE_MODULES.find((m) => m.id === selectedPart) || HARDWARE_MODULES[0];

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <Navbar />

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-5">
        {/* ================= 1. DEDICATED STAGE FSM PIPELINE BAR ================= */}
        <section className="panel-frame">
          <div className="panel-header">
            <span>
              AUTONOMOUS STAGE PIPELINE // 5-STATE DETERMINISTIC FINITE AUTOMATON (SLIDE 24)
            </span>
            <span className="text-[#00e676] font-bold">
              ● ACTIVE STEP {String(activeStepObj.step).padStart(2, "0")}/12 · PHASE{" "}
              {activeStepObj.phase}
            </span>
          </div>

          {/* 5 Stages Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 border-b border-[#222220]">
            {FSM_STAGES.map((st, idx) => {
              const active = telemetry.state === st.id;
              const order = ["SEARCH", "PICK", "CARRY", "PLACE", "DONE"];
              const passed = order.indexOf(telemetry.state) > idx;

              return (
                <div
                  key={st.id}
                  className={`p-3 sm:p-3.5 border-b sm:border-b-0 border-r border-[#222220] last:border-r-0 transition-colors ${
                    active
                      ? "bg-[#ffb300] text-[#080808]"
                      : passed
                      ? "bg-[#111a14] text-[#00e676]"
                      : "bg-[#0e0e0e] text-[#88857e]"
                  }`}
                >
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <span className="font-bold">[{st.code}]</span>
                    <span>{st.condition}</span>
                  </div>
                  <div className="font-display font-black text-base sm:text-lg uppercase mt-0.5 tracking-tight">
                    {st.id}
                  </div>
                  <div
                    className={`font-mono text-[10px] truncate ${
                      active ? "text-[#080808] font-semibold" : "text-[#88857e]"
                    }`}
                  >
                    {st.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live Stage Status Readout */}
          <div className="px-4 py-2.5 bg-[#080808] flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="px-2 py-0.5 bg-[#ffb300] text-[#080808] text-[10px] font-bold shrink-0">
                STEP {String(activeStepObj.step).padStart(2, "0")} // {activeStepObj.title}
              </span>
              <span className="text-[#f2efe9] truncate">{telemetry.subStageText}</span>
            </div>
            <span className="text-[11px] text-[#00e676] shrink-0">
              HW: {activeStepObj.hw}
            </span>
          </div>
        </section>

        {/* ================= 2. MAIN 12-COLUMN PLAYGROUND WORKBENCH ================= */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT 8 COLS: DEDICATED 3D DIGITAL TWIN STAGE */}
          <div className="lg:col-span-8 panel-frame flex flex-col">
            {/* Stage Header with Camera Switcher */}
            <div className="panel-header">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-[#ffb300] inline-block" />
                <span className="text-[#f2efe9] font-bold">
                  3D DIGITAL TWIN STAGE // RM-01 ROVER
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1">
                {(
                  [
                    { id: "orbit", label: "ORBIT 3D" },
                    { id: "chase", label: "CHASE CAM" },
                    { id: "pov", label: "SONAR POV" },
                    { id: "top", label: "BLUEPRINT TOP" },
                    { id: "xray", label: "EXPLODE X-RAY" },
                  ] as const
                ).map((cm) => (
                  <button
                    key={cm.id}
                    onClick={() => setCameraMode(cm.id)}
                    className={`px-2 py-1 font-mono text-[10px] border transition ${
                      cameraMode === cm.id
                        ? "bg-[#ffb300] text-[#080808] border-[#ffb300] font-bold"
                        : "bg-[#111111] text-[#88857e] border-[#222220] hover:text-[#f2efe9]"
                    }`}
                  >
                    {cm.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scenario & Playback Strip */}
            <div className="px-3.5 py-2.5 border-b border-[#222220] bg-[#111111] flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setIsRunning((r) => !r)}
                  className={`px-3 py-1 border font-bold text-[11px] cursor-pointer ${
                    isRunning
                      ? "bg-[#ffb300] text-[#080808] border-[#ffb300]"
                      : "bg-[#00e676] text-[#080808] border-[#00e676]"
                  }`}
                >
                  {isRunning ? "PAUSE ❚❚" : "RUN ▶"}
                </button>
                <button
                  onClick={handleReset}
                  className="px-2.5 py-1 border border-[#3a3834] bg-[#0b0b0b] text-[#f2efe9] hover:border-[#ffb300] text-[11px] cursor-pointer"
                >
                  RESET ↺
                </button>
                {[0.5, 1, 2].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setSimSpeed(spd)}
                    className={`px-2 py-1 border text-[10px] cursor-pointer ${
                      simSpeed === spd
                        ? "border-[#ffb300] text-[#ffb300] bg-[#151515] font-bold"
                        : "border-[#222220] text-[#88857e]"
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {PRESET_SCENARIOS.map((sc) => (
                  <button
                    key={sc.id}
                    onClick={() => handleSelectScenario(sc.id)}
                    className={`px-2 py-1 border text-[10px] cursor-pointer ${
                      scenarioId === sc.id
                        ? "border-[#00e676] text-[#00e676] bg-[#111a14] font-bold"
                        : "border-[#222220] text-[#88857e] hover:text-[#f2efe9]"
                    }`}
                  >
                    {sc.code}
                  </button>
                ))}
              </div>
            </div>

            {/* 3D WebGL Canvas Box */}
            <div className="w-full h-[420px] sm:h-[500px] lg:h-[540px] relative">
              <KinetiXStage3D
                isRunning={isRunning}
                simSpeed={simSpeed}
                mode={mode}
                resetId={resetId}
                obstacleThresholdCm={obstacleThresholdCm}
                pickDistCm={pickDistCm}
                motorPwm={motorPwm}
                obstacles={obstacles}
                setObstacles={setObstacles}
                cylinderPos={cylinderPos}
                setCylinderPos={setCylinderPos}
                targetPos={targetPos}
                cameraMode={cameraMode}
                selectedPart={selectedPart}
                setSelectedPart={setSelectedPart}
                yoloEnabled={yoloEnabled}
                slamEnabled={slamEnabled}
                manualKeys={manualKeys}
                onTelemetryUpdate={handleTelemetryUpdate}
              />
            </div>

            {/* Bottom Sandbox & Future Scope Controls Strip */}
            <div className="p-3 border-t border-[#222220] bg-[#0b0b0b] flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[#88857e] text-[10px] mr-1">SANDBOX:</span>
                <button
                  onClick={() => handleAddObstacle("crate")}
                  className="px-2.5 py-1 border border-[#3a3834] bg-[#141413] text-[#f2efe9] hover:border-[#ffb300] cursor-pointer"
                >
                  + CRATE
                </button>
                <button
                  onClick={() => handleAddObstacle("angled")}
                  className="px-2.5 py-1 border border-[#3a3834] bg-[#141413] text-[#ffb300] hover:border-[#ffb300] cursor-pointer"
                  title="Slide 26: 45° angled wall deflects ultrasound"
                >
                  + 45° WALL (S26)
                </button>
                <button
                  onClick={() => handleAddObstacle("foam")}
                  className="px-2.5 py-1 border border-[#3a3834] bg-[#141413] text-[#c084fc] hover:border-[#c084fc] cursor-pointer"
                  title="Slide 26: Soft foam absorbs 40 kHz burst"
                >
                  + FOAM (S26)
                </button>
                <button
                  onClick={() => setObstacles([])}
                  className="px-2 py-1 border border-[#222220] text-[#88857e] hover:text-[#ff2a2a] cursor-pointer"
                >
                  CLEAR
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[#88857e] text-[10px] mr-1">UPGRADES (S27):</span>
                <button
                  onClick={() => setYoloEnabled((v) => !v)}
                  className={`px-2.5 py-1 border cursor-pointer ${
                    yoloEnabled
                      ? "bg-[#00e676] text-[#080808] border-[#00e676] font-bold"
                      : "border-[#3a3834] text-[#88857e]"
                  }`}
                >
                  YOLO VISION: {yoloEnabled ? "ON" : "OFF"}
                </button>
                <button
                  onClick={() => setSlamEnabled((v) => !v)}
                  className={`px-2.5 py-1 border cursor-pointer ${
                    slamEnabled
                      ? "bg-[#00e5ff] text-[#080808] border-[#00e5ff] font-bold"
                      : "border-[#3a3834] text-[#88857e]"
                  }`}
                >
                  360° SLAM: {slamEnabled ? "ON" : "OFF"}
                </button>
                <button
                  onClick={() => setMode((m) => (m === "manual" ? "auto" : "manual"))}
                  className={`px-2.5 py-1 border cursor-pointer ${
                    mode === "manual"
                      ? "bg-[#ffb300] text-[#080808] border-[#ffb300] font-bold"
                      : "border-[#3a3834] text-[#88857e]"
                  }`}
                >
                  WASD TELEOP: {mode === "manual" ? "ON" : "OFF"}
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT 4 COLS: HARDWARE TELEMETRY STACK (OR X-RAY INSPECTOR) */}
          <div className="lg:col-span-4 space-y-4">
            {cameraMode === "xray" ? (
              <div className="panel-frame">
                <div className="panel-header">
                  <span>EXPLODED 3D X-RAY // {activePartObj.code}</span>
                  <button
                    onClick={() => setCameraMode("orbit")}
                    className="text-[#ffb300] hover:underline"
                  >
                    EXIT X-RAY ×
                  </button>
                </div>

                <div className="p-4 space-y-4 font-mono text-xs">
                  <div className="grid grid-cols-3 gap-1.5">
                    {HARDWARE_MODULES.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setSelectedPart(m.id)}
                        className={`p-2 border text-left text-[10px] cursor-pointer ${
                          selectedPart === m.id
                            ? "bg-[#ffb300] text-[#080808] border-[#ffb300] font-bold"
                            : "bg-[#111111] text-[#88857e] border-[#222220]"
                        }`}
                      >
                        <div>[{m.code}]</div>
                        <div className="truncate font-bold">{m.shortName}</div>
                      </button>
                    ))}
                  </div>

                  <div className="border border-[#222220] bg-[#080808] p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-[#ffb300] font-bold">{activePartObj.category}</span>
                      <span className="text-[#00e676]">{activePartObj.slideRef}</span>
                    </div>
                    <h3 className="font-display font-black text-xl uppercase text-[#f2efe9]">
                      {activePartObj.name}
                    </h3>
                    <p className="font-sans text-xs text-[#88857e] leading-relaxed">
                      {activePartObj.role}
                    </p>

                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      {activePartObj.specs.map((s) => (
                        <div key={s.label} className="border border-[#222220] bg-[#111111] p-2">
                          <div className="text-[9px] text-[#88857e]">{s.label}</div>
                          <div className="text-[11px] text-[#f2efe9] font-bold mt-0.5">
                            {s.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* PANEL A: HC-SR04 TIME-OF-FLIGHT OSCILLOSCOPE */}
                <div className="panel-frame">
                  <div className="panel-header">
                    <span>HC-SR04 // TIME-OF-FLIGHT (SLIDE 09)</span>
                    <span
                      className={
                        telemetry.distanceCm <= obstacleThresholdCm
                          ? "text-[#ff2a2a] font-bold"
                          : "text-[#00e676] font-bold"
                      }
                    >
                      d = {telemetry.distanceCm} cm
                    </span>
                  </div>

                  <div className="p-3.5 space-y-3 font-mono text-xs">
                    <canvas
                      ref={scopeCanvasRef}
                      width={360}
                      height={72}
                      className="w-full h-[72px] bg-[#080808] border border-[#222220]"
                    />

                    <div className="grid grid-cols-3 gap-1.5 text-center text-[11px]">
                      <div className="border border-[#222220] bg-[#0b0b0b] p-2">
                        <div className="text-[9px] text-[#88857e]">ECHO TIME (t)</div>
                        <div className="text-[#ffb300] font-bold">{telemetry.echoUs} µs</div>
                      </div>
                      <div className="border border-[#222220] bg-[#0b0b0b] p-2">
                        <div className="text-[9px] text-[#88857e]">FORMULA</div>
                        <div className="text-[#f2efe9]">t ÷ 58</div>
                      </div>
                      <div className="border border-[#222220] bg-[#0b0b0b] p-2">
                        <div className="text-[9px] text-[#88857e]">DISTANCE (d)</div>
                        <div className="text-[#00e676] font-bold">{telemetry.distanceCm} cm</div>
                      </div>
                    </div>

                    <div className="pt-1 space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-[#88857e]">AVOID THRESHOLD (SLIDE 21):</span>
                        <span className="text-[#ffb300] font-bold">{obstacleThresholdCm} cm</span>
                      </div>
                      <input
                        type="range"
                        min={12}
                        max={35}
                        value={obstacleThresholdCm}
                        onChange={(e) => setObstacleThresholdCm(Number(e.target.value))}
                        className="w-full accent-[#ffb300] cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* PANEL B: L298N DUAL H-BRIDGE SWITCH MATRIX */}
                <div className="panel-frame">
                  <div className="panel-header">
                    <span>L298N // H-BRIDGE SWITCHES (SLIDES 10–11)</span>
                    <span className="text-[#ffb300]">PWM: {telemetry.leftPwm}/255</span>
                  </div>

                  <div className="p-3.5 space-y-3 font-mono text-xs">
                    <div className="flex items-center gap-3 bg-[#080808] border border-[#222220] p-2.5">
                      <svg viewBox="0 0 200 105" className="w-40 h-20 shrink-0">
                        <line x1="20" y1="10" x2="180" y2="10" stroke="#ffb300" strokeWidth="2" />
                        <text x="4" y="13" fill="#ffb300" fontSize="9">+V</text>
                        <line x1="20" y1="95" x2="180" y2="95" stroke="#88857e" strokeWidth="2" />
                        <text x="2" y="98" fill="#88857e" fontSize="9">GND</text>

                        <line x1="55" y1="10" x2="55" y2="26" stroke="#88857e" strokeWidth="2" />
                        <line x1="55" y1="42" x2="55" y2="62" stroke="#88857e" strokeWidth="2" />
                        <line x1="55" y1="78" x2="55" y2="95" stroke="#88857e" strokeWidth="2" />

                        <line x1="145" y1="10" x2="145" y2="26" stroke="#88857e" strokeWidth="2" />
                        <line x1="145" y1="42" x2="145" y2="62" stroke="#88857e" strokeWidth="2" />
                        <line x1="145" y1="78" x2="145" y2="95" stroke="#88857e" strokeWidth="2" />

                        <line
                          x1="55"
                          y1="26"
                          x2={s1Closed ? "55" : "42"}
                          y2="42"
                          stroke={s1Closed ? "#00e676" : "#4a4843"}
                          strokeWidth="3"
                        />
                        <text x="26" y="38" fill={s1Closed ? "#00e676" : "#88857e"} fontSize="9">
                          S1
                        </text>

                        <line
                          x1="55"
                          y1="62"
                          x2={s2Closed ? "55" : "42"}
                          y2="78"
                          stroke={s2Closed ? "#ff2a2a" : "#4a4843"}
                          strokeWidth="3"
                        />
                        <text x="26" y="74" fill={s2Closed ? "#ff2a2a" : "#88857e"} fontSize="9">
                          S2
                        </text>

                        <line
                          x1="145"
                          y1="26"
                          x2={s3Closed ? "145" : "158"}
                          y2="42"
                          stroke={s3Closed ? "#ff2a2a" : "#4a4843"}
                          strokeWidth="3"
                        />
                        <text x="162" y="38" fill={s3Closed ? "#ff2a2a" : "#88857e"} fontSize="9">
                          S3
                        </text>

                        <line
                          x1="145"
                          y1="62"
                          x2={s4Closed ? "145" : "158"}
                          y2="78"
                          stroke={s4Closed ? "#00e676" : "#4a4843"}
                          strokeWidth="3"
                        />
                        <text x="162" y="74" fill={s4Closed ? "#00e676" : "#88857e"} fontSize="9">
                          S4
                        </text>

                        <line
                          x1="55"
                          y1="52"
                          x2="84"
                          y2="52"
                          stroke={s1Closed ? "#00e676" : "#4a4843"}
                          strokeWidth="2.5"
                        />
                        <line
                          x1="116"
                          y1="52"
                          x2="145"
                          y2="52"
                          stroke={s4Closed ? "#00e676" : "#4a4843"}
                          strokeWidth="2.5"
                        />
                        <circle
                          cx="100"
                          cy="52"
                          r="15"
                          fill="#111111"
                          stroke={s1Closed ? "#00e676" : "#4a4843"}
                          strokeWidth="2.5"
                        />
                        <text x="95" y="56" fill="#f2efe9" fontSize="11" fontWeight="bold">
                          M
                        </text>
                      </svg>

                      <div className="space-y-1.5 text-[10px]">
                        <div className="border border-[#222220] bg-[#111111] p-1.5">
                          <span className="text-[#88857e]">LEFT (A): </span>
                          <span className="text-[#f2efe9] font-bold">
                            IN1={telemetry.in1} IN2={telemetry.in2}
                          </span>
                        </div>
                        <div className="border border-[#222220] bg-[#111111] p-1.5">
                          <span className="text-[#88857e]">RIGHT (B): </span>
                          <span className="text-[#f2efe9] font-bold">
                            IN3={telemetry.in3} IN4={telemetry.in4}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-[#88857e]">ENA / ENB PWM SPEED:</span>
                        <span className="text-[#00e676] font-bold">{motorPwm} / 255</span>
                      </div>
                      <input
                        type="range"
                        min={115}
                        max={255}
                        value={motorPwm}
                        onChange={(e) => setMotorPwm(Number(e.target.value))}
                        className="w-full accent-[#00e676] cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* PANEL C: SG90 SERVO & LIVE C++ FSM TRACE */}
                <div className="panel-frame">
                  <div className="panel-header">
                    <span>SG90 PWM &amp; C++ FSM TRACE (SLIDES 14 &amp; 24)</span>
                    <span className="text-[#00e5ff] font-bold">
                      D9: {telemetry.gripAngle}° ({telemetry.servoPulseMs}ms)
                    </span>
                  </div>

                  <div className="p-3 bg-[#080808] font-mono text-[10.5px] space-y-0.5 overflow-x-auto custom-scrollbar">
                    {STATE_MACHINE_CODE.map((row) => {
                      const active = telemetry.activeCodeLine === row.line;
                      return (
                        <div
                          key={row.line}
                          className={`px-1.5 py-0.5 flex items-center gap-2 ${
                            active
                              ? "bg-[#ffb300] text-[#080808] font-bold"
                              : "text-[#88857e]"
                          }`}
                        >
                          <span className="w-4 text-right opacity-60">{row.line}</span>
                          <span className="whitespace-pre">{row.code}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* ================= 3. 12-STEP MISSION MATRIX (SLIDES 19 & 20) ================= */}
        <section className="panel-frame">
          <div className="panel-header">
            <span>SYNCHRONIZED 12-STEP EXECUTION LOG (SLIDES 19 &amp; 20)</span>
            <span>PHASE 1: SEARCH &amp; PICK [01–06] · PHASE 2: CARRY &amp; PLACE [07–12]</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y divide-[#222220]">
            {TWELVE_STEPS.map((s) => {
              const isCurrent = telemetry.stepNum === s.step;
              const isDone = telemetry.stepNum > s.step;
              return (
                <div
                  key={s.step}
                  className={`p-3 font-mono text-xs transition ${
                    isCurrent
                      ? "bg-[#ffb300]/15 border-l-2 border-l-[#ffb300]"
                      : isDone
                      ? "bg-[#0b120e]"
                      : "bg-[#0e0e0e]"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span
                      className={
                        isCurrent
                          ? "text-[#ffb300] font-bold"
                          : isDone
                          ? "text-[#00e676]"
                          : "text-[#88857e]"
                      }
                    >
                      STEP {String(s.step).padStart(2, "0")}
                    </span>
                    <span className="text-[9px] text-[#88857e]">{s.state}</span>
                  </div>
                  <div className="text-[11px] font-bold text-[#f2efe9] truncate">{s.title}</div>
                  <div className="text-[10px] text-[#88857e] mt-1 line-clamp-2 font-sans">
                    {s.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
