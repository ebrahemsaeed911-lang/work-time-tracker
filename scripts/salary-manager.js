import { storage } from './storage-manager.js';

// ==========================================================================
// Salary manager — reference hours, salary amount and hourly rate
// ==========================================================================

export const DEFAULT_SALARY_SETTINGS = {
  referenceHours: 0,
  salary: 0,
  currency: 'ج.م'
};

export class SalaryManager {
  async getSettings() {
    try {
      const settings = await storage.getItem('settings', 'salary');
      if (settings) {
        return {
          referenceHours: settings.referenceHours ?? DEFAULT_SALARY_SETTINGS.referenceHours,
          salary: settings.salary ?? DEFAULT_SALARY_SETTINGS.salary,
          currency: DEFAULT_SALARY_SETTINGS.currency
        };
      }
    } catch { }
    return { ...DEFAULT_SALARY_SETTINGS };
  }

  async saveSettings(refHours, salaryAmount) {
    await storage.setItem('settings', {
      key: 'salary',
      referenceHours: Number(refHours),
      salary: Number(salaryAmount)
    });
  }

  getHourlyRate(referenceHours, salary) {
    if (!referenceHours || !salary) return 0;
    return salary / referenceHours;
  }

  getExpectedSalary(totalHours, referenceHours, salary) {
    const hourlyRate = this.getHourlyRate(referenceHours, salary);
    return totalHours * hourlyRate;
  }
}

export const salary = new SalaryManager();
