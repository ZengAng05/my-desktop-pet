// 拖拽管理器：支持鼠标/触摸拖拽，并区分"点击"与"拖拽"
import { eventBus } from './EventBus.js';

export class DragManager {
  constructor(config, { element, getPosition, setPosition, canDrag }) {
    this.config = config;
    this.element = element;
    this.getPosition = getPosition;
    this.setPosition = setPosition;
    this.canDrag = canDrag || (() => true);

    this.dragging = false;
    this.moved = false;
    this.pointerId = null;
    this.startX = 0;
    this.startY = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.lastTap = 0;
    this.longPressTimer = null;
    this.longPressed = false;

    this.bindEvents();
  }

  bindEvents() {
    this.element.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    this.element.addEventListener('pointermove', (e) => this.onPointerMove(e));
    this.element.addEventListener('pointerup', (e) => this.onPointerUp(e));
    this.element.addEventListener('pointercancel', (e) => this.onPointerUp(e));
    this.element.addEventListener('contextmenu', (e) => this.onContextMenu(e));
  }

  onPointerDown(e) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const pos = this.getPosition();
    this.dragging = true;
    this.moved = false;
    this.longPressed = false;
    this.pointerId = e.pointerId;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.offsetX = pos.x - e.clientX;
    this.offsetY = pos.y - e.clientY;
    try {
      this.element.setPointerCapture(e.pointerId);
    } catch (err) {
      /* 忽略捕获失败 */
    }

    // 注意：不在此处触发 pet:dragstart，避免普通点击误暂停移动；
    // 只有真正开始拖拽（超过位移阈值）时才触发（见 onPointerMove）

    // 长按检测：按住且不移动超过阈值 → 触发"疑惑"
    clearTimeout(this.longPressTimer);
    this.longPressTimer = setTimeout(() => {
      if (this.dragging && !this.moved) {
        this.longPressed = true;
        eventBus.emit('pet:longpress');
      }
    }, this.config.longPressDuration);
  }

  onPointerMove(e) {
    if (!this.dragging || e.pointerId !== this.pointerId) return;
    // 禁止拖动时（如夜间睡眠）不移动、不触发拖拽，点击仍可正常判定
    if (!this.canDrag()) return;
    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;

    if (!this.moved && Math.hypot(dx, dy) > this.config.dragThreshold) {
      this.moved = true;
      clearTimeout(this.longPressTimer);
      // 真正开始拖拽时才通知，移动 AI 暂停游走
      eventBus.emit('pet:dragstart');
    }

    if (this.moved) {
      this.setPosition(e.clientX + this.offsetX, e.clientY + this.offsetY);
      eventBus.emit('pet:dragmove', { x: e.clientX, y: e.clientY });
    }
  }

  onPointerUp(e) {
    if (!this.dragging || e.pointerId !== this.pointerId) return;
    this.dragging = false;
    clearTimeout(this.longPressTimer);
    if (this.moved) {
      eventBus.emit('pet:dragend');
    } else if (this.longPressed) {
      // 长按已触发，不再触发点击
      this.longPressed = false;
    } else {
      this.handleClick(e);
    }
  }

  /** 区分单击与双击 */
  handleClick() {
    const now = Date.now();
    if (now - this.lastTap < this.config.doubleClickWindow) {
      eventBus.emit('pet:doubleclick');
      this.lastTap = 0;
    } else {
      this.lastTap = now;
      setTimeout(() => {
        if (this.lastTap === now) {
          eventBus.emit('pet:click');
          this.lastTap = 0;
        }
      }, this.config.doubleClickWindow);
    }
  }

  /** 右键点击：触发"生气" */
  onContextMenu(e) {
    e.preventDefault();
    eventBus.emit('pet:contextmenu', e);
  }

  isDragging() {
    return this.dragging && this.moved;
  }
}
