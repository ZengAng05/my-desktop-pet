// 宠物实体：聚合状态、位置，并提供说话能力
import { PetState } from './PetState.js';
import { eventBus } from '../core/EventBus.js';

export class Pet {
  constructor(config, state = null) {
    this.config = config;
    this.state = state || new PetState(config);
    this.x = 0;
    this.y = 0;
    this.isSleeping = false; // 是否处于夜间自动睡眠
    this.isResting = false; // 是否处于任何睡眠/休息状态（夜间长睡 + 手动小憩）
  }

  get mood() {
    return this.state.getMood();
  }

  setMood(mood) {
    this.state.setMood(mood);
  }

  getStat(name) {
    return this.state.getStat(name);
  }

  addStat(name, delta) {
    this.state.addStat(name, delta);
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
  }

  /** 让宠物说话（弹出气泡） */
  say(text, duration = 3200) {
    if (!text) return;
    eventBus.emit('pet:chat', { text, duration });
  }
}
