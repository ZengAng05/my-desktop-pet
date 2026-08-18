// 本地存档工具（localStorage 封装）
const STORAGE_KEY = 'your-desktop-pet:save:v1';

export const Storage = {
  /** 保存数据 */
  save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[Storage] 保存失败：', e);
    }
  },

  /** 读取数据，失败返回 null */
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('[Storage] 读取存档失败：', e);
      return null;
    }
  },

  /** 清除存档 */
  clear() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('[Storage] 清除存档失败：', e);
    }
  }
};
