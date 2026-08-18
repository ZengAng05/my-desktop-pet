// 基于 requestAnimationFrame 的游戏循环
export class GameLoop {
  constructor() {
    this.subscribers = [];
    this.running = false;
    this.lastTime = 0;
    this.rafId = null;
  }

  /** 注册每帧更新的回调，返回取消函数 */
  subscribe(fn) {
    this.subscribers.push(fn);
    return () => {
      this.subscribers = this.subscribers.filter((f) => f !== fn);
    };
  }

  /** 启动循环 */
  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();

    const step = (now) => {
      if (!this.running) return;
      // dt 单位为秒，限制最大 0.1s 防止切后台后跳变
      const dt = Math.min((now - this.lastTime) / 1000, 0.1);
      this.lastTime = now;
      for (const fn of [...this.subscribers]) {
        fn(dt, now);
      }
      this.rafId = requestAnimationFrame(step);
    };

    this.rafId = requestAnimationFrame(step);
  }

  /** 停止循环 */
  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }
}
