// 交互处理器：响应点击、双击与工具栏操作
import { eventBus } from '../core/EventBus.js';
import { chance } from '../utils/MathUtils.js';

export class InteractionHandler {
  constructor(config, pet) {
    this.config = config;
    this.pet = pet;
    this.cooldownUntil = 0;
    this.bindEvents();
  }

  bindEvents() {
    eventBus.on('pet:click', () => this.onClick());
    eventBus.on('pet:doubleclick', () => this.onDoubleClick());
    eventBus.on('pet:contextmenu', () => this.onContextMenu());
    eventBus.on('pet:longpress', () => this.onLongPress());
    eventBus.on('pet:dragend', () => this.onDragEnd());
    eventBus.on('toolbar:action', ({ action }) => this.onToolbarAction(action));
  }

  /** 冷却检查，防止连续点击刷属性 */
  isOnCooldown() {
    const now = Date.now();
    if (now < this.cooldownUntil) return true;
    this.cooldownUntil = now + this.config.interaction.clickCooldown;
    return false;
  }

  onClick() {
    // 夜间睡觉时点击 → 喊起来（会生气/疑惑并继续睡）
    if (this.pet.isSleeping) {
      eventBus.emit('pet:nightwake');
      return;
    }
    if (this.isOnCooldown()) return;
    this.pet.state.addAffinity(1);
    // 正在生气时点击，会继续闹脾气
    if (this.pet.mood === 'angry' && chance(0.7)) {
      this.pet.dialogue.say('mood', { mood: 'angry' });
      return;
    }
    const roll = Math.random();
    if (roll < 0.55) {
      this.pet.setMood('happy');
      this.pet.dialogue.say('mood', { mood: 'happy' });
    } else if (roll < 0.8) {
      this.pet.setMood('shy');
      this.pet.dialogue.say('mood', { mood: 'shy' });
    } else {
      this.pet.setMood('normal');
      this.pet.dialogue.say('click');
    }
  }

  onDoubleClick() {
    if (this.pet.isSleeping) return; // 睡觉中不响应
    this.pet.setMood('happy');
    this.pet.addStat('happiness', 5);
    this.pet.state.addAffinity(2);
    this.pet.dialogue.say('doubleClick');
  }

  /** 右键 → 生气 */
  onContextMenu() {
    if (this.pet.isSleeping) return; // 睡觉中不响应
    if (this.isOnCooldown()) return;
    this.pet.addStat('happiness', -6);
    this.pet.state.addAffinity(-5);
    this.pet.setMood('angry');
    this.pet.dialogue.say('mood', { mood: 'angry' });
  }

  /** 长按 → 疑惑 */
  onLongPress() {
    if (this.pet.isSleeping) return; // 睡觉中不响应
    if (this.isOnCooldown()) return;
    this.pet.state.addAffinity(-1);
    this.pet.setMood('confused');
    this.pet.dialogue.say('mood', { mood: 'confused' });
  }

  /** 拖拽结束 → 偶尔疑惑/开心 */
  onDragEnd() {
    if (this.pet.isSleeping) return; // 睡觉中不响应
    if (this.isOnCooldown()) return;
    const roll = Math.random();
    if (roll < 0.35) {
      this.pet.setMood('confused');
      this.pet.dialogue.say('mood', { mood: 'confused' });
    } else if (roll < 0.6) {
      this.pet.setMood('happy');
      this.pet.dialogue.say('mood', { mood: 'happy' });
    }
  }

  onToolbarAction(action) {
    // 夜间睡觉时：投喂/抚摸/玩耍/睡觉 均被拒绝，只有状态/时钟/重置可用
    if (this.pet.isSleeping && ['feed', 'pet', 'play', 'sleep'].includes(action)) {
      this.pet.setMood(chance(0.5) ? 'angry' : 'confused');
      this.pet.dialogue.say('sleepRefuse');
      return;
    }
    switch (action) {
      case 'feed':
        this.pet.setMood('happy');
        this.pet.addStat('hunger', 35);
        this.pet.addStat('happiness', 8);
        this.pet.state.addAffinity(3);
        this.pet.dialogue.say('feed');
        // 随机选择一种食物并播放吃东西动作
        eventBus.emit('pet:eat', { food: chance(0.5) ? 'hamburger' : 'watermelon' });
        break;

      case 'pet':
        this.pet.addStat('happiness', 12);
        this.pet.state.addAffinity(2);
        if (chance(0.45)) {
          this.pet.setMood('shy');
        } else {
          this.pet.setMood('happy');
        }
        this.pet.dialogue.say('pet');
        // 显示抚摸手特效
        eventBus.emit('pet:effect', { effect: 'pettingHand' });
        break;

      case 'play':
        this.pet.setMood('happy');
        this.pet.addStat('happiness', 22);
        this.pet.addStat('energy', -12);
        this.pet.state.addAffinity(3);
        this.pet.dialogue.say('play');
        // 显示球拍特效
        eventBus.emit('pet:effect', { effect: 'racket' });
        break;

      case 'sleep':
        this.pet.setMood('normal');
        this.pet.addStat('energy', 45);
        this.pet.addStat('happiness', 5);
        this.pet.state.addAffinity(1);
        this.pet.dialogue.say('sleep');
        // 播放睡觉动作
        eventBus.emit('pet:sleep');
        break;

      case 'status':
        eventBus.emit('ui:status-toggle');
        break;

      case 'reset':
        this.pet.state.reset();
        this.pet.dialogue.say('reset');
        break;

      default:
        break;
    }
  }
}
