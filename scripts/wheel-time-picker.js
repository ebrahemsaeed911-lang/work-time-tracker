// ==========================================================================
// Wheel time picker — shared scroll-snap column builder
// Used by the hours picker modal, the edit-shift modal and the manual-shift modal.
// ==========================================================================

export const WHEEL_ITEM_HEIGHT = 44;

/**
 * Builds a single scroll-snap wheel column (hours / minutes / seconds).
 * @param {number} count        Number of values (e.g. 60 for minutes).
 * @param {number} defaultValue Initially selected value.
 * @param {HTMLInputElement} [input] Synced number input.
 * @returns {HTMLDivElement} The generated `.wheel-col` element.
 */
export function createWheelColumn(count, defaultValue, input) {
  const col = document.createElement('div');
  col.className = 'wheel-col';
  col.dataset.value = defaultValue;

  const topSpacer = document.createElement('div');
  topSpacer.className = 'wheel-item wheel-spacer';
  col.appendChild(topSpacer);

  for (let i = 0; i < count; i++) {
    const item = document.createElement('div');
    item.className = 'wheel-item' + (i === defaultValue ? ' sel' : '');
    item.dataset.value = i;
    item.textContent = String(i).padStart(2, '0');
    col.appendChild(item);
  }

  const bottomSpacer = document.createElement('div');
  bottomSpacer.className = 'wheel-item wheel-spacer';
  col.appendChild(bottomSpacer);

  col.scrollTop = defaultValue * WHEEL_ITEM_HEIGHT;
  if (input) input.value = defaultValue;

  let ticking = false;
  col.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const idx = Math.round(col.scrollTop / WHEEL_ITEM_HEIGHT);
        const clamped = Math.max(0, Math.min(count - 1, idx));
        const items = col.querySelectorAll('.wheel-item:not(.wheel-spacer)');
        items.forEach((el, i) => {
          el.classList.toggle('sel', i === clamped);
        });
        col.dataset.value = clamped;
        if (input) input.value = clamped;
        ticking = false;
      });
      ticking = true;
    }
  });

  return col;
}

/** Reads the currently selected value from a wheel column. */
export function readWheelValue(col) {
  return Math.round(col.scrollTop / WHEEL_ITEM_HEIGHT);
}

/** Combines h/m/s wheel values into a decimal hours number. */
export function wheelsToDecimalHours(hours, minutes, seconds) {
  return Math.round((hours + minutes / 60 + seconds / 3600) * 10000) / 10000;
}
