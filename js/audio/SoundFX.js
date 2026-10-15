/**
 * SoundFX.js
 * Procedural Web Audio API sound synthesizer for Infinity Tic-Tac-Toe.
 * Generates all sound effects dynamically without external audio assets.
 */

export class SoundFX {
  constructor() {
    this.audioCtx = null;
    this.isMuted = localStorage.getItem('ttt_infinity_sound') === 'muted';
    this.masterGain = null;
  }

  /**
   * Initializes or resumes AudioContext upon user gesture
   */
  initContext() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
        this.masterGain = this.audioCtx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.25, this.audioCtx.currentTime);
        this.masterGain.connect(this.audioCtx.destination);
      }
    } else if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  /**
   * Toggles sound on/off
   * @returns {boolean} New mute state
   */
  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('ttt_infinity_sound', this.isMuted ? 'muted' : 'active');
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.25, this.audioCtx.currentTime);
    }
    return this.isMuted;
  }

  /**
   * Crisp move placement sound
   * @param {'X' | 'O'} player 
   */
  playMove(player) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (player === 'X') {
      // Electric bright chime for X
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    } else {
      // Resonant deep chime for O
      osc.type = 'sine';
      osc.frequency.setValueAtTime(329.63, now); // E4
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.12); // A4
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    }

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  /**
   * Dissolve / evaporating piece sound effect
   */
  playVanish() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.35);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.36);
  }

  /**
   * Clock tick sound for critical countdown seconds
   */
  playTick() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(1000, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  /**
   * Amber alert sound when piece is next to expire
   */
  playWarning() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(659.25, now); // E5
    osc.frequency.setValueAtTime(880, now + 0.08); // A5

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  /**
   * Triumphant victory arpeggio
   */
  playWin() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.audioCtx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => {
        if (this.isMuted || !this.audioCtx) return;
        const ctx = this.audioCtx;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.45);
      }, i * 110);
    });
  }

  /**
   * Low buzzer for turn timeout
   */
  playTimeout() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.35);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.45);
  }

  /**
   * Ascending reset chime for resetting rounds and scores
   */
  playReset() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    const notes = [440, 659.25, 880];
    notes.forEach((freq, idx) => {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.15, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.18);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.22);
    });
  }
}

