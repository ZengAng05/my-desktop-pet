// 闹钟小工具：设置提醒时间，到点通过事件通知宠物提醒主人
import { eventBus } from '../../core/EventBus.js';

const STORAGE_KEY = 'your-desktop-pet:alarms';

const pad = (n) => String(n).padStart(2, '0');

export class AlarmWidget {
  constructor() {
    this.alarms = this.load();
    this.lastTriggered = new Set(); // 记录已触发的 id+日期，避免同一天重复响
    // 后台每秒检查，面板关闭也持续生效
    this.checkTimer = setInterval(() => this.check(), 1000);
  }

  load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.alarms));
    } catch (e) {
      /* 忽略存储失败 */
    }
  }

  /** 每秒检查：当前时间命中已启用闹钟则触发提醒（每天最多一次） */
  check() {
    const now = new Date();
    const hm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const day = now.toDateString();
    for (const a of this.alarms) {
      if (!a.enabled || a.time !== hm) continue;
      const key = `${a.id}:${day}`;
      if (this.lastTriggered.has(key)) continue;
      this.lastTriggered.add(key);
      eventBus.emit('alarm:ring', { time: a.time, alarm: a });
    }
  }

  /** 添加闹钟（time 格式 HH:MM） */
  add(time) {
    if (!time || !/^\d{2}:\d{2}$/.test(time)) return null;
    const alarm = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      time,
      enabled: true
    };
    this.alarms.push(alarm);
    this.save();
    eventBus.emit('alarm:set', { alarm });
    return alarm;
  }

  remove(id) {
    this.alarms = this.alarms.filter((a) => a.id !== id);
    this.save();
  }

  toggle(id, enabled) {
    const a = this.alarms.find((x) => x.id === id);
    if (a) {
      a.enabled = !!enabled;
      this.save();
    }
  }

  /** 渲染闹钟界面到指定容器 */
  render(container) {
    container.innerHTML = `
      <div class="widget-tool">
        <div class="widget-tool-title">⏰ 闹钟</div>
        <div class="widget-tool-row">
          <input type="time" class="alarm-input" value="08:00" />
          <button class="alarm-add btn-primary">添加</button>
        </div>
        <div class="alarm-list"></div>
        <div class="widget-tool-hint">到点后小团子会提醒你哦~</div>
      </div>
    `;
    const input = container.querySelector('.alarm-input');
    const listEl = container.querySelector('.alarm-list');

    const renderList = () => {
      listEl.innerHTML = '';
      if (!this.alarms.length) {
        listEl.innerHTML = '<div class="widget-empty">还没有闹钟，先添加一个吧~</div>';
        return;
      }
      const sorted = [...this.alarms].sort((x, y) => x.time.localeCompare(y.time));
      for (const a of sorted) {
        const row = document.createElement('div');
        row.className = 'alarm-item';
        row.innerHTML = `
          <span class="alarm-time">${a.time}</span>
          <label class="alarm-toggle">
            <input type="checkbox" ${a.enabled ? 'checked' : ''} />
            <span>${a.enabled ? '开启' : '关闭'}</span>
          </label>
          <button class="alarm-del">删除</button>
        `;
        row.querySelector('.alarm-toggle input').addEventListener('change', (e) => {
          this.toggle(a.id, e.target.checked);
          renderList();
        });
        row.querySelector('.alarm-del').addEventListener('click', () => {
          this.remove(a.id);
          renderList();
        });
        listEl.appendChild(row);
      }
    };

    container.querySelector('.alarm-add').addEventListener('click', () => {
      if (this.add(input.value)) renderList();
    });
    renderList();
  }
}
