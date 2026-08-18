// 小工具菜单：集中管理闹钟、备忘录等小工具（宠物会互动响应）
import { eventBus } from '../core/EventBus.js';
import { AlarmWidget } from './widgets/AlarmWidget.js';
import { MemoWidget } from './widgets/MemoWidget.js';
import { CalendarWidget } from './widgets/CalendarWidget.js';
import { CountdownWidget } from './widgets/CountdownWidget.js';
import { PomodoroWidget } from './widgets/PomodoroWidget.js';

// 小工具注册表（新增小工具时在这里加一行即可）
const WIDGETS = [
  { id: 'alarm', name: '闹钟', icon: '⏰', desc: '定时提醒' },
  { id: 'memo', name: '备忘录', icon: '📝', desc: '随手记' },
  { id: 'calendar', name: '日历', icon: '📅', desc: '看日子' },
  { id: 'countdown', name: '倒计时', icon: '⏳', desc: '计时倒数' },
  { id: 'pomodoro', name: '番茄钟', icon: '🍅', desc: '专注休息' }
];

export class WidgetMenu {
  constructor() {
    this.alarm = new AlarmWidget();
    this.memo = new MemoWidget();
    this.calendar = new CalendarWidget();
    this.countdown = new CountdownWidget();
    this.pomodoro = new PomodoroWidget();
    this.visible = false;
    this.current = null;
    this.buildDom();
  }

  buildDom() {
    this.panel = document.createElement('div');
    this.panel.className = 'widget-menu hidden';
    this.panel.innerHTML = `
      <div class="widget-header">
        <button class="widget-back hidden" title="返回">←</button>
        <span class="widget-title">🧰 小工具</span>
        <button class="widget-close" title="关闭">×</button>
      </div>
      <div class="widget-body"></div>
    `;
    document.body.appendChild(this.panel);

    this.titleEl = this.panel.querySelector('.widget-title');
    this.backBtn = this.panel.querySelector('.widget-back');
    this.bodyEl = this.panel.querySelector('.widget-body');

    this.panel.querySelector('.widget-close').addEventListener('click', () => this.close());
    this.backBtn.addEventListener('click', () => this.showMenu());
    this.showMenu();
  }

  toggle() {
    this.visible ? this.close() : this.open();
  }

  open() {
    this.visible = true;
    this.panel.classList.remove('hidden');
    this.showMenu();
    eventBus.emit('widget:open'); // 宠物互动：打开小工具菜单
  }

  close() {
    this.visible = false;
    this.panel.classList.add('hidden');
  }

  /** 菜单视图：小工具卡片网格 */
  showMenu() {
    this.current = null;
    this.titleEl.textContent = '🧰 小工具';
    this.backBtn.classList.add('hidden');
    this.bodyEl.innerHTML = `
      <div class="widget-grid">
        ${WIDGETS.map(
          (w) => `<button class="widget-card" data-w="${w.id}">
            <span class="widget-card-icon">${w.icon}</span>
            <span class="widget-card-name">${w.name}</span>
            <span class="widget-card-desc">${w.desc}</span>
          </button>`
        ).join('')}
      </div>
    `;
    this.bodyEl.querySelectorAll('.widget-card').forEach((card) => {
      card.addEventListener('click', () => this.openWidget(card.dataset.w));
    });
  }

  /** 打开某个小工具视图 */
  openWidget(id) {
    const w = WIDGETS.find((x) => x.id === id);
    if (!w) return;
    this.current = id;
    this.titleEl.textContent = `${w.icon} ${w.name}`;
    this.backBtn.classList.remove('hidden');
    this.bodyEl.innerHTML = '';
    const tool = this[id] || null;
    if (tool && typeof tool.render === 'function') {
      tool.render(this.bodyEl);
    }
  }
}
