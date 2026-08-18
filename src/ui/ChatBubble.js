// 对话气泡组件
export class ChatBubble {
  constructor(element) {
    this.element = element;
    this.timer = null;
  }

  /** 显示一条消息，duration 毫秒后自动隐藏 */
  show(text, duration = 3200) {
    this.element.textContent = text;
    this.element.classList.remove('hidden');
    // 触发重绘，确保过渡动画生效
    void this.element.offsetWidth;
    this.element.classList.add('visible');

    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.hide(), duration);
  }

  /** 立即隐藏 */
  hide() {
    clearTimeout(this.timer);
    this.element.classList.remove('visible');
    this.element.classList.add('hidden');
  }
}
