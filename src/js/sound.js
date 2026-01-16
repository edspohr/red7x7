// Sound Manager using Web Audio API (No assets required)

class SoundManager {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.3; // Volume
    this.masterGain.connect(this.ctx.destination);
  }

  playTone(freq, type, duration, startTime = 0) {
    if (this.ctx.state === "suspended") this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);

    // Envelope
    gain.gain.setValueAtTime(0, this.ctx.currentTime + startTime);
    gain.gain.linearRampToValueAtTime(
      1,
      this.ctx.currentTime + startTime + 0.05
    );
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      this.ctx.currentTime + startTime + duration
    );

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(this.ctx.currentTime + startTime);
    osc.stop(this.ctx.currentTime + startTime + duration);
  }

  playSuccess() {
    // "Ding-Dong" / Major Third ascending
    this.playTone(523.25, "sine", 0.6, 0); // C5
    this.playTone(659.25, "sine", 0.8, 0.15); // E5
    this.playTone(783.99, "sine", 1.0, 0.3); // G5 (Triad)
  }

  playError() {
    // "Buzz" / Discordant
    this.playTone(150, "sawtooth", 0.4, 0);
    this.playTone(145, "sawtooth", 0.4, 0); // Dissonance
  }

  playUnlock() {
    // "Magical" sweep
    this.playTone(440, "sine", 0.1, 0);
    this.playTone(554, "sine", 0.1, 0.1);
    this.playTone(659, "sine", 0.3, 0.2);
    this.playTone(880, "sine", 0.6, 0.3);
  }
}

export const sounds = new SoundManager();
