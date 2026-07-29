const DEFAULT_SETTINGS = {
  referenceHours: 0,
  salary: 0,
  currency: 'ج.م'
};

class SalaryManager {
  async getSettings() {
    try {
      const settings = await storage.getItem('settings', 'salary');
      if (settings) {
        return {
          referenceHours: settings.referenceHours ?? DEFAULT_SETTINGS.referenceHours,
          salary: settings.salary ?? DEFAULT_SETTINGS.salary,
          currency: DEFAULT_SETTINGS.currency
        };
      }
    } catch { }
    return { ...DEFAULT_SETTINGS };
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

window.salary = new SalaryManager();
