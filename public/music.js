// JavaScript / public/music.js / Web Audio API / original procedural electronic loop
export class Soundtrack {
  constructor(onChange = () => {}) {
    this.onChange = onChange;
    this.enabled = false;
    this.volume = 0.25;
    this.step = 0;
    this.timer = null;
    this.suspendTimer = null;
    this.next = 0;
    document.addEventListener('visibilitychange', () => {
      if (!this.enabled || !this.context) return;
      if (document.hidden) {
        clearInterval(this.timer);
        this.timer = null;
        this.context.suspend().catch(() => {});
      } else {
        this.start().catch(() => {
          this.enabled = false;
          this.onChange();
        });
      }
      this.onChange();
    });
  }

  initialize() {
    if (this.context) return;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) throw Error('Este navegador não oferece suporte à música.');
    this.context = new Audio();
    this.master = this.context.createGain();
    this.master.gain.value = this.volume * 0.22;
    this.master.connect(this.context.destination);
    this.noise = this.context.createBuffer(1, this.context.sampleRate * 0.1, this.context.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.context.onstatechange = () => this.onChange();
  }

  async start() {
    clearTimeout(this.suspendTimer);
    this.initialize();
    await this.context.resume();
    if (this.context.state !== 'running') throw Error('Toque novamente para liberar a música.');
    this.enabled = true;
    this.master.gain.cancelScheduledValues(this.context.currentTime);
    this.master.gain.setTargetAtTime(this.volume * 0.22, this.context.currentTime, 0.035);
    if (!this.timer) {
      this.next = this.context.currentTime + 0.04;
      this.schedule();
      this.timer = setInterval(() => this.schedule(), 30);
    }
    this.onChange();
  }

  stop() {
    this.enabled = false;
    clearInterval(this.timer);
    this.timer = null;
    if (this.context) {
      this.master.gain.setTargetAtTime(0, this.context.currentTime, 0.025);
      this.suspendTimer = setTimeout(() => {
        if (!this.enabled) this.context.suspend().catch(() => {});
      }, 140);
    }
    this.onChange();
  }

  setVolume(value) {
    this.volume = Math.min(1, Math.max(0, value));
    if (this.context) this.master.gain.setTargetAtTime(this.enabled ? this.volume * 0.22 : 0, this.context.currentTime, 0.03);
  }

  note(midi, time, duration, type = 'triangle', amplitude = 0.2) {
    const osc = this.context.createOscillator(), envelope = this.context.createGain();
    osc.type = type;
    osc.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(amplitude, time + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(envelope);
    envelope.connect(this.master);
    osc.start(time);
    osc.stop(time + duration + 0.02);
    osc.onended = () => { osc.disconnect(); envelope.disconnect(); };
  }

  kick(time) {
    const osc = this.context.createOscillator(), gain = this.context.createGain();
    osc.frequency.setValueAtTime(120, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.16);
    gain.gain.setValueAtTime(0.7, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.22);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(time);
    osc.stop(time + 0.23);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  hat(time, accent) {
    const source = this.context.createBufferSource(), filter = this.context.createBiquadFilter(), gain = this.context.createGain();
    source.buffer = this.noise;
    filter.type = 'highpass';
    filter.frequency.value = 6500;
    gain.gain.setValueAtTime(accent ? 0.11 : 0.055, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.045);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(time);
    source.stop(time + 0.06);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }

  schedule() {
    if (!this.enabled || this.context.state !== 'running') return;
    const interval = 60 / 104 / 4;
    if (this.next < this.context.currentTime) this.next = this.context.currentTime + 0.02;
    while (this.next < this.context.currentTime + 0.12) {
      const step = this.step % 16, bar = Math.floor(this.step / 16) % 4;
      const root = [45, 41, 48, 43][bar];
      if (step % 4 === 0) this.kick(this.next);
      if (step % 2 === 0) this.hat(this.next, step % 4 === 2);
      if ([0, 3, 6, 8, 11, 14].includes(step)) this.note(root - 12, this.next, 0.21, 'sine', 0.35);
      const melody = [0, 7, 12, 15, 7, 12, 19, 12];
      if (step % 2 === 0) this.note(root + 12 + melody[step / 2], this.next, 0.24, 'triangle', 0.095);
      if (step === 0) for (const note of [root + 12, root + 15, root + 19]) this.note(note, this.next, interval * 13, 'sine', 0.045);
      this.next += interval;
      this.step++;
    }
  }
}
