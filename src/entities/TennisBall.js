// 网球：从小团团扔出的抛物线动画，落地后由狗捡起/叼回
import { clamp } from '../utils/MathUtils.js';

export class TennisBall {
  constructor(src, { size }) {
    this.size = size;
    this.element = document.createElement('img');
    this.element.className = 'tennis-ball';
    this.element.src = src;
    this.element.style.width = `${size}px`;
    this.element.style.display = 'none';
    this.element.draggable = false;
    document.body.appendChild(this.element);

    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.g = 0;
    this.state = 'hidden'; // hidden | flying | resting
    this.onLand = null;
  }

  show(x, y) {
    this.x = x;
    this.y = y;
    this.element.style.display = 'block';
    this.element.style.left = `${x}px`;
    this.element.style.top = `${y}px`;
  }

  hide() {
    this.state = 'hidden';
    this.element.style.display = 'none';
  }

  /** 从 (x,y) 以初速度 (vx, vy0) 抛出，落地（y >= landY）时回调 */
  throwFrom(x, y, vx, vy0, gravity, landY, onLand) {
    this.landY = landY;
    this.onLand = onLand || null;
    this.vx = vx;
    this.vy = vy0;
    this.g = gravity;
    this.state = 'flying';
    this.show(x, y);
  }

  /** 落地静止 */
  restAt(x, y) {
    this.state = 'resting';
    this.show(x, y);
    if (this.onLand) {
      const cb = this.onLand;
      this.onLand = null;
      cb();
    }
  }

  getState() {
    return this.state;
  }

  /** 每帧更新飞行 */
  update(dt) {
    if (this.state !== 'flying') return;
    this.vy += this.g * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    // 落地
    if (this.y >= this.landY) {
      this.restAt(this.x, this.landY);
      return;
    }
    // 左右出界：停在边界
    if (this.x < 0) {
      this.restAt(0, this.y);
      return;
    }
    if (this.x > window.innerWidth - this.size) {
      this.restAt(window.innerWidth - this.size, this.y);
      return;
    }
    this.element.style.left = `${this.x}px`;
    this.element.style.top = `${this.y}px`;
  }

  destroy() {
    if (this.element) this.element.remove();
  }
}
