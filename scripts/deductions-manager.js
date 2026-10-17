import { storage } from './storage-manager.js';
import { ui } from './ui-manager.js';

// ==========================================================================
// Deductions manager — add / update / remove and monthly aggregation
// ==========================================================================

export class DeductionManager {
  async getAll() {
    const deductions = await storage.getAll('deductions');
    return deductions.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  async add(reason, amount, date) {
    const deduction = {
      id: ui.generateId(),
      reason,
      amount: Number(amount),
      date: date || ui.getTodayDate(),
      createdAt: new Date().toISOString()
    };

    await storage.setItem('deductions', deduction);
    ui.showToast('تم إضافة الخصم بنجاح', 'success');
    return deduction;
  }

  async remove(id) {
    await storage.deleteItem('deductions', id);
    ui.showToast('تم حذف الخصم', 'success');
  }

  async update(id, data) {
    const deductions = await storage.getAll('deductions');
    const deduction = deductions.find(d => d.id === id);
    if (!deduction) return false;

    Object.assign(deduction, data);
    await storage.setItem('deductions', deduction);
    return true;
  }

  async getByMonth(year, month) {
    const all = await this.getAll();
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    return all.filter(d => d.date && d.date.startsWith(prefix));
  }

  getTotal(deductions) {
    return deductions.reduce((sum, d) => sum + (d.amount || 0), 0);
  }

  getNetSalary(expectedSalary, totalDeductions) {
    return Math.max(0, expectedSalary - totalDeductions);
  }
}

export const deductions = new DeductionManager();
