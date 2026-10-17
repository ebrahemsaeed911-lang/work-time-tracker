// ==========================================================================
// Site-wide configuration (page locations used by shared components)
// Every page lives at pages/<page-name>/, so the project root is two levels up.
// ==========================================================================

export const PROJECT_ROOT_PATH = '../../';

export const PAGE_URLS = {
  dashboard: `${PROJECT_ROOT_PATH}pages/dashboard/dashboard-page.html`,
  reports: `${PROJECT_ROOT_PATH}pages/reports/reports-page.html`,
  settings: `${PROJECT_ROOT_PATH}pages/settings/settings-page.html`,
  moreApps: `${PROJECT_ROOT_PATH}pages/more-apps/more-apps-page.html`,
  offline: `${PROJECT_ROOT_PATH}pages/offline/offline-page.html`
};
