/**
 * Confetti.js
 * Lightweight, high-performance canvas confetti celebration emitter.
 */

export class Confetti {
  constructor(canvasId = 'confetti-canvas') {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.particles = [];
    this.animationId = null;

    if (this.canvas) {
      this.resize();
      window.addEventListener('resize', () => this.resize());
    }
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  /**
   * Fires a burst of celebration confetti
   * @param {'X' | 'O'} winner 
   */
  launch(winner) {
    if (!this.canvas || !this.ctx) return;
    this.resize();

    const colors = winner === 'X' 
      ? ['#00F0FF', '#0099FF', '#FFFFFF', '#7000FF']
      : ['#FF007A', '#FF7700', '#FFFFFF', '#FFD700'];

    this.particles = [];
    const count = 100;

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: this.canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: this.canvas.height * 0.45,
        w: Math.random() * 8 + 4,
        h: Math.random() * 6 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 16,
        vy: -Math.random() * 15 - 5,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        gravity: 0.35,
        opacity: 1,
        fadeSpeed: 0.008 + Math.random() * 0.008
      });
    }

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.loop();
  }

  loop() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.98;
      p.rotation += p.rotationSpeed;
      p.opacity -= p.fadeSpeed;

      if (p.opacity <= 0 || p.y > this.canvas.height) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.max(0, p.opacity);
      this.ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      this.ctx.restore();
    }

    if (this.particles.length > 0) {
      this.animationId = requestAnimationFrame(() => this.loop());
    } else {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.animationId = null;
    }
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    this.particles = [];
  }
}
