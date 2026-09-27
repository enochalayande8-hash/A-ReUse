/**
 * Safe Session Storage & Local Storage Resilience Layer
 *
 * Solves:
 * 1. "Unable to process request due to missing initial state" (auth/missing-initial-state)
 *    inside Android WebViews (Webintoapp, APK wrappers) where sessionStorage is partitioned
 *    or wiped across window transitions / redirects.
 * 2. SecurityExceptions / QuotaExceeded errors in restricted browser environments.
 */

// Memory fallback store if storage is blocked
const memoryStore: Record<string, string> = {};

export function initStorageResilience(): void {
  if (typeof window === 'undefined') return;

  try {
    // 1. Check if localStorage is functional
    let hasLocalStorage = false;
    try {
      const testKey = '__test_ls__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      hasLocalStorage = true;
    } catch {
      hasLocalStorage = false;
    }

    // 2. Check if sessionStorage is functional
    let hasSessionStorage = false;
    try {
      const testKey = '__test_ss__';
      window.sessionStorage.setItem(testKey, '1');
      window.sessionStorage.removeItem(testKey);
      hasSessionStorage = true;
    } catch {
      hasSessionStorage = false;
    }

    // If sessionStorage is completely blocked, polyfill it with localStorage or memoryStore
    if (!hasSessionStorage) {
      console.warn('[SafeStorage] sessionStorage inaccessible. Providing resilient polyfill.');
      const storageShim: Storage = {
        get length() {
          return Object.keys(memoryStore).length;
        },
        clear() {
          Object.keys(memoryStore).forEach((k) => delete memoryStore[k]);
        },
        getItem(key: string) {
          if (hasLocalStorage) {
            try {
              const val = window.localStorage.getItem('__ss_shim_' + key);
              if (val !== null) return val;
            } catch {}
          }
          return memoryStore[key] ?? null;
        },
        key(index: number) {
          return Object.keys(memoryStore)[index] ?? null;
        },
        removeItem(key: string) {
          delete memoryStore[key];
          if (hasLocalStorage) {
            try {
              window.localStorage.removeItem('__ss_shim_' + key);
            } catch {}
          }
        },
        setItem(key: string, value: string) {
          memoryStore[key] = String(value);
          if (hasLocalStorage) {
            try {
              window.localStorage.setItem('__ss_shim_' + key, String(value));
            } catch {}
          }
        },
      };

      try {
        Object.defineProperty(window, 'sessionStorage', {
          value: storageShim,
          configurable: true,
          writable: true,
        });
      } catch (err) {
        console.warn('[SafeStorage] Could not override window.sessionStorage:', err);
      }
      return;
    }

    // If sessionStorage IS available, hook into it to back up Firebase OAuth state into localStorage
    if (hasLocalStorage && hasSessionStorage) {
      const originalSetItem = window.sessionStorage.setItem.bind(window.sessionStorage);
      const originalGetItem = window.sessionStorage.getItem.bind(window.sessionStorage);
      const originalRemoveItem = window.sessionStorage.removeItem.bind(window.sessionStorage);

      // On startup, restore any backed up firebase keys from localStorage into sessionStorage
      try {
        for (let i = 0; i < window.localStorage.length; i++) {
          const lKey = window.localStorage.key(i);
          if (lKey && lKey.startsWith('__fb_backup_')) {
            const rawKey = lKey.replace('__fb_backup_', '');
            const val = window.localStorage.getItem(lKey);
            if (val && !originalGetItem(rawKey)) {
              originalSetItem(rawKey, val);
            }
          }
        }
      } catch (restoreErr) {
        console.warn('[SafeStorage] Note restoring firebase backup:', restoreErr);
      }

      // Intercept setItem to mirror Firebase keys
      window.sessionStorage.setItem = (key: string, value: string) => {
        try {
          originalSetItem(key, value);
        } catch {
          // If sessionStorage throws QuotaExceeded or error, write to memory
          memoryStore[key] = value;
        }

        if (key.startsWith('firebase:')) {
          try {
            window.localStorage.setItem('__fb_backup_' + key, value);
          } catch {}
        }
      };

      // Intercept getItem to fall back to localStorage backup
      window.sessionStorage.getItem = (key: string) => {
        try {
          const val = originalGetItem(key);
          if (val !== null) return val;
        } catch {}

        if (memoryStore[key] !== undefined) {
          return memoryStore[key];
        }

        if (key.startsWith('firebase:')) {
          try {
            const backup = window.localStorage.getItem('__fb_backup_' + key);
            if (backup !== null) {
              try {
                originalSetItem(key, backup);
              } catch {}
              return backup;
            }
          } catch {}
        }

        return null;
      };

      // Intercept removeItem to clean up backup
      window.sessionStorage.removeItem = (key: string) => {
        try {
          originalRemoveItem(key);
        } catch {}
        delete memoryStore[key];

        if (key.startsWith('firebase:')) {
          try {
            window.localStorage.removeItem('__fb_backup_' + key);
          } catch {}
        }
      };
    }
  } catch (globalErr) {
    console.warn('[SafeStorage] Storage resilience initialization note:', globalErr);
  }
}

// Auto-run immediately when module is imported
initStorageResilience();
