// 全局配置：所有可调参数集中在这里
const base = import.meta.env.BASE_URL || '/';

export const CONFIG = {
  // 宠物基础信息
  pet: {
    name: '小团子',
    size: 170, // 显示宽度(px)
    margin: 30 // 屏幕边缘留白
  },

  // 精灵图资源（对应 public/assets/sprites/ 下的图片）
  sprites: {
    normal: `${base}assets/sprites/normal.png`,
    happy: `${base}assets/sprites/happy.png`,
    angry: `${base}assets/sprites/angry.png`,
    confused: `${base}assets/sprites/confused.png`,
    shy: `${base}assets/sprites/shy.png`,
    blink: `${base}assets/sprites/blink.png`,
    hungry: `${base}assets/sprites/hungry.png`,
    tired: `${base}assets/sprites/tired.png`,
    // 动作
    walkLeft: `${base}assets/sprites/walk_left.png`,
    walkRight: `${base}assets/sprites/walk_right.png`,
    walkUpdown: `${base}assets/sprites/walk_updown.png`,
    eatHamburger: `${base}assets/sprites/eat_hamburger.png`,
    eatWatermelon: `${base}assets/sprites/eat_watermelon.png`,
    sleep: `${base}assets/sprites/sleep.png`, // 白天小睡
    // 夜间睡眠动画帧（入睡动画：1→2→3，停在最后一帧为睡眠状态）
    sleepNight1: `${base}assets/sprites/sleep_night_1.png`,
    sleepNight2: `${base}assets/sprites/sleep_night_2.png`,
    sleepNight3: `${base}assets/sprites/sleep_night_3.png`,
    // 起床动画帧（wake_1~4）
    wake1: `${base}assets/sprites/wake_1.png`,
    wake2: `${base}assets/sprites/wake_2.png`,
    wake3: `${base}assets/sprites/wake_3.png`,
    wake4: `${base}assets/sprites/wake_4.png`,
    // 场景互动动作
    sitChair: `${base}assets/sprites/sit_chair.png`, // 坐椅子·睁眼
    sitChairSleep: `${base}assets/sprites/sit_chair_sleep.png`, // 坐椅子·闭眼（打盹）
    lieGrass: `${base}assets/sprites/lie_grass.png`, // 草地上躺着
    maleGod: `${base}assets/sprites/male_god.png`, // 男神（做梦梦到男神事件）
    petHandLeft: `${base}assets/sprites/pet_hand_left.png` // 团团向左抚摸动作
  },

  // 狗 NPC 素材（public/assets/npc/dog/）
  dogSprites: {
    stand: `${base}assets/npc/dog/stand.png`, // 站立（睁眼）
    standBlink: `${base}assets/npc/dog/stand_blink.png`, // 站立闭眼（眨眼帧）
    standSleep: `${base}assets/sprites/npc/dog_stand_sleep.png`, // 陪伴睡觉（安静趴着）
    run: Array.from({ length: 10 }, (_, i) => `${base}assets/npc/dog/run_${i + 1}.png`), // 跑动画 10 帧
    pet: Array.from({ length: 4 }, (_, i) => `${base}assets/npc/dog/pet_${i + 1}.png`) // 被抚摸 4 帧
  },

  // 情绪特效（漂浮在宠物上方）
  effects: {
    heart: `${base}assets/sprites/effects/heart.png`,
    questionMark: `${base}assets/sprites/effects/question_mark.png`,
    happyStar: `${base}assets/sprites/effects/happy_star.png`,
    angerFlame: `${base}assets/sprites/effects/anger_flame.png`,
    sleepCloud: `${base}assets/sprites/effects/sleep_cloud.png`,
    sparkle: `${base}assets/sprites/effects/sparkle.png`,
    angerMark: `${base}assets/sprites/effects/anger_mark.png`,
    pettingHand: `${base}assets/sprites/effects/petting_hand.png`,
    racket: `${base}assets/sprites/effects/racket.png`
  },

  // 特效放置位置（特殊放置的元素：抚摸手/球拍放在人物身边而非头顶）
  effectPlacement: {
    pettingHand: { placement: 'petting', size: 92, duration: 1600 },
    racket: { placement: 'racket', size: 92, duration: 1600 }
  },

  // 道具
  props: {
    hamburger: `${base}assets/sprites/props/hamburger.png`,
    watermelon: `${base}assets/sprites/props/watermelon.png`,
    tennisBall: `${base}assets/sprites/props/tennis_ball.png` // 网球
  },

  // 背景（按时间段自动切换）
  backgrounds: {
    morning: `${base}assets/backgrounds/morning.png`,
    noon: `${base}assets/backgrounds/noon.png`,
    afternoon: `${base}assets/backgrounds/afternoon.png`,
    evening: `${base}assets/backgrounds/evening.png`
  },

  // 动作时长(ms)
  action: {
    eatDuration: 2000,
    sleepDuration: 4500
  },

  // 夜间睡眠作息（23:00 - 次日 06:30）
  nightSleep: {
    startHour: 23, // 晚上 23:00 开始睡
    endHour: 6, // 早上 6 点
    endMinute: 30, // 30 分（即 06:30 起床）
    frameMs: 520, // 入睡动画每帧间隔(ms)
    wakeFrameMs: 340, // 起床动画每帧间隔(ms)
    energyRegenPerSec: 0.8, // 睡眠中精力恢复速度/秒
    refuseDuration: 1800, // 被吵醒后闹脾气到重新入睡的时间(ms)
    crushChance: 0.1, // 说梦话时梦到男神的小概率（0-1）
    crushDuration: 3200 // 男神浮现时长(ms)
  },

  // 属性设定
  stats: {
    hunger: { initial: 75, max: 100, decayPerSecond: 0.12 }, // 饱腹度
    happiness: { initial: 70, max: 100, decayPerSecond: 0.1 }, // 快乐值
    energy: { initial: 85, max: 100, decayPerSecond: 0.06 } // 精力
  },

  // 心情相关
  mood: {
    initial: 'normal',
    blinkInterval: [3200, 6800], // 眨眼间隔(ms)随机范围
    blinkDuration: 240, // 眨眼持续(ms)
    wanderMoodInterval: [20000, 40000] // 心情随机切换间隔(ms)
  },

  // 移动行为
  movement: {
    enabled: true,
    speed: 46, // 正常移动速度 px/s
    hopSpeed: 300, // 跳跃移动速度 px/s
    hopChance: 0.22, // 跳跃概率
    wanderInterval: [5000, 11000], // 随机走动间隔(ms)
    hotspotChance: 0.35 // 游走时主动走向场景互动点（椅子/草地）的概率
  },

  // 交互
  interaction: {
    clickCooldown: 900, // 点击冷却(ms)
    dragThreshold: 6, // 判定为拖拽的位移阈值(px)
    doubleClickWindow: 320, // 双击判定窗口(ms)
    longPressDuration: 600 // 长按判定时长(ms)
  },

  // 狗 NPC（小狗是团团的一半大小）
  dog: {
    size: 85, // 显示宽度(px) = 团团(170) 的一半
    margin: 30, // 屏幕边缘留白
    runFrameMs: 110, // 跑动画每帧间隔(ms)
    petFrameMs: 180, // 被抚摸动画每帧间隔(ms)
    petDuration: 2200, // 抚摸动画总时长(ms)
    blinkInterval: [2500, 5500], // 眨眼间隔(ms)
    blinkDuration: 260, // 眨眼持续(ms)
    speed: 90, // 移动速度 px/s
    wanderInterval: [4000, 9000], // 自由游走间隔(ms)
    followRange: 110, // 跟随模式下与团团的保持距离(px)
    ballSize: 26, // 网球显示大小(px)
    ballGravity: 1300, // 网球重力加速度 px/s²
    ballMaxSpeed: 620, // 网球最大初速度 px/s
    pickUpRange: 55 // 狗捡起网球的判定距离(px)
  },

  // UI 交互
  ui: {
    toolbarHideDelay: 2500 // 鼠标离开宠物/工具栏后，工具栏保持显示的时间(ms)
  },

  // 台词
  chat: {
    greeting: ['主人回来啦！欢迎欢迎~', '想我了吗？嘿嘿~', '今天也要元气满满哦！', '嗯？你来啦！'],
    normal: ['嗯…在发呆中…', '主人，在忙什么呀？', '我有点无聊了…', '今天天气不错呢~', '呼噜噜…'],
    happy: ['好开心呀！', '最喜欢主人啦！', '嘿嘿，一起玩吧！', '今天心情超棒！'],
    angry: ['哼！不理你啦！', '再这样我就真生气了！', '我要闹了！', '主人讨厌！'],
    confused: ['咦？发生什么了？', '这是什么情况…', '不太明白…', '？？？'],
    shy: ['别…别这样看人家啦…', '好害羞…', '呜…被看到了…', '人家会害羞的啦…'],
    feed: ['好好吃！谢谢主人~', '唔姆唔姆…真香！', '吃饱饱啦！', '主人最好啦！'],
    pet: ['嘿嘿，好舒服~', '主人的手手好温柔…', '再摸一会儿嘛~'],
    play: ['哈哈哈好有趣！', '再玩一次！再玩一次！', '主人最会玩啦！'],
    sleep: ['呼…好困…Zzz', '那我就睡一会儿咯…', '晚安，主人…'],
    hungry: ['好饿呀…主人，有吃的吗？', '肚子咕咕叫了…', '想吃饭饭…'],
    sleepy: ['好困…眼皮要合上了…', '能量不足…', '想睡觉觉…'],
    reset: ['重置完成！要好好照顾我哦~'],
    goodnight: ['夜深了，我先睡啦…Zzz', '晚安，主人~明天见！', '呼噜…做个好梦…'],
    morning: ['早安主人！今天也要加油哦~', '主人早！新的一天开始啦！', '早上好！想我了吗？']
  },

  // 自动存档间隔(ms)
  saveInterval: 5000,

  // 音效（Web Audio 合成）
  sounds: {
    enabled: true,
    volume: 0.35,
    walkInterval: 0.5 // 走路脚步声间隔(秒)
  },

  // 动态场景特效（画布粒子系统）
  fx: {
    enabled: true,
    density: 1 // 粒子密度系数（0.5 稀疏 / 1 正常 / 1.5 浓密）
  },

  // 场景互动点：宠物游走时会主动走向这些地点并触发动作
  // x/y 为屏幕比例（0-1），表示宠物左上角停留的位置，需按你的背景微调
  hotspots: [
    {
      id: 'chair',
      name: '椅子',
      x: 0.78, // 椅子位于右上角（可用定位工具微调）
      y: 0.22,
      actions: [
        {
          sprite: 'sitChair', // 坐椅子·睁眼（素材：坐睁眼.png）
          duration: 4000,
          chat: ['在椅子上休息一下~', '坐在这里好舒服呀！', '歇一会儿再走~']
        },
        {
          sprite: 'sitChairSleep', // 坐椅子·闭眼打盹（素材：坐闭眼.png）
          duration: 5000,
          chat: ['坐在这儿打个小盹…Zzz', '椅子上好适合午睡呀…']
        }
      ]
    },
    {
      id: 'grass',
      name: '草地',
      x: 0.72,
      y: 0.82,
      w: 0.3, // 范围宽度（屏幕比例）
      h: 0.2, // 范围高度（屏幕比例）
      actions: [
        {
          sprite: 'lieGrass', // 在草地上躺着（素材：躺着.png）
          duration: 4500,
          chat: ['在草地上躺一会儿~', '草地软软的，躺着好舒服~', '晒晒太阳，真惬意~']
        }
      ]
    }
  ]
};
