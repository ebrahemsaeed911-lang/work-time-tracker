import { storage } from './storage-manager.js';
import { ui } from './ui-manager.js';
import { mountPageHeader } from '../components/page-header/page-header.js';
import { mountBottomNavigation } from '../components/bottom-navigation/bottom-navigation.js';
import { registerServiceWorker, checkPWAFirstLaunch } from './service-worker-registration.js';

// ==========================================================================
// App bootstrap — shared startup for every page
// ==========================================================================

export async function bootstrapApp({ active = null } = {}) {
  await storage.init();
  ui.init();

  mountPageHeader(document.querySelector('[data-component="page-header"]'));
  mountBottomNavigation(document.querySelector('[data-component="bottom-navigation"]'), active);

  registerServiceWorker();
  checkPWAFirstLaunch();
}
