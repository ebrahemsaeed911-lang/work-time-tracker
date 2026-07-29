class UIManager {
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
      const buildWheel = (count, defVal, inp) => {
        const col = document.createElement('div');
        col.className = 'wheel-col';
        col.dataset.value = defVal;
        const ts = document.createElement('div');
        ts.className = 'wheel-item wheel-spacer';
        col.appendChild(ts);
        for (let i = 0; i < count; i++) {
          const item = document.createElement('div');
          item.className = 'wheel-item' + (i === defVal ? ' sel' : '');
          item.dataset.value = i;
          item.textContent = String(i).padStart(2, '0');
          col.appendChild(item);
        }
        const bs = document.createElement('div');
        bs.className = 'wheel-item wheel-spacer';
        col.appendChild(bs);
        const itemH = 44;
        col.scrollTop = defVal * itemH;
        if (inp) inp.value = defVal;

        let ticking = false;
        col.addEventListener('scroll', () => {
          if (!ticking) {
            requestAnimationFrame(() => {
              const idx = Math.round(col.scrollTop / itemH);
              const clamped = Math.max(0, Math.min(count - 1, idx));
              const items = col.querySelectorAll('.wheel-item:not(.wheel-spacer)');
              items.forEach((el, i) => {
                el.classList.toggle('sel', i === clamped);
              });
              col.dataset.value = clamped;
              if (inp) inp.value = clamped;
              ticking = false;
            });
            ticking = true;
          }
        });
        return { col, itemH };
      };

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

      const inps = overlay.querySelectorAll('.tp-inp');
      const hW = buildWheel(maxHours + 1, initH, inps[0]);
      const sep1 = document.createElement('span'); sep1.className = 'tp-sep'; sep1.textContent = ':';
      const mW = buildWheel(60, initM, inps[1]);
      const sep2 = document.createElement('span'); sep2.className = 'tp-sep'; sep2.textContent = ':';
      const sW = buildWheel(60, initS, inps[2]);
      const picker = overlay.querySelector('.wheel-picker');
      picker.append(hW.col, sep2, mW.col, sep1, sW.col);

      [inps[0], inps[1], inps[2]].forEach((inp, i) => {
        inp.addEventListener('input', () => {
          const val = Math.max(Number(inp.min), Math.min(Number(inp.max), Number(inp.value) || 0));
          inp.value = val;
          const col = i === 0 ? hW.col : i === 1 ? mW.col : sW.col;
          col.scrollTop = val * hW.itemH;
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
        const h = Math.round(hW.col.scrollTop / hW.itemH);
        const m = Math.round(mW.col.scrollTop / mW.itemH);
        const s = Math.round(sW.col.scrollTop / sW.itemH);
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

window.ui = new UIManager();
