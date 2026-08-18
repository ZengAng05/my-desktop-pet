// 移动 AI：让宠物在屏幕内随机游走，并主动走向场景互动点（椅子/草地）
import { eventBus } from '../core/EventBus.js';
import { randomRange, randomInt, chance, clamp, pick } from '../utils/MathUtils.js';

export class MovementAI {
  constructor(config, { getPosition, setPosition, getSize, hotspots = [] }) {
    this.config = config;
    this.getPosition = getPosition;
    this.setPosition = setPosition;
    this.getSize = getSize;
    this.hotspots = hotspots;

    this.target = null;
    this.targetHotspot = null;
    this.arriveCallback = null;
    this.timer = null;
    this.paused = false;

    // 拖拽时暂停移动
    eventBus.on('pet:dragstart', () => this.pause());
    eventBus.on('pet:dragend', () => {
      this.resume();
      this.scheduleNext();
    });
  }

  start() {
    this.scheduleNext();
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.target = null;
  }

  pause() {
    this.paused = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.target = null;
    this.targetHotspot = null;
    this.arriveCallback = null;
  }

  /** 定点移动到指定坐标，到达后执行回调（用于夜间入睡定位到椅子等） */
  moveTo(x, y, onArrive) {
    this.paused = false;
    this.arriveCallback = onArrive || null;
    this.target = { x, y, hop: false };
    this.targetHotspot = null;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  /** 到达目标后是否还有待执行的回调 */
  hasArriveCallback() {
    return !!this.arriveCallback;
  }

  resume() {
    this.paused = false;
  }

  /** 恢复移动并安排下次游走 */
  resumeAndWander() {
    this.resume();
    this.scheduleNext();
  }

  /** 当前是否正在移动 */
  isMoving() {
    return !this.paused && !!this.target;
  }

  /** 获取移动方向：left / right / vertical */
  getDirection() {
    if (!this.target) return 'vertical';
    const pos = this.getPosition();
    const dx = this.target.x - pos.x;
    const dy = this.target.y - pos.y;
    if (Math.abs(dx) > Math.abs(dy) * 1.2) {
      return dx > 0 ? 'right' : 'left';
    }
    return 'vertical';
  }

  /** 安排下一次随机移动 */
  scheduleNext() {
    if (this.paused) return;
    if (this.timer) clearTimeout(this.timer);
    const [min, max] = this.config.wanderInterval;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.pickTarget();
    }, randomInt(min, max));
  }

  /** 在屏幕范围内随机选一个目标点（有一定概率走向场景互动点） */
  pickTarget() {
    const margin = 30;
    const size = this.getSize();
    const maxX = Math.max(margin, window.innerWidth - size.width - margin);
    const maxY = Math.max(margin, window.innerHeight - size.height - margin);

    // 主动走向某个场景互动点（椅子/草地）
    const available = this.hotspots.filter((h) => h.actions && h.actions.length);
    if (available.length && chance(this.config.hotspotChance || 0.3)) {
      const h = pick(available);
      // 范围型互动点（如草地）：在范围内随机选一个落脚点
      let tx, ty;
      if (h.w && h.h) {
        tx = clamp((h.x + (Math.random() - 0.5) * h.w) * window.innerWidth, margin, maxX);
        ty = clamp((h.y + (Math.random() - 0.5) * h.h) * window.innerHeight, margin, maxY);
      } else {
        tx = clamp(h.x * window.innerWidth, margin, maxX);
        ty = clamp(h.y * window.innerHeight, margin, maxY);
      }
      this.target = { x: tx, y: ty, hop: false };
      this.targetHotspot = h;
    } else {
      this.target = {
        x: randomRange(margin, maxX),
        y: randomRange(margin, maxY),
        hop: this.config.enabled && chance(this.config.hopChance)
      };
      this.targetHotspot = null;
    }
    this.scheduleNext();
  }

  /** 每帧向目标移动 */
  update(dt) {
    if (this.paused || !this.target) return;
    const pos = this.getPosition();
    const dx = this.target.x - pos.x;
    const dy = this.target.y - pos.y;
    const dist = Math.hypot(dx, dy);

    // 到达目标
    if (dist < 10) {
      const callback = this.arriveCallback;
      const hotspot = this.targetHotspot;
      this.arriveCallback = null;
      this.target = null;
      this.targetHotspot = null;
      if (callback) {
        callback();
        return;
      }
      if (hotspot) {
        // 到达场景互动点，交由外部触发动作（动作结束后会恢复游走）
        eventBus.emit('pet:hotspot-reached', { hotspot });
      } else {
        this.scheduleNext();
      }
      return;
    }

    const speed = this.target.hop ? this.config.hopSpeed : this.config.speed;
    const step = Math.min(speed * dt, dist);
    const nx = clamp(pos.x + (dx / dist) * step, 0, window.innerWidth);
    const ny = clamp(pos.y + (dy / dist) * step, 0, window.innerHeight);
    this.setPosition(nx, ny);
  }
}
