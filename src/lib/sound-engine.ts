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
  private compressor: DynamicsCompressorNode | null = null;
  private enabled = false;

  // Continuous 3-Layer DC Gearmotor + Spur Gearbox + PWM Whine Synth
  private motorOscArmature: OscillatorNode | null = null;
  private motorOscGearbox: OscillatorNode | null = null;
  private motorOscPwm: OscillatorNode | null = null;
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
        this.initAudioGraph(this.ctx);
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getOutputNode(ctx: AudioContext): AudioNode {
    return this.compressor || ctx.destination;
  }

  private initAudioGraph(ctx: AudioContext) {
    // Master Dynamics Compressor + Makeup Gain so laptop speakers sound loud, punchy & clear
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.setValueAtTime(-18, ctx.currentTime);
    comp.knee.setValueAtTime(10, ctx.currentTime);
    comp.ratio.setValueAtTime(4, ctx.currentTime);
    comp.attack.setValueAtTime(0.003, ctx.currentTime);
    comp.release.setValueAtTime(0.15, ctx.currentTime);

    const makeup = ctx.createGain();
    makeup.gain.setValueAtTime(1.45, ctx.currentTime);

    comp.connect(makeup);
    makeup.connect(ctx.destination);
    this.compressor = comp;

    // Continuous 1:48 Geared DC Motor Synth tuned for Laptop Speaker Sweet Spot (140 Hz - 1800 Hz)
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, ctx.currentTime);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1450, ctx.currentTime);
    filter.Q.setValueAtTime(3.2, ctx.currentTime);

    // Layer 1: Motor Armature Buzz (Sawtooth 140-280 Hz)
    const oscArmature = ctx.createOscillator();
    oscArmature.type = "sawtooth";
    oscArmature.frequency.setValueAtTime(150, ctx.currentTime);

    const armGain = ctx.createGain();
    armGain.gain.setValueAtTime(0.55, ctx.currentTime);

    // Layer 2: 1:48 Spur Gearbox Mesh Whine (Square 280-560 Hz - super audible on laptop speakers!)
    const oscGearbox = ctx.createOscillator();
    oscGearbox.type = "square";
    oscGearbox.frequency.setValueAtTime(300, ctx.currentTime);

    const gearGain = ctx.createGain();
    gearGain.gain.setValueAtTime(0.32, ctx.currentTime);

    // Layer 3: L298N PWM Carrier Harmonic (Triangle 580-1100 Hz)
    const oscPwm = ctx.createOscillator();
    oscPwm.type = "triangle";
    oscPwm.frequency.setValueAtTime(620, ctx.currentTime);

    const pwmGain = ctx.createGain();
    pwmGain.gain.setValueAtTime(0.22, ctx.currentTime);

    // Mechanical Gear-Tooth Cadence LFO (22 Hz -> 42 Hz)
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(24, ctx.currentTime);

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(14, ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(oscArmature.frequency);
    lfoGain.connect(oscGearbox.frequency);

    oscArmature.connect(armGain);
    oscGearbox.connect(gearGain);
    oscPwm.connect(pwmGain);

    armGain.connect(filter);
    gearGain.connect(filter);
    pwmGain.connect(filter);

    filter.connect(masterGain);
    masterGain.connect(comp);

    oscArmature.start();
    oscGearbox.start();
    oscPwm.start();
    lfo.start();

    this.motorOscArmature = oscArmature;
    this.motorOscGearbox = oscGearbox;
    this.motorOscPwm = oscPwm;
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
    const out = this.getOutputNode(ctx);

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      gain.gain.setValueAtTime(0.28, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.002, now + idx * 0.06 + 0.19);
      osc.connect(gain);
      gain.connect(out);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.2);
    });
  }

  public playFlashSuccess() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const out = this.getOutputNode(ctx);

    const now = ctx.currentTime;
    const notes = [587.33, 880, 1174.66];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);
      gain.gain.setValueAtTime(0.32, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.002, now + idx * 0.07 + 0.24);
      osc.connect(gain);
      gain.connect(out);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.25);
    });
  }

  // Strained Servo Stall Groan + Triple Overload Rejection Alarm (when payload weight > maxLoadKg)
  public playOverloadReject() {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const out = this.getOutputNode(ctx);

    const now = ctx.currentTime;

    // 1. Strained Servo Motor Stall Groan (0.0s - 0.35s)
    const stallOsc = ctx.createOscillator();
    const stallGain = ctx.createGain();
    stallOsc.type = "sawtooth";
    stallOsc.frequency.setValueAtTime(195, now);
    stallOsc.frequency.linearRampToValueAtTime(115, now + 0.32);
    stallGain.gain.setValueAtTime(0.38, now);
    stallGain.gain.exponentialRampToValueAtTime(0.002, now + 0.35);
    stallOsc.connect(stallGain);
    stallGain.connect(out);
    stallOsc.start(now);
    stallOsc.stop(now + 0.36);

    // 2. Descending Overload Rejection Alarm Beeps (0.36s - 0.85s)
    [740, 523.25, 370].forEach((freq, idx) => {
      const t0 = now + 0.36 + idx * 0.14;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.35, t0);
      g.gain.exponentialRampToValueAtTime(0.002, t0 + 0.12);
      osc.connect(g);
      g.connect(out);
      osc.start(t0);
      osc.stop(t0 + 0.13);
    });
  }

  // Loud, Crisp 340ms SG90 Micro-Servo Gear Train Whir + Mechanical Clamp Thud
  private playServoActuation(closing: boolean) {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const out = this.getOutputNode(ctx);

    const now = ctx.currentTime;
    const duration = 0.34;

    const carrier = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    carrier.type = "sawtooth";
    const startFreq = closing ? 480 : 860;
    const endFreq = closing ? 880 : 460;
    carrier.frequency.setValueAtTime(startFreq, now);
    carrier.frequency.linearRampToValueAtTime(endFreq, now + duration);

    mod.type = "square";
    mod.frequency.setValueAtTime(64, now);
    modGain.gain.setValueAtTime(75, now);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1100, now);
    filter.Q.setValueAtTime(1.4, now);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.38, now + 0.03);
    gain.gain.setValueAtTime(0.36, now + duration - 0.05);
    gain.gain.exponentialRampToValueAtTime(0.002, now + duration);

    mod.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(filter);
    filter.connect(gain);
    gain.connect(out);

    carrier.start(now);
    mod.start(now);
    carrier.stop(now + duration + 0.01);
    mod.stop(now + duration + 0.01);

    // Mechanical jaw clamp click/thud at end of travel
    const thud = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thud.type = "triangle";
    thud.frequency.setValueAtTime(closing ? 240 : 190, now + duration - 0.03);
    thud.frequency.exponentialRampToValueAtTime(68, now + duration + 0.09);
    thudGain.gain.setValueAtTime(0.45, now + duration - 0.03);
    thudGain.gain.exponentialRampToValueAtTime(0.002, now + duration + 0.095);

    thud.connect(thudGain);
    thudGain.connect(out);
    thud.start(now + duration - 0.03);
    thud.stop(now + duration + 0.1);
  }

  // Loud H-Bridge Active Dynamic Brake Screech / Deceleration Chirp
  private playBrakeScreech() {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const out = this.getOutputNode(ctx);

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.2);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1200, now);

    gain.gain.setValueAtTime(0.36, now);
    gain.gain.exponentialRampToValueAtTime(0.002, now + 0.21);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  // State Transition Telemetry Chimes
  private playStateChime(newState: string) {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const out = this.getOutputNode(ctx);

    const now = ctx.currentTime;
    if (newState === "CARRY") {
      [587.33, 880].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(f, now + i * 0.08);
        g.gain.setValueAtTime(0.3, now + i * 0.08);
        g.gain.exponentialRampToValueAtTime(0.002, now + i * 0.08 + 0.18);
        osc.connect(g);
        g.connect(out);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.19);
      });
    } else if (newState === "DONE") {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(f, now + i * 0.08);
        g.gain.setValueAtTime(0.32, now + i * 0.08);
        g.gain.exponentialRampToValueAtTime(0.002, now + i * 0.08 + 0.34);
        osc.connect(g);
        g.connect(out);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.35);
      });
    }
  }

  public updateTelemetrySound(input: SoundTelemetryInput) {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const out = this.getOutputNode(ctx);

    const now = ctx.currentTime;
    const nowMs = performance.now();

    // 1. Update Continuous 1:48 Geared DC Motor + Gearbox Whine (Loud & Clear on Laptop Speakers!)
    if (
      this.motorOscArmature &&
      this.motorOscGearbox &&
      this.motorOscPwm &&
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
        // Tuned to 145 Hz - 290 Hz fundamental + 290 Hz - 580 Hz gearbox harmonic + 580 Hz - 1160 Hz PWM whine
        const baseFreq = isSpinning
          ? 185 + pwmNorm * 95
          : isReversing
          ? 135 + pwmNorm * 65
          : 145 + pwmNorm * 85;

        this.motorOscArmature.frequency.setTargetAtTime(baseFreq, now, 0.04);
        this.motorOscGearbox.frequency.setTargetAtTime(baseFreq * 2.0, now, 0.04);
        this.motorOscPwm.frequency.setTargetAtTime(baseFreq * 4.0, now, 0.04);
        this.motorLfo.frequency.setTargetAtTime(18 + pwmNorm * 22, now, 0.04);
        this.motorFilter.frequency.setTargetAtTime(
          isSpinning ? 2100 : 1250 + pwmNorm * 650,
          now,
          0.04
        );
        this.motorMasterGain.gain.setTargetAtTime(
          isSpinning ? 0.34 : 0.24 + pwmNorm * 0.08,
          now,
          0.04
        );
      } else {
        this.motorOscArmature.frequency.setTargetAtTime(90, now, 0.08);
        this.motorOscGearbox.frequency.setTargetAtTime(180, now, 0.08);
        this.motorMasterGain.gain.setTargetAtTime(0.0001, now, 0.05);
      }

      // 2. Loud Industrial Reverse Backup Beeper when reversing
      if (isDriving && isReversing && nowMs - this.lastReverseBeepMs > 330) {
        this.lastReverseBeepMs = nowMs;
        const beep = ctx.createOscillator();
        const bGain = ctx.createGain();
        beep.type = "square";
        beep.frequency.setValueAtTime(1120, now);
        bGain.gain.setValueAtTime(0.28, now);
        bGain.gain.exponentialRampToValueAtTime(0.002, now + 0.13);
        beep.connect(bGain);
        bGain.connect(out);
        beep.start(now);
        beep.stop(now + 0.14);
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
    if (input.hasFault && nowMs - this.lastFaultBuzzMs > 420) {
      this.lastFaultBuzzMs = nowMs;
      const buzz = ctx.createOscillator();
      const bGain = ctx.createGain();
      buzz.type = "sawtooth";
      buzz.frequency.setValueAtTime(220, now);
      buzz.frequency.setValueAtTime(165, now + 0.09);
      bGain.gain.setValueAtTime(0.34, now);
      bGain.gain.exponentialRampToValueAtTime(0.002, now + 0.2);
      buzz.connect(bGain);
      bGain.connect(out);
      buzz.start(now);
      buzz.stop(now + 0.21);
    }

    // 7. Submarine-Style Ultrasonic Sonar Ping + Tactical Proximity Alert
    if (input.isRunning && input.state !== "DONE" && !input.hasFault) {
      const pingInterval =
        input.distanceCm <= input.thresholdCm
          ? 165
          : Math.min(640, 185 + input.distanceCm * 4.0);

      if (nowMs - this.lastPingMs >= pingInterval) {
        this.lastPingMs = nowMs;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        if (input.distanceCm <= input.thresholdCm) {
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(1380, now);
          osc.frequency.setValueAtTime(1880, now + 0.045);
          gain.gain.setValueAtTime(0.32, now);
          gain.gain.exponentialRampToValueAtTime(0.002, now + 0.11);
          osc.connect(gain);
          gain.connect(out);
          osc.start(now);
          osc.stop(now + 0.12);
        } else {
          osc.type = "triangle";
          osc.frequency.setValueAtTime(1760, now);
          osc.frequency.exponentialRampToValueAtTime(1440, now + 0.065);
          gain.gain.setValueAtTime(0.22, now);
          gain.gain.exponentialRampToValueAtTime(0.002, now + 0.075);
          osc.connect(gain);
          gain.connect(out);
          osc.start(now);
          osc.stop(now + 0.08);
        }
      }
    }
  }
}

export const soundEngine = new KinetiXSoundEngine();
