// Small procedural sound bed. Off until the player asks for it, because a
// sudden horn on a phone is a bug, not polish.

export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = false;

  get on(): boolean {
    return this.enabled;
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    if (this.enabled) this.start();
    else this.stop();
    return this.enabled;
  }

  private start() {
    if (this.ctx) {
      void this.ctx.resume();
      if (this.master) this.master.gain.value = 0.16;
      return;
    }
    const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return;
    this.ctx = new Context();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.16;
    this.master.connect(this.ctx.destination);
    const osc = this.ctx.createOscillator();
    const filt = this.ctx.createBiquadFilter();
    const hum = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = 46;
    filt.type = "lowpass";
    filt.frequency.value = 180;
    hum.gain.value = 0.075;
    osc.connect(filt).connect(hum).connect(this.master);
    osc.start();
    void this.ctx.resume();
  }

  private stop() {
    if (this.master) this.master.gain.value = 0;
    if (this.ctx) void this.ctx.suspend();
  }

  private tone(freq: number, duration: number, type: OscillatorType, gain = 0.16, slide = 0) {
    if (!this.enabled || !this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slide !== 0) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), now + duration);
    amp.gain.setValueAtTime(gain, now);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(amp).connect(this.master);
    osc.start(now);
    osc.stop(now + duration);
  }

  build() {
    this.tone(180, 0.16, "square", 0.12, -60);
    this.tone(510, 0.09, "triangle", 0.08, 40);
  }

  upgrade() {
    this.tone(440, 0.14, "triangle", 0.1, 220);
    this.tone(660, 0.2, "sine", 0.08, 120);
  }

  wave() {
    this.tone(110, 0.6, "sawtooth", 0.15, 18);
    this.tone(165, 0.45, "triangle", 0.08, 12);
  }

  leak() {
    this.tone(72, 0.35, "sawtooth", 0.2, -28);
  }

  clear() {
    this.tone(392, 0.22, "triangle", 0.1, 90);
    this.tone(588, 0.34, "sine", 0.08, 80);
  }

  defeat() {
    this.tone(160, 1.0, "sawtooth", 0.2, -120);
  }
}
