// 精灵图加载器：预加载并缓存所有宠物表情图片
export class SpriteLoader {
  static cache = new Map();

  /** 加载单张图片并缓存 */
  static load(src) {
    return new Promise((resolve, reject) => {
      if (this.cache.has(src)) {
        resolve(this.cache.get(src));
        return;
      }
      const img = new Image();
      img.onload = () => {
        this.cache.set(src, img);
        resolve(img);
      };
      img.onerror = () => reject(new Error(`无法加载图片：${src}`));
      img.src = src;
    });
  }

  /** 批量预加载（忽略单个失败） */
  static async preloadAll(srcs) {
    const results = await Promise.allSettled(srcs.map((s) => this.load(s)));
    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length) {
      console.warn(`[SpriteLoader] ${failed.length} 张图片加载失败`);
    }
  }

  /** 获取已缓存的图片对象 */
  static get(src) {
    return this.cache.get(src) || null;
  }
}
