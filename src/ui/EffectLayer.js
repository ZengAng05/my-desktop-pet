// 特效层：在宠物旁展示漂浮特效与道具

export class EffectLayer {
  constructor(container) {
    this.container = container;
  }

  /** 漂浮特效（同一时间只保留一个，避免重叠；可指定 placement 自定义位置） */
  showEffect(src, { size = 90, placement, duration = 1600 } = {}) {
    if (!src) return;
    // 先清除上一个特效，避免多个特效叠加
    this.container.querySelectorAll('.pet-effect').forEach((el) => el.remove());
    const img = document.createElement('img');
    img.className = 'pet-effect' + (placement ? ` pet-effect--${placement}` : '');
    img.src = src;
    img.style.width = `${size}px`;
    img.addEventListener('animationend', () => img.remove());
    // 无限循环动画（如抚摸手/球拍）不会触发 animationend，用定时器兜底移除
    setTimeout(() => img.remove(), duration + 600);
    this.container.appendChild(img);
  }

  /** 道具展示（弹出后消失） */
  showProp(src, { size = 70 } = {}) {
    if (!src) return;
    const img = document.createElement('img');
    img.className = 'pet-prop';
    img.src = src;
    img.style.width = `${size}px`;
    img.addEventListener('animationend', () => img.remove());
    this.container.appendChild(img);
  }
}
