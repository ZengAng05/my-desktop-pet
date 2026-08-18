// 位置标记工具：手动标记场景元素（椅子/草地）在屏幕上的位置
// 用法：工具栏「📍 定位」或按 F2 打开面板 → 选择元素 → 点击画面放置（范围元素拖拽框选）
// 位置以屏幕比例(0-1)保存到 localStorage，下次启动自动生效
import { eventBus } from '../core/EventBus.js';

const STORAGE_KEY = 'your-desktop-pet:positions:v1';

/** 位置存档：读写场景元素位置 */
export const PositionStorage = {
  load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
      return {};
    }
  },
  save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      /* 忽略存储失败 */
    }
  }
};

export class PositionTool {
  constructor({ targets }) {
    this.targets = targets;
    this.active = false;
    this.activeTarget = null;
    this.dragStart = null;
    this.buildDom();
    this.bindEvents();
  }

  buildDom() {
    // 十字准星（点元素）
    this.marker = document.createElement('div');
    this.marker.className = 'position-marker';
    this.marker.style.display = 'none';
    document.body.appendChild(this.marker);

    // 虚线范围框（范围元素）
    this.areaMarker = document.createElement('div');
    this.areaMarker.className = 'position-area-marker';
    document.body.appendChild(this.areaMarker);

    // 面板
    this.panel = document.createElement('div');
    this.panel.className = 'position-panel hidden';
    this.panel.innerHTML = `
      <div class="position-title">📍 位置标记</div>
      <div class="position-hint">选择要标记的元素，然后点击画面放置位置</div>
      <div class="position-targets"></div>
      <div class="position-info"></div>
      <button class="position-done">完成</button>
    `;
    document.body.appendChild(this.panel);

    const targetsBox = this.panel.querySelector('.position-targets');
    for (const t of this.targets) {
      const btn = document.createElement('button');
      btn.className = 'position-target-btn';
      btn.textContent = t.label;
      btn.dataset.id = t.id;
      btn.addEventListener('click', () => this.selectTarget(t.id));
      targetsBox.appendChild(btn);
    }

    this.infoEl = this.panel.querySelector('.position-info');
    this.panel.querySelector('.position-done').addEventListener('click', () => this.close());
  }

  bindEvents() {
    // F2 快捷开关
    window.addEventListener('keydown', (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        this.toggle();
      }
    });

    // 点元素：点击画面放置
    document.addEventListener('click', (e) => {
      if (!this.active || !this.activeTarget) return;
      if (e.target.closest('.position-panel')) return; // 忽略面板自身
      if (this.activeTarget.type === 'area') return; // 范围元素走拖拽
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      this.activeTarget.setRatio(x, y);
      this.showMarker(e.clientX, e.clientY);
      this.updateInfo(`${this.activeTarget.label} 已放置：(${Math.round(x * 100)}%, ${Math.round(y * 100)}%)`);
      this.saveAll();
    });

    // 范围元素：拖拽框选
    document.addEventListener('pointerdown', (e) => {
      if (!this.active || !this.activeTarget || this.activeTarget.type !== 'area') return;
      if (e.target.closest('.position-panel')) return;
      this.dragStart = { x: e.clientX, y: e.clientY };
      this.areaMarker.style.display = 'block';
      this.areaMarker.style.left = e.clientX + 'px';
      this.areaMarker.style.top = e.clientY + 'px';
      this.areaMarker.style.width = '0px';
      this.areaMarker.style.height = '0px';
    });
    document.addEventListener('pointermove', (e) => {
      if (!this.dragStart) return;
      const x = Math.min(e.clientX, this.dragStart.x);
      const y = Math.min(e.clientY, this.dragStart.y);
      this.areaMarker.style.left = x + 'px';
      this.areaMarker.style.top = y + 'px';
      this.areaMarker.style.width = Math.abs(e.clientX - this.dragStart.x) + 'px';
      this.areaMarker.style.height = Math.abs(e.clientY - this.dragStart.y) + 'px';
    });
    document.addEventListener('pointerup', (e) => {
      if (!this.dragStart) return;
      const x = Math.min(e.clientX, this.dragStart.x) / window.innerWidth;
      const y = Math.min(e.clientY, this.dragStart.y) / window.innerHeight;
      const w = Math.abs(e.clientX - this.dragStart.x) / window.innerWidth;
      const h = Math.abs(e.clientY - this.dragStart.y) / window.innerHeight;
      this.dragStart = null;
      this.areaMarker.style.display = 'none';
      if (this.activeTarget) {
        this.activeTarget.setRatio(x, y, w, h);
        this.updateInfo(`${this.activeTarget.label} 范围已设置`);
        this.saveAll();
      }
    });
  }

  toggle() {
    this.active ? this.close() : this.open();
  }

  open() {
    this.active = true;
    this.panel.classList.remove('hidden');
    this.updateInfo('选择元素后，点击画面放置位置');
  }

  close() {
    this.active = false;
    this.activeTarget = null;
    this.panel.classList.add('hidden');
    this.marker.style.display = 'none';
    this.areaMarker.style.display = 'none';
    this.panel.querySelectorAll('.position-target-btn').forEach((b) => b.classList.remove('active'));
    this.saveAll();
    // 通知位置已更新
    eventBus.emit('position:saved');
  }

  selectTarget(id) {
    this.activeTarget = this.targets.find((t) => t.id === id) || null;
    if (!this.activeTarget) return;
    this.panel.querySelectorAll('.position-target-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.id === id);
    });
    const ratio = this.activeTarget.getRatio();
    if (this.activeTarget.type === 'area') {
      this.updateInfo(`${this.activeTarget.label}：拖拽框选范围`);
      this.marker.style.display = 'none';
    } else if (ratio) {
      this.updateInfo(`${this.activeTarget.label}：点击画面放置位置`);
      this.showMarker(ratio.x * window.innerWidth, ratio.y * window.innerHeight);
    }
  }

  updateInfo(text) {
    this.infoEl.textContent = text;
  }

  showMarker(x, y) {
    this.marker.style.display = 'block';
    this.marker.style.left = x + 'px';
    this.marker.style.top = y + 'px';
  }

  /** 保存所有元素位置 */
  saveAll() {
    const saved = {};
    for (const t of this.targets) {
      const ratio = t.getRatio();
      if (ratio) saved[t.id] = ratio;
    }
    PositionStorage.save(saved);
  }
}
