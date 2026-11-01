"use client";

export interface SoundTelemetryInput {
  distanceCm: number;
  thresholdCm: number;
  gripAngle: number;
  isRunning: boolean;
  state: string;
  avoidState: string;
  leftPwm: number;
  rightPwm: number;
  in1: number;
  in2: number;
  in3: number;
  in4: number;
  hasFault: boolean;
}

class KinetiXSoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = false;

  // Continuous DC Gearmotor + Gearbox nodes
  private motorOscMain: OscillatorNode | null = null;
  private motorOscSub: OscillatorNode | null = null;
  private motorLfo: OscillatorNode | null = null;
  private motorLfoGain: GainNode | null = null;
  private motorFilter: BiquadFilterNode | null = null;
  private motorMasterGain: GainNode | null = null;

  // State trackers for one-shot mechanical/telemetry events
  private lastPingMs = 0;
  private lastReverseBeepMs = 0;
  private lastFaultBuzzMs = 0;
  private prevState = "SEARCH";
  private prevAvoidState = "NONE";
  private prevTargetGrip = 90;

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.initContinuousMotorSynth(this.ctx);
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private initContinuousMotorSynth(ctx: AudioContext) {
    // Master gain for continuous 1:48 TT Geared DC Motor hum
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, ctx.currentTime);

    // Low-pass filter to shape raw waveforms into warm mechanical gearbox hum
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(240, ctx.currentTime);
    filter.Q.setValueAtTime(2.8, ctx.currentTime);

    // Primary armature/commutator sawtooth oscillator
    const oscMain = ctx.createOscillator();
    oscMain.type = "sawtooth";
    oscMain.frequency.setValueAtTime(75, ctx.currentTime);

    // Sub-harmonic 1:48 spur gear-mesh triangle oscillator
    const oscSub = ctx.createOscillator();
    oscSub.type = "triangle";
    oscSub.frequency.setValueAtTime(37.5, ctx.currentTime);

    // LFO for realistic gear-tooth vibrato / wheel cadence
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(16, ctx.currentTime);

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(4.5, ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(oscMain.frequency);

    oscMain.connect(filter);
    oscSub.connect(filter);
    filter.connect(masterGain);
    masterGain.connect(ctx.destination);

    oscMain.start();
    oscSub.start();
    lfo.start();

    this.motorOscMain = oscMain;
    this.motorOscSub = oscSub;
    this.motorLfo = lfo;
    this.motorLfoGain = lfoGain;
    this.motorFilter = filter;
    this.motorMasterGain = masterGain;
  }

  public setEnabled(on: boolean) {
    this.enabled = on;
    if (on) {
      this.ensureContext();
      this.playBootChime();
    } else if (this.ctx && this.motorMasterGain) {
      this.motorMasterGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.04);
    }
  }

  public isEnabled() {
    return this.enabled;
  }

  public playBootChime() {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.055);
      gain.gain.setValueAtTime(0.045, now + idx * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + idx * 0.055 + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.055);
      osc.stop(now + idx * 0.055 + 0.17);
    });
  }

  public playFlashSuccess() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [587.33, 880, 1174.66];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.065);
      gain.gain.setValueAtTime(0.055, now + idx * 0.065);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.065 + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.065);
      osc.stop(now + idx * 0.065 + 0.23);
    });
  }

  // Realistic 320ms SG90 Micro-Servo Gear Train Whir + Mechanical Clamp Thud
  private playServoActuation(closing: boolean) {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const duration = 0.32;

    // High-speed nylon gear train whir
    const carrier = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    carrier.type = "sawtooth";
    const startFreq = closing ? 360 : 540;
    const endFreq = closing ? 580 : 340;
    carrier.frequency.setValueAtTime(startFreq, now);
    carrier.frequency.linearRampToValueAtTime(endFreq, now + duration);

    // Gear tooth modulation
    mod.type = "square";
    mod.frequency.setValueAtTime(48, now);
    modGain.gain.setValueAtTime(35, now);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(850, now);
    filter.Q.setValueAtTime(1.8, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.048, now + 0.03);
    gain.gain.setValueAtTime(0.045, now + duration - 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + duration);

    mod.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    carrier.start(now);
    mod.start(now);
    carrier.stop(now + duration + 0.01);
    mod.stop(now + duration + 0.01);

    // Mechanical jaw clamp thud at the end of travel
    const thud = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thud.type = "sine";
    thud.frequency.setValueAtTime(closing ? 135 : 110, now + duration - 0.03);
    thud.frequency.exponentialRampToValueAtTime(42, now + duration + 0.07);
    thudGain.gain.setValueAtTime(0.07, now + duration - 0.03);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + duration + 0.075);

    thud.connect(thudGain);
    thudGain.connect(ctx.destination);
    thud.start(now + duration - 0.03);
    thud.stop(now + duration + 0.08);
  }

  // H-Bridge Active Dynamic Brake Thud + Deceleration Chirp
  private playBrakeScreech() {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.16);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(480, now);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  // State Transition Telemetry Chimes
  private playStateChime(newState: string) {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    if (newState === "CARRY") {
      // Payload locked confirmation (2 ascending tones)
      [523.25, 783.99].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, now + i * 0.08);
        g.gain.setValueAtTime(0.04, now + i * 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.15);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.16);
      });
    } else if (newState === "DONE") {
      // Mission complete 4-note chord fanfare
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(f, now + i * 0.075);
        g.gain.setValueAtTime(0.055, now + i * 0.075);
        g.gain.exponentialRampToValueAtTime(0.0008, now + i * 0.075 + 0.32);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(now + i * 0.075);
        osc.stop(now + i * 0.075 + 0.34);
      });
    }
  }

  public updateTelemetrySound(input: SoundTelemetryInput) {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const nowMs = performance.now();

    // 1. Update Continuous 1:48 Geared DC Motor Hum & Pitch
    if (
      this.motorOscMain &&
      this.motorOscSub &&
      this.motorLfo &&
      this.motorFilter &&
      this.motorMasterGain
    ) {
      const avgPwm = (input.leftPwm + input.rightPwm) * 0.5;
      const isDriving = input.isRunning && avgPwm > 5 && !input.hasFault;
      const isSpinning =
        input.in1 !== input.in3 && input.leftPwm > 0 && input.rightPwm > 0;
      const isReversing =
        input.in1 === 0 && input.in2 === 1 && input.in3 === 0 && input.in4 === 1;

      if (isDriving) {
        const pwmNorm = avgPwm / 255;
        // Base motor frequency scales with PWM RPM, shifting higher during differential spin
        const targetMainFreq = isSpinning
          ? 98 + pwmNorm * 65
          : isReversing
          ? 68 + pwmNorm * 42
          : 62 + pwmNorm * 58;

        this.motorOscMain.frequency.setTargetAtTime(targetMainFreq, now, 0.05);
        this.motorOscSub.frequency.setTargetAtTime(targetMainFreq * 0.5, now, 0.05);
        this.motorLfo.frequency.setTargetAtTime(10 + pwmNorm * 16, now, 0.05);
        this.motorFilter.frequency.setTargetAtTime(
          isSpinning ? 360 : 210 + pwmNorm * 130,
          now,
          0.05
        );
        this.motorMasterGain.gain.setTargetAtTime(
          isSpinning ? 0.042 : 0.03 + pwmNorm * 0.015,
          now,
          0.04
        );
      } else {
        // Spool down motor smoothly when stopped or paused
        this.motorOscMain.frequency.setTargetAtTime(42, now, 0.08);
        this.motorOscSub.frequency.setTargetAtTime(21, now, 0.08);
        this.motorMasterGain.gain.setTargetAtTime(0.0001, now, 0.05);
      }

      // 2. Industrial Reverse Backup Beeper when reversing (Step 11 or REVERSE_CLEAR)
      if (isDriving && isReversing && nowMs - this.lastReverseBeepMs > 340) {
        this.lastReverseBeepMs = nowMs;
        const beep = ctx.createOscillator();
        const bGain = ctx.createGain();
        beep.type = "sine";
        beep.frequency.setValueAtTime(1080, now);
        bGain.gain.setValueAtTime(0.038, now);
        bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        beep.connect(bGain);
        bGain.connect(ctx.destination);
        beep.start(now);
        beep.stop(now + 0.13);
      }
    }

    // 3. Detect SG90 Gripper Command Transitions (90° Open <-> 30° Closed)
    const targetRounded = input.gripAngle < 60 ? 30 : 90;
    if (targetRounded !== this.prevTargetGrip) {
      this.prevTargetGrip = targetRounded;
      this.playServoActuation(targetRounded === 30);
    }

    // 4. Detect H-Bridge Active Brake Engagement
    if (input.avoidState === "BRAKE" && this.prevAvoidState !== "BRAKE") {
      this.playBrakeScreech();
    }
    this.prevAvoidState = input.avoidState;

    // 5. Detect FSM State Transitions (CARRY lock / DONE fanfare)
    if (input.state !== this.prevState) {
      this.playStateChime(input.state);
      this.prevState = input.state;
    }

    // 6. Hardware Wiring Fault Buzzer
    if (input.hasFault && nowMs - this.lastFaultBuzzMs > 450) {
      this.lastFaultBuzzMs = nowMs;
      const buzz = ctx.createOscillator();
      const bGain = ctx.createGain();
      buzz.type = "sawtooth";
      buzz.frequency.setValueAtTime(155, now);
      buzz.frequency.setValueAtTime(130, now + 0.08);
      bGain.gain.setValueAtTime(0.04, now);
      bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      buzz.connect(bGain);
      bGain.connect(ctx.destination);
      buzz.start(now);
      buzz.stop(now + 0.19);
    }

    // 7. Submarine-Style 40kHz Ultrasonic Sonar Ping + Proximity Lock
    if (input.isRunning && input.state !== "DONE" && !input.hasFault) {
      const pingInterval =
        input.distanceCm <= input.thresholdCm
          ? 170
          : Math.min(680, 190 + input.distanceCm * 4.2);

      if (nowMs - this.lastPingMs >= pingInterval) {
        this.lastPingMs = nowMs;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        if (input.distanceCm <= input.thresholdCm) {
          // Two-tone tactical obstacle proximity lock
          osc.type = "triangle";
          osc.frequency.setValueAtTime(1320, now);
          osc.frequency.setValueAtTime(1760, now + 0.045);
          gain.gain.setValueAtTime(0.045, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.11);
        } else {
          // Warm resonant acoustic sonar ping + echo tail
          osc.type = "sine";
          osc.frequency.setValueAtTime(1680, now);
          osc.frequency.exponentialRampToValueAtTime(1420, now + 0.055);
          gain.gain.setValueAtTime(0.024, now);
          gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.065);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.07);
        }
      }
    }
  }
}

export const soundEngine = new KinetiXSoundEngine();
