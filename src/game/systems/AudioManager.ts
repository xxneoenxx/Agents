// AudioManager: kurze, prozedural per WebAudio erzeugte SFX (keine externen
// Asset-Dateien -> keine Lizenzfragen). Abschaltbar; startet den AudioContext
// erst nach einer Nutzergeste (Autoplay-Richtlinien).

export type SfxName = 'coin' | 'serve' | 'buy' | 'levelup' | 'deal';

type AudioCtor = typeof AudioContext;

export class AudioManager {
  private ctx?: AudioContext;
  private enabled: boolean;
  private lastPlayMs: Record<string, number> = {};

  constructor(enabled: boolean) {
    this.enabled = enabled;
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (on) this.resume();
  }

  /** Nach der ersten Nutzergeste aufrufen, um den Context zu aktivieren. */
  resume(): void {
    const ctx = this.context();
    if (ctx && ctx.state === 'suspended') void ctx.resume();
  }

  private context(): AudioContext | undefined {
    if (!this.enabled) return undefined;
    if (!this.ctx) {
      const Ctor: AudioCtor | undefined =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
      if (!Ctor) return undefined;
      try {
        this.ctx = new Ctor();
      } catch {
        return undefined;
      }
    }
    return this.ctx;
  }

  // Ein einzelner Ton mit Huellkurve.
  private tone(
    ctx: AudioContext,
    freq: number,
    startAt: number,
    duration: number,
    type: OscillatorType,
    peak: number,
    slideTo?: number,
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startAt);
    if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(slideTo, startAt + duration);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(startAt);
    osc.stop(startAt + duration + 0.02);
  }

  play(name: SfxName): void {
    const ctx = this.context();
    if (!ctx) return;
    // Drosselung, damit haeufige Ereignisse (v. a. Muenzen) nicht uebersteuern.
    const minInterval = name === 'coin' ? 200 : 60;
    const now = performance.now();
    if (now - (this.lastPlayMs[name] ?? 0) < minInterval) return;
    this.lastPlayMs[name] = now;

    const t = ctx.currentTime;
    switch (name) {
      case 'coin':
        this.tone(ctx, 880, t, 0.09, 'triangle', 0.06);
        this.tone(ctx, 1320, t + 0.06, 0.1, 'triangle', 0.05);
        break;
      case 'serve':
        this.tone(ctx, 520, t, 0.08, 'sine', 0.05, 660);
        break;
      case 'buy':
        this.tone(ctx, 440, t, 0.1, 'square', 0.04, 880);
        break;
      case 'deal':
        this.tone(ctx, 660, t, 0.12, 'triangle', 0.06, 990);
        break;
      case 'levelup':
        this.tone(ctx, 523, t, 0.12, 'triangle', 0.06);
        this.tone(ctx, 659, t + 0.1, 0.12, 'triangle', 0.06);
        this.tone(ctx, 784, t + 0.2, 0.16, 'triangle', 0.06);
        break;
    }
  }
}
