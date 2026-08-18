// 狗 NPC：会自由游走/跟随团团，可被抚摸，可玩扔球捡球
// 素材默认朝左；向右移动/朝向时用 scaleX(-1) 镜像区分左右
import { eventBus } from '../core/EventBus.js';
import { randomInt, randomRange, clamp } from '../utils/MathUtils.js';

export class NpcDog {
  constructor(config, { root, getPetPosition, onPetEnd }) {
    this.config = config;
    this.getPetPosition = getPetPosition; // () => {x, y} 团团位置
    this.onPetEnd = onPetEnd || (() => {});

    this.x = 0;
    this.y = 0;
    this.direction = 'left'; // 素材默认朝左
    this.mode = 'free'; // free=自由游走 follow=跟随团团
    this.busy = false; // 播放抚摸动画时不动

    this.wanderTarget = null;
    this.wanderTimer = null;
    this.patrolTarget = null; // 定点目标（捡球/回程）
    this.patrolCallback = null;

    // 动画状态
    this.state = 'idle'; // idle | run | pet
    this.frameTimer = null;
    this.frameIndex = 0;
    this.blinkTimer = null;

    // 交互
    this.pointerId = null;
    this.pointerDownAt = 0;
    this.lastTap = 0;

    this.createDom(root);
    this.bindEvents();
    this.scheduleBlink();
    this.scheduleWander();
  }

  createDom(root) {
    this.element = document.createElement('div');
    this.element.className = 'npc-dog';
    this.element.innerHTML = `
      <div class="npc-dog-shadow"></div>
      <img class="npc-dog-image" draggable="false" alt="小狗" />
      <div class="dog-menu">
        <button class="dog-menu-btn" data-act="throw" title="扔网球">🎾<span>扔球</span></button>
        <button class="dog-menu-btn" data-act="pet" title="抚摸">🤚<span>抚摸</span></button>
        <button class="dog-menu-btn" data-act="follow" title="跟随/自由">🐕<span>跟随</span></button>
      </div>
    `;
    root.appendChild(this.element);
    this.image = this.element.querySelector('.npc-dog-image');
    this.menu = this.element.querySelector('.dog-menu');
    this.image.style.width = `${this.config.dog.size}px`;
    this.applyDirection();
  }

  bindEvents() {
    // 单击=抚摸 / 双击=切换自由-跟随（点击选项卡按钮不算）
    this.element.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      if (e.target.closest('.dog-menu')) return; // 选项卡操作不触发狗的单击/双击
      this.pointerId = e.pointerId;
      this.pointerDownAt = Date.now();
    });
    const endTap = (e) => {
      if (e.pointerId !== this.pointerId) return;
      this.pointerId = null;
      const now = Date.now();
      if (now - this.lastTap < this.config.interaction.doubleClickWindow) {
        this.lastTap = 0;
        eventBus.emit('dog:toggle-follow');
      } else {
        this.lastTap = now;
        setTimeout(() => {
          if (this.lastTap === now) {
            this.lastTap = 0;
            eventBus.emit('dog:pet');
          }
        }, this.config.interaction.doubleClickWindow);
      }
    };
    this.element.addEventListener('pointerup', endTap);
    this.element.addEventListener('pointercancel', endTap);

    // 悬停选项卡（毛玻璃）：鼠标悬停狗时出现，离开延迟隐藏
    let hideTimer = null;
    const showMenu = () => {
      clearTimeout(hideTimer);
      this.menu.classList.add('visible');
    };
    const scheduleHide = () => {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => this.menu.classList.remove('visible'), 1200);
    };
    this.element.addEventListener('mouseenter', showMenu);
    this.element.addEventListener('mouseleave', scheduleHide);
    this.menu.addEventListener('mouseenter', showMenu);
    this.menu.addEventListener('mouseleave', scheduleHide);
    this.menu.addEventListener('click', (e) => {
      const btn = e.target.closest('.dog-menu-btn');
      if (!btn) return;
      scheduleHide();
      const act = btn.dataset.act;
      if (act === 'throw') eventBus.emit('dog:menu-throw');
      else if (act === 'pet') eventBus.emit('dog:pet');
      else if (act === 'follow') eventBus.emit('dog:toggle-follow');
    });
  }

  setPosition(x, y) {
    this.x = clamp(x, 0, Math.max(0, window.innerWidth - this.config.dog.size));
    this.y = clamp(y, 0, Math.max(0, window.innerHeight - this.config.dog.size));
    this.element.style.left = `${this.x}px`;
    this.element.style.top = `${this.y}px`;
  }

  getPosition() {
    return { x: this.x, y: this.y };
  }

  /** 设置朝向（素材默认朝左，向右时镜像） */
  setDirection(dir) {
    if (dir === this.direction) return;
    this.direction = dir;
    this.applyDirection();
  }

  applyDirection() {
    this.element.classList.toggle('facing-right', this.direction === 'right');
  }

  /** 切换模式：free=自由游走 follow=跟随团团 */
  setMode(mode) {
    this.mode = mode === 'follow' ? 'follow' : 'free';
    this.wanderTarget = null;
    this.element.classList.toggle('following', this.mode === 'follow');
    if (this.mode === 'follow') this.stopRun();
    else this.scheduleWander();
    eventBus.emit('dog:modechange', { mode: this.mode });
  }

  // ---------- 动画 ----------

  setState(state) {
    if (this.state === state) return;
    this.state = state;
    this.clearFrameTimer();
    if (state === 'run') this.playFrames(this.config.dogSprites.run, this.config.dog.runFrameMs, true);
    else if (state === 'pet') this.playFrames(this.config.dogSprites.pet, this.config.dog.petFrameMs, false);
    else this.showIdle();
  }

  /** 播放帧动画（loop 可选） */
  playFrames(frames, frameMs, loop) {
    this.frameIndex = 0;
    this.image.setAttribute('src', frames[0]);
    this.frameTimer = setInterval(() => {
      this.frameIndex++;
      if (this.frameIndex >= frames.length) {
        if (loop) {
          this.frameIndex = 0;
        } else {
          this.clearFrameTimer();
          // 抚摸动画播完 → 回 idle
          if (this.state === 'pet') {
            this.state = 'idle';
            this.busy = false;
            this.onPetEnd();
          }
          return;
        }
      }
      this.image.setAttribute('src', frames[this.frameIndex]);
    }, frameMs);
  }

  /** 站立（睁眼），并安排眨眼 */
  showIdle() {
    this.image.setAttribute('src', this.config.dogSprites.stand);
    this.scheduleBlink();
  }

  clearFrameTimer() {
    if (this.frameTimer) {
      clearInterval(this.frameTimer);
      this.frameTimer = null;
    }
  }

  /** 眨眼：站立时周期切换 睁眼→闭眼→睁眼 */
  scheduleBlink() {
    if (this.blinkTimer) clearTimeout(this.blinkTimer);
    const [min, max] = this.config.dog.blinkInterval;
    this.blinkTimer = setTimeout(() => {
      this.blinkTimer = null;
      if (this.state === 'idle') {
        this.image.setAttribute('src', this.config.dogSprites.standBlink);
        setTimeout(() => {
          if (this.state === 'idle') this.image.setAttribute('src', this.config.dogSprites.stand);
        }, this.config.dog.blinkDuration);
      }
      this.scheduleBlink();
    }, randomInt(min, max));
  }

  /** 开始/停止跑 */
  startRun() {
    this.setState('run');
  }

  stopRun() {
    if (this.state === 'run') {
      this.state = 'idle';
      this.clearFrameTimer(); // 停止跑动画定时器，避免停下后仍覆盖站立帧
      this.showIdle();
    }
  }

  /** 被抚摸动画 */
  pet() {
    this.busy = true;
    this.wanderTarget = null;
    this.patrolTarget = null;
    this.setState('pet');
  }

  // ---------- 移动 ----------

  /** 定点移动到某处（捡球等），到达后回调（目标自动限制在屏幕可达范围内） */
  moveTo(x, y, onArrive) {
    const maxX = Math.max(0, window.innerWidth - this.config.dog.size);
    const maxY = Math.max(0, window.innerHeight - this.config.dog.size);
    this.patrolTarget = { x: clamp(x, 0, maxX), y: clamp(y, 0, maxY) };
    this.patrolCallback = onArrive || null;
    this.wanderTarget = null;
  }

  scheduleWander() {
    if (this.mode !== 'free') return;
    if (this.wanderTimer) clearTimeout(this.wanderTimer);
    const [min, max] = this.config.dog.wanderInterval;
    this.wanderTimer = setTimeout(() => {
      this.wanderTimer = null;
      if (this.mode !== 'free' || this.busy || this.patrolTarget) return;
      const m = this.config.dog.margin;
      this.wanderTarget = {
        x: randomRange(m, Math.max(m, window.innerWidth - this.config.dog.size - m)),
        y: randomRange(m, Math.max(m, window.innerHeight - this.config.dog.size - m))
      };
    }, randomInt(min, max));
  }

  /** 每帧更新（自由游走 / 跟随团团 / 定点移动） */
  update(dt) {
    if (this.busy) return; // 抚摸中不动

    // 定点移动（捡球/回程）优先
    if (this.patrolTarget) {
      this.stepToward(this.patrolTarget.x, this.patrolTarget.y, dt, () => {
        const cb = this.patrolCallback;
        this.patrolTarget = null;
        this.patrolCallback = null;
        if (cb) cb();
      });
      return;
    }

    // 跟随团团
    if (this.mode === 'follow') {
      const pet = this.getPetPosition();
      const targetX = pet.x;
      const targetY = pet.y + 20; // 稍偏下方，像蹲在团团脚边
      const dist = Math.hypot(targetX - this.x, targetY - this.y);
      if (dist > this.config.dog.followRange) {
        this.stepToward(targetX, targetY, dt, null, 1);
      } else {
        this.stopRun();
      }
      return;
    }

    // 自由游走
    if (this.wanderTarget) {
      this.stepToward(this.wanderTarget.x, this.wanderTarget.y, dt, () => {
        this.wanderTarget = null;
        this.scheduleWander();
      });
    } else {
      this.stopRun();
    }
  }

  /** 朝目标移动一步（speedFactor 可加速），到达后回调 */
  stepToward(tx, ty, dt, onArrive, speedFactor = 1) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    const speed = this.config.dog.speed * speedFactor;
    if (dist < 6) {
      this.stopRun();
      if (onArrive) onArrive();
      return;
    }
    // 朝向：素材默认朝左，向右走时镜像
    this.setDirection(Math.abs(dx) > 8 ? (dx > 0 ? 'right' : 'left') : this.direction);
    if (this.state !== 'run') this.startRun();
    const step = Math.min(speed * dt, dist);
    this.setPosition(this.x + (dx / dist) * step, this.y + (dy / dist) * step);
  }

  /** 清理（测试/卸载用） */
  destroy() {
    this.clearFrameTimer();
    if (this.blinkTimer) clearTimeout(this.blinkTimer);
    if (this.wanderTimer) clearTimeout(this.wanderTimer);
    if (this.element) this.element.remove();
  }
}
