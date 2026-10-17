import { ui } from './ui-manager.js';

// ==========================================================================
// Service worker registration + PWA install flow
// ==========================================================================

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register(new URL('../service-worker.js', import.meta.url))
      .then((reg) => {
        console.log('SW registered:', reg.scope);

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              ui.showToast('تم تحديث التطبيق. أعد فتحه للاستفادة.', 'info', 5000);
            }
          });
        });
      })
      .catch((err) => {
        console.log('SW registration failed:', err);
      });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  });

  setupInstallPrompt();

  window.addEventListener('appinstalled', () => {
    const installBtn = document.getElementById('installBtn');
    if (installBtn) installBtn.style.display = 'none';
    ui.showToast('تم تثبيت التطبيق بنجاح', 'success');
  });
}

function setupInstallPrompt() {
  let deferredPrompt;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    const installBtn = document.getElementById('installBtn');
    if (installBtn) {
      installBtn.style.display = 'flex';
      installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        installBtn.style.display = 'none';
        deferredPrompt.prompt();
        const result = await deferredPrompt.userChoice;
        if (result.outcome === 'accepted') {
          ui.showToast('تم تثبيت التطبيق', 'success');
        }
        deferredPrompt = null;
      });
    }
  });
}

export function checkPWAFirstLaunch() {
  const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
  if (!isStandalone) return;
  try {
    if (localStorage.getItem('wtt_pwa_launched')) return;
    localStorage.setItem('wtt_pwa_launched', '1');
    setTimeout(() => {
      ui.showToast('بيانات متصفح Safari غير متاحة في التطبيق. استخدم تصدير Excel لنقل بياناتك.', 'info', 6000);
    }, 2000);
  } catch { }
}
