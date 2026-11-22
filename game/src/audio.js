// EMBER PACT — sound: small WebAudio oscillator effects, no audio files.
// The context is created lazily on the first user gesture (browsers block
// audio before one), and M toggles mute. Nothing here loads over the network.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  // One oscillator blip: frequency, seconds, wave shape, volume, slide-to.
  tone(freq, dur, type, vol, slideTo) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + dur);
    gain.gain.setValueAtTime(vol || 0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  play(name) {
    if (this.muted) return;
    switch (name) {
      case 'click': this.tone(660, 0.06, 'triangle', 0.08); break;
      case 'draw': this.tone(520, 0.09, 'sine', 0.09, 780); break;
      case 'play': this.tone(392, 0.12, 'triangle', 0.12, 523); break;
      case 'damage': this.tone(180, 0.22, 'sawtooth', 0.14, 70); break;
      case 'heal': this.tone(523, 0.25, 'sine', 0.1, 784); break;
      case 'shield': this.tone(330, 0.18, 'square', 0.07, 440); break;
      case 'venom': this.tone(220, 0.3, 'sawtooth', 0.1, 110); break;
      case 'surge': this.tone(587, 0.12, 'triangle', 0.14, 880); this.tone(880, 0.2, 'triangle', 0.12, 1174); break;
      case 'turn': this.tone(440, 0.1, 'sine', 0.09, 660); break;
      case 'win': [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, 'triangle', 0.12), i * 130)); break;
      case 'lose': [392, 330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, 'sawtooth', 0.08), i * 150)); break;
      default: break;
    }
  }
}
