import { bootstrapApp } from '../../scripts/app-bootstrap.js';
import { ui } from '../../scripts/ui-manager.js';
import { reportManager } from '../../scripts/report-manager.js';

// ==========================================================================
// Reports page — date range filter, summary and export
// ==========================================================================

class ReportsPage {
  async init() {
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
}

const reportsPage = new ReportsPage();

document.addEventListener('DOMContentLoaded', async () => {
  await bootstrapApp({ active: 'reports' });
  await reportsPage.init();
});
