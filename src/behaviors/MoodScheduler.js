// 心情调度器：负责眨眼、自动心情切换与属性衰减
import { eventBus } from '../core/EventBus.js';
import { randomInt, chance } from '../utils/MathUtils.js';

export class MoodScheduler {
  constructor(config, state, pet) {
    this.config = config;
    this.state = state;
    this.pet = pet;

    // 基准心情：blink 等临时心情结束后恢复到的状态
    this.baseMood = config.mood.initial;
    this.blinkTimer = null;
    this.moodTimer = null;
    this._statCheckAcc = 0;
    this.lastHintAt = 0; // 低状态暗示冷却时间戳

    // 记录非临时心情变化
    eventBus.on('pet:moodchange', ({ mood }) => {
      if (mood !== 'blink') this.baseMood = mood;
    });
  }

  start() {
    this.scheduleBlink();
    this.scheduleMoodSwitch();
  }

  stop() {
    if (this.blinkTimer) clearTimeout(this.blinkTimer);
    if (this.moodTimer) clearTimeout(this.moodTimer);
    this.blinkTimer = null;
    this.moodTimer = null;
  }

  /** 周期性眨眼 */
  scheduleBlink() {
    const [min, max] = this.config.mood.blinkInterval;
    this.blinkTimer = setTimeout(() => {
      this.blinkTimer = null;
      if (!document.hidden) {
        this.state.setMood('blink');
        setTimeout(() => {
          // 眨眼结束后恢复基准心情
          this.state.setMood(this.baseMood);
        }, this.config.mood.blinkDuration);
      }
      this.scheduleBlink();
    }, randomInt(min, max));
  }

  /** 周期性自动切换心情 */
  scheduleMoodSwitch() {
    const [min, max] = this.config.mood.wanderMoodInterval;
    this.moodTimer = setTimeout(() => {
      this.moodTimer = null;
      this.autoMood();
      this.scheduleMoodSwitch();
    }, randomInt(min, max));
  }

  /** 根据属性与随机数决定当前心情 */
  autoMood() {
    // 睡觉/休息中不自动切换心情、不说话
    if (this.pet.isSleeping || this.pet.isResting) return;

    // 太饿了 → 饥饿表情
    if (this.state.getStat('hunger') < 25) {
      this.setStatMood('hungry', 0.5);
      return;
    }

    // 太伤心 → 疑惑/低落
    if (this.state.getStat('happiness') < 15) {
      this.setStatMood('confused', 0.5);
      return;
    }

    // 太困了 → 疲惫表情并提示
    if (this.state.getStat('energy') < 20) {
      this.setStatMood('tired', 0.4);
      return;
    }

    // 随机心情：受好感度影响（高好感更常开心，低好感更常闹脾气/害羞）
    const affinity = this.state.affinity;
    const roll = Math.random();
    if (affinity >= 50) {
      // 高好感：更多开心
      if (roll < 0.55) this.baseMood = 'happy';
      else if (roll < 0.75) this.baseMood = 'normal';
      else if (roll < 0.9) this.baseMood = 'confused';
      else if (roll < 0.97) this.baseMood = 'shy';
      else this.baseMood = 'angry';
    } else if (affinity < 20) {
      // 低好感：更多害羞/闹脾气
      if (roll < 0.25) this.baseMood = 'normal';
      else if (roll < 0.4) this.baseMood = 'happy';
      else if (roll < 0.55) this.baseMood = 'confused';
      else if (roll < 0.8) this.baseMood = 'shy';
      else this.baseMood = 'angry';
    } else {
      // 默认
      if (roll < 0.4) this.baseMood = 'normal';
      else if (roll < 0.65) this.baseMood = 'happy';
      else if (roll < 0.85) this.baseMood = 'confused';
      else if (roll < 0.95) this.baseMood = 'shy';
      else this.baseMood = 'angry';
    }
    this.state.setMood(this.baseMood);

    // 说话（受好感度影响的台词）
    if (chance(0.45)) {
      this.pet.dialogue.say('mood', { mood: this.baseMood });
    }
  }

  /** 依据属性设置心情并可选说话 */
  setStatMood(mood, msgChance) {
    this.baseMood = mood;
    this.state.setMood(mood);
    if (chance(msgChance)) {
      this.pet.dialogue.say('mood', { mood });
    }
  }

  /** 每帧更新（属性衰减 + 定期状态检查） */
  tick(dt) {
    this.state.tick(dt);
    this._statCheckAcc += dt;
    if (this._statCheckAcc >= 4) {
      this._statCheckAcc = 0;
      this.checkStatMood();
    }
  }

  /** 低状态暗示：弹出对话框提示玩家该做什么（带冷却，避免刷屏） */
  hintLowState(pool) {
    const now = Date.now();
    if (now - this.lastHintAt < randomInt(45000, 90000)) return;
    this.lastHintAt = now;
    if (this.pet.dialogue) this.pet.dialogue.say(pool);
  }

  /** 定期检查属性状态并触发对应心情（比随机心情更及时） */
  checkStatMood() {
    if (this.state.getMood() === 'blink') return;
    if (this.pet.isSleeping || this.pet.isResting) return; // 睡觉中不打扰
    if (this.state.getStat('hunger') < 25) {
      this.baseMood = 'hungry';
      this.state.setMood('hungry');
      this.hintLowState('lowHunger'); // 暗示：投喂我
      return;
    }
    if (this.state.getStat('energy') < 20) {
      this.baseMood = 'tired';
      this.state.setMood('tired');
      this.hintLowState('lowEnergy'); // 暗示：让我休息
      return;
    }
    if (this.state.getStat('happiness') < 15) {
      this.baseMood = 'confused';
      this.state.setMood('confused');
      this.hintLowState('lowHappy'); // 暗示：陪我玩
    }
  }
}
