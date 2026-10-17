import { bootstrapApp } from '../../scripts/app-bootstrap.js';
import { storage } from '../../scripts/storage-manager.js';
import { ui } from '../../scripts/ui-manager.js';
import { salary } from '../../scripts/salary-manager.js';
import { deductions } from '../../scripts/deductions-manager.js';
import { createWheelColumn, readWheelValue, WHEEL_ITEM_HEIGHT } from '../../scripts/wheel-time-picker.js';
import { editSvg, trashSvg } from '../../components/shared/svg-icons.js';

// ==========================================================================
// Settings page — salary settings, deductions, theme, data and links
// ==========================================================================

class SettingsPage {
  async init() {
    await this._loadSettings();
    this._bindEvents();
  }

  async _loadSettings() {
    const settings = await salary.getSettings();
    document.getElementById('referenceHours').value = settings.referenceHours;
    document.getElementById('salaryAmount').value = settings.salary;
    this._updatePreview(settings.referenceHours, settings.salary);
  }

  _bindEvents() {
    const refHours = document.getElementById('referenceHours');
    const salaryAmount = document.getElementById('salaryAmount');

    refHours.addEventListener('input', () => {
      this._updatePreview(
        Number(refHours.value) || 0,
        Number(salaryAmount.value) || 0
      );
    });

    salaryAmount.addEventListener('input', () => {
      this._updatePreview(
        Number(refHours.value) || 0,
        Number(salaryAmount.value) || 0
      );
    });

    document.getElementById('saveSalary').addEventListener('click', async () => {
      const refHoursValue = Number(document.getElementById('referenceHours').value) || 0;
      const salaryValue = Number(document.getElementById('salaryAmount').value) || 0;

      if (refHoursValue <= 0 || salaryValue <= 0) {
        ui.showToast('يرجى إدخال قيم صحيحة', 'error');
        return;
      }

      await salary.saveSettings(refHoursValue, salaryValue);
      this._updatePreview(refHoursValue, salaryValue);
      ui.showToast('تم حفظ إعدادات المرتب', 'success');
    });

    document.getElementById('addDeduction').addEventListener('click', () => {
      this._showAddDeductionModal();
    });

    document.getElementById('addShiftBtn').addEventListener('click', () => {
      this._addManualShift();
    });

    document.getElementById('exportData').addEventListener('click', () => {
      this._exportAllData();
    });

    document.getElementById('importData').addEventListener('click', () => {
      this._importData();
    });

    document.getElementById('newPeriodBtnSettings').addEventListener('click', async () => {
      const confirmed = await ui.showModal(
        'بداية فترة جديدة',
        'سيتم حفظ بيانات الشهر الحالي في الأرشيف وبدء فترة جديدة من الصفر. هل تريد المتابعة؟',
        'تأكيد',
        'إلغاء'
      );
      if (confirmed) {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        await storage.archivePeriod(year, month);
        await storage.setLastPeriod(year, month);
        ui.showToast('تم أرشفة الشهر الحالي وبدء فترة جديدة', 'success');
      }
    });

    document.getElementById('clearData').addEventListener('click', async () => {
      const confirmed = await ui.showModal(
        'حذف كل البيانات',
        'هل أنت متأكد من حذف جميع البيانات؟ لا يمكن التراجع عن هذا الإجراء.',
        'حذف',
        'إلغاء'
      );
      if (confirmed) {
        await storage.clearStore('shifts');
        await storage.clearStore('deductions');
        await storage.clearStore('attendance');
        await storage.clearStore('settings');
        ui.showToast('تم حذف جميع البيانات', 'success');
        await this._loadSettings();
        this._renderDeductions();
      }
    });

    this._renderDeductions();
  }

  _updatePreview(refHours, salaryAmount) {
    const rate = salary.getHourlyRate(refHours, salaryAmount);
    document.getElementById('hourlyRatePreview').textContent =
      rate ? ui.formatCurrency(rate) : '—';
    document.getElementById('refHoursPreview').textContent =
      refHours ? `${refHours} ساعة` : '—';
    document.getElementById('salaryPreview').textContent =
      salaryAmount ? ui.formatCurrency(salaryAmount) : '—';
  }

  async _renderDeductions() {
    const list = document.getElementById('deductionsList');
    const allDeductions = await deductions.getAll();
    const total = deductions.getTotal(allDeductions);

    document.getElementById('totalDeductions').textContent = ui.formatCurrency(total);

    if (allDeductions.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
          </svg>
          <h3>لا توجد خصومات</h3>
          <p>لم يتم إضافة أي خصومات بعد</p>
        </div>
      `;
      return;
    }

    list.innerHTML = allDeductions.map(d => `
      <div class="deduction-item fade-in">
        <div class="deduction-info">
          <div class="deduction-reason">${d.reason}</div>
          <div class="deduction-meta">
            <span>${ui.formatDate(d.date)}</span>
          </div>
        </div>
        <div class="deduction-amount">${ui.formatCurrency(d.amount)}</div>
        <div class="deduction-actions">
          <button class="btn-icon" onclick="window.settingsPage._editDeduction('${d.id}')" title="تعديل">
            ${editSvg(18)}
          </button>
          <button class="btn-icon" onclick="window.settingsPage._deleteDeduction('${d.id}')" title="حذف">
            ${trashSvg(18)}
          </button>
        </div>
      </div>
    `).join('');
  }

  async _showAddDeductionModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    overlay.innerHTML = `
      <div class="modal">
        <h3 class="modal-title">إضافة خصم جديد</h3>
        <div class="modal-content">
          <div class="form-group">
            <label class="form-label">السبب</label>
            <input type="text" class="form-input" id="deductionReason" placeholder="سبب الخصم" required>
          </div>
          <div class="form-group">
            <label class="form-label">القيمة</label>
            <input type="number" class="form-input" id="deductionAmount" placeholder="المبلغ" min="0" step="0.01" required>
          </div>
          <div class="form-group">
            <label class="form-label">التاريخ</label>
            <input type="date" class="form-input" id="deductionDate" value="${ui.getTodayDate()}">
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline btn-cancel">إلغاء</button>
          <button class="btn btn-primary btn-confirm">إضافة</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));

    overlay.querySelector('.btn-cancel').addEventListener('click', () => {
      overlay.remove();
    });

    overlay.querySelector('.btn-confirm').addEventListener('click', async () => {
      const reason = document.getElementById('deductionReason').value.trim();
      const amount = document.getElementById('deductionAmount').value;
      const date = document.getElementById('deductionDate').value;

      if (!reason) {
        ui.showToast('يرجى إدخال سبب الخصم', 'error');
        return;
      }
      if (!amount || Number(amount) <= 0) {
        ui.showToast('يرجى إدخال قيمة صحيحة', 'error');
        return;
      }

      await deductions.add(reason, amount, date);
      overlay.remove();
      this._renderDeductions();
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
  }

  async _editDeduction(id) {
    const all = await deductions.getAll();
    const deduction = all.find(d => d.id === id);
    if (!deduction) return;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    overlay.innerHTML = `
      <div class="modal">
        <h3 class="modal-title">تعديل الخصم</h3>
        <div class="modal-content">
          <div class="form-group">
            <label class="form-label">السبب</label>
            <input type="text" class="form-input" id="deductionReason" value="${deduction.reason}" required>
          </div>
          <div class="form-group">
            <label class="form-label">القيمة</label>
            <input type="number" class="form-input" id="deductionAmount" value="${deduction.amount}" min="0" step="0.01" required>
          </div>
          <div class="form-group">
            <label class="form-label">التاريخ</label>
            <input type="date" class="form-input" id="deductionDate" value="${deduction.date}">
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

    overlay.querySelector('.btn-cancel').addEventListener('click', () => {
      overlay.remove();
    });

    overlay.querySelector('.btn-confirm').addEventListener('click', async () => {
      const reason = document.getElementById('deductionReason').value.trim();
      const amount = document.getElementById('deductionAmount').value;
      const date = document.getElementById('deductionDate').value;

      if (!reason || !amount || Number(amount) <= 0) {
        ui.showToast('يرجى إدخال بيانات صحيحة', 'error');
        return;
      }

      await deductions.update(id, { reason, amount: Number(amount), date });
      overlay.remove();
      this._renderDeductions();
      ui.showToast('تم تحديث الخصم', 'success');
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
  }

  async _deleteDeduction(id) {
    const confirmed = await ui.showModal('حذف الخصم', 'هل أنت متأكد من حذف هذا الخصم؟');
    if (confirmed) {
      await deductions.remove(id);
      this._renderDeductions();
    }
  }

  async _addManualShift() {
    const today = ui.getTodayDate();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    overlay.innerHTML = `
      <div class="modal">
        <h3 class="modal-title">إضافة شيفت يدوي</h3>
        <div class="modal-content">
          <div class="form-group">
            <label class="form-label">التاريخ</label>
            <input type="date" class="form-input" id="manualShiftDate" value="${today}">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">وقت الحضور (اختياري)</label>
              <div style="display:flex;align-items:center;gap:6px">
                <input type="time" step="1" class="form-input" id="manualShiftCheckIn" style="flex:1">
                <span class="ampm-label" id="manualShiftCheckInAMPM"></span>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">وقت الانصراف (اختياري)</label>
              <div style="display:flex;align-items:center;gap:6px">
                <input type="time" step="1" class="form-input" id="manualShiftCheckOut" style="flex:1">
                <span class="ampm-label" id="manualShiftCheckOutAMPM"></span>
              </div>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">ملاحظة (اختياري)</label>
            <textarea class="form-input" id="manualShiftNote" rows="2" placeholder="ملاحظة لهذا الشيفت"></textarea>
          </div>
          <div class="form-divider"><span>أو أدخل الساعات مباشرة</span></div>
          <div class="wheel-picker-sm">
            <div class="wheel-picker"><div class="wheel-highlight"></div></div>
            <div class="tp-labels" dir="ltr">
              <span>س</span><span>د</span><span>ث</span>
            </div>
            <div class="tp-inputs" dir="ltr">
              <input type="number" class="tp-inp" min="0" max="12" value="0">
              <input type="number" class="tp-inp" min="0" max="59" value="0">
              <input type="number" class="tp-inp" min="0" max="59" value="0">
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

    const hW = createWheelColumn(13, 0, inps[0]);
    const sep1 = document.createElement('span'); sep1.className = 'tp-sep'; sep1.textContent = ':';
    const mW = createWheelColumn(60, 0, inps[1]);
    const sep2 = document.createElement('span'); sep2.className = 'tp-sep'; sep2.textContent = ':';
    const sW = createWheelColumn(60, 0, inps[2]);
    picker.append(hW, sep2, mW, sep1, sW);

    [inps[0], inps[1], inps[2]].forEach((inp, i) => {
      inp.addEventListener('input', () => {
        const val = Math.max(Number(inp.min), Math.min(Number(inp.max), Number(inp.value) || 0));
        inp.value = val;
        const col = i === 0 ? hW : i === 1 ? mW : sW;
        col.scrollTop = val * WHEEL_ITEM_HEIGHT;
        const items = col.querySelectorAll('.wheel-item:not(.wheel-spacer)');
        items.forEach((el, j) => el.classList.toggle('sel', j === val));
        col.dataset.value = val;
      });
    });

    ['manualShiftCheckIn', 'manualShiftCheckOut'].forEach(id => {
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
      const date = document.getElementById('manualShiftDate').value;
      const checkInTime = document.getElementById('manualShiftCheckIn').value;
      const checkOutTime = document.getElementById('manualShiftCheckOut').value;
      const note = document.getElementById('manualShiftNote').value.trim();

      if (!date) {
        ui.showToast('يرجى إدخال التاريخ', 'error');
        return;
      }

      const wheelH = readWheelValue(hW);
      const wheelM = readWheelValue(mW);
      const wheelS = readWheelValue(sW);
      const wheelHours = Math.round((wheelH + wheelM / 60 + wheelS / 3600) * 10000) / 10000;

      if (checkInTime && checkOutTime) {
        const checkInDate = new Date(`${date}T${checkInTime}`);
        let checkOutDate = new Date(`${date}T${checkOutTime}`);
        if (checkOutDate <= checkInDate) checkOutDate.setDate(checkOutDate.getDate() + 1);
        const checkIn = checkInDate.toISOString();
        const checkOut = checkOutDate.toISOString();
        let shiftHours = (checkOutDate - checkInDate) / (1000 * 60 * 60);
        if (shiftHours < 0) shiftHours = Math.abs(shiftHours);
        shiftHours = Math.round(shiftHours * 100) / 100;
        await storage.setItem('shifts', {
          id: ui.generateId(), date, checkIn, checkOut, hours: shiftHours, note
        });
        const monthKey = date.slice(0, 7);
        const mh = await storage.getItem('settings', `manualHours_${monthKey}`);
        if (mh) {
          mh.hours = Math.round((mh.hours + shiftHours) * 10000) / 10000;
          await storage.setItem('settings', mh);
        }
      } else {
        await storage.setItem('shifts', {
          id: ui.generateId(), date, checkIn: null, checkOut: null, hours: wheelHours, note
        });
        const monthKey = date.slice(0, 7);
        const mh = await storage.getItem('settings', `manualHours_${monthKey}`);
        if (mh) {
          mh.hours = Math.round((mh.hours + wheelHours) * 10000) / 10000;
          await storage.setItem('settings', mh);
        }
      }

      overlay.remove();
      ui.showToast('تم إضافة الشيفت بنجاح', 'success');
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }

  async _exportAllData() {
    const now = new Date();

    const shifts = await storage.getAll('shifts');
    const allDeductions = await storage.getAll('deductions');
    const allSettings = await storage.getAll('settings');
    const attendanceRecords = await storage.getAll('attendance');
    const archivedPeriods = allSettings.filter(s => s.key && s.key.startsWith('archived_'));
    const manualHours = allSettings.filter(s => s.key && s.key.startsWith('manualHours_'));

    const salarySettings = allSettings.find(s => s.key === 'salary');
    const activePeriod = allSettings.find(s => s.key === 'activePeriod');

    const exportData = {
      version: 2,
      exportedAt: now.toISOString(),
      data: {
        shifts,
        deductions: allDeductions,
        attendance: attendanceRecords,
        salary: salarySettings || null,
        activePeriod: activePeriod || null,
        manualHours,
        archives: archivedPeriods
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `حساب_المرتب_${ui.getTodayDate()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    ui.showToast('تم تصدير جميع البيانات', 'success');
  }

  _importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    input.style.opacity = '0';

    const cleanup = () => input.remove();

    input.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) {
        cleanup();
        return;
      }

      try {
        const text = await this._readFileText(file);
        const parsed = JSON.parse(text);

        if (!parsed || typeof parsed !== 'object' || !parsed.version || !parsed.data) {
          ui.showToast('ملف غير صالح', 'error');
          return;
        }

        const d = parsed.data;
        const shiftCount = Array.isArray(d.shifts) ? d.shifts.length : 0;
        const dedCount = Array.isArray(d.deductions) ? d.deductions.length : 0;
        const archiveCount = Array.isArray(d.archives) ? d.archives.length : 0;

        const confirmed = await ui.showModal(
          'استيراد البيانات',
          `سيتم استيراد ${shiftCount} شيفت، ${dedCount} خصم، و ${archiveCount} فترة مؤرشفة. هل تريد استبدال جميع البيانات الحالية؟`,
          'استبدال',
          'إلغاء'
        );

        if (!confirmed) return;

        await this._applyImport(d);

        ui.showToast('تم استيراد البيانات بنجاح', 'success');
        await this._renderDeductions();
        await this._loadSettings();
      } catch (err) {
        console.error('Import failed:', err);
        ui.showToast('فشل استيراد الملف', 'error');
      } finally {
        cleanup();
      }
    });

    document.body.appendChild(input);
    input.click();
  }

  _readFileText(file) {
    if (typeof file.text === 'function') {
      return file.text();
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  async _applyImport(d) {
    const normRecords = (records) =>
      Array.isArray(records) ? records.filter((r) => r && typeof r === 'object') : [];

    await storage.clearStore('shifts');
    await storage.clearStore('deductions');
    await storage.clearStore('attendance');

    const allSettings = await storage.getAll('settings');
    for (const s of allSettings) {
      await storage.deleteItem('settings', s.key || s.id);
    }

    for (const shift of normRecords(d.shifts)) {
      await storage.setItem('shifts', shift.id ? shift : { ...shift, id: ui.generateId() });
    }
    for (const ded of normRecords(d.deductions)) {
      await storage.setItem('deductions', ded.id ? ded : { ...ded, id: ui.generateId() });
    }
    for (const record of normRecords(d.attendance)) {
      await storage.setItem('attendance', record.id ? record : { ...record, id: ui.generateId() });
    }

    const settingsItems = [];
    if (d.salary) settingsItems.push(d.salary);
    if (d.activePeriod) settingsItems.push(d.activePeriod);
    settingsItems.push(...normRecords(d.manualHours), ...normRecords(d.archives));

    for (const item of settingsItems) {
      if (item && item.key) {
        await storage.setItem('settings', item);
      }
    }
  }
}

const settingsPage = new SettingsPage();
window.settingsPage = settingsPage;

document.addEventListener('DOMContentLoaded', async () => {
  await bootstrapApp({ active: 'settings' });
  await settingsPage.init();
});
