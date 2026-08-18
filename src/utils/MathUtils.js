// 常用数学工具函数

/** 将值限制在 [min, max] 范围内 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/** 返回 [min, max) 区间内的随机浮点数 */
export function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

/** 返回 [min, max] 区间内的随机整数 */
export function randomInt(min, max) {
  return Math.floor(randomRange(min, max + 1));
}

/** 线性插值 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** 从数组中随机取一个元素 */
export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** 以指定概率返回 true */
export function chance(probability) {
  return Math.random() < probability;
}

/** 两点间距离 */
export function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

/** 是否在范围内 */
export function inRange(value, min, max) {
  return value >= min && value <= max;
}
