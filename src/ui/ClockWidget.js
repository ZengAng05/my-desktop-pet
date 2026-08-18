// 时钟小部件：显示当前时间与日期，点击可隐藏/显示（状态自动保存）
const STORAGE_KEY = 'your-desktop-pet:clock';

export class ClockWidget {
  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'clock-widget';
    this.element.title = '点击隐藏/显示时钟';
    this.element.innerHTML = `
      <div class="clock-time">--:--:--</div>
      <div class="clock-date">----年--月--日</div>
    `;
    document.body.appendChild(this.element);
    this.timeEl = this.element.querySelector('.clock-time');
    this.dateEl = this.element.querySelector('.clock-date');

    // 恢复上次显示状态
    try {
      this.visible = localStorage.getItem(STORAGE_KEY) !== 'hidden';
    } catch (e) {
      this.visible = true;
    }
    this.applyVisibility();

    this.tick();
    this.timer = setInterval(() => this.tick(), 1000);
    this.element.addEventListener('click', () => this.toggle());
  }

  tick() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    this.timeEl.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const weeks = ['日', '一', '二', '三', '四', '五', '六'];
    this.dateEl.textContent = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${weeks[now.getDay()]}`;
  }

  /** 切换显示/隐藏 */
  toggle() {
    this.visible = !this.visible;
    this.applyVisibility();
    try {
      localStorage.setItem(STORAGE_KEY, this.visible ? 'show' : 'hidden');
    } catch (e) {
      /* 忽略存储失败 */
    }
  }

  applyVisibility() {
    this.element.classList.toggle('hidden', !this.visible);
  }
}
