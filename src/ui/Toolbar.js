// 工具栏：提供投喂、抚摸、玩耍、睡觉、状态、重置等操作
import { eventBus } from '../core/EventBus.js';

const ACTIONS = [
  { action: 'feed', icon: '🍗', label: '投喂' },
  { action: 'pet', icon: '🤚', label: '抚摸' },
  { action: 'play', icon: '🎾', label: '玩耍' },
  { action: 'sleep', icon: '😴', label: '睡觉' },
  { action: 'status', icon: '📊', label: '状态' },
  { action: 'clock', icon: '🕐', label: '时钟' },
  { action: 'widgets', icon: '🧰', label: '小工具' },
  { action: 'position', icon: '📍', label: '定位' },
  { action: 'reset', icon: '🔄', label: '重置' }
];

/**
 * 工具栏：悬停宠物时显示；离开后延迟隐藏，给足移动到工具栏并操作的时间
 */
export class Toolbar {
  constructor(root, petElement, hideDelay = 2500) {
    this.petElement = petElement;
    this.hideDelay = hideDelay;
    this.hideTimer = null;

    this.element = document.createElement('div');
    this.element.className = 'toolbar';
    this.element.innerHTML = ACTIONS.map(
      ({ action, icon, label }) =>
        `<button class="toolbar-btn" data-action="${action}" title="${label}">${icon}<span>${label}</span></button>`
    ).join('');
    root.appendChild(this.element);

    // 悬停宠物或工具栏 → 立即显示；离开 → 延迟隐藏
    petElement.addEventListener('mouseenter', () => this.show());
    petElement.addEventListener('mouseleave', () => this.scheduleHide());
    this.element.addEventListener('mouseenter', () => this.show());
    this.element.addEventListener('mouseleave', () => this.scheduleHide());

    this.element.addEventListener('click', (e) => {
      const btn = e.target.closest('.toolbar-btn');
      if (!btn) return;
      eventBus.emit('toolbar:action', { action: btn.dataset.action });
    });
  }

  /** 立即显示并取消隐藏定时 */
  show() {
    this.cancelHide();
    this.element.classList.add('visible');
  }

  /** 延迟隐藏 */
  scheduleHide() {
    this.cancelHide();
    this.hideTimer = setTimeout(() => {
      this.element.classList.remove('visible');
    }, this.hideDelay);
  }

  /** 取消隐藏定时 */
  cancelHide() {
    if (this.hideTimer) clearTimeout(this.hideTimer);
    this.hideTimer = null;
  }

  /** 立即隐藏 */
  hide() {
    this.cancelHide();
    this.element.classList.remove('visible');
  }
}
