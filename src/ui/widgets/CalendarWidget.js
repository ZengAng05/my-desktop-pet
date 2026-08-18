// 日历小工具：月历查看，可翻月，今天高亮
import { eventBus } from '../../core/EventBus.js';

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

export class CalendarWidget {
  constructor() {
    const now = new Date();
    this.viewYear = now.getFullYear();
    this.viewMonth = now.getMonth(); // 0-11
  }

  render(container) {
    container.innerHTML = `
      <div class="widget-tool">
        <div class="widget-tool-title">📅 日历</div>
        <div class="cal-nav">
          <button class="cal-prev btn-ghost" title="上个月">‹</button>
          <span class="cal-month"></span>
          <button class="cal-next btn-ghost" title="下个月">›</button>
        </div>
        <div class="cal-grid"></div>
      </div>
    `;
    this.bodyEl = container;
    this.monthEl = container.querySelector('.cal-month');
    this.gridEl = container.querySelector('.cal-grid');

    container.querySelector('.cal-prev').addEventListener('click', () => {
      this.viewMonth--;
      if (this.viewMonth < 0) {
        this.viewMonth = 11;
        this.viewYear--;
      }
      this.renderGrid();
    });
    container.querySelector('.cal-next').addEventListener('click', () => {
      this.viewMonth++;
      if (this.viewMonth > 11) {
        this.viewMonth = 0;
        this.viewYear++;
      }
      this.renderGrid();
    });
    this.renderGrid();
    eventBus.emit('calendar:open', { year: this.viewYear, month: this.viewMonth + 1 });
  }

  renderGrid() {
    this.monthEl.textContent = `${this.viewYear}年${this.viewMonth + 1}月`;
    const firstDay = new Date(this.viewYear, this.viewMonth, 1).getDay();
    const days = new Date(this.viewYear, this.viewMonth + 1, 0).getDate();
    const today = new Date();
    const isToday = (d) =>
      today.getFullYear() === this.viewYear &&
      today.getMonth() === this.viewMonth &&
      today.getDate() === d;
    // 星期 + 日期全部作为 grid 直接子元素，保证 7 列对齐
    let html = WEEK.map((w) => `<span class="cal-weekday">${w}</span>`).join('');
    for (let i = 0; i < firstDay; i++) html += '<span class="cal-empty"></span>';
    for (let d = 1; d <= days; d++) {
      html += `<span class="cal-day${isToday(d) ? ' today' : ''}">${d}</span>`;
    }
    this.gridEl.innerHTML = html;
  }
}
