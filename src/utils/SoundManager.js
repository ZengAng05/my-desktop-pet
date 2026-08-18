// 音效管理器：使用 Web Audio API 合成轻量音效（无需音频文件）
import { eventBus } from '../core/EventBus.js';

export class SoundManager {
  constructor(config, getIsMoving) {
    this.config = config;
    this.getIsMoving = getIsMoving;
    this.ctx = null;
    this.masterGain = null;
    this.walkTimer = 0;
    this.bindEvents();
  }

  /** 懒创建 AudioContext（需用户手势，点击时自动创建/恢复） */
  ensureContext() {
    if (!this.config.enabled) return null;
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      this.ctx = new Ctx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.config.volume;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  /** 播放一个音符（带音量包络） */
  tone({ freq = 440, type = 'sine', duration = 0.15, gain = 0.3, when = 0, slideTo = null }) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(1, freq), t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + duration);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  /** 播放一段带通噪声（吃东西、脚步声等） */
  noise({ duration = 0.1, gain = 0.2, filterFreq = 2000, when = 0 }) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const size = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);
    src.start(t0);
    src.stop(t0 + duration);
  }

  /** 播放预设音效 */
  play(name) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    switch (name) {
      case 'click': // 点击
        this.tone({ freq: 620, type: 'triangle', duration: 0.08, gain: 0.2 });
        break;
      case 'happy': // 开心：上扬两个音
        this.tone({ freq: 523, type: 'sine', duration: 0.12, gain: 0.22 });
        this.tone({ freq: 784, type: 'sine', duration: 0.14, gain: 0.22, when: 0.09 });
        break;
      case 'eat': // 吃东西：两下咀嚼
        this.noise({ duration: 0.06, gain: 0.18, filterFreq: 1200 });
        this.noise({ duration: 0.06, gain: 0.18, filterFreq: 800, when: 0.1 });
        break;
      case 'sleep': // 睡觉：柔和下滑
        this.tone({ freq: 240, type: 'sine', duration: 0.5, gain: 0.1, slideTo: 170 });
        break;
      case 'angry': // 生气：低沉嗡鸣
        this.tone({ freq: 170, type: 'sawtooth', duration: 0.22, gain: 0.18, slideTo: 90 });
        break;
      case 'confused': // 疑惑：下滑音
        this.tone({ freq: 520, type: 'triangle', duration: 0.16, gain: 0.16, slideTo: 320 });
        break;
      case 'grab': // 抓起：低沉短音
        this.tone({ freq: 300, type: 'sine', duration: 0.1, gain: 0.18, slideTo: 220 });
        break;
      case 'drop': // 放下：轻微上扬
        this.tone({ freq: 260, type: 'sine', duration: 0.12, gain: 0.18, slideTo: 420 });
        break;
      case 'wake': // 醒来：清脆两个音
        this.tone({ freq: 660, type: 'sine', duration: 0.1, gain: 0.18 });
        this.tone({ freq: 880, type: 'sine', duration: 0.12, gain: 0.18, when: 0.08 });
        break;
      case 'alarm': // 闹钟：三声清脆叮铃
        [660, 880, 660].forEach((f, i) => {
          this.tone({ freq: f, type: 'sine', duration: 0.18, gain: 0.2, when: i * 0.22 });
        });
        break;
      default:
        break;
    }
  }

  /** 走路脚步声（柔和，由 tick 限频调用） */
  step() {
    this.noise({ duration: 0.04, gain: 0.06, filterFreq: 500 });
  }

  /** 每帧调用：处理走路脚步声 */
  tick(dt) {
    if (!this.config.enabled) return;
    if (this.getIsMoving && this.getIsMoving()) {
      this.walkTimer -= dt;
      if (this.walkTimer <= 0) {
        this.step();
        this.walkTimer = this.config.walkInterval;
      }
    } else {
      this.walkTimer = 0;
    }
  }

  /** 订阅交互事件触发对应音效 */
  bindEvents() {
    eventBus.on('pet:click', () => this.play('click'));
    eventBus.on('pet:doubleclick', () => this.play('happy'));
    eventBus.on('pet:eat', () => this.play('eat'));
    eventBus.on('pet:sleep', () => this.play('sleep'));
    eventBus.on('pet:contextmenu', () => this.play('angry'));
    eventBus.on('pet:longpress', () => this.play('confused'));
    eventBus.on('pet:dragstart', () => this.play('grab'));
    eventBus.on('pet:dragend', () => this.play('drop'));
    eventBus.on('pet:wake', () => this.play('wake'));
    eventBus.on('pet:reset', () => this.play('happy'));
  }
}
