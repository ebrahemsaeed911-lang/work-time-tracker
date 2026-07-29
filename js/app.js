class App {
  async init() {
    await storage.init();
    ui.init();
    this._registerSW();
    this._setupNavigation();
    this._checkPWAFirstLaunch();

    const page = this._getCurrentPage();
    await this._loadPage(page);
  }

  _checkPWAFirstLaunch() {
    const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
    if (!isStandalone) return;
    try {
      if (localStorage.getItem('wtt_pwa_launched')) return;
      localStorage.setItem('wtt_pwa_launched', '1');
      setTimeout(() => {
        ui.showToast('بيانات متصفح Safari غير متاحة في التطبيق. استخدم تصدير Excel لنقل بياناتك.', 'info', 6000);
      }, 2000);
    } catch {}
  }

  _getCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('dashboard')) return 'dashboard';
    if (path.includes('reports')) return 'reports';
    if (path.includes('settings')) return 'settings';
    return 'dashboard';
  }

  async _loadPage(page) {
    switch (page) {
      case 'dashboard':
        await this._loadDashboard();
        break;
      case 'reports':
        await this._loadReports();
        break;
      case 'settings':
        await settingsPage.init();
        break;
    }
  }

  _setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && this._getCurrentPage() === this._getPageFromHref(href)) {
        link.classList.add('active');
      }
    });
  }

  _getPageFromHref(href) {
    if (href.includes('dashboard')) return 'dashboard';
    if (href.includes('reports')) return 'reports';
    if (href.includes('settings')) return 'settings';
    return 'dashboard';
  }

  async _loadDashboard() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    await this._checkNewPeriod(currentYear, currentMonth);

    const allShifts = await attendance.getAllShifts();
    const currentMonthShifts = await attendance.getCurrentMonthShifts();
    const monthDeductions = await deductions.getByMonth(currentYear, currentMonth);
    const settings = await salary.getSettings();
    const lastAttendance = await attendance.getLastAttendance();

    const monthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    const manualHours = await storage.getItem('settings', `manualHours_${monthKey}`);
    const totalHours = manualHours ? manualHours.hours : attendance.getTotalHours(currentMonthShifts);
    const workDays = attendance.getWorkDays(currentMonthShifts);
    const expectedSalary = salary.getExpectedSalary(totalHours, settings.referenceHours, settings.salary);
    const totalDeductions = deductions.getTotal(monthDeductions);
    const netSalary = deductions.getNetSalary(expectedSalary, totalDeductions);

    this._updateStats(totalHours, workDays, expectedSalary, totalDeductions, netSalary);
    this._updateAttendanceButtons(allShifts);
    this._updateLastRecord(lastAttendance);
    this._renderRecentShifts(
      currentMonthShifts.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10)
    );
    this._bindAttendanceEvents();
    this._bindNewPeriodButton(currentYear, currentMonth);
    this._bindStatsClick();
  }

  _bindStatsClick() {
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach((card, index) => {
      card.addEventListener('click', () => {
        if (index === 0) this._showAllMonthShifts();
      });
    });
  }

  async _showAllMonthShifts() {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const stored = await storage.getItem('settings', `manualHours_${monthKey}`);
    const currentHours = stored ? stored.hours : 0;

    const totalSeconds = Math.round(currentHours * 3600);
    const defH = Math.floor(totalSeconds / 3600);
    const defM = Math.floor((totalSeconds % 3600) / 60);
    const defS = totalSeconds % 60;

    const result = await ui.showHoursPicker('تعديل إجمالي ساعات الشهر', 799, defH, defM, defS);
    if (!result) return;

    const hours = result.h + result.m / 60 + result.s / 3600;

    if (hours === 0) {
      await storage.deleteItem('settings', `manualHours_${monthKey}`);
    } else {
      await storage.setItem('settings', {
        key: `manualHours_${monthKey}`,
        hours: Math.round(hours * 10000) / 10000
      });
    }

    ui.showToast('تم تحديث ساعات الشهر', 'success');
    await this._loadDashboard();
  }

  async _checkNewPeriod(year, month) {
    const lastPeriod = await storage.getLastPeriod();
    if (!lastPeriod) {
      await storage.setLastPeriod(year, month);
      return;
    }
    if (lastPeriod.year === year && lastPeriod.month === month) return;
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const confirmed = await ui.showModal(
      'بداية شهر جديد',
      `تم اكتشاف شهر جديد (${month}/${year}). هل تريد أرشفة الشهر الماضي وبدء فترة جديدة؟`,
      'أرشفة وبدء جديد',
      'تخطي'
    );
    if (confirmed) {
      await storage.archivePeriod(prevYear, prevMonth);
      ui.showToast('تم أرشفة الفترة السابقة وبدء فترة جديدة', 'success');
    }
    await storage.setLastPeriod(year, month);
  }

  async _startNewPeriod() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const confirmed = await ui.showModal(
      'بداية فترة جديدة',
      'سيتم حفظ بيانات الشهر الحالي في الأرشيف وبدء فترة جديدة من الصفر. هل تريد المتابعة؟',
      'تأكيد',
      'إلغاء'
    );
    if (!confirmed) return;

    await storage.archivePeriod(year, month);
    await storage.setLastPeriod(year, month);

    ui.showToast('تم أرشفة الشهر الحالي وبدء فترة جديدة', 'success');
    await this._loadDashboard();
  }

  _bindNewPeriodButton(year, month) {
    const btn = document.getElementById('newPeriodBtn');
    if (!btn) return;
    btn.onclick = async () => {
      const confirmed = await ui.showModal(
        'بداية فترة جديدة',
        'هل أنت متأكد؟ سيتم بدء فترة مرتب جديدة للشهر الحالي.',
        'تأكيد',
        'إلغاء'
      );
      if (confirmed) await this._startNewPeriod();
    };
  }

  _updateStats(totalHours, workDays, expectedSalary, totalDeductions, netSalary) {
    document.getElementById('totalHours').textContent = ui.formatHours(totalHours);
    document.getElementById('workDays').textContent = workDays;
    document.getElementById('expectedSalary').textContent = ui.formatCurrency(expectedSalary);
    document.getElementById('totalDeductions').textContent = ui.formatCurrency(totalDeductions);
    document.getElementById('netSalary').textContent = ui.formatCurrency(netSalary);
  }

  async _updateAttendanceButtons(allShifts) {
    const checkInBtn = document.getElementById('checkInBtn');
    const checkOutBtn = document.getElementById('checkOutBtn');

    if (!checkInBtn || !checkOutBtn) return;

    const today = ui.getTodayDate();
    const todayShifts = allShifts.filter(s => s.date === today && s.checkIn);
    const activeShift = todayShifts.find(s => s.checkIn && !s.checkOut);

    if (activeShift) {
      checkInBtn.disabled = true;
      checkOutBtn.disabled = false;
    } else {
      checkInBtn.disabled = false;
      checkOutBtn.disabled = true;
    }
  }

  _updateLastRecord(lastAttendance) {
    const container = document.getElementById('lastRecord');
    if (!container) return;

    if (!lastAttendance) {
      container.innerHTML = `
        <div class="last-record">
          <div class="last-record-icon in">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div class="last-record-info">
            <div class="last-record-label">آخر عملية</div>
            <div class="last-record-time">لا توجد عمليات سابقة</div>
          </div>
        </div>
      `;
      return;
    }

    const isCheckIn = lastAttendance.type === 'checkIn';
    container.innerHTML = `
      <div class="last-record">
        <div class="last-record-icon ${isCheckIn ? 'in' : 'out'}">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            ${isCheckIn
              ? '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'
              : '<circle cx="12" cy="12" r="10"/><polyline points="16 16 12 12 8 16"/>'
            }
          </svg>
        </div>
        <div class="last-record-info">
          <div class="last-record-label">آخر ${isCheckIn ? 'حضور' : 'انصراف'}</div>
          <div class="last-record-time">${ui.formatDateTime(lastAttendance.time)}</div>
        </div>
      </div>
    `;
  }

  _renderRecentShifts(shifts) {
    const container = document.getElementById('recentShiftsContainer');
    if (!container) return;

    if (shifts.length === 0) {
      container.innerHTML = `
        <div class="text-center text-muted" style="padding:24px;">
          لا توجد شيفتات مسجلة
        </div>
      `;
      return;
    }

    container.innerHTML = shifts.map(s => `
      <div class="shift-card fade-in${s.note ? ' has-note' : ''}" data-id="${s.id}">
        <div class="shift-card-main">
          <div class="shift-card-date">${ui.formatDate(s.date)}</div>
          <div class="shift-card-duration">${s.hours ? ui.formatHours(s.hours) : '—'}</div>
          ${s.note ? '<div class="shift-card-note-badge" title="هناك ملاحظة"></div>' : ''}
          <div class="shift-card-actions">
            <button class="btn-icon btn-edit-shift" data-id="${s.id}" title="تعديل">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="btn-icon btn-delete-shift" data-id="${s.id}" title="حذف">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="shift-card-details">
          <span class="shift-card-time-value">${s.checkIn ? ui.formatTime(s.checkIn) : '—'}</span>
          <span class="shift-card-time-label">حضور</span>
          <span class="shift-card-time-sep">|</span>
          <span class="shift-card-time-value">${s.checkOut ? ui.formatTime(s.checkOut) : '—'}</span>
          <span class="shift-card-time-label">انصراف</span>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.shift-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('.shift-card-actions')) return;
        card.classList.toggle('active');
      });
    });

    container.querySelectorAll('.btn-edit-shift').forEach(btn => {
      btn.addEventListener('click', e => this._editShift(btn.dataset.id));
    });

    container.querySelectorAll('.btn-delete-shift').forEach(btn => {
      btn.addEventListener('click', e => this._deleteShift(btn.dataset.id));
    });
  }

  async _editShift(id) {
    const allShifts = await attendance.getAllShifts();
    const shift = allShifts.find(s => s.id === id);
    if (!shift) return;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const checkInTime = shift.checkIn ? shift.checkIn.slice(11, 19) : '';
    const checkOutTime = shift.checkOut ? shift.checkOut.slice(11, 19) : '';
    const note = shift.note || '';
    const totalSeconds = Math.round((shift.hours || 0) * 3600);
    const defH = Math.min(12, Math.floor(totalSeconds / 3600));
    const defM = Math.floor((totalSeconds % 3600) / 60);
    const defS = totalSeconds % 60;

    overlay.innerHTML = `
      <div class="modal">
        <h3 class="modal-title">تعديل الشيفت</h3>
        <div class="modal-content">
          <div class="form-group">
            <label class="form-label">التاريخ</label>
            <input type="date" class="form-input" id="editShiftDate" value="${shift.date}">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">وقت الحضور (اختياري)</label>
              <div style="display:flex;align-items:center;gap:6px">
                <input type="time" step="1" class="form-input" id="editCheckIn" value="${checkInTime}" style="flex:1">
                <span class="ampm-label" id="editCheckInAMPM">${checkInTime ? (Number(checkInTime.split(':')[0]) >= 12 ? 'مساءً' : 'صباحاً') : ''}</span>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">وقت الانصراف (اختياري)</label>
              <div style="display:flex;align-items:center;gap:6px">
                <input type="time" step="1" class="form-input" id="editCheckOut" value="${checkOutTime}" style="flex:1">
                <span class="ampm-label" id="editCheckOutAMPM">${checkOutTime ? (Number(checkOutTime.split(':')[0]) >= 12 ? 'مساءً' : 'صباحاً') : ''}</span>
              </div>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">ملاحظة (اختياري)</label>
            <textarea class="form-input" id="editShiftNote" rows="2" placeholder="ملاحظة لهذا الشيفت">${note}</textarea>
          </div>
          <div class="form-divider"><span>أو أدخل الساعات مباشرة</span></div>
          <div class="wheel-picker-sm">
            <div class="wheel-picker"><div class="wheel-highlight"></div></div>
            <div class="tp-labels" dir="ltr">
              <span>س</span><span>د</span><span>ث</span>
            </div>
            <div class="tp-inputs" dir="ltr">
              <input type="number" class="tp-inp" min="0" max="12" value="${defH}">
              <input type="number" class="tp-inp" min="0" max="59" value="${defM}">
              <input type="number" class="tp-inp" min="0" max="59" value="${defS}">
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline btn-cancel">إلغاء</button>
          <button class="btn btn-primary btn-confirm">حفظ</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));

    const picker = overlay.querySelector('.wheel-picker-sm .wheel-picker');
    const inps = overlay.querySelectorAll('.wheel-picker-sm .tp-inp');
    const itemH = 44;

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
      col.scrollTop = defVal * itemH;
      if (inp) inp.value = defVal;

      let ticking = false;
      col.addEventListener('scroll', () => {
        if (!ticking) {
          requestAnimationFrame(() => {
            const idx = Math.round(col.scrollTop / itemH);
            const clamped = Math.max(0, Math.min(count - 1, idx));
            const items = col.querySelectorAll('.wheel-item:not(.wheel-spacer)');
            items.forEach((el, i) => el.classList.toggle('sel', i === clamped));
            col.dataset.value = clamped;
            if (inp) inp.value = clamped;
            ticking = false;
          });
          ticking = true;
        }
      });
      return col;
    };

    const hCol = buildWheel(13, defH, inps[0]);
    const sep1 = document.createElement('span'); sep1.className = 'tp-sep'; sep1.textContent = ':';
    const mCol = buildWheel(60, defM, inps[1]);
    const sep2 = document.createElement('span'); sep2.className = 'tp-sep'; sep2.textContent = ':';
    const sCol = buildWheel(60, defS, inps[2]);
    picker.append(hCol, sep2, mCol, sep1, sCol);

    [inps[0], inps[1], inps[2]].forEach((inp, i) => {
      inp.addEventListener('input', () => {
        const val = Math.max(Number(inp.min), Math.min(Number(inp.max), Number(inp.value) || 0));
        inp.value = val;
        const col = i === 0 ? hCol : i === 1 ? mCol : sCol;
        col.scrollTop = val * itemH;
        const items = col.querySelectorAll('.wheel-item:not(.wheel-spacer)');
        items.forEach((el, j) => el.classList.toggle('sel', j === val));
        col.dataset.value = val;
      });
    });

    ['editCheckIn', 'editCheckOut'].forEach(id => {
      const inp = document.getElementById(id);
      const lbl = document.getElementById(id + 'AMPM');
      if (inp && lbl) {
        inp.addEventListener('input', () => {
          const h = Number(inp.value ? inp.value.split(':')[0] : 0);
          lbl.textContent = h >= 12 ? 'مساءً' : 'صباحاً';
        });
      }
    });

    overlay.querySelector('.btn-cancel').addEventListener('click', () => {
      overlay.remove();
    });

    overlay.querySelector('.btn-confirm').addEventListener('click', async () => {
      const date = document.getElementById('editShiftDate').value;
      const checkInTime = document.getElementById('editCheckIn').value;
      const checkOutTime = document.getElementById('editCheckOut').value;
      const note = document.getElementById('editShiftNote').value.trim();

      if (!date) {
        ui.showToast('يرجى إدخال التاريخ', 'error');
        return;
      }

      const oldHours = shift.hours || 0;
      let newHours;

      if (checkInTime && checkOutTime) {
        const checkInDate = new Date(`${date}T${checkInTime}`);
        let checkOutDate = new Date(`${date}T${checkOutTime}`);
        if (checkOutDate <= checkInDate) checkOutDate.setDate(checkOutDate.getDate() + 1);
        await attendance.updateShift(id, {
          date,
          checkIn: checkInDate.toISOString(),
          checkOut: checkOutDate.toISOString(),
          note
        });
        newHours = shift.hours || 0;
      } else {
        newHours = Math.round(
          (Math.round(hCol.scrollTop / itemH) +
           Math.round(mCol.scrollTop / itemH) / 60 +
           Math.round(sCol.scrollTop / itemH) / 3600) * 10000
        ) / 10000;
        await storage.setItem('shifts', Object.assign({}, shift, {
          date, note, checkIn: null, checkOut: null, hours: newHours
        }));
      }

      const monthKey = date.slice(0, 7);
      const mh = await storage.getItem('settings', `manualHours_${monthKey}`);
      if (mh) {
        mh.hours = Math.round((mh.hours + (newHours - oldHours)) * 10000) / 10000;
        await storage.setItem('settings', mh);
      }

      overlay.remove();
      ui.showToast('تم تحديث الشيفت', 'success');
      await this._loadDashboard();
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }

  async _deleteShift(id) {
    const confirmed = await ui.showModal('حذف الشيفت', 'هل أنت متأكد من حذف هذا الشيفت؟');
    if (!confirmed) return;

    const allShifts = await attendance.getAllShifts();
    const shift = allShifts.find(s => s.id === id);
    if (!shift) return;

    await attendance.deleteShift(id);

    const monthKey = shift.date.slice(0, 7);
    const mh = await storage.getItem('settings', `manualHours_${monthKey}`);
    if (mh) {
      mh.hours = Math.round((mh.hours - (shift.hours || 0)) * 10000) / 10000;
      await storage.setItem('settings', mh);
    }

    await this._loadDashboard();
  }

  _bindAttendanceEvents() {
    if (this.attendanceEventsBound) return;
    this.attendanceEventsBound = true;

    const checkInBtn = document.getElementById('checkInBtn');
    const checkOutBtn = document.getElementById('checkOutBtn');

    if (checkInBtn) {
      checkInBtn.addEventListener('click', async () => {
        const result = await attendance.checkIn();
        if (result) await this._loadDashboard();
      });
    }

    if (checkOutBtn) {
      checkOutBtn.addEventListener('click', async () => {
        const result = await attendance.checkOut();
        if (result) {
          const shift = await attendance.getTodayShift();
          if (shift && shift.hours) {
            const now = new Date();
            const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const mh = await storage.getItem('settings', `manualHours_${monthKey}`);
            if (mh) {
              mh.hours = Math.round((mh.hours + shift.hours) * 10000) / 10000;
              await storage.setItem('settings', mh);
            }
          }
          await this._loadDashboard();
        }
      });
    }
  }

  async _loadReports() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const fromStr = firstDay.toISOString().slice(0, 10);
    const toStr = now.toISOString().slice(0, 10);

    document.getElementById('reportDateFrom').value = fromStr;
    document.getElementById('reportDateTo').value = toStr;
    document.getElementById('reportDateTo').max = '2030-12-31';

    await this._generateRangeReport(fromStr, toStr);

    document.getElementById('reportDateFrom').addEventListener('change', async () => {
      const f = document.getElementById('reportDateFrom').value;
      const t = document.getElementById('reportDateTo').value;
      if (f && t) await this._generateRangeReport(f, t);
    });

    document.getElementById('reportDateTo').addEventListener('change', async () => {
      const f = document.getElementById('reportDateFrom').value;
      const t = document.getElementById('reportDateTo').value;
      if (f && t) await this._generateRangeReport(f, t);
    });

    document.getElementById('exportPDF').addEventListener('click', async () => {
      const f = document.getElementById('reportDateFrom').value;
      const t = document.getElementById('reportDateTo').value;
      const report = await reportManager.generateRangeReport(f, t);
      await reportManager.exportToPDF(report);
    });

    document.getElementById('exportCSV').addEventListener('click', async () => {
      const f = document.getElementById('reportDateFrom').value;
      const t = document.getElementById('reportDateTo').value;
      const report = await reportManager.generateRangeReport(f, t);
      await reportManager.exportToCSV(report);
    });
  }

  async _generateRangeReport(fromDate, toDate) {
    const report = await reportManager.generateRangeReport(fromDate, toDate);

    document.getElementById('reportTotalHours').textContent = ui.formatHours(report.totalHours);
    document.getElementById('reportWorkDays').textContent = `${report.workDays} يوم`;
    document.getElementById('reportExpectedSalary').textContent = ui.formatCurrency(report.expectedSalary);
    document.getElementById('reportDeductions').textContent = ui.formatCurrency(report.totalDeductions);
    document.getElementById('reportNetSalary').textContent = ui.formatCurrency(report.netSalary);

    const tbody = document.getElementById('reportShiftsBody');
    if (!tbody) return;

      if (report.shifts.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" class="text-center text-muted" style="padding:24px;">
              لا توجد شيفتات في هذا النطاق
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = report.shifts.map(s => `
        <tr>
          <td>${ui.formatDate(s.date)}</td>
          <td>${s.checkIn ? ui.formatTime(s.checkIn) : '—'}</td>
          <td>${s.checkOut ? ui.formatTime(s.checkOut) : '—'}</td>
          <td>${s.hours ? ui.formatHours(s.hours) : '—'}</td>
          <td>${s.note || ''}</td>
        </tr>
      `).join('');
  }

  _registerSW() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
          .then((reg) => {
            console.log('SW registered:', reg.scope);

            reg.addEventListener('updatefound', () => {
              const newWorker = reg.installing;
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  ui.showToast('تم تحديث التطبيق. أعد فتحه للاستفادة.', 'info', 5000);
                }
              });
            });
          })
          .catch((err) => {
            console.log('SW registration failed:', err);
          });

        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        });
      });

      let deferredPrompt;
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;

        const installBtn = document.getElementById('installBtn');
        if (installBtn) {
          installBtn.style.display = 'flex';
          installBtn.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            installBtn.style.display = 'none';
            deferredPrompt.prompt();
            const result = await deferredPrompt.userChoice;
            if (result.outcome === 'accepted') {
              ui.showToast('تم تثبيت التطبيق', 'success');
            }
            deferredPrompt = null;
          });
        }
      });

      window.addEventListener('appinstalled', () => {
        const installBtn = document.getElementById('installBtn');
        if (installBtn) installBtn.style.display = 'none';
        ui.showToast('تم تثبيت التطبيق بنجاح', 'success');
      });
    }
  }
}

const app = new App();
document.addEventListener('DOMContentLoaded', () => app.init());
