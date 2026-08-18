// 倒计时小工具：设定目标时长，实时倒数，到 0 提醒
import { eventBus } from '../../core/EventBus.js';

const pad = (n) => String(n).padStart(2, '0');

export class CountdownWidget {
  constructor() {
    this.remaining = 0; // 剩余秒数
    this.total = 0;
    this.running = false;
    this.timer = null;
    this.bodyEl = null;
  }

  setSeconds(s) {
    this.remaining = Math.max(0, Math.floor(s));
    this.total = this.remaining;
  }

  start() {
    if (this.running || this.remaining <= 0) return;
    this.running = true;
    eventBus.emit('countdown:set', { total: this.total });
    this.timer = setInterval(() => this.tick(), 1000);
  }

  pause() {
    this.running = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  reset() {
    this.pause();
    this.remaining = this.total;
    this.renderTime();
  }

  tick() {
    this.remaining--;
    this.renderTime();
    if (this.remaining <= 0) {
      this.pause();
      eventBus.emit('countdown:end', { total: this.total });
    }
  }

  fmt(s) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${pad(h)}:${pad(m)}:${pad(sec)}`;
  }

  render(container) {
    this.bodyEl = container;
    container.innerHTML = `
      <div class="widget-tool">
        <div class="widget-tool-title">⏳ 倒计时</div>
        <div class="cd-inputs">
          <input type="number" class="cd-h" min="0" max="99" value="0" title="时" />
          <span class="cd-sep">:</span>
          <input type="number" class="cd-m" min="0" max="59" value="5" title="分" />
          <span class="cd-sep">:</span>
          <input type="number" class="cd-s" min="0" max="59" value="0" title="秒" />
        </div>
        <div class="cd-display">00:05:00</div>
        <div class="widget-tool-row">
          <button class="cd-start btn-primary">开始</button>
          <button class="cd-pause btn-ghost">暂停</button>
          <button class="cd-reset btn-ghost">重置</button>
        </div>
        <div class="widget-tool-hint">到 0 时小团子会提醒你哦~</div>
      </div>
    `;

    const readInputs = () => {
      const h = Math.max(0, parseInt(container.querySelector('.cd-h').value || '0', 10) || 0);
      const m = Math.max(0, parseInt(container.querySelector('.cd-m').value || '0', 10) || 0);
      const s = Math.max(0, parseInt(container.querySelector('.cd-s').value || '0', 10) || 0);
      return h * 3600 + m * 60 + s;
    };

    container.querySelector('.cd-start').addEventListener('click', () => {
      if (!this.running) {
        if (this.remaining <= 0) this.setSeconds(readInputs());
        this.start();
        this.renderTime();
      }
    });
    container.querySelector('.cd-pause').addEventListener('click', () => {
      this.pause();
      this.renderTime();
    });
    container.querySelector('.cd-reset').addEventListener('click', () => {
      this.setSeconds(readInputs());
      this.renderTime();
    });
    this.renderTime();
  }

  renderTime() {
    if (!this.bodyEl) return;
    const display = this.bodyEl.querySelector('.cd-display');
    if (display) display.textContent = this.fmt(this.remaining);
  }
}
