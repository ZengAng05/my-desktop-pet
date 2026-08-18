// 动态场景特效：画布粒子系统，让背景"活"起来
// 支持：萤火虫（夜晚/傍晚）、光尘（白天）、星空（夜晚）
export class AmbientFX {
  constructor(canvas, config) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.config = config;
    this.particles = [];
    this.stars = [];
    this.running = false;
    this.last = 0;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.floor(this.w * dpr);
    this.canvas.height = Math.floor(this.h * dpr);
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.initStars();
  }

  /** 当前时间段 */
  getPeriod() {
    const h = new Date().getHours();
    if (h >= 5 && h < 11) return 'morning';
    if (h >= 11 && h < 14) return 'noon';
    if (h >= 14 && h < 18) return 'afternoon';
    if (h >= 18 && h < 23) return 'evening';
    return 'night';
  }

  /** 预生成星星位置（固定点 + 闪烁） */
  initStars() {
    this.stars = [];
    const count = Math.min(90, Math.floor((this.w * this.h) / 16000));
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.w,
        y: Math.random() * this.h * 0.65,
        size: Math.random() * 1.6 + 0.4,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 1.6 + 0.4
      });
    }
  }

  start() {
    if (this.running || !this.config.enabled) return;
    this.running = true;
    this.last = performance.now();
    const step = (now) => {
      if (!this.running) return;
      const dt = Math.min((now - this.last) / 1000, 0.05);
      this.last = now;
      this.update(dt);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  stop() {
    this.running = false;
  }

  countType(type) {
    let n = 0;
    for (const p of this.particles) if (p.type === type) n++;
    return n;
  }

  update(dt) {
    const period = this.getPeriod();
    this.spawn(dt, period);
    this.updateParticles(dt);
    this.draw(period);
  }

  /** 按时间段与场景生成粒子 */
  spawn(dt, period) {
    const density = this.config.density || 1;
    const r = Math.random;

    // 萤火虫（夜晚最多，傍晚次之，白天少量）
    const fireflyTarget = period === 'night' ? 26 : period === 'evening' ? 14 : 4;
    if (this.countType('firefly') < fireflyTarget * density && r() < dt * 2) {
      this.particles.push(this.makeFirefly());
    }

    // 光尘（白天为主）
    const sparkleTarget = period === 'morning' || period === 'noon' || period === 'afternoon' ? 20 : 6;
    if (this.countType('sparkle') < sparkleTarget * density && r() < dt * 3) {
      this.particles.push(this.makeSparkle());
    }
  }

  makeFirefly() {
    return {
      type: 'firefly',
      x: Math.random() * this.w,
      y: Math.random() * this.h,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 0.5) * 10,
      size: Math.random() * 1.6 + 1,
      life: 8 + Math.random() * 6,
      maxLife: 14,
      phase: Math.random() * Math.PI * 2,
      drift: Math.random() * Math.PI * 2,
      alpha: 0.6 + Math.random() * 0.4
    };
  }

  makeSparkle() {
    return {
      type: 'sparkle',
      x: Math.random() * this.w,
      y: this.h + 8,
      size: Math.random() * 1.6 + 0.8,
      life: 8 + Math.random() * 8,
      maxLife: 16,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.5
    };
  }

  updateParticles(dt) {
    const p = this.particles;
    for (let i = p.length - 1; i >= 0; i--) {
      const pt = p[i];
      pt.life -= dt;
      if (pt.life <= 0) {
        p.splice(i, 1);
        continue;
      }
      pt.phase += dt * 2;
      switch (pt.type) {
        case 'firefly':
          pt.x += (pt.vx + Math.sin(pt.phase + pt.drift) * 12) * dt;
          pt.y += (pt.vy + Math.cos(pt.phase) * 9) * dt;
          if (pt.x < -12) pt.x = this.w + 12;
          if (pt.x > this.w + 12) pt.x = -12;
          if (pt.y < -12) pt.y = this.h + 12;
          if (pt.y > this.h + 12) pt.y = -12;
          break;
        case 'sparkle':
          pt.x += Math.sin(pt.phase) * 8 * dt;
          pt.y -= 8 * dt;
          break;
      }
    }
  }

  draw(period) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    const now = performance.now() / 1000;

    // 星空（夜晚/傍晚闪烁）
    if (period === 'night' || period === 'evening') {
      const strength = period === 'night' ? 1 : 0.45;
      for (const s of this.stars) {
        const tw = 0.5 + 0.5 * Math.sin(now * s.speed + s.phase);
        ctx.globalAlpha = tw * strength;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    for (const pt of this.particles) {
      const fadeIn = Math.min(1, pt.life / 0.8);
      const fadeOut = pt.life < 0.8 ? pt.life / 0.8 : 1;
      const alpha = Math.min(fadeIn, fadeOut) * pt.alpha;

      switch (pt.type) {
        case 'firefly': {
          // 萤火虫发光（径向渐变光晕 + 亮点）
          const glow = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, pt.size * 6);
          glow.addColorStop(0, `rgba(255, 233, 130, ${0.85 * alpha})`);
          glow.addColorStop(0.3, `rgba(255, 214, 90, ${0.3 * alpha})`);
          glow.addColorStop(1, 'rgba(255, 214, 90, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size * 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `rgba(255, 250, 210, ${alpha})`;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'sparkle':
          ctx.fillStyle = `rgba(255, 255, 235, ${alpha * 0.7})`;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
          ctx.fill();
          break;
      }
    }
  }
}
