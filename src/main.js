// 桌宠入口：装配所有模块并启动
import { CONFIG } from './config/index.js';
import { eventBus } from './core/EventBus.js';
import { GameLoop } from './core/GameLoop.js';
import { Renderer } from './core/Renderer.js';
import { DragManager } from './core/DragManager.js';
import { AmbientFX } from './core/AmbientFX.js';
import { SpriteLoader } from './utils/SpriteLoader.js';
import { Storage } from './utils/Storage.js';
import { Pet } from './entities/Pet.js';
import { NpcDog } from './entities/NpcDog.js';
import { TennisBall } from './entities/TennisBall.js';
import { ChatBubble } from './ui/ChatBubble.js';
import { Toolbar } from './ui/Toolbar.js';
import { StatusBar } from './ui/StatusBar.js';
import { EffectLayer } from './ui/EffectLayer.js';
import { SoundManager } from './utils/SoundManager.js';
import { DialogueSystem } from './utils/DialogueSystem.js';
import { PositionTool, PositionStorage } from './ui/PositionTool.js';
import { ClockWidget } from './ui/ClockWidget.js';
import { WidgetMenu } from './ui/WidgetMenu.js';
import { InteractionHandler } from './behaviors/InteractionHandler.js';
import { MoodScheduler } from './behaviors/MoodScheduler.js';
import { MovementAI } from './behaviors/MovementAI.js';
import { clamp, chance, randomInt, pick } from './utils/MathUtils.js';

async function bootstrap() {
  // 0. 应用位置标记工具保存的位置（localStorage 覆盖默认配置）
  const savedPos = PositionStorage.load();
  for (const h of CONFIG.hotspots || []) {
    if (savedPos[h.id]) {
      h.x = savedPos[h.id].x;
      h.y = savedPos[h.id].y;
      if (savedPos[h.id].w) h.w = savedPos[h.id].w;
      if (savedPos[h.id].h) h.h = savedPos[h.id].h;
    }
  }

  // 1. 预加载宠物与特效素材（背景图体积较大，改为按需加载）
  await SpriteLoader.preloadAll([
    ...Object.values(CONFIG.sprites),
    ...Object.values(CONFIG.effects),
    ...Object.values(CONFIG.props),
    ...Object.values(CONFIG.dogSprites).flat()
  ]);

  // 2. 创建渲染器与宠物实体
  const root = document.getElementById('pet-root');
  const renderer = new Renderer(CONFIG, root);
  const pet = new Pet(CONFIG);

  // 2.2 对话系统（挂到宠物上，供各模块调用）
  pet.dialogue = new DialogueSystem(pet);

  // 3. 读取存档，恢复位置与状态
  const save = Storage.load();
  if (save) {
    pet.state.fromJSON(save);
    if (typeof save.x === 'number' && typeof save.y === 'number') {
      pet.setPosition(save.x, save.y);
    }
  }
  if (pet.x === 0 && pet.y === 0) {
    const size = renderer.getSize();
    pet.setPosition(
      Math.max(0, (window.innerWidth - size.width) / 2),
      Math.max(0, (window.innerHeight - size.height) / 2 - 60)
    );
  }

  renderer.setSprite(CONFIG.sprites[pet.mood] || CONFIG.sprites.normal);
  renderer.setMoodClass(pet.mood);
  renderer.setPosition(pet.x, pet.y);

  // 3.5 动态场景特效：萤火虫/光尘/星空
  const fxCanvas = document.getElementById('fx-canvas');
  const ambientFX = new AmbientFX(fxCanvas, CONFIG.fx);
  ambientFX.start();

  // 3.6 背景：根据当前时间自动切换（早上/中午/下午/晚上），淡入过渡
  const bgLayer = document.getElementById('bg-layer');
  const applyBackground = () => {
    const hour = new Date().getHours();
    let key = 'evening';
    if (hour >= 5 && hour < 12) key = 'morning';
    else if (hour >= 12 && hour < 15) key = 'noon';
    else if (hour >= 15 && hour < 19) key = 'afternoon';
    const src = CONFIG.backgrounds[key];
    if (!src || document.body.dataset.bg === key) return; // 已是当前背景则跳过
    // 高清背景体积较大，先加载完成再淡入，避免空白闪烁
    const img = new Image();
    img.onload = () => {
      document.body.dataset.bg = key;
      bgLayer.style.backgroundImage = `url('${src}')`;
      bgLayer.classList.add('show');
    };
    img.src = src;
  };
  applyBackground();
  setInterval(applyBackground, 60 * 60 * 1000);

  // 4. UI 组件
  const chatBubble = new ChatBubble(renderer.bubble);
  const effectLayer = new EffectLayer(renderer.container);
  const toolbar = new Toolbar(root, renderer.container, CONFIG.ui.toolbarHideDelay);
  const clockWidget = new ClockWidget();
  const widgetMenu = new WidgetMenu();
  const statusPanel = document.getElementById('status-panel');
  const statusBar = new StatusBar(statusPanel);
  statusBar.update(pet.state);

  // 5. 游戏循环
  const loop = new GameLoop();

  // 6. 行为模块
  const moodScheduler = new MoodScheduler(CONFIG, pet.state, pet);
  const movementAI = new MovementAI(CONFIG.movement, {
    getPosition: () => ({ x: pet.x, y: pet.y }),
    setPosition: (x, y) => {
      pet.setPosition(x, y);
      renderer.setPosition(x, y);
    },
    getSize: () => renderer.getSize(),
    hotspots: CONFIG.hotspots
  });

  // 6.2 音效管理器（AudioContext 会在首次点击交互时自动创建/解锁）
  const soundManager = new SoundManager(CONFIG.sounds, () => movementAI.isMoving() && !actionSrc);

  // 6.5 悬停宠物/工具栏时暂停游走，方便交互（避免宠物跑掉够不着按钮）
  // 注意：睡眠/休息时永不恢复游走；正在走向椅子入睡时保持移动
  let hoveringPet = false;
  let hoveringToolbar = false;
  const updateMovementOnHover = () => {
    if (pet.isResting) {
      if (!movementAI.hasArriveCallback()) movementAI.pause();
    } else if (hoveringPet || hoveringToolbar) {
      movementAI.pause();
    } else {
      movementAI.resumeAndWander();
    }
  };
  renderer.container.addEventListener('mouseenter', () => {
    hoveringPet = true;
    updateMovementOnHover();
  });
  renderer.container.addEventListener('mouseleave', () => {
    hoveringPet = false;
    updateMovementOnHover();
  });
  toolbar.element.addEventListener('mouseenter', () => {
    hoveringToolbar = true;
    updateMovementOnHover();
  });
  toolbar.element.addEventListener('mouseleave', () => {
    hoveringToolbar = false;
    updateMovementOnHover();
  });

  // 7. 拖拽（包含边界限制；睡眠/休息时不可拖动）
  new DragManager(CONFIG.interaction, {
    element: renderer.container,
    canDrag: () => !pet.isResting,
    getPosition: () => ({ x: pet.x, y: pet.y }),
    setPosition: (x, y) => {
      const size = renderer.getSize();
      const m = CONFIG.pet.margin;
      x = clamp(x, -m, Math.max(-m, window.innerWidth - size.width + m));
      y = clamp(y, -m, Math.max(-m, window.innerHeight - size.height + m));
      pet.setPosition(x, y);
      renderer.setPosition(x, y);
    }
  });

  // 7.5 狗 NPC：自由游走/跟随团团/可抚摸/可扔球捡球
  const dog = new NpcDog(CONFIG, {
    root: document.body,
    getPetPosition: () => ({ x: pet.x, y: pet.y }),
    onPetEnd: () => {
      /* 抚摸动画结束 */
    }
  });
  // 初始位置：团团旁边
  dog.setPosition(
    clamp(pet.x + CONFIG.pet.size + 20, 0, Math.max(0, window.innerWidth - CONFIG.dog.size)),
    clamp(pet.y + CONFIG.pet.size - CONFIG.dog.size, 0, Math.max(0, window.innerHeight - CONFIG.dog.size))
  );

  const tennisBall = new TennisBall(CONFIG.props.tennisBall, { size: CONFIG.dog.ballSize });

  // 扔球：小团子随机向前方扔出网球（抛物线，随机落点）
  const throwBall = () => {
    const st = tennisBall.getState();
    if (st === 'flying' || st === 'holding') return; // 球在空中/狗在叼时不重复扔
    pet.dialogue.say('dogThrow');
    pet.setMood('happy');
    setAction(CONFIG.sprites.happy, 500); // 团团做扔球发力动作
    const fromX = pet.x + CONFIG.pet.size / 2 - CONFIG.dog.ballSize / 2;
    const fromY = pet.y + CONFIG.pet.size / 3;
    const landY = dog.y + 10; // 地面高度（狗所在地平线）
    // 随机落点：团团前方 120~420px（左右随机），且不超出屏幕
    const maxRight = Math.max(0, window.innerWidth - CONFIG.dog.ballSize) - fromX;
    const maxLeft = fromX;
    const dirs = [];
    if (maxRight >= 120) dirs.push(1);
    if (maxLeft >= 120) dirs.push(-1);
    const dir = dirs.length ? dirs[Math.floor(Math.random() * dirs.length)] : (Math.random() < 0.5 ? -1 : 1);
    const limit = dir > 0 ? Math.min(420, maxRight) : Math.min(420, maxLeft);
    const dist = 120 + Math.random() * Math.max(0, limit - 120);
    const landX = clamp(fromX + dir * dist, 0, Math.max(0, window.innerWidth - CONFIG.dog.ballSize));
    // 由固定飞行时间反推初速度 → 保证抛物线精确落在随机落点
    const flight = 0.9 + Math.random() * 0.5; // 0.9~1.4s
    const vx = (landX - fromX) / flight;
    const vy0 = (landY - fromY - 0.5 * CONFIG.dog.ballGravity * flight * flight) / flight;
    // 稍等让团团动作先显示，再抛出网球
    setTimeout(() => {
      const s2 = tennisBall.getState();
      if (s2 === 'hidden' || s2 === 'resting') {
        tennisBall.throwFrom(fromX, fromY, vx, vy0, CONFIG.dog.ballGravity, landY, dogPickup);
      }
    }, 250);
  };

  // 狗捡球：跑到球旁 → 捡到的瞬间球消失 → 跑回团团身边把球交给她
  const dogPickup = () => {
    if (tennisBall.getState() !== 'resting') return;
    dog.moveTo(tennisBall.x + tennisBall.size / 2 - CONFIG.dog.size / 2, dog.y, () => {
      if (tennisBall.getState() !== 'resting') return;
      // 捡到球的瞬间：球直接消失
      tennisBall.hide();
      // 狗跑回团团身边
      const targetX = pet.x + (pet.x < dog.x ? -20 : CONFIG.pet.size + 20);
      dog.moveTo(clamp(targetX, 0, Math.max(0, window.innerWidth - CONFIG.dog.size)), dog.y, () => {
        dog.stopRun();
        // 把球交给团团：团团开心回应
        pet.setMood('happy');
        pet.dialogue.say('dogFetch');
        setAction(CONFIG.sprites.happy, 800);
      });
    });
  };

  // 狗交互事件：抚摸 / 切换跟随 / 扔球
  eventBus.on('dog:pet', () => {
    if (dog.busy) return;
    pet.dialogue.say('dogPet');
    pet.setMood('happy');
    // 狗在团团哪一侧，就移动到哪一侧（不跨过团团），团团面向狗
    const maxX = Math.max(0, window.innerWidth - CONFIG.dog.size);
    const maxY = Math.max(0, window.innerHeight - CONFIG.dog.size);
    const dogOnRight = dog.x > pet.x + CONFIG.pet.size / 2;
    const targetX = clamp(pet.x + (dogOnRight ? CONFIG.pet.size + 14 : -14), 0, maxX);
    const targetY = clamp(pet.y + CONFIG.pet.size - CONFIG.dog.size, 0, maxY);
    dog.moveTo(targetX, targetY, () => {
      if (dog.busy) return;
      // pet_hand_left 素材默认朝左；狗在团团右侧时镜像，让团团面向狗
      renderer.container.classList.toggle('facing-right', dogOnRight);
      setAction(CONFIG.sprites.petHandLeft, CONFIG.dog.petDuration, () => {
        renderer.container.classList.remove('facing-right');
      });
      dog.pet();
    });
  });
  eventBus.on('dog:toggle-follow', () => dog.setMode(dog.mode === 'follow' ? 'free' : 'follow'));
  eventBus.on('dog:modechange', ({ mode }) => pet.dialogue.say(mode === 'follow' ? 'dogFollow' : 'dogFree'));

  // 选项卡「扔网球」：小团子扔出（随机落点抛物线）
  eventBus.on('dog:menu-throw', () => throwBall());

  // 8. 交互处理
  new InteractionHandler(CONFIG, pet);

  // 8.5 精灵选择：动作(吃/睡/场景互动/夜间睡眠) > 走路 > 心情
  let actionSrc = null;
  let actionTimer = null;
  let hotspotFrameTimer = null;
  let nightFrameTimer = null; // 夜间睡眠动画定时器
  let seqFrameTimer = null; // 入睡/起床帧序列定时器

  /** 清理所有动作定时器 */
  const clearActionTimers = () => {
    clearTimeout(actionTimer);
    actionTimer = null;
    if (hotspotFrameTimer) {
      clearInterval(hotspotFrameTimer);
      hotspotFrameTimer = null;
    }
    if (nightFrameTimer) {
      clearInterval(nightFrameTimer);
      nightFrameTimer = null;
    }
    if (seqFrameTimer) {
      clearInterval(seqFrameTimer);
      seqFrameTimer = null;
    }
  };

  const setAction = (src, duration, onEnd) => {
    clearActionTimers();
    actionSrc = src;
    actionTimer = setTimeout(() => {
      actionSrc = null;
      if (onEnd) onEnd();
    }, duration);
  };

  /** 播放帧序列（依次显示，播完停在最后一帧） */
  const playFrames = (srcs, frameMs, onDone) => {
    clearActionTimers();
    if (!srcs || !srcs.length) {
      if (onDone) onDone();
      return;
    }
    let frame = 0;
    const show = () => {
      actionSrc = srcs[frame];
      renderer.setSprite(srcs[frame]);
    };
    show();
    seqFrameTimer = setInterval(() => {
      frame++;
      if (frame >= srcs.length) {
        clearInterval(seqFrameTimer);
        seqFrameTimer = null;
        // 停在最后一帧（睡眠/站起状态）
        actionSrc = srcs[srcs.length - 1];
        renderer.setSprite(srcs[srcs.length - 1]);
        if (onDone) onDone();
      } else {
        show();
      }
    }, frameMs);
  };

  // 夜间睡眠/起床帧
  const NIGHT_FRAMES = [
    CONFIG.sprites.sleepNight1,
    CONFIG.sprites.sleepNight2,
    CONFIG.sprites.sleepNight3
  ];
  const WAKE_FRAMES = [
    CONFIG.sprites.wake1,
    CONFIG.sprites.wake2,
    CONFIG.sprites.wake3,
    CONFIG.sprites.wake4
  ];

  /** 是否为夜间睡眠时段（23:00 - 次日 06:30） */
  const isNightTime = (d = new Date()) => {
    const h = d.getHours();
    const m = d.getMinutes();
    if (h >= CONFIG.nightSleep.startHour) return true;
    if (h < CONFIG.nightSleep.endHour) return true;
    if (h === CONFIG.nightSleep.endHour && m < CONFIG.nightSleep.endMinute) return true;
    return false;
  };

  /** 找到指定互动点 */
  const findHotspot = (id) => (CONFIG.hotspots || []).find((h) => h.id === id);

  /** 定位到椅子：已到椅子附近直接执行回调，否则走向椅子后执行（她只能在椅子上睡觉） */
  const goToChairAndThen = (onArrive) => {
    const chair = findHotspot('chair');
    if (!chair) {
      onArrive();
      return;
    }
    const margin = 30;
    const size = renderer.getSize();
    const tx = clamp(chair.x * window.innerWidth, margin, Math.max(margin, window.innerWidth - size.width - margin));
    const ty = clamp(chair.y * window.innerHeight, margin, Math.max(margin, window.innerHeight - size.height - margin));
    // 已经在椅子上附近 → 直接入睡
    if (Math.hypot(pet.x - tx, pet.y - ty) < 20) {
      onArrive();
      return;
    }
    movementAI.moveTo(tx, ty, () => {
      if (!pet.isResting) return; // 途中休息状态被打断则中止
      onArrive();
    });
  };

  /** 播放夜间入睡动画并停在最后一帧（睡眠状态） */
  const doSleepOnSpot = () => {
    playFrames(NIGHT_FRAMES, CONFIG.nightSleep.frameMs);
    spawnEffect('sleepCloud');
    soundManager.play('sleep');
  };

  /** 进入夜间睡眠：必须先在椅子上（走向椅子定位后再入睡） */
  const startNightSleep = () => {
    pet.isSleeping = true;
    pet.isResting = true;
    pet.setMood('normal');
    pet.dialogue.say('night'); // 道晚安后走向椅子
    goToChairAndThen(() => {
      movementAI.pause(); // 到达椅子后完全停止移动
      doSleepOnSpot();
    });
  };

  /** 清晨到点起床：播放起床动画后恢复正常 */
  const finishNightSleep = () => {
    pet.isSleeping = false;
    pet.isResting = false;
    pet.setMood('normal');
    playFrames(WAKE_FRAMES, CONFIG.nightSleep.wakeFrameMs, () => {
      actionSrc = null;
      renderer.setSprite(CONFIG.sprites[pet.mood] || CONFIG.sprites.normal);
    });
    movementAI.resumeAndWander();
    spawnEffect('sparkle');
    soundManager.play('wake');
    pet.dialogue.say('wake'); // 起床迷糊台词（随后 checkSchedule 会补一句早安）
  };

  const resolveSprite = () => {
    if (actionSrc) return actionSrc;
    if (movementAI.isMoving()) {
      const dir = movementAI.getDirection();
      if (dir === 'left') return CONFIG.sprites.walkLeft;
      if (dir === 'right') return CONFIG.sprites.walkRight;
      return CONFIG.sprites.walkUpdown;
    }
    return CONFIG.sprites[pet.mood] || CONFIG.sprites.normal;
  };

  const applySprite = () => {
    const moving = !actionSrc && movementAI.isMoving();
    renderer.container.classList.toggle('walking', moving);
    renderer.setSprite(resolveSprite());
  };

  // 8.6 特效系统
  const spawnEffect = (effectKey, opts) => {
    if (pet.isSleeping && effectKey !== 'sleepCloud' && effectKey !== 'sparkle') return;
    const src = CONFIG.effects[effectKey];
    if (src) effectLayer.showEffect(src, { ...CONFIG.effectPlacement[effectKey], ...opts });
  };

  let lastEffectAt = 0;
  const spawnMoodEffect = (mood) => {
    const now = Date.now();
    if (now - lastEffectAt < 1200) return;
    let effect = null;
    switch (mood) {
      case 'happy': effect = chance(0.5) ? 'happyStar' : 'heart'; break;
      case 'angry': effect = chance(0.5) ? 'angerFlame' : 'angerMark'; break;
      case 'confused': effect = 'questionMark'; break;
      case 'shy': effect = 'sparkle'; break;
      default: break;
    }
    if (effect) {
      lastEffectAt = now;
      spawnEffect(effect);
    }
  };

  // 9. 事件接线
  eventBus.on('pet:moodchange', ({ mood }) => {
    renderer.setMoodClass(mood);
    statusBar.update(pet.state);
    spawnMoodEffect(mood);
  });
  eventBus.on('pet:statchange', () => statusBar.update(pet.state));
  eventBus.on('pet:affinitychange', () => statusBar.update(pet.state));
  eventBus.on('pet:reset', () => statusBar.update(pet.state));
  eventBus.on('pet:chat', ({ text, duration }) => chatBubble.show(text, duration));
  eventBus.on('ui:status-toggle', () => statusBar.toggle());

  // 动作事件：吃东西 / 睡觉
  eventBus.on('pet:eat', ({ food }) => {
    const isWatermelon = food === 'watermelon';
    const eatSprite = isWatermelon ? CONFIG.sprites.eatWatermelon : CONFIG.sprites.eatHamburger;
    setAction(eatSprite, CONFIG.action.eatDuration);
    effectLayer.showProp(isWatermelon ? CONFIG.props.watermelon : CONFIG.props.hamburger);
    spawnEffect(isWatermelon ? 'happyStar' : 'heart');
  });
  eventBus.on('pet:sleep', () => {
    pet.isSleeping = false; // 手动睡觉是一段小憩，不是夜间长睡
    pet.isResting = true;
    pet.setMood('normal');
    pet.dialogue.say('sleep');
    // 只能在椅子上睡：先走向椅子再小憩
    goToChairAndThen(() => {
      movementAI.pause();
      setAction(CONFIG.sprites.sleep, CONFIG.action.sleepDuration, () => {
        pet.isResting = false;
        movementAI.resumeAndWander();
      });
      spawnEffect('sleepCloud');
    });
  });

  // 夜间被"喊起来"：生气/疑惑 → 吵着要睡觉 → 继续睡
  eventBus.on('pet:nightwake', () => {
    if (!pet.isSleeping) return;
    movementAI.pause(); // 停止走向椅子
    // 播放起床动画（短暂"起来"）
    playFrames(WAKE_FRAMES, CONFIG.nightSleep.wakeFrameMs, () => {
      const mood = chance(0.5) ? 'angry' : 'confused';
      pet.setMood(mood);
      actionSrc = CONFIG.sprites[mood];
      renderer.setSprite(CONFIG.sprites[mood]);
      pet.dialogue.say('nightWake');
      soundManager.play(mood === 'angry' ? 'angry' : 'confused');
      // 吵完继续去睡觉（她已在椅子上，直接原地睡）
      setTimeout(() => startNightSleep(), CONFIG.nightSleep.refuseDuration);
    });
  });

  // 自动作息：深夜自动睡觉（23:00-06:30），清晨自动起床并问候
  let lastGreetDay = '';
  const checkSchedule = () => {
    const now = new Date();
    const hour = now.getHours();
    const dayKey = now.toDateString();
    const night = isNightTime(now);

    // 深夜 → 自动进入夜间睡眠（播放入睡动画，停在睡眠状态）
    if (night && !pet.isSleeping) {
      startNightSleep();
    }

    // 清晨（06:30 之后）→ 自动起床 + 每日问候一次
    if (!night && pet.isSleeping) {
      finishNightSleep();
      if (lastGreetDay !== dayKey) {
        lastGreetDay = dayKey;
        setTimeout(() => pet.dialogue.say('morning'), 1500);
      }
    }

    // 兜底问候：6:30-12 点（非睡眠状态）每天问候一次
    if (!night && !pet.isSleeping && hour < 12 && lastGreetDay !== dayKey) {
      lastGreetDay = dayKey;
      pet.dialogue.say('morning');
    }
  };
  checkSchedule();
  setInterval(checkSchedule, 30 * 1000);

  // 通用特效事件（抚摸手、球拍等）
  eventBus.on('pet:effect', ({ effect, opts }) => spawnEffect(effect, opts));

  // 场景互动：走到椅子/草地后触发坐下、打滚等动作
  const startHotspotAction = (hotspot) => {
    if (!hotspot || !hotspot.actions || !hotspot.actions.length) {
      movementAI.resumeAndWander();
      return;
    }
    const action = pick(hotspot.actions);
    const keys = action.sprites && action.sprites.length ? action.sprites : [action.sprite];
    const srcs = keys.map((k) => CONFIG.sprites[k]).filter(Boolean);
    const hasSprite = srcs.length > 0 && srcs.some((s) => SpriteLoader.get(s));

    // 素材还没导入：先走到地点并说话，等素材到位后自动升级为完整动作
    if (!hasSprite) {
      movementAI.pause();
      const text = pick(action.chat || []);
      if (text) pet.say(text);
      setAction(null, 1600, () => movementAI.resumeAndWander());
      return;
    }

    movementAI.pause();
    const text = pick(action.chat || []);
    if (text) pet.say(text);

    // 播放动作：单帧或循环帧动画
    let frame = 0;
    const showFrame = () => {
      const src = srcs[frame % srcs.length];
      actionSrc = src;
      renderer.setSprite(src);
    };
    showFrame();
    clearTimeout(actionTimer);
    if (srcs.length > 1 && action.frameMs) {
      hotspotFrameTimer = setInterval(() => {
        frame++;
        showFrame();
      }, action.frameMs);
    }
    actionTimer = setTimeout(() => {
      if (hotspotFrameTimer) {
        clearInterval(hotspotFrameTimer);
        hotspotFrameTimer = null;
      }
      actionSrc = null;
      movementAI.resumeAndWander();
    }, action.duration || 4000);
  };

  eventBus.on('pet:hotspot-reached', ({ hotspot }) => {
    // 正在做其他动作或睡觉时，忽略并继续游走
    if (actionSrc || pet.isSleeping) {
      movementAI.resumeAndWander();
      return;
    }
    startHotspotAction(hotspot);
  });

  // 8.7 位置标记工具：F2 或工具栏「定位」开启，点击画面放置椅子/草地位置
  const positionTool = new PositionTool({
    targets: [
      {
        id: 'chair',
        label: '椅子',
        getRatio: () => {
          const h = findHotspot('chair');
          return h ? { x: h.x, y: h.y } : { x: 0.78, y: 0.22 };
        },
        setRatio: (x, y) => {
          const h = findHotspot('chair');
          if (h) {
            h.x = x;
            h.y = y;
          }
        }
      },
      {
        id: 'grass',
        label: '草地',
        type: 'area', // 范围元素：拖拽框选
        getRatio: () => {
          const h = findHotspot('grass');
          return h
            ? { x: h.x, y: h.y, w: h.w || 0.3, h: h.h || 0.2 }
            : { x: 0.72, y: 0.82, w: 0.3, h: 0.2 };
        },
        setRatio: (x, y, w, h) => {
          const g = findHotspot('grass');
          if (g) {
            g.x = x;
            g.y = y;
            g.w = w;
            g.h = h;
          }
        }
      }
    ]
  });
  eventBus.on('toolbar:action', ({ action }) => {
    if (action === 'widgets') widgetMenu.toggle();
    if (action === 'position') positionTool.toggle();
    if (action === 'clock') clockWidget.toggle();
  });

  // 8.8 小工具与宠物互动
  eventBus.on('widget:open', () => pet.dialogue.say('widgetOpen'));
  eventBus.on('alarm:set', () => pet.dialogue.say('alarmSet'));
  eventBus.on('alarm:ring', ({ time }) => {
    pet.dialogue.say('alarmRing'); // 先完整播报提醒
    spawnEffect('sparkle');
    soundManager.play('alarm');
    // 只有在她睡觉时，闹钟才会吵醒她；没睡觉时就是普通提醒，不打扰
    if (pet.isSleeping) {
      setTimeout(() => eventBus.emit('pet:nightwake'), 2500);
    }
  });
  eventBus.on('memo:add', () => pet.dialogue.say('memoAdd'));
  eventBus.on('memo:delete', () => pet.dialogue.say('memoDelete'));
  eventBus.on('calendar:open', () => pet.dialogue.say('calendarOpen'));
  eventBus.on('countdown:set', () => pet.dialogue.say('countdownSet'));
  eventBus.on('countdown:end', () => {
    pet.dialogue.say('countdownEnd');
    spawnEffect('sparkle');
    soundManager.play('alarm');
  });
  eventBus.on('pomodoro:start', () => pet.dialogue.say('pomodoroStart'));
  eventBus.on('pomodoro:break', () => {
    pet.dialogue.say('pomodoroBreak');
    soundManager.play('happy');
  });
  eventBus.on('pomodoro:work', () => {
    pet.dialogue.say('pomodoroWork');
    soundManager.play('happy');
  });

  // 10. 注册每帧更新
  loop.subscribe((dt) => {
    moodScheduler.tick(dt);
    // 睡眠/休息期间禁止任何游走（防御：意外 resume 立即停止；走向椅子的定点移动除外）
    if (pet.isResting && movementAI.isMoving() && !movementAI.hasArriveCallback()) {
      movementAI.pause();
    }
    movementAI.update(dt);
    dog.update(dt);
    tennisBall.update(dt);
    soundManager.tick(dt);
    // 夜间睡眠中缓慢恢复精力
    if (pet.isSleeping) {
      pet.addStat('energy', CONFIG.nightSleep.energyRegenPerSec * dt);
    }
    applySprite();
  });

  // 11. 自动存档
  const saveGame = () => {
    Storage.save({
      x: pet.x,
      y: pet.y,
      ...pet.state.toJSON()
    });
  };
  const saveTimer = setInterval(saveGame, CONFIG.saveInterval);
  window.addEventListener('beforeunload', saveGame);

  // 12. 窗口尺寸变化时把宠物拉回屏幕内
  window.addEventListener('resize', () => {
    const size = renderer.getSize();
    const maxX = window.innerWidth - size.width;
    const maxY = window.innerHeight - size.height;
    pet.setPosition(clamp(pet.x, 0, Math.max(0, maxX)), clamp(pet.y, 0, Math.max(0, maxY)));
    renderer.setPosition(pet.x, pet.y);
  });

  // 13. 启动
  moodScheduler.start();
  movementAI.start();
  loop.start();

  // 14. 开场问候（按时间段变化：早上/中午/下午/晚上）
  setTimeout(() => {
    pet.dialogue.say('greeting');
  }, 700);

  // 15. 随机闲聊：宠物偶尔自己说句话（不在睡觉/动作中时）
  const scheduleIdle = () => {
    setTimeout(() => {
      if (!pet.isSleeping && !actionSrc && chance(0.5)) {
        pet.dialogue.say('idle');
      }
      scheduleIdle();
    }, randomInt(25000, 60000));
  };
  scheduleIdle();

  // 15.5 夜间说梦话：睡眠中偶尔冒出几句梦话（小概率做梦梦到男神）
  const dreamOfCrush = () => {
    pet.dialogue.say('dreamCrush'); // 害羞的梦话
    soundManager.play('happy');
    const src = CONFIG.sprites.maleGod;
    if (src && SpriteLoader.get(src)) {
      // 男神形象在宠物身边温柔浮现
      effectLayer.showEffect(src, { placement: 'crush', size: 130, duration: CONFIG.nightSleep.crushDuration });
    }
  };

  const scheduleSleepTalk = () => {
    setTimeout(() => {
      if (pet.isSleeping && !document.hidden && chance(0.7)) {
        if (chance(CONFIG.nightSleep.crushChance)) {
          dreamOfCrush(); // 小概率：梦到男神
        } else {
          pet.dialogue.say('sleepTalk');
          soundManager.play('sleep');
        }
      }
      scheduleSleepTalk();
    }, randomInt(15000, 40000));
  };
  scheduleSleepTalk();

  console.log('[桌宠] 启动成功 ✨ 点击宠物互动，悬停显示工具栏');
}

bootstrap().catch((e) => {
  console.error('[桌宠] 启动失败：', e);
});
