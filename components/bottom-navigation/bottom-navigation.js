import { dashboardNavSvg, reportsNavSvg, settingsSvg } from '../shared/svg-icons.js';
import { PAGE_URLS } from '../../scripts/site-config.js';

// ==========================================================================
// Bottom navigation component
//
// Usage: <nav data-component="bottom-navigation" data-active="dashboard">
// ==========================================================================

const NAV_ITEMS = [
  { key: 'dashboard', label: 'الرئيسية', href: PAGE_URLS.dashboard, icon: dashboardNavSvg(22) },
  { key: 'reports', label: 'التقارير', href: PAGE_URLS.reports, icon: reportsNavSvg(22) },
  { key: 'settings', label: 'الإعدادات', href: PAGE_URLS.settings, icon: settingsSvg(22, 2) }
];

export function mountBottomNavigation(root, active = null) {
  if (!root) return;

  root.classList.add('app-nav');
  root.innerHTML = NAV_ITEMS.map(item => `
    <a href="${item.href}" class="nav-link${item.key === active ? ' active' : ''}">
      ${item.icon}
      <span>${item.label}</span>
    </a>
  `).join('');
}
