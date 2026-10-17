import { storage } from './storage-manager.js';
import { ui } from './ui-manager.js';
import { attendance } from './attendance-manager.js';
import { deductions } from './deductions-manager.js';
import { salary } from './salary-manager.js';

// ==========================================================================
// Report manager — monthly/range reports and PDF/CSV export
// ==========================================================================

export class ReportManager {
  async generateMonthlyReport(year, month) {
    let shifts = await attendance.getMonthShifts(year, month);
    let allDeductions = await deductions.getAll();
    const settings = await salary.getSettings();

    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
    let monthDeductions = allDeductions.filter(d => d.date.startsWith(monthPrefix));

    let manualHours = null;
    if (shifts.length === 0 && monthDeductions.length === 0) {
      const archived = await storage.getArchivedPeriod(year, month);
      if (archived) {
        shifts = archived.shifts || [];
        monthDeductions = archived.deductions || [];
        if (archived.manualHours) manualHours = archived.manualHours;
      }
    }

    return this._buildReport(shifts, monthDeductions, settings, { year, month }, manualHours);
  }

  async generateRangeReport(fromDate, toDate) {
    const allShifts = await attendance.getAllShifts();
    const allDeductions = await deductions.getAll();
    const settings = await salary.getSettings();

    const from = fromDate;
    const to = toDate;

    const shifts = allShifts.filter(s => s.date && s.date >= from && s.date <= to);
    const rangeDeductions = allDeductions.filter(d => d.date && d.date >= from && d.date <= to);

    const archivedPeriods = await storage.getArchivedPeriods();
    for (const p of archivedPeriods) {
      if (!p.year || !p.month) continue;
      const archived = await storage.getArchivedPeriod(p.year, p.month);
      if (!archived) continue;
      const aShifts = (archived.shifts || []).filter(s => s.date && s.date >= from && s.date <= to);
      const aDeds = (archived.deductions || []).filter(d => d.date && d.date >= from && d.date <= to);
      shifts.push(...aShifts);
      rangeDeductions.push(...aDeds);
    }

    return this._buildReport(shifts, rangeDeductions, settings, { fromDate, toDate }, null);
  }

  _buildReport(shifts, deductionsList, settings, periodInfo, manualHours) {
    const totalHours = manualHours || attendance.getTotalHours(shifts);
    const workDays = manualHours ? shifts.filter(s => s.hours > 0).length : attendance.getWorkDays(shifts);
    const hourlyRate = salary.getHourlyRate(settings.referenceHours, settings.salary);
    const expectedSalary = salary.getExpectedSalary(totalHours, settings.referenceHours, settings.salary);
    const totalDeductions = deductions.getTotal(deductionsList);
    const netSalary = deductions.getNetSalary(expectedSalary, totalDeductions);

    return {
      ...periodInfo,
      shifts,
      deductions: deductionsList,
      totalHours: Math.round(totalHours * 100) / 100,
      workDays,
      hourlyRate: Math.round(hourlyRate * 100) / 100,
      expectedSalary: Math.round(expectedSalary * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      netSalary: Math.round(netSalary * 100) / 100
    };
  }

  _getTitle(report) {
    if (report.year && report.month) {
      const names = ['يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      return `${names[report.month - 1]} ${report.year}`;
    }
    return `من ${report.fromDate} إلى ${report.toDate}`;
  }

  async exportToPDF(report) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      ui.showToast('يرجى السماح بالنوافق المنبثقة', 'error');
      return;
    }

    const title = this._getTitle(report);
    const shiftsHtml = report.shifts.map(s => `
      <tr>
        <td>${ui.formatDate(s.date)}</td>
        <td>${s.checkIn ? ui.formatTime(s.checkIn) : '—'}</td>
        <td>${s.checkOut ? ui.formatTime(s.checkOut) : '—'}</td>
        <td>${s.hours ? ui.formatHours(s.hours) : '—'}</td>
        <td>${s.note ? s.note : ''}</td>
      </tr>
    `).join('');

    const deductionsHtml = report.deductions.map(d => `
      <tr>
        <td>${d.reason}</td>
        <td>${ui.formatDate(d.date)}</td>
        <td>${ui.formatCurrency(d.amount)}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>تقرير ${title}</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #333; }
          h1 { text-align: center; margin-bottom: 30px; color: #4a3d24; }
          h2 { color: #8a7448; margin-top: 30px; }
          .summary { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
          .summary-item { padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
          .summary-item .label { font-size: 12px; color: #64748b; }
          .summary-item .value { font-size: 18px; font-weight: 700; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th { background: #f1f5f9; padding: 10px; text-align: right; font-size: 12px; text-transform: uppercase; color: #475569; }
          td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #94a3b8; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <h1>📊 تقرير العمل</h1>
        <p style="text-align:center;color:#64748b;margin-bottom:30px;">${title}</p>

        <div class="summary">
          <div class="summary-item">
            <div class="label">إجمالي الساعات</div>
            <div class="value">${report.totalHours} س</div>
          </div>
          <div class="summary-item">
            <div class="label">أيام العمل</div>
            <div class="value">${report.workDays} يوم</div>
          </div>
          <div class="summary-item">
            <div class="label">المرتب قبل الخصم</div>
            <div class="value">${ui.formatCurrency(report.expectedSalary)}</div>
          </div>
          <div class="summary-item">
            <div class="label">الخصومات</div>
            <div class="value">${ui.formatCurrency(report.totalDeductions)}</div>
          </div>
          <div class="summary-item" style="grid-column:1/-1;border-color:#c8b28a;">
            <div class="label">صافي المرتب</div>
            <div class="value" style="color:#648148;">${ui.formatCurrency(report.netSalary)}</div>
          </div>
        </div>

        <h2>سجل الشيفتات</h2>
        <table>
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>الحضور</th>
              <th>الانصراف</th>
              <th>المدة</th>
              <th>ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            ${shiftsHtml || '<tr><td colspan="5" style="text-align:center;color:#94a3b8;">لا توجد شيفتات</td></tr>'}
          </tbody>
        </table>

        ${report.deductions.length ? `
          <h2>الخصومات</h2>
          <table>
            <thead>
              <tr>
                <th>السبب</th>
                <th>التاريخ</th>
                <th>القيمة</th>
              </tr>
            </thead>
            <tbody>
              ${deductionsHtml}
            </tbody>
          </table>
        ` : ''}

        <div class="footer">
          تم إنشاء التقرير في ${new Date().toLocaleString('ar-EG')}
        </div>
        <script>
          window.onload = function() { window.print(); }
        <\/script>
      </body>
      </html>
    `);

    printWindow.document.close();
    ui.showToast('تم فتح التقرير للطباعة', 'success');
  }

  async exportToCSV(report) {
    const title = this._getTitle(report);
    let csv = `تقرير العمل - ${title}\n\n`;

    csv += 'الملخص\n';
    csv += `إجمالي الساعات,${report.totalHours}\n`;
    csv += `أيام العمل,${report.workDays}\n`;
    csv += `المرتب قبل الخصم,${report.expectedSalary}\n`;
    csv += `الخصومات,${report.totalDeductions}\n`;
    csv += `صافي المرتب,${report.netSalary}\n\n`;

    csv += 'سجل الشيفتات\n';
    csv += 'التاريخ,الحضور,الانصراف,المدة(ساعات),ملاحظات\n';
    for (const s of report.shifts) {
      const date = ui.formatDate(s.date);
      const checkIn = s.checkIn ? ui.formatTime(s.checkIn) : '—';
      const checkOut = s.checkOut ? ui.formatTime(s.checkOut) : '—';
      const hours = s.hours || '—';
      const note = s.note ? s.note.replace(/"/g, '""') : '';
      csv += `"${date}","${checkIn}","${checkOut}","${hours}","${note}"\n`;
    }

    if (report.deductions.length) {
      csv += '\nالخصومات\n';
      csv += 'السبب,التاريخ,القيمة\n';
      for (const d of report.deductions) {
        csv += `"${d.reason}","${ui.formatDate(d.date)}","${d.amount}"\n`;
      }
    }

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const suffix = report.fromDate ? `من_${report.fromDate}_الى_${report.toDate}` : `${report.year}_${String(report.month).padStart(2, '0')}`;
    link.download = `تقرير_${suffix}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    ui.showToast('تم تصدير التقرير CSV', 'success');
  }
}

export const reportManager = new ReportManager();
