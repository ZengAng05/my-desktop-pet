// 番茄时间小工具：25 分钟专注 + 5 分钟休息循环，阶段切换由宠物提醒
import { eventBus } from '../../core/EventBus.js';

const pad = (n) => String(n).padStart(2, '0');

export class PomodoroWidget {
  constructor() {
    this.workSeconds = 25 * 60; // 专注 25 分钟（可自定义）
    this.breakSeconds = 5 * 60; // 休息 5 分钟（可自定义）
    this.mode = 'work'; // work | break
    this.remaining = this.workSeconds;
    this.running = false;
    this.timer = null;
    this.bodyEl = null;
  }

  /** 自定义专注/休息时长（分钟） */
  setDurations(workMin, breakMin) {
    const w = Math.max(1, Math.min(180, Math.floor(workMin) || 25));
    const b = Math.max(1, Math.min(60, Math.floor(breakMin) || 5));
    this.workSeconds = w * 60;
    this.breakSeconds = b * 60;
    // 应用新时长时回到对应阶段并重置
    this.mode = 'work';
    this.remaining = this.workSeconds;
    this.pause();
    this.renderTime();
  }

  start() {
    if (this.running) return;
    this.running = true;
    eventBus.emit('pomodoro:start', { mode: this.mode });
    this.timer = setInterval(() => this.tick(), 1000);
  }

  pause() {
    this.running = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  reset() {
    this.pause();
    this.mode = 'work';
    this.remaining = this.workSeconds;
    this.renderTime();
  }

  tick() {
    this.remaining--;
    this.renderTime();
    if (this.remaining <= 0) {
      if (this.mode === 'work') {
        // 专注结束 → 进入休息
        this.mode = 'break';
        this.remaining = this.breakSeconds;
        eventBus.emit('pomodoro:break', {});
      } else {
        // 休息结束 → 回到专注
        this.mode = 'work';
        this.remaining = this.workSeconds;
        eventBus.emit('pomodoro:work', {});
      }
      this.renderTime();
    }
  }

  fmt(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${pad(m)}:${pad(sec)}`;
  }

  render(container) {
    this.bodyEl = container;
    container.innerHTML = `
      <div class="widget-tool">
        <div class="widget-tool-title">🍅 番茄时间</div>
        <div class="pomo-settings">
          <label class="pomo-setting">
            <span>专注</span>
            <input type="number" class="pomo-work-min" min="1" max="180" value="${this.workSeconds / 60}" />
            <span>分钟</span>
          </label>
          <label class="pomo-setting">
            <span>休息</span>
            <input type="number" class="pomo-break-min" min="1" max="60" value="${this.breakSeconds / 60}" />
            <span>分钟</span>
          </label>
          <button class="pomo-apply btn-ghost">应用</button>
        </div>
        <div class="pomo-mode work">💪 专注中</div>
        <div class="pomo-display">25:00</div>
        <div class="widget-tool-row">
          <button class="pomo-start btn-primary">开始</button>
          <button class="pomo-pause btn-ghost">暂停</button>
          <button class="pomo-reset btn-ghost">重置</button>
        </div>
        <div class="widget-tool-hint">点「应用」可自定义时长</div>
      </div>
    `;

    container.querySelector('.pomo-start').addEventListener('click', () => this.start());
    container.querySelector('.pomo-pause').addEventListener('click', () => {
      this.pause();
      this.renderTime();
    });
    container.querySelector('.pomo-reset').addEventListener('click', () => this.reset());
    container.querySelector('.pomo-apply').addEventListener('click', () => {
      const workMin = parseInt(container.querySelector('.pomo-work-min').value || '25', 10);
      const breakMin = parseInt(container.querySelector('.pomo-break-min').value || '5', 10);
      this.setDurations(workMin, breakMin);
      eventBus.emit('pomodoro:start', { mode: this.mode, custom: true });
    });
    this.renderTime();
  }

  renderTime() {
    if (!this.bodyEl) return;
    const modeEl = this.bodyEl.querySelector('.pomo-mode');
    const display = this.bodyEl.querySelector('.pomo-display');
    if (modeEl) {
      modeEl.textContent = this.mode === 'work' ? '💪 专注中' : '☕ 休息中';
      modeEl.className = 'pomo-mode ' + (this.mode === 'work' ? 'work' : 'break');
    }
    if (display) display.textContent = this.fmt(this.remaining);
  }
}
