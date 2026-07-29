class StorageManager {
  constructor() {
    this.dbName = 'WorkTrackerDB';
    this.dbVersion = 1;
    this.db = null;
  }

  async init() {
    if (this.db) return;
    try {
      this.db = await this._openIndexedDB();
    } catch {
      this.db = null;
    }
  }

  _openIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains('shifts')) {
          const shiftStore = db.createObjectStore('shifts', { keyPath: 'id' });
          shiftStore.createIndex('date', 'date', { unique: false });
        }

        if (!db.objectStoreNames.contains('deductions')) {
          const dedStore = db.createObjectStore('deductions', { keyPath: 'id' });
          dedStore.createIndex('date', 'date', { unique: false });
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains('attendance')) {
          db.createObjectStore('attendance', { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error);
    });
  }

  _getStore(storeName, mode = 'readonly') {
    if (!this.db) return null;
    const tx = this.db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  async getItem(storeName, key) {
    if (!this.db) return this._fallbackGet(storeName, key);
    try {
      const store = this._getStore(storeName);
      return new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(null);
      });
    } catch {
      return this._fallbackGet(storeName, key);
    }
  }

  async getAll(storeName) {
    if (!this.db) return this._fallbackGetAll(storeName);
    try {
      const store = this._getStore(storeName);
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject([]);
      });
    } catch {
      return this._fallbackGetAll(storeName);
    }
  }

  async getAllByIndex(storeName, indexName, value) {
    if (!this.db) {
      return this._fallbackGetAll(storeName).filter(item => item[indexName] === value);
    }
    try {
      const store = this._getStore(storeName);
      const index = store.index(indexName);
      return new Promise((resolve, reject) => {
        const request = index.getAll(value);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject([]);
      });
    } catch {
      return this._fallbackGetAll(storeName).filter(item => item[indexName] === value);
    }
  }

  async setItem(storeName, data) {
    if (!this.db) return this._fallbackSet(storeName, data);
    try {
      const store = this._getStore(storeName, 'readwrite');
      return new Promise((resolve, reject) => {
        const request = store.put(data);
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(false);
      });
    } catch {
      return this._fallbackSet(storeName, data);
    }
  }

  async deleteItem(storeName, key) {
    if (!this.db) return this._fallbackDelete(storeName, key);
    try {
      const store = this._getStore(storeName, 'readwrite');
      return new Promise((resolve, reject) => {
        const request = store.delete(key);
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(false);
      });
    } catch {
      return this._fallbackDelete(storeName, key);
    }
  }

  async clearStore(storeName) {
    if (!this.db) {
      localStorage.removeItem(`wtt_${storeName}`);
      return;
    }
    try {
      const store = this._getStore(storeName, 'readwrite');
      return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(false);
      });
    } catch {
      localStorage.removeItem(`wtt_${storeName}`);
    }
  }

  async getLastPeriod() {
    try {
      return await this.getItem('settings', 'activePeriod');
    } catch {
      return null;
    }
  }

  async setLastPeriod(year, month) {
    try {
      await this.setItem('settings', {
        key: 'activePeriod',
        year,
        month
      });
    } catch { }
  }

  async archivePeriod(year, month) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const existing = await this.getItem('settings', `archived_${prefix}`);

    const allShifts = await this.getAll('shifts');
    const allDeductions = await this.getAll('deductions');
    const monthShifts = allShifts.filter(s => s.date && s.date.startsWith(prefix));
    const monthDeductions = allDeductions.filter(d => d.date && d.date.startsWith(prefix));
    const manualHours = await this.getItem('settings', `manualHours_${prefix}`);

    if (monthShifts.length === 0 && monthDeductions.length === 0 && !manualHours && existing) {
      return;
    }

    const archive = existing || { key: `archived_${prefix}`, year, month, shifts: [], deductions: [] };

    if (monthShifts.length) archive.shifts = [...(archive.shifts || []), ...monthShifts];
    if (monthDeductions.length) archive.deductions = [...(archive.deductions || []), ...monthDeductions];
    if (manualHours) archive.manualHours = manualHours.hours;

    await this.setItem('settings', archive);
    if (manualHours) await this.deleteItem('settings', `manualHours_${prefix}`);

    for (const s of monthShifts) {
      await this.deleteItem('shifts', s.id);
    }
    for (const d of monthDeductions) {
      await this.deleteItem('deductions', d.id);
    }
  }

  async getArchivedPeriod(year, month) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    return await this.getItem('settings', `archived_${prefix}`);
  }

  async getArchivedPeriods() {
    const all = await this.getAll('settings');
    return all.filter(s => s.key && s.key.startsWith('archived_'));
  }

  _fallbackGet(storeName, key) {
    try {
      const data = localStorage.getItem(`wtt_${storeName}`);
      if (!data) return null;
      const items = JSON.parse(data);
      return items.find(item => item.id === key || item.key === key) || null;
    } catch {
      return null;
    }
  }

  _fallbackGetAll(storeName) {
    try {
      const data = localStorage.getItem(`wtt_${storeName}`);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  _fallbackSet(storeName, data) {
    try {
      const key = data.id || data.key;
      const existing = this._fallbackGetAll(storeName);
      const index = existing.findIndex(item => (item.id === key || item.key === key));
      if (index >= 0) {
        existing[index] = data;
      } else {
        existing.push(data);
      }
      localStorage.setItem(`wtt_${storeName}`, JSON.stringify(existing));
      return true;
    } catch {
      return false;
    }
  }

  _fallbackDelete(storeName, key) {
    try {
      const existing = this._fallbackGetAll(storeName);
      const filtered = existing.filter(item => item.id !== key && item.key !== key);
      localStorage.setItem(`wtt_${storeName}`, JSON.stringify(filtered));
      return true;
    } catch {
      return false;
    }
  }
}

window.storage = new StorageManager();
