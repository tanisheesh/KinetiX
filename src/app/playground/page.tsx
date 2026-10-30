"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import KinetiXStage3D, {
  StageTelemetry,
  WiringFaultConfig,
} from "@/components/kinetix-stage-3d";
import {
  ArenaObstacle,
  FSM_STAGES,
  HARDWARE_MODULES,
  PRESET_SCENARIOS,
  STATE_MACHINE_CODE,
  TWELVE_STEPS,
} from "@/lib/kinetix-data";
import { soundEngine } from "@/lib/sound-engine";

interface TelemetrySample {
  ts: string;
  state: string;
  step: number;
  distanceCm: number;
  echoUs: number;
  gripAngle: number;
  leftPwm: number;
  motorCurrentMa: number;
  batteryVoltage: number;
}

export default function PlaygroundPage() {
  const [isRunning, setIsRunning] = useState(true);
  const [simSpeed, setSimSpeed] = useState(1);
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [resetId, setResetId] = useState(1);

  // Live Flashable Firmware Parameters (Upgrade #1)
  const [obstacleThresholdCm, setObstacleThresholdCm] = useState(20);
  const [pickDistCm, setPickDistCm] = useState(5);
  const [gripClosedDeg, setGripClosedDeg] = useState(30);
  const [spinDurationMs, setSpinDurationMs] = useState(450);
  const [motorPwm, setMotorPwm] = useState(170);

  // Draft values inside the C++ Firmware Patcher
  const [codeTab, setCodeTab] = useState<"trace" | "patch">("trace");
  const [draftPickCm, setDraftPickCm] = useState(5);
  const [draftAvoidCm, setDraftAvoidCm] = useState(20);
  const [draftGripDeg, setDraftGripDeg] = useState(30);
  const [draftSpinMs, setDraftSpinMs] = useState(450);
  const [draftPwm, setDraftPwm] = useState(170);
  const [flashBanner, setFlashBanner] = useState<string | null>(null);

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

  // Upgrades #2, #3, #4, #6, #7 Toggles
  const [yoloEnabled, setYoloEnabled] = useState(false);
  const [slamEnabled, setSlamEnabled] = useState(false);
  const [pipEnabled, setPipEnabled] = useState(true);
  const [ghostRaceEnabled, setGhostRaceEnabled] = useState(false);
  const [multiSortEnabled, setMultiSortEnabled] = useState(false);
  const [wallDrawMode, setWallDrawMode] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);

  const [wiringFaults, setWiringFaults] = useState<WiringFaultConfig>({
    noCommonGnd: false,
    swapLeftPolarity: false,
    lowBatteryBrownout: false,
  });

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
    motorCurrentMa: 310,
    batteryVoltage: 7.25,
    sortedCount: 0,
    totalPayloads: 1,
    ghostStatus: "FIXED-PATH OPEN LOOP",
  });

  // Blackbox history buffer for Upgrade #5 Strip Chart & CSV/JSON Export
  const historyRef = useRef<TelemetrySample[]>([]);
  const scopeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const stripChartRef = useRef<HTMLCanvasElement | null>(null);

  const handleTelemetryUpdate = useCallback((t: StageTelemetry) => {
    setTelemetry(t);
    const sample: TelemetrySample = {
      ts: new Date().toISOString().slice(11, 22),
      state: t.state,
      step: t.stepNum,
      distanceCm: t.distanceCm,
      echoUs: t.echoUs,
      gripAngle: t.gripAngle,
      leftPwm: t.leftPwm,
      motorCurrentMa: t.motorCurrentMa,
      batteryVoltage: t.batteryVoltage,
    };
    historyRef.current = [...historyRef.current.slice(-119), sample];
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

  // Upgrade #5: Draw Real-Time Multi-Channel Telemetry Strip Chart (Distance, Current, Voltage)
  useEffect(() => {
    const canvas = stripChartRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const samples = historyRef.current;

    ctx.clearRect(0, 0, w, h);

    // Background Grid
    ctx.strokeStyle = "#1c1c1a";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 28) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Threshold horizontal dashed line (e.g. 20 cm)
    const threshY = h - (obstacleThresholdCm / 120) * (h - 16) - 8;
    ctx.strokeStyle = "rgba(255, 42, 42, 0.45)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, threshY);
    ctx.lineTo(w, threshY);
    ctx.stroke();
    ctx.setLineDash([]);

    if (samples.length < 2) return;

    const plotTrace = (getVal: (s: TelemetrySample) => number, maxVal: number, color: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      samples.forEach((s, idx) => {
        const x = (idx / 119) * w;
        const norm = Math.max(0, Math.min(1, getVal(s) / maxVal));
        const y = h - norm * (h - 16) - 8;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    };

    // Trace 1: Sonar Distance (0 - 120 cm) in Amber
    plotTrace((s) => s.distanceCm, 120, "#ffb300");
    // Trace 2: Motor Current (0 - 1000 mA) in Green
    plotTrace((s) => s.motorCurrentMa, 1000, "#00e676");
    // Trace 3: Battery Voltage (0 - 9.0 V) in Cyan
    plotTrace((s) => s.batteryVoltage, 9.0, "#00e5ff");
  }, [telemetry, obstacleThresholdCm]);

  const handleFlashFirmware = () => {
    setPickDistCm(draftPickCm);
    setObstacleThresholdCm(draftAvoidCm);
    setGripClosedDeg(draftGripDeg);
    setSpinDurationMs(draftSpinMs);
    setMotorPwm(draftPwm);
    soundEngine.playFlashSuccess();
    setFlashBanner(
      `AVRDUDE // FLASHED 3,412 BYTES TO ATMEGA328P (PICK≤${draftPickCm}cm, AVOID≤${draftAvoidCm}cm, GRIP=${draftGripDeg}°, SPIN=${draftSpinMs}ms)`
    );
    setTimeout(() => setFlashBanner(null), 4000);
  };

  const handleExportBlackbox = (format: "csv" | "json") => {
    const data = historyRef.current;
    if (data.length === 0) return;
    let content = "";
    let mime = "text/plain";
    let ext = "csv";

    if (format === "json") {
      content = JSON.stringify(data, null, 2);
      mime = "application/json";
      ext = "json";
    } else {
      const headers =
        "timestamp,state,step,distance_cm,echo_us,grip_angle_deg,pwm,motor_current_ma,battery_v";
      const rows = data.map(
        (r) =>
          `${r.ts},${r.state},${r.step},${r.distanceCm},${r.echoUs},${r.gripAngle},${r.leftPwm},${r.motorCurrentMa},${r.batteryVoltage}`
      );
      content = [headers, ...rows].join("\n");
      mime = "text/csv";
      ext = "csv";
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kinetix-blackbox-telemetry.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
    setWiringFaults({
      noCommonGnd: false,
      swapLeftPolarity: false,
      lowBatteryBrownout: false,
    });
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

  const anyFaultActive =
    wiringFaults.noCommonGnd ||
    wiringFaults.swapLeftPolarity ||
    wiringFaults.lowBatteryBrownout;

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <Navbar />

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-5">
        {/* Flash Success Banner */}
        {flashBanner && (
          <div className="border border-[#00e676] bg-[#00e676]/15 px-4 py-2.5 font-mono text-xs text-[#00e676] font-bold flex items-center justify-between">
            <span>⚡ {flashBanner}</span>
            <button onClick={() => setFlashBanner(null)} className="underline">
              DISMISS
            </button>
          </div>
        )}

        {/* ================= 1. DEDICATED STAGE FSM PIPELINE BAR ================= */}
        <section className="panel-frame">
          <div className="panel-header">
            <span>
              AUTONOMOUS STAGE PIPELINE // 5-STATE DETERMINISTIC FINITE AUTOMATON
            </span>
            <div className="flex items-center gap-3">
              {multiSortEnabled && (
                <span className="text-[#ffb300] font-bold">
                  PAYLOADS SORTED: {telemetry.sortedCount}/{telemetry.totalPayloads}
                </span>
              )}
              <span className="text-[#00e676] font-bold">
                ● ACTIVE STEP {String(activeStepObj.step).padStart(2, "0")}/12 · PHASE{" "}
                {activeStepObj.phase}
              </span>
            </div>
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
                  className={`p-2.5 sm:p-3.5 border-b sm:border-b-0 border-r border-[#222220] last:border-r-0 transition-colors ${
                    idx === 4 ? "col-span-2 sm:col-span-1" : ""
                  } ${
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
              <span
                className={`px-2 py-0.5 text-[10px] font-bold shrink-0 ${
                  anyFaultActive
                    ? "bg-[#ff2a2a] text-[#f2efe9]"
                    : "bg-[#ffb300] text-[#080808]"
                }`}
              >
                {anyFaultActive
                  ? "HARDWARE FAULT ACTIVE"
                  : `STEP ${String(activeStepObj.step).padStart(2, "0")} // ${activeStepObj.title}`}
              </span>
              <span className="text-[#f2efe9] truncate">{telemetry.subStageText}</span>
            </div>
            <span className="text-[11px] text-[#00e676] shrink-0">
              {telemetry.motorCurrentMa} mA · {telemetry.batteryVoltage} V
            </span>
          </div>
        </section>

        {/* ================= 2. MAIN 12-COLUMN PLAYGROUND WORKBENCH ================= */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT 8 COLS: DEDICATED 3D DIGITAL TWIN STAGE */}
          <div className="lg:col-span-8 panel-frame flex flex-col">
            {/* Stage Header with Camera Switcher + Audio + PiP */}
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
                    { id: "top", label: "BLUEPRINT" },
                    { id: "xray", label: "X-RAY" },
                  ] as const
                ).map((cm) => (
                  <button
                    key={cm.id}
                    onClick={() => setCameraMode(cm.id)}
                    className={`px-2 py-1 font-mono text-[10px] border transition cursor-pointer ${
                      cameraMode === cm.id
                        ? "bg-[#ffb300] text-[#080808] border-[#ffb300] font-bold"
                        : "bg-[#111111] text-[#88857e] border-[#222220] hover:text-[#f2efe9]"
                    }`}
                  >
                    {cm.label}
                  </button>
                ))}
                <button
                  onClick={() => setPipEnabled((p) => !p)}
                  className={`px-2 py-1 font-mono text-[10px] border cursor-pointer ${
                    pipEnabled
                      ? "border-[#00e676] text-[#00e676] bg-[#111a14] font-bold"
                      : "border-[#222220] text-[#88857e]"
                  }`}
                  title="Toggle Picture-in-Picture Nose-Cam"
                >
                  PiP CAM
                </button>
                <button
                  onClick={() => {
                    const next = !audioEnabled;
                    setAudioEnabled(next);
                    soundEngine.setEnabled(next);
                  }}
                  className={`px-2 py-1 font-mono text-[10px] border cursor-pointer ${
                    audioEnabled
                      ? "bg-[#00e5ff] text-[#080808] border-[#00e5ff] font-bold"
                      : "border-[#222220] text-[#88857e]"
                  }`}
                  title="Web Audio API Ultrasonic & Servo Sound Synthesis"
                >
                  {audioEnabled ? "AUDIO: ON" : "AUDIO: OFF"}
                </button>
              </div>
            </div>

            {/* Scenario, A/B Ghost Race & Multi-Sort Strip */}
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
                      scenarioId === sc.id && !multiSortEnabled
                        ? "border-[#00e676] text-[#00e676] bg-[#111a14] font-bold"
                        : "border-[#222220] text-[#88857e] hover:text-[#f2efe9]"
                    }`}
                  >
                    {sc.code}
                  </button>
                ))}
                <button
                  onClick={() => setMultiSortEnabled((m) => !m)}
                  className={`px-2.5 py-1 border text-[10px] cursor-pointer ${
                    multiSortEnabled
                      ? "bg-[#ffb300] text-[#080808] border-[#ffb300] font-bold"
                      : "border-[#3a3834] text-[#ffb300]"
                  }`}
                >
                  3-OBJECT SORT
                </button>
                <button
                  onClick={() => {
                    setGhostRaceEnabled((g) => !g);
                    setResetId((r) => r + 1);
                  }}
                  className={`px-2.5 py-1 border text-[10px] cursor-pointer ${
                    ghostRaceEnabled
                      ? "bg-[#ff2a2a] text-[#f2efe9] border-[#ff2a2a] font-bold"
                      : "border-[#3a3834] text-[#ff2a2a]"
                  }`}
                >
                  A/B GHOST RACE
                </button>
              </div>
            </div>

            {/* 3D WebGL Canvas Box */}
            <div className="w-full h-[320px] sm:h-[460px] lg:h-[540px] relative">
              <KinetiXStage3D
                isRunning={isRunning}
                simSpeed={simSpeed}
                mode={mode}
                resetId={resetId}
                obstacleThresholdCm={obstacleThresholdCm}
                pickDistCm={pickDistCm}
                gripClosedDeg={gripClosedDeg}
                spinDurationMs={spinDurationMs}
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
                pipEnabled={pipEnabled}
                ghostRaceEnabled={ghostRaceEnabled}
                multiSortEnabled={multiSortEnabled}
                wallDrawMode={wallDrawMode}
                wiringFaults={wiringFaults}
                manualKeys={manualKeys}
                onTelemetryUpdate={handleTelemetryUpdate}
              />
            </div>

            {/* Touch & Mouse Teleop D-Pad Bar when Manual WASD Mode is Active */}
            {mode === "manual" && (
              <div className="px-3 py-2.5 border-t border-[#ffb300] bg-[#151515] flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
                <span className="text-[#ffb300] text-[10px] sm:text-[11px] font-bold">
                  TELEOP ACTIVE // HOLD TOUCH BUTTONS OR USE W/A/S/D + SPACE:
                </span>
                <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="flex items-center gap-1">
                    {(
                      [
                        { key: "w", label: "▲ FWD" },
                        { key: "a", label: "◀ LEFT" },
                        { key: "s", label: "▼ REV" },
                        { key: "d", label: "▶ RIGHT" },
                      ] as const
                    ).map((btn) => (
                      <button
                        key={btn.key}
                        onPointerDown={() =>
                          setManualKeys((p) => ({ ...p, [btn.key]: true }))
                        }
                        onPointerUp={() =>
                          setManualKeys((p) => ({ ...p, [btn.key]: false }))
                        }
                        onPointerLeave={() =>
                          setManualKeys((p) => ({ ...p, [btn.key]: false }))
                        }
                        className={`px-2.5 py-1.5 border text-[10px] font-bold select-none touch-none cursor-pointer ${
                          manualKeys[btn.key]
                            ? "bg-[#ffb300] text-[#080808] border-[#ffb300]"
                            : "bg-[#080808] text-[#f2efe9] border-[#3a3834]"
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() =>
                      setManualKeys((p) => ({ ...p, gripClosed: !p.gripClosed }))
                    }
                    className={`px-2.5 py-1.5 border text-[10px] font-bold cursor-pointer ${
                      manualKeys.gripClosed
                        ? "bg-[#00e676] text-[#080808] border-[#00e676]"
                        : "bg-[#080808] text-[#00e5ff] border-[#00e5ff]"
                    }`}
                  >
                    {manualKeys.gripClosed ? "GRIP: 30° CLOSED" : "GRIP: 90° OPEN"}
                  </button>
                </div>
              </div>
            )}

            {/* Bottom Sandbox, Maze Builder, Upgrades & Fault Injector Strip */}
            <div className="p-3 border-t border-[#222220] bg-[#0b0b0b] space-y-2 font-mono text-[11px]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[#88857e] text-[10px] mr-1">ARENA:</span>
                  <button
                    onClick={() => handleAddObstacle("crate")}
                    className="px-2 py-1 border border-[#3a3834] bg-[#141413] text-[#f2efe9] hover:border-[#ffb300] cursor-pointer"
                  >
                    + CRATE
                  </button>
                  <button
                    onClick={() => handleAddObstacle("angled")}
                    className="px-2 py-1 border border-[#3a3834] bg-[#141413] text-[#ffb300] hover:border-[#ffb300] cursor-pointer"
                  >
                    + 45° WALL
                  </button>
                  <button
                    onClick={() => handleAddObstacle("foam")}
                    className="px-2 py-1 border border-[#3a3834] bg-[#141413] text-[#c084fc] hover:border-[#c084fc] cursor-pointer"
                  >
                    + FOAM
                  </button>
                  <button
                    onClick={() => setWallDrawMode((w) => !w)}
                    className={`px-2 py-1 border cursor-pointer ${
                      wallDrawMode
                        ? "bg-[#00e5ff] text-[#080808] border-[#00e5ff] font-bold"
                        : "border-[#3a3834] text-[#00e5ff]"
                    }`}
                  >
                    {wallDrawMode ? "CLICK FLOOR: ON" : "DRAW MAZE WALL"}
                  </button>
                  <button
                    onClick={() => setObstacles([])}
                    className="px-2 py-1 border border-[#222220] text-[#88857e] hover:text-[#ff2a2a] cursor-pointer"
                  >
                    CLEAR
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => setYoloEnabled((v) => !v)}
                    className={`px-2 py-1 border cursor-pointer ${
                      yoloEnabled
                        ? "bg-[#00e676] text-[#080808] border-[#00e676] font-bold"
                        : "border-[#3a3834] text-[#88857e]"
                    }`}
                  >
                    YOLO HUD: {yoloEnabled ? "ON" : "OFF"}
                  </button>
                  <button
                    onClick={() => setSlamEnabled((v) => !v)}
                    className={`px-2 py-1 border cursor-pointer ${
                      slamEnabled
                        ? "bg-[#00e5ff] text-[#080808] border-[#00e5ff] font-bold"
                        : "border-[#3a3834] text-[#88857e]"
                    }`}
                  >
                    360° SLAM: {slamEnabled ? "ON" : "OFF"}
                  </button>
                  <button
                    onClick={() => setMode((m) => (m === "manual" ? "auto" : "manual"))}
                    className={`px-2 py-1 border cursor-pointer ${
                      mode === "manual"
                        ? "bg-[#ffb300] text-[#080808] border-[#ffb300] font-bold"
                        : "border-[#3a3834] text-[#88857e]"
                    }`}
                  >
                    WASD: {mode === "manual" ? "ON" : "OFF"}
                  </button>
                </div>
              </div>

              {/* Upgrade #4: Live Wiring Fault Injector Strip */}
              <div className="pt-2 border-t border-[#222220] flex flex-wrap items-center justify-between gap-2 text-[10px]">
                <span className="text-[#ff2a2a] font-bold">
                  WIRING FAULT INJECTOR:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() =>
                      setWiringFaults((f) => ({ ...f, noCommonGnd: !f.noCommonGnd }))
                    }
                    className={`px-2 py-0.5 border cursor-pointer ${
                      wiringFaults.noCommonGnd
                        ? "bg-[#ff2a2a] text-[#f2efe9] border-[#ff2a2a] font-bold"
                        : "border-[#3a3834] text-[#88857e]"
                    }`}
                  >
                    DROP COMMON GND
                  </button>
                  <button
                    onClick={() =>
                      setWiringFaults((f) => ({
                        ...f,
                        swapLeftPolarity: !f.swapLeftPolarity,
                      }))
                    }
                    className={`px-2 py-0.5 border cursor-pointer ${
                      wiringFaults.swapLeftPolarity
                        ? "bg-[#ff2a2a] text-[#f2efe9] border-[#ff2a2a] font-bold"
                        : "border-[#3a3834] text-[#88857e]"
                    }`}
                  >
                    SWAP IN1↔IN2
                  </button>
                  <button
                    onClick={() =>
                      setWiringFaults((f) => ({
                        ...f,
                        lowBatteryBrownout: !f.lowBatteryBrownout,
                      }))
                    }
                    className={`px-2 py-0.5 border cursor-pointer ${
                      wiringFaults.lowBatteryBrownout
                        ? "bg-[#ff2a2a] text-[#f2efe9] border-[#ff2a2a] font-bold"
                        : "border-[#3a3834] text-[#88857e]"
                    }`}
                  >
                    4.8V BROWNOUT
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT 4 COLS: HARDWARE TELEMETRY STACK + LIVE C++ IDE */}
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
                      <span className="text-[#00e676]">{activePartObj.busTag}</span>
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
                    <span>HC-SR04 // TIME-OF-FLIGHT OSCILLOSCOPE</span>
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
                  </div>
                </div>

                {/* PANEL B: L298N DUAL H-BRIDGE SWITCH MATRIX */}
                <div className="panel-frame">
                  <div className="panel-header">
                    <span>L298N // H-BRIDGE SWITCH MATRIX</span>
                    <span className="text-[#ffb300]">
                      {telemetry.motorCurrentMa}mA · {telemetry.batteryVoltage}V
                    </span>
                  </div>

                  <div className="p-3.5 space-y-2.5 font-mono text-xs">
                    <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center gap-3 bg-[#080808] border border-[#222220] p-2.5">
                      <svg viewBox="0 0 200 105" className="w-full max-w-[180px] h-20 shrink-0">
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

                      <div className="grid grid-cols-2 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-1 gap-1.5 text-[10px] w-full">
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
                  </div>
                </div>

                {/* PANEL C: UPGRADE #1 — LIVE TRACE OR IN-BROWSER C++ FIRMWARE PATCHER */}
                <div className="panel-frame">
                  <div className="panel-header">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCodeTab("trace")}
                        className={`px-2 py-0.5 text-[10px] border cursor-pointer ${
                          codeTab === "trace"
                            ? "bg-[#ffb300] text-[#080808] border-[#ffb300] font-bold"
                            : "bg-[#111111] text-[#88857e] border-[#222220]"
                        }`}
                      >
                        LIVE C++ TRACE
                      </button>
                      <button
                        onClick={() => setCodeTab("patch")}
                        className={`px-2 py-0.5 text-[10px] border cursor-pointer ${
                          codeTab === "patch"
                            ? "bg-[#00e676] text-[#080808] border-[#00e676] font-bold"
                            : "bg-[#111111] text-[#88857e] border-[#222220]"
                        }`}
                      >
                        EDIT &amp; FLASH C++ ⚡
                      </button>
                    </div>
                    <span className="text-[#00e5ff] font-bold">
                      D9: {telemetry.gripAngle}° ({telemetry.servoPulseMs}ms)
                    </span>
                  </div>

                  {codeTab === "trace" ? (
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
                  ) : (
                    <div className="p-3.5 bg-[#080808] font-mono text-xs space-y-2.5">
                      <div className="text-[10px] text-[#00e676]">
                        // MODIFY CONSTANTS &amp; FLASH TO VIRTUAL ATMEGA328P
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <label className="border border-[#222220] bg-[#111111] p-2 block">
                          <span className="text-[9px] text-[#88857e] block">
                            PICK_DIST_CM (3–10)
                          </span>
                          <input
                            type="number"
                            min={3}
                            max={10}
                            value={draftPickCm}
                            onChange={(e) => setDraftPickCm(Number(e.target.value))}
                            className="w-full bg-transparent text-[#ffb300] font-bold focus:outline-none mt-0.5"
                          />
                        </label>

                        <label className="border border-[#222220] bg-[#111111] p-2 block">
                          <span className="text-[9px] text-[#88857e] block">
                            AVOID_DIST_CM (12–35)
                          </span>
                          <input
                            type="number"
                            min={12}
                            max={35}
                            value={draftAvoidCm}
                            onChange={(e) => setDraftAvoidCm(Number(e.target.value))}
                            className="w-full bg-transparent text-[#00e676] font-bold focus:outline-none mt-0.5"
                          />
                        </label>

                        <label className="border border-[#222220] bg-[#111111] p-2 block">
                          <span className="text-[9px] text-[#88857e] block">
                            GRIP_CLOSED_DEG (&gt;52° SLIPS!)
                          </span>
                          <input
                            type="number"
                            min={20}
                            max={75}
                            value={draftGripDeg}
                            onChange={(e) => setDraftGripDeg(Number(e.target.value))}
                            className="w-full bg-transparent text-[#00e5ff] font-bold focus:outline-none mt-0.5"
                          />
                        </label>

                        <label className="border border-[#222220] bg-[#111111] p-2 block">
                          <span className="text-[9px] text-[#88857e] block">
                            SPIN_DELAY_MS (250–900)
                          </span>
                          <input
                            type="number"
                            min={250}
                            max={900}
                            step={50}
                            value={draftSpinMs}
                            onChange={(e) => setDraftSpinMs(Number(e.target.value))}
                            className="w-full bg-transparent text-[#f2efe9] font-bold focus:outline-none mt-0.5"
                          />
                        </label>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-[#88857e]">CRUISE_PWM (ENA/ENB):</span>
                          <span className="text-[#ffb300] font-bold">{draftPwm} / 255</span>
                        </div>
                        <input
                          type="range"
                          min={115}
                          max={255}
                          value={draftPwm}
                          onChange={(e) => setDraftPwm(Number(e.target.value))}
                          className="w-full accent-[#ffb300] cursor-pointer"
                        />
                      </div>

                      <button
                        onClick={handleFlashFirmware}
                        className="brutal-btn brutal-btn-primary w-full !py-2 !text-xs"
                      >
                        ⚡ COMPILE &amp; FLASH TO VIRTUAL UNO
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </section>

        {/* ================= 3. UPGRADE #5: REAL-TIME TELEMETRY STRIP CHART & BLACKBOX RECORDER ================= */}
        <section className="panel-frame">
          <div className="panel-header">
            <div className="flex flex-wrap items-center gap-4">
              <span>BLACKBOX TELEMETRY RECORDER // 120-SAMPLE ROLLING STRIP CHART</span>
              <span className="text-[#ffb300]">■ SONAR d(cm)</span>
              <span className="text-[#00e676]">■ MOTOR I(mA)</span>
              <span className="text-[#00e5ff]">■ BATTERY V(volts)</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExportBlackbox("csv")}
                className="px-2.5 py-1 border border-[#3a3834] bg-[#141413] text-[#f2efe9] hover:border-[#ffb300] text-[10px] cursor-pointer"
              >
                EXPORT .CSV ↓
              </button>
              <button
                onClick={() => handleExportBlackbox("json")}
                className="px-2.5 py-1 border border-[#3a3834] bg-[#141413] text-[#00e676] hover:border-[#00e676] text-[10px] cursor-pointer"
              >
                EXPORT .JSON ↓
              </button>
            </div>
          </div>

          <div className="p-4 bg-[#080808]">
            <canvas
              ref={stripChartRef}
              width={1280}
              height={110}
              className="w-full h-[110px] bg-[#0b0b0b] border border-[#222220]"
            />
          </div>
        </section>

        {/* ================= 4. 12-STEP MISSION MATRIX ================= */}
        <section className="panel-frame">
          <div className="panel-header">
            <span>SYNCHRONIZED 12-STEP EXECUTION LOG</span>
            <span>PHASE 1: SEARCH &amp; PICK [01–06] · PHASE 2: CARRY &amp; PLACE [07–12]</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 border-t border-[#222220]">
            {TWELVE_STEPS.map((s) => {
              const isCurrent = telemetry.stepNum === s.step;
              const isDone = telemetry.stepNum > s.step;
              return (
                <div
                  key={s.step}
                  className={`p-3 border-b border-r border-[#222220] font-mono text-xs transition ${
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
