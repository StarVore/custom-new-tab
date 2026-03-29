import { Injectable } from "@angular/core";

type Dict = Record<string, unknown>;

@Injectable({
  providedIn: "root",
})
export class ExtensionStorageService {
  async getJson<T>(key: string): Promise<T | null> {
    const area = this.getExtensionStorageArea();
    if (area) {
      const data = await this.storageGet(area, key);
      const value = data[key];
      if (value !== undefined) return value as T;

      // One-time migration path for existing users previously on localStorage.
      const fallback = this.getLocalJson<T>(key);
      if (fallback !== null) {
        await this.storageSet(area, { [key]: fallback });
        localStorage.removeItem(key);
        return fallback;
      }

      return null;
    }

    return this.getLocalJson<T>(key);
  }

  async setJson<T>(key: string, value: T): Promise<void> {
    const area = this.getExtensionStorageArea();
    if (area) {
      await this.storageSet(area, { [key]: value });
      localStorage.removeItem(key);
      return;
    }

    localStorage.setItem(key, JSON.stringify(value));
  }

  async remove(key: string): Promise<void> {
    const area = this.getExtensionStorageArea();
    if (area) {
      await this.storageRemove(area, key);
    }
    localStorage.removeItem(key);
  }

  private getLocalJson<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  private getExtensionStorageArea(): unknown | null {
    const g = globalThis as unknown as {
      browser?: { storage?: { local?: unknown } };
      chrome?: { storage?: { local?: unknown } };
    };
    return g.browser?.storage?.local ?? g.chrome?.storage?.local ?? null;
  }

  private storageGet(area: unknown, key: string): Promise<Dict> {
    const storage = area as {
      get: (
        keys: string | string[] | Dict,
        callback?: (items: Dict) => void,
      ) => Promise<Dict> | void;
    };

    try {
      const maybePromise = storage.get(key as string);
      if (
        maybePromise &&
        typeof (maybePromise as Promise<Dict>).then === "function"
      ) {
        return maybePromise as Promise<Dict>;
      }
    } catch {
      // Fall through to callback style.
    }

    return new Promise((resolve, reject) => {
      storage.get(key, (items: Dict) => {
        const runtime = (
          globalThis as unknown as {
            chrome?: { runtime?: { lastError?: Error } };
          }
        ).chrome?.runtime;
        if (runtime?.lastError) {
          reject(runtime.lastError);
          return;
        }
        resolve(items ?? {});
      });
    });
  }

  private storageSet(area: unknown, values: Dict): Promise<void> {
    const storage = area as {
      set: (items: Dict, callback?: () => void) => Promise<void> | void;
    };

    try {
      const maybePromise = storage.set(values);
      if (
        maybePromise &&
        typeof (maybePromise as Promise<void>).then === "function"
      ) {
        return maybePromise as Promise<void>;
      }
    } catch {
      // Fall through to callback style.
    }

    return new Promise((resolve, reject) => {
      storage.set(values, () => {
        const runtime = (
          globalThis as unknown as {
            chrome?: { runtime?: { lastError?: Error } };
          }
        ).chrome?.runtime;
        if (runtime?.lastError) {
          reject(runtime.lastError);
          return;
        }
        resolve();
      });
    });
  }

  private storageRemove(area: unknown, key: string): Promise<void> {
    const storage = area as {
      remove: (
        keys: string | string[],
        callback?: () => void,
      ) => Promise<void> | void;
    };

    try {
      const maybePromise = storage.remove(key);
      if (
        maybePromise &&
        typeof (maybePromise as Promise<void>).then === "function"
      ) {
        return maybePromise as Promise<void>;
      }
    } catch {
      // Fall through to callback style.
    }

    return new Promise((resolve, reject) => {
      storage.remove(key, () => {
        const runtime = (
          globalThis as unknown as {
            chrome?: { runtime?: { lastError?: Error } };
          }
        ).chrome?.runtime;
        if (runtime?.lastError) {
          reject(runtime.lastError);
          return;
        }
        resolve();
      });
    });
  }
}
