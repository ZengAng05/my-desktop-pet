// 简单的事件总线（发布/订阅）
export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  /** 订阅事件，返回取消订阅的函数 */
  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(handler);
    return () => this.off(event, handler);
  }

  /** 取消订阅 */
  off(event, handler) {
    const list = this.listeners.get(event);
    if (!list) return;
    const idx = list.indexOf(handler);
    if (idx !== -1) list.splice(idx, 1);
  }

  /** 触发事件 */
  emit(event, payload) {
    const list = this.listeners.get(event);
    if (!list) return;
    for (const handler of [...list]) {
      try {
        handler(payload);
      } catch (e) {
        console.error(`[EventBus] 事件 "${event}" 处理出错：`, e);
      }
    }
  }

  /** 清空所有订阅 */
  clear() {
    this.listeners.clear();
  }
}

// 全局单例
export const eventBus = new EventBus();
