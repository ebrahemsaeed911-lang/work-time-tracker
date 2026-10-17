import { createWheelColumn, readWheelValue, WHEEL_ITEM_HEIGHT } from './wheel-time-picker.js';

// ==========================================================================
// UI manager — theme, toast, modal, formatting and shared dialogs
// ==========================================================================

export class UIManager {
  constructor() {
    this.theme = this._loadTheme();
  }

  init() {
    this._applyTheme();
    this._setupThemeToggle();
  }

  _loadTheme() {
    try {
      return localStorage.getItem('wtt_theme') || 'dark';
    } catch {
      return 'dark';
    }
  }

  _saveTheme(theme) {
    try {
      localStorage.setItem('wtt_theme', theme);
    } catch { }
  }

  _applyTheme() {
    if (this.theme === 'light') {
      document.body.classList.add('light-mode');
      document.body.classList.remove('dark-mode');
    } else {
      document.body.classList.add('dark-mode');
      document.body.classList.remove('light-mode');
    }
  }

  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    this._saveTheme(this.theme);
    this._applyTheme();
  }

  _setupThemeToggle() {
    const toggle = document.getElementById('themeToggle');
    if (toggle) {
      toggle.checked = this.theme === 'light';
      toggle.addEventListener('change', () => this.toggleTheme());
    }
  }

  showToast(message, type = 'info', duration = 3000) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, duration);
  }

  showModal(title, content, confirmText = 'تأكيد', cancelText = 'إلغاء') {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';

      overlay.innerHTML = `
        <div class="modal">
          <h3 class="modal-title">${title}</h3>
          <div class="modal-content">${content}</div>
          <div class="modal-actions">
            <button class="btn btn-outline btn-cancel">${cancelText}</button>
            <button class="btn btn-primary btn-confirm">${confirmText}</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      requestAnimationFrame(() => {
        overlay.classList.add('active');
      });

      overlay.querySelector('.btn-cancel').addEventListener('click', () => {
        overlay.remove();
        resolve(false);
      });

      overlay.querySelector('.btn-confirm').addEventListener('click', () => {
        overlay.remove();
        resolve(true);
      });

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.remove();
          resolve(false);
        }
      });
    });
  }

  showPrompt(title, defaultValue = '') {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';

      overlay.innerHTML = `
        <div class="modal">
          <h3 class="modal-title">${title}</h3>
          <div class="modal-content">
            <input type="text" class="form-input modal-input" value="${defaultValue}" autofocus>
          </div>
          <div class="modal-actions">
            <button class="btn btn-outline btn-cancel">إلغاء</button>
            <button class="btn btn-primary btn-confirm">تأكيد</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      requestAnimationFrame(() => {
        overlay.classList.add('active');
        overlay.querySelector('.modal-input').focus();
      });

      const input = overlay.querySelector('.modal-input');

      overlay.querySelector('.btn-confirm').addEventListener('click', () => {
        overlay.remove();
        resolve(input.value);
      });

      overlay.querySelector('.btn-cancel').addEventListener('click', () => {
        overlay.remove();
        resolve(null);
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          overlay.querySelector('.btn-confirm').click();
        }
      });

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.remove();
          resolve(null);
        }
      });
    });
  }

  formatDate(dateStr) {
    const d = new Date(dateStr);
    const dayNames = ['ح', 'ن', 'ث', 'أ', 'خ', 'ج', 'س'];
    const day = dayNames[d.getDay()];
    const dayNum = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day} ${dayNum}/${month}/${year}`;
  }

  formatTime(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('ar-EG-u-nu-latn', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  formatDateTime(dateStr) {
    return `${this.formatDate(dateStr)} - ${this.formatTime(dateStr)}`;
  }

  formatHours(hours) {
    const totalSeconds = Math.round(hours * 3600);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  formatCurrency(amount) {
    return Number(amount).toLocaleString('ar-EG-u-nu-latn') + ' ج.م';
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  getTodayDate() {
    const d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  getCurrentMonth() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
  }

  getMonthDays() {
    const d = new Date();
    return this.getDaysInMonth(d.getFullYear(), d.getMonth() + 1);
  }

  showHoursPicker(title, maxHours, initH, initM, initS) {
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal">
          <h3 class="modal-title">${title}</h3>
          <div class="modal-content">
            <div class="wheel-picker">
              <div class="wheel-highlight"></div>
            </div>
            <div class="tp-labels" dir="ltr">
              <span>س</span>
              <span>د</span>
              <span>ث</span>
            </div>
            <div class="tp-inputs" dir="ltr">
              <input type="number" class="tp-inp" min="0" max="${maxHours}" value="0">
              <input type="number" class="tp-inp" min="0" max="59" value="0">
              <input type="number" class="tp-inp" min="0" max="59" value="0">
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-outline btn-cancel">إلغاء</button>
            <button class="btn btn-primary btn-confirm">تأكيد</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('active'));

      const inputs = overlay.querySelectorAll('.tp-inp');
      const hoursCol = createWheelColumn(maxHours + 1, initH, inputs[0]);
      const minutesCol = createWheelColumn(60, initM, inputs[1]);
      const secondsCol = createWheelColumn(60, initS, inputs[2]);

      const sep1 = document.createElement('span');
      sep1.className = 'tp-sep';
      sep1.textContent = ':';
      const sep2 = document.createElement('span');
      sep2.className = 'tp-sep';
      sep2.textContent = ':';

      const picker = overlay.querySelector('.wheel-picker');
      picker.append(hoursCol, sep2, minutesCol, sep1, secondsCol);

      [inputs[0], inputs[1], inputs[2]].forEach((input, i) => {
        input.addEventListener('input', () => {
          const val = Math.max(Number(input.min), Math.min(Number(input.max), Number(input.value) || 0));
          input.value = val;
          const col = i === 0 ? hoursCol : i === 1 ? minutesCol : secondsCol;
          col.scrollTop = val * WHEEL_ITEM_HEIGHT;
          const items = col.querySelectorAll('.wheel-item:not(.wheel-spacer)');
          items.forEach((el, j) => el.classList.toggle('sel', j === val));
          col.dataset.value = val;
        });
      });

      overlay.querySelector('.btn-cancel').addEventListener('click', () => {
        overlay.remove();
        resolve(null);
      });

      overlay.querySelector('.btn-confirm').addEventListener('click', () => {
        const h = readWheelValue(hoursCol);
        const m = readWheelValue(minutesCol);
        const s = readWheelValue(secondsCol);
        overlay.remove();
        resolve({ h, m, s });
      });

      overlay.addEventListener('click', e => {
        if (e.target === overlay) {
          overlay.remove();
          resolve(null);
        }
      });
    });
  }
}

export const ui = new UIManager();
