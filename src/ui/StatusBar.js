// 状态面板：显示心情与各项属性条
import { eventBus } from '../core/EventBus.js';

const MOOD_NAMES = {
  normal: '正常',
  happy: '开心',
  angry: '生气',
  confused: '疑惑',
  shy: '害羞',
  blink: '眨眼',
  hungry: '饿了',
  tired: '疲惫'
};

export class StatusBar {
  constructor(element) {
    this.element = element;
    this.fills = {};
    this.build();
  }

  build() {
    this.element.innerHTML = `
      <div class="status-header">
        <span>📊 状态面板</span>
        <button class="status-close" title="关闭">×</button>
      </div>
      <div class="status-mood">心情：<span class="status-mood-label">正常</span></div>
      <div class="status-affinity">好感：<span class="affinity-level">陌生</span><span class="affinity-value"></span></div>
      <div class="stat-row"><span>饱腹</span><div class="stat-bar"><div class="stat-fill" data-stat="hunger"></div></div></div>
      <div class="stat-row"><span>快乐</span><div class="stat-bar"><div class="stat-fill" data-stat="happiness"></div></div></div>
      <div class="stat-row"><span>精力</span><div class="stat-bar"><div class="stat-fill" data-stat="energy"></div></div></div>
      <div class="stat-row"><span>好感</span><div class="stat-bar"><div class="stat-fill affinity-fill" data-stat="affinity"></div></div></div>
      <button class="status-reset">🔄 重置桌宠</button>
    `;

    this.moodLabel = this.element.querySelector('.status-mood-label');
    this.affinityLevel = this.element.querySelector('.affinity-level');
    this.affinityValue = this.element.querySelector('.affinity-value');
    this.element.querySelectorAll('.stat-fill').forEach((el) => {
      this.fills[el.dataset.stat] = el;
    });

    this.element.querySelector('.status-close').addEventListener('click', () => this.hide());
    this.element.querySelector('.status-reset').addEventListener('click', () => {
      eventBus.emit('toolbar:action', { action: 'reset' });
    });
  }

  /** 刷新面板数据 */
  update(state) {
    if (!state) return;
    this.moodLabel.textContent = MOOD_NAMES[state.getMood()] || state.getMood();

    for (const [name, el] of Object.entries(this.fills)) {
      if (name === 'affinity') {
        const level = state.getAffinityLevel();
        const width = Math.min(100, state.affinity);
        el.style.width = `${width}%`;
        el.classList.toggle('high', level.color === 'high');
        el.classList.toggle('mid', level.color === 'mid');
        el.classList.toggle('low', level.color === 'low');
        this.affinityLevel.textContent = level.name;
        this.affinityValue.textContent = `(${state.affinity})`;
      } else {
        const value = state.getStat(name);
        el.style.width = `${value}%`;
        el.classList.toggle('high', value >= 60);
        el.classList.toggle('mid', value >= 25 && value < 60);
        el.classList.toggle('low', value < 25);
      }
    }
  }

  show() {
    this.element.classList.remove('hidden');
  }

  hide() {
    this.element.classList.add('hidden');
  }

  toggle() {
    if (this.element.classList.contains('hidden')) {
      this.show();
    } else {
      this.hide();
    }
  }
}
