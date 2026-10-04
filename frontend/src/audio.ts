// Sonido 100% sintetizado con WebAudio: zumbido ambiente, pasos y efectos.
export class Sfx {
  /** Poner en true para volver a activar el zumbido y el viento de fondo. */
  static AMBIENT = false;
  private ctx?: AudioContext;
  private master?: GainNode;
  private noiseBuf?: AudioBuffer;

  start() {
    if (this.ctx) return;
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(ctx.destination);

    this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    // Sonido de fondo desactivado por ahora: sólo quedan los efectos.
    if (!Sfx.AMBIENT) return;

    // Zumbido grave de dos osciladores desafinados
    const drone = ctx.createBiquadFilter();
    drone.type = 'lowpass';
    drone.frequency.value = 180;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.06;
    drone.connect(droneGain).connect(this.master);
    for (const f of [49, 49.6, 98.3]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.connect(drone);
      o.start();
    }
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 70;
    lfo.connect(lfoGain).connect(drone.frequency);
    lfo.start();

    // Viento: ruido filtrado
    const wind = ctx.createBufferSource();
    wind.buffer = this.noiseBuf;
    wind.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 350;
    windFilter.Q.value = 0.7;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.025;
    wind.connect(windFilter).connect(windGain).connect(this.master);
    wind.start();
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, delay = 0) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur);
  }

  private burst(dur: number, freq: number, vol: number, delay = 0) {
    if (!this.ctx || !this.master || !this.noiseBuf) return;
    const t = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t, Math.random());
    s.stop(t + dur);
  }

  step() {
    this.burst(0.12, 500 + Math.random() * 200, 0.12);
  }

  beep() {
    this.tone(880, 0.08, 'square', 0.05);
  }

  correct() {
    this.tone(660, 0.15, 'square', 0.06);
    this.tone(990, 0.3, 'square', 0.06, 0.13);
  }

  wrong() {
    this.tone(150, 0.45, 'sawtooth', 0.1);
    this.tone(142, 0.45, 'sawtooth', 0.1);
  }

  locked() {
    for (let i = 0; i < 3; i++) this.burst(0.06, 2500, 0.25, i * 0.09);
  }

  unlock() {
    this.burst(0.05, 4000, 0.4);
    this.tone(70, 0.5, 'sine', 0.3, 0.05);
  }

  creak() {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(90, t);
    o.frequency.linearRampToValueAtTime(140, t + 0.6);
    o.frequency.linearRampToValueAtTime(70, t + 1.1);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.1);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 600;
    f.Q.value = 4;
    o.connect(f).connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 1.2);
  }

  buzz() {
    this.tone(120, 0.08, 'sawtooth', 0.03);
  }

  // Sirena de alarma (sube y baja) durante ~3,2 s.
  siren() {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.value = 650;
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 2.3;
    lfoGain.gain.value = 320;
    lfo.connect(lfoGain).connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.16, t + 0.1);
    g.gain.setValueAtTime(0.16, t + 2.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
    o.connect(g).connect(this.master);
    o.start(t);
    lfo.start(t);
    o.stop(t + 3.2);
    lfo.stop(t + 3.2);
  }

  // Golpe grave de terror cuando aparece el robot.
  stinger() {
    this.tone(62, 1.3, 'sawtooth', 0.22);
    this.tone(44, 1.6, 'sine', 0.22, 0.03);
    this.tone(30, 1.8, 'sine', 0.18, 0.05);
  }
}
