import { appLogoSvg, installSvg, settingsSvg, backSvg } from '../shared/svg-icons.js';
import { PAGE_URLS } from '../../scripts/site-config.js';

// ==========================================================================
// Page header component
//
// Usage: <header data-component="page-header" data-variant="default" data-title="...">
// Variants: "default" (install + settings), "settings" (install only), "back" (back link only)
// ==========================================================================

export function mountPageHeader(root) {
  if (!root) return;

  const title = root.dataset.title || '';
  const variant = root.dataset.variant || 'default';

  root.classList.add('page-header');
  root.innerHTML = `
    <div class="page-header-start">
      ${appLogoSvg()}
      <h1 class="page-title">${title}</h1>
    </div>
    <div class="page-header-end">
      ${renderInstallButton(variant)}
      ${renderEndAction(variant)}
    </div>
  `;
}

function renderInstallButton(variant) {
  if (variant === 'back') return '';

  return `
    <button id="installBtn" class="btn-icon" style="display:none;" title="تثبيت التطبيق">
      ${installSvg()}
    </button>
  `;
}

function renderEndAction(variant) {
  if (variant === 'settings') return '';

  if (variant === 'back') {
    return `<a href="${PAGE_URLS.settings}" class="btn-icon" title="رجوع" style="width:44px;height:44px;">
      ${backSvg()}
    </a>`;
  }

  return `<a href="${PAGE_URLS.settings}" class="btn-icon" title="الإعدادات">
    ${settingsSvg(20, 2)}
  </a>`;
}
