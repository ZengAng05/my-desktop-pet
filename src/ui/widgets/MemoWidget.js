// 备忘录小工具：随手记录待办/想法，保存到本地
import { eventBus } from '../../core/EventBus.js';

const STORAGE_KEY = 'your-desktop-pet:memos';

export class MemoWidget {
  constructor() {
    this.memos = this.load();
  }

  load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.memos));
    } catch (e) {
      /* 忽略存储失败 */
    }
  }

  /** 添加一条备忘 */
  add(text) {
    const t = String(text || '').trim();
    if (!t) return null;
    const memo = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text: t,
      createdAt: Date.now()
    };
    this.memos.unshift(memo);
    this.save();
    eventBus.emit('memo:add', { memo });
    return memo;
  }

  remove(id) {
    this.memos = this.memos.filter((m) => m.id !== id);
    this.save();
    eventBus.emit('memo:delete', { id });
  }

  /** 渲染备忘录界面到指定容器 */
  render(container) {
    container.innerHTML = `
      <div class="widget-tool">
        <div class="widget-tool-title">📝 备忘录</div>
        <div class="widget-tool-row">
          <input type="text" class="memo-input" maxlength="60" placeholder="写点什么…" />
          <button class="memo-add btn-primary">记下</button>
        </div>
        <div class="memo-list"></div>
      </div>
    `;
    const input = container.querySelector('.memo-input');
    const listEl = container.querySelector('.memo-list');

    const renderList = () => {
      listEl.innerHTML = '';
      if (!this.memos.length) {
        listEl.innerHTML = '<div class="widget-empty">还没有备忘，写一条吧~</div>';
        return;
      }
      for (const m of this.memos) {
        const row = document.createElement('div');
        row.className = 'memo-item';
        row.innerHTML = `<span class="memo-text"></span><button class="memo-del">×</button>`;
        row.querySelector('.memo-text').textContent = m.text;
        row.querySelector('.memo-del').addEventListener('click', () => {
          this.remove(m.id);
          renderList();
        });
        listEl.appendChild(row);
      }
    };

    const addHandler = () => {
      if (this.add(input.value)) {
        input.value = '';
        renderList();
      }
    };
    container.querySelector('.memo-add').addEventListener('click', addHandler);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addHandler();
    });
    renderList();
  }
}
