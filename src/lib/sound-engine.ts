"use client";

class KinetiXSoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = false;
  private lastPingMs = 0;
  private lastServoAngle = 90;

  private ensureContext() {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setEnabled(on: boolean) {
    this.enabled = on;
    if (on) {
      this.ensureContext();
      this.playBootChime();
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
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.setValueAtTime(780, now + 0.06);
    osc.frequency.setValueAtTime(1040, now + 0.12);

    gain.gain.setValueAtTime(0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.23);
  }

  public playFlashSuccess() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.setValueAtTime(990, now + 0.07);
    osc.frequency.setValueAtTime(1320, now + 0.14);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.29);
  }

  public updateTelemetrySound(
    distanceCm: number,
    thresholdCm: number,
    gripAngle: number,
    isMoving: boolean
  ) {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const nowMs = performance.now();
    // Interval between sonar clicks shrinks as distance gets closer
    const pingInterval = distanceCm <= thresholdCm ? 180 : Math.min(700, 180 + distanceCm * 4.5);

    if (nowMs - this.lastPingMs >= pingInterval) {
      this.lastPingMs = nowMs;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (distanceCm <= thresholdCm) {
        // Proximity alert double-beep
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(660, now + 0.04);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.095);
      } else if (isMoving) {
        // Subtle 40kHz-represented ultrasonic sonar tick
        osc.type = "sine";
        osc.frequency.setValueAtTime(1480, now);
        gain.gain.setValueAtTime(0.018, now);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.03);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.035);
      }
    }

    // SG90 Servo Whir Sound when jaw angle changes significantly
    if (Math.abs(gripAngle - this.lastServoAngle) > 4) {
      const closing = gripAngle < this.lastServoAngle;
      this.lastServoAngle = gripAngle;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(closing ? 320 : 260, now);
      osc.frequency.linearRampToValueAtTime(closing ? 440 : 350, now + 0.08);
      gain.gain.setValueAtTime(0.025, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.095);
    }
  }
}

export const soundEngine = new KinetiXSoundEngine();
