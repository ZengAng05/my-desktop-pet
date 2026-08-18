// 渲染器：负责创建并更新宠物的 DOM 节点
export class Renderer {
  constructor(config, root) {
    this.config = config;
    this.root = root;
    this.x = 0;
    this.y = 0;
    this.createDom();
  }

  /** 创建宠物 DOM 结构 */
  createDom() {
    this.container = document.createElement('div');
    this.container.className = 'pet';
    this.container.innerHTML = `
      <div class="pet-shadow"></div>
      <img class="pet-image" draggable="false" alt="桌宠" />
      <div class="pet-name">${this.config.pet.name}</div>
      <div class="chat-bubble hidden"></div>
    `;
    this.root.appendChild(this.container);

    this.image = this.container.querySelector('.pet-image');
    this.bubble = this.container.querySelector('.chat-bubble');
    this.nameEl = this.container.querySelector('.pet-name');

    // 设置显示尺寸
    this.image.style.width = `${this.config.pet.size}px`;
  }

  /** 切换宠物表情 */
  setSprite(src) {
    if (!src) return;
    if (this.image.getAttribute('src') === src) return;
    this.image.setAttribute('src', src);
  }

  /** 设置心情 CSS 类，用于播放对应动画 */
  setMoodClass(mood) {
    const moods = ['normal', 'happy', 'angry', 'confused', 'shy', 'blink', 'hungry', 'tired'];
    this.container.classList.remove(...moods.map((m) => `mood-${m}`));
    if (moods.includes(mood)) {
      this.container.classList.add(`mood-${mood}`);
    }
  }

  /** 设置宠物位置（translate3d 硬件加速） */
  setPosition(x, y) {
    this.x = x;
    this.y = y;
    this.root.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  /** 获取宠物显示尺寸 */
  getSize() {
    return { width: this.config.pet.size, height: this.config.pet.size };
  }
}
