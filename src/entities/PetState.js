// 宠物状态：管理心情与各项属性（饱腹/快乐/精力）
import { clamp } from '../utils/MathUtils.js';
import { eventBus } from '../core/EventBus.js';

export class PetState {
  constructor(config) {
    this.config = config;
    this.mood = config.mood.initial;
    this.stats = {};
    this.affinity = 0; // 好感度（长期累计，不随属性衰减）
    this._decayAccumulator = 0;

    for (const [key, def] of Object.entries(config.stats)) {
      this.stats[key] = def.initial;
    }
  }

  getMood() {
    return this.mood;
  }

  /** 切换心情（blink 属于临时心情，不影响基准心情） */
  setMood(mood) {
    if (this.mood === mood) return;
    const prev = this.mood;
    this.mood = mood;
    eventBus.emit('pet:moodchange', { prev, mood, state: this });
  }

  getStat(name) {
    return this.stats[name] ?? 0;
  }

  /** 增加/减少好感度 */
  addAffinity(delta) {
    this.affinity = clamp(this.affinity + delta, 0, 999);
    eventBus.emit('pet:affinitychange', { value: this.affinity, state: this });
  }

  /** 获取好感度等级 */
  getAffinityLevel() {
    if (this.affinity >= 100) return { name: '挚友', color: 'high' };
    if (this.affinity >= 80) return { name: '信赖', color: 'high' };
    if (this.affinity >= 50) return { name: '亲密', color: 'mid' };
    if (this.affinity >= 20) return { name: '熟悉', color: 'mid' };
    return { name: '陌生', color: 'low' };
  }

  setStat(name, value) {
    const def = this.config.stats[name];
    if (!def) return;
    const clamped = clamp(value, 0, def.max);
    if (this.stats[name] === clamped) return;
    this.stats[name] = clamped;
    eventBus.emit('pet:statchange', { name, value: clamped, state: this });
  }

  addStat(name, delta) {
    this.setStat(name, this.getStat(name) + delta);
  }

  /** 每帧衰减属性（累积到整秒再一次性扣除，减少事件频率） */
  tick(dt) {
    this._decayAccumulator += dt;
    if (this._decayAccumulator >= 1) {
      const steps = Math.floor(this._decayAccumulator);
      this._decayAccumulator -= steps;
      for (const [name, def] of Object.entries(this.config.stats)) {
        this.addStat(name, -def.decayPerSecond * steps);
      }
    }
  }

  /** 重置所有属性 */
  reset() {
    for (const [key, def] of Object.entries(this.config.stats)) {
      this.stats[key] = def.initial;
    }
    this.affinity = 0;
    this._decayAccumulator = 0;
    this.setMood(this.config.mood.initial);
    eventBus.emit('pet:reset', { state: this });
  }

  toJSON() {
    return { mood: this.mood, affinity: this.affinity, stats: { ...this.stats } };
  }

  fromJSON(data) {
    if (!data) return;
    if (data.stats) {
      for (const [key, value] of Object.entries(data.stats)) {
        if (this.config.stats[key]) {
          this.stats[key] = clamp(value, 0, this.config.stats[key].max);
        }
      }
    }
    if (typeof data.affinity === 'number') {
      this.affinity = clamp(data.affinity, 0, 999);
    }
    if (data.mood && this.config.sprites[data.mood]) {
      this.mood = data.mood;
    }
  }
}
