// Sonido 100% sintetizado con WebAudio (sin archivos externos).
export class Sfx {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private noiseBuf!: AudioBuffer;
  muted = false;
  private last: Record<string, number> = {};
  private ambientOn = false;

  init() {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.55;
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.startAmbient();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.55;
  }

  private tone(f: number, d: number, type: OscillatorType = 'sine', v = 0.18, f2?: number, delay = 0) {
    const c = this.ctx!;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + d + 0.05);
  }

  private noise(d: number, v: number, f0: number, f1?: number, type: BiquadFilterType = 'bandpass', delay = 0) {
    const c = this.ctx!;
    const t = c.currentTime + delay;
    const s = c.createBufferSource();
    s.buffer = this.noiseBuf;
    const fl = c.createBiquadFilter();
    fl.type = type;
    fl.frequency.setValueAtTime(f0, t);
    if (f1) fl.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + d);
    fl.Q.value = 1.2;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(fl).connect(g).connect(this.master);
    s.start(t, Math.random() * 0.5);
    s.stop(t + d + 0.05);
  }

  play(n: string) {
    if (!this.ctx || this.muted) return;
    const now = performance.now();
    if (now - (this.last[n] ?? 0) < 45) return;
    this.last[n] = now;
    switch (n) {
      case 'atk':
        this.noise(0.16, 0.28, 900, 3200);
        this.tone(220, 0.1, 'triangle', 0.1, 120);
        break;
      case 'atk3':
        this.noise(0.28, 0.4, 500, 2600);
        this.tone(150, 0.25, 'sawtooth', 0.14, 60);
        break;
      case 'spc':
        this.tone(520, 0.3, 'sine', 0.2, 1500);
        this.tone(780, 0.3, 'triangle', 0.08, 2000);
        this.noise(0.2, 0.12, 2000, 5000);
        break;
      case 'cast':
        this.tone(110, 0.55, 'sawtooth', 0.12, 330);
        this.noise(0.5, 0.18, 300, 1400);
        this.tone(880, 0.6, 'sine', 0.06, 880, 0.1);
        break;
      case 'omega':
        this.tone(90, 0.9, 'sawtooth', 0.16, 500);
        this.tone(660, 0.9, 'sine', 0.1, 1320);
        this.noise(0.8, 0.2, 200, 3000);
        break;
      case 'blink':
        this.noise(0.18, 0.25, 4000, 600, 'bandpass');
        this.tone(900, 0.14, 'sine', 0.08, 300);
        break;
      case 'hit':
        this.tone(190, 0.12, 'square', 0.14, 60);
        this.noise(0.1, 0.22, 1400, 400);
        break;
      case 'hitArmor':
        this.tone(520, 0.1, 'square', 0.1, 380);
        this.noise(0.06, 0.2, 5000, 3000, 'highpass');
        break;
      case 'syn':
        this.tone(523, 0.16, 'triangle', 0.12);
        break;
      case 'synack':
        this.tone(523, 0.12, 'triangle', 0.08);
        this.tone(659, 0.2, 'triangle', 0.12, undefined, 0.06);
        break;
      case 'ack':
        this.tone(659, 0.12, 'triangle', 0.08);
        this.tone(784, 0.25, 'triangle', 0.14, undefined, 0.06);
        break;
      case 'est':
        [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.35, 'square', 0.07, undefined, i * 0.055));
        this.noise(0.5, 0.3, 300, 4000);
        this.tone(70, 0.5, 'sine', 0.3, 40);
        break;
      case 'rst':
        this.tone(300, 0.25, 'sawtooth', 0.1, 70);
        break;
      case 'hurt':
        this.tone(240, 0.3, 'sawtooth', 0.2, 70);
        this.noise(0.25, 0.3, 700, 200);
        break;
      case 'telegraph':
        this.tone(200, 0.35, 'sine', 0.05, 520);
        break;
      case 'throw':
        this.noise(0.2, 0.2, 1500, 700);
        break;
      case 'slam':
        this.tone(80, 0.4, 'sine', 0.35, 30);
        this.noise(0.35, 0.3, 400, 80, 'lowpass');
        break;
      case 'spawn':
        this.tone(160, 0.5, 'sine', 0.08, 420);
        this.noise(0.4, 0.1, 600, 2400);
        break;
      case 'die':
        this.tone(300, 0.4, 'sawtooth', 0.1, 50);
        this.noise(0.3, 0.2, 1800, 200);
        break;
      case 'pickup':
        [659, 880, 1175].forEach((f, i) => this.tone(f, 0.3, 'sine', 0.12, undefined, i * 0.07));
        break;
      case 'door':
        this.tone(70, 0.8, 'sawtooth', 0.12, 140);
        this.noise(0.7, 0.12, 200, 900);
        break;
      case 'select':
        this.tone(740, 0.08, 'triangle', 0.1);
        break;
      case 'talk':
        this.tone(520 + Math.random() * 80, 0.035, 'triangle', 0.05);
        break;
      case 'zeus':
        this.noise(0.25, 0.4, 6000, 1000, 'highpass');
        this.tone(60, 0.3, 'sawtooth', 0.2, 30);
        break;
      case 'boss':
        this.tone(55, 1.4, 'sawtooth', 0.25, 110);
        this.tone(58, 1.4, 'sawtooth', 0.2, 112);
        break;
      case 'win':
        [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => this.tone(f, 0.6, 'triangle', 0.12, undefined, i * 0.14));
        break;
      case 'lose':
        [392, 349, 311, 262].forEach((f, i) => this.tone(f, 0.7, 'sawtooth', 0.1, f * 0.9, i * 0.25));
        break;
    }
  }

  private startAmbient() {
    if (!this.ctx || this.ambientOn) return;
    this.ambientOn = true;
    const c = this.ctx;
    const g = c.createGain();
    g.gain.value = 0.05;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 260;
    const lfo = c.createOscillator();
    const lfoG = c.createGain();
    lfo.frequency.value = 0.07;
    lfoG.gain.value = 120;
    lfo.connect(lfoG).connect(lp.frequency);
    lfo.start();
    [55, 55.35, 82.4].forEach((f) => {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.connect(lp);
      o.start();
    });
    lp.connect(g).connect(this.master);
    const scale = [220, 261.6, 329.6, 392, 440, 523.3];
    setInterval(() => {
      if (!this.ctx || this.muted || Math.random() < 0.35) return;
      const f = scale[Math.floor(Math.random() * scale.length)] * (Math.random() < 0.3 ? 2 : 1);
      this.tone(f, 2.8, 'sine', 0.035);
      this.tone(f * 2.01, 2, 'sine', 0.012);
    }, 2600);
  }
}
