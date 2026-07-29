class AttendanceManager {
  async getAllShifts() {
    const shifts = await storage.getAll('shifts');
    return shifts.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  async getTodayShift() {
    const today = ui.getTodayDate();
    const shifts = await storage.getAllByIndex('shifts', 'date', today);
    return shifts.length > 0 ? shifts[shifts.length - 1] : null;
  }

  async getActiveShift() {
    const today = ui.getTodayDate();
    const shifts = await storage.getAllByIndex('shifts', 'date', today);
    return shifts.find(s => s.checkIn && !s.checkOut) || null;
  }

  async getCurrentMonthShifts() {
    const month = ui.getCurrentMonth();
    const all = await this.getAllShifts();
    return all.filter(s => s.date.startsWith(month));
  }

  async getMonthShifts(year, month) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const all = await this.getAllShifts();
    return all.filter(s => s.date.startsWith(prefix));
  }

  async checkIn() {
    const activeShift = await this.getActiveShift();
    if (activeShift) {
      ui.showToast('تم تسجيل الحضور بالفعل', 'error');
      return false;
    }

    const now = new Date();
    const shift = {
      id: ui.generateId(),
      date: ui.getTodayDate(),
      checkIn: now.toISOString(),
      checkOut: null,
      hours: 0,
      note: ''
    };

    await storage.setItem('shifts', shift);
    await this._recordAttendance('checkIn', now);
    ui.showToast('تم تسجيل الحضور بنجاح', 'success');
    return true;
  }

  async checkOut() {
    const activeShift = await this.getActiveShift();

    if (!activeShift) {
      ui.showToast('لم يتم تسجيل الحضور', 'error');
      return false;
    }

    const now = new Date();
    const checkInTime = new Date(activeShift.checkIn);
    const hours = (now - checkInTime) / (1000 * 60 * 60);

    activeShift.checkOut = now.toISOString();
    activeShift.hours = Math.round(hours * 100) / 100;

    await storage.setItem('shifts', activeShift);
    await this._recordAttendance('checkOut', now);
    ui.showToast('تم تسجيل الانصراف بنجاح', 'success');
    return true;
  }

  async _recordAttendance(type, time) {
    const record = {
      id: ui.generateId(),
      type,
      time: time.toISOString(),
      date: ui.getTodayDate()
    };
    await storage.setItem('attendance', record);
  }

  async getLastAttendance() {
    const all = await storage.getAll('attendance');
    if (all.length === 0) return null;
    all.sort((a, b) => new Date(b.time) - new Date(a.time));
    return all[0];
  }

  async updateShift(id, data) {
    const shifts = await storage.getAll('shifts');
    const shift = shifts.find(s => s.id === id);
    if (!shift) return false;

    Object.assign(shift, data);

    if (shift.checkIn && shift.checkOut) {
      let checkInTime = new Date(shift.checkIn);
      let checkOutTime = new Date(shift.checkOut);
      if (checkOutTime <= checkInTime) checkOutTime.setDate(checkOutTime.getDate() + 1);
      let rawHours = (checkOutTime - checkInTime) / (1000 * 60 * 60);
      if (rawHours < 0) rawHours = Math.abs(rawHours);
      shift.hours = Math.round(rawHours * 100) / 100;
    }

    await storage.setItem('shifts', shift);
    return true;
  }

  async deleteShift(id) {
    await storage.deleteItem('shifts', id);
    ui.showToast('تم حذف الشيفت', 'success');
  }

  getTotalHours(shifts) {
    return shifts.reduce((sum, s) => sum + (s.hours || 0), 0);
  }

  getWorkDays(shifts) {
    return shifts.filter(s => s.hours > 0).length;
  }

  getCurrentStatus(shifts) {
    const today = ui.getTodayDate();
    const activeShift = shifts.find(s => s.date === today && s.checkIn && !s.checkOut);
    if (activeShift) return { status: 'checkedIn', label: 'تم الحضور فقط' };
    const todayShifts = shifts.filter(s => s.date === today);
    if (todayShifts.length > 0) return { status: 'completed', label: 'تم الانصراف' };
    return { status: 'none', label: 'لم يتم التسجيل' };
  }
}

window.attendance = new AttendanceManager();
