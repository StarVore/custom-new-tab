import { TestBed } from "@angular/core/testing";
import { ExtensionStorageService } from "./extension-storage.service";

type AnyGlobal = Record<string, unknown>;

describe("ExtensionStorageService", () => {
  let service: ExtensionStorageService;
  let localStorageData: Record<string, string>;

  function removeExtensionApis(): void {
    delete (globalThis as AnyGlobal)["browser"];
    delete (globalThis as AnyGlobal)["chrome"];
  }

  beforeAll(() => {
    localStorageData = {};
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => localStorageData[key] ?? null,
      setItem: (key: string, value: string) => {
        localStorageData[key] = value;
      },
      removeItem: (key: string) => {
        delete localStorageData[key];
      },
      get length() {
        return Object.keys(localStorageData).length;
      },
      key: (i: number) => Object.keys(localStorageData)[i] ?? null,
    });
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    localStorageData = {};
    removeExtensionApis();

    TestBed.configureTestingModule({ providers: [ExtensionStorageService] });
    service = TestBed.inject(ExtensionStorageService);
  });

  afterEach(() => {
    localStorageData = {};
    removeExtensionApis();
  });

  // ── localStorage fallback ─────────────────────────────────────────────────

  describe("localStorage fallback (no extension storage)", () => {
    it("getJson returns null for missing key", async () => {
      expect(await service.getJson("missing")).toBeNull();
    });

    it("setJson/getJson round-trips via localStorage", async () => {
      await service.setJson("k", { hello: "world" });
      expect(await service.getJson("k")).toEqual({ hello: "world" });
    });

    it("remove deletes from localStorage", async () => {
      localStorage.setItem("k", JSON.stringify(1));
      await service.remove("k");
      expect(localStorage.getItem("k")).toBeNull();
    });

    it("getJson returns null on malformed JSON", async () => {
      localStorage.setItem("bad", "not-json{{");
      expect(await service.getJson("bad")).toBeNull();
    });
  });

  // ── browser.storage.local – Promise API ──────────────────────────────────

  describe("browser.storage.local (Promise API)", () => {
    let storageBacking: Record<string, unknown>;

    beforeEach(() => {
      storageBacking = {};

      (globalThis as AnyGlobal)["browser"] = {
        storage: {
          local: {
            get: vi.fn((key: string) =>
              Promise.resolve({ [key]: storageBacking[key] }),
            ),
            set: vi.fn((items: Record<string, unknown>) => {
              Object.assign(storageBacking, items);
              return Promise.resolve();
            }),
            remove: vi.fn((key: string) => {
              delete storageBacking[key];
              return Promise.resolve();
            }),
          },
        },
      };
    });

    it("getJson fetches value from extension storage", async () => {
      storageBacking["cfg"] = { x: 1 };
      expect(await service.getJson<{ x: number }>("cfg")).toEqual({ x: 1 });
    });

    it("getJson returns null when key absent", async () => {
      expect(await service.getJson("absent")).toBeNull();
    });

    it("getJson migrates value from localStorage to extension storage", async () => {
      localStorage.setItem("leg", JSON.stringify({ migrated: true }));

      const result = await service.getJson<{ migrated: boolean }>("leg");

      expect(result).toEqual({ migrated: true });
      // Migrated into extension storage
      expect(storageBacking["leg"]).toEqual({ migrated: true });
      // Cleared from localStorage
      expect(localStorage.getItem("leg")).toBeNull();
    });

    it("setJson stores in extension storage and clears localStorage", async () => {
      localStorage.setItem("k", JSON.stringify("old"));
      await service.setJson("k", "new");
      expect(storageBacking["k"]).toBe("new");
      expect(localStorage.getItem("k")).toBeNull();
    });

    it("remove deletes from extension storage and localStorage", async () => {
      storageBacking["k"] = "value";
      localStorage.setItem("k", JSON.stringify("value"));
      await service.remove("k");
      expect(storageBacking["k"]).toBeUndefined();
      expect(localStorage.getItem("k")).toBeNull();
    });
  });

  // ── chrome.storage.local – callback API ──────────────────────────────────

  describe("chrome.storage.local (callback API)", () => {
    let storageBacking: Record<string, unknown>;
    let lastError: Error | undefined;

    beforeEach(() => {
      storageBacking = {};
      lastError = undefined;

      (globalThis as AnyGlobal)["chrome"] = {
        runtime: {
          get lastError() {
            return lastError;
          },
        },
        storage: {
          local: {
            // Callback-style: when called with 1 arg returns undefined (not a
            // Promise); when called with 2 args invokes the callback.
            get: vi.fn(
              (
                key: string,
                callback?: (items: Record<string, unknown>) => void,
              ) => {
                if (callback) callback({ [key]: storageBacking[key] });
                // intentionally returns undefined → triggers callback path
              },
            ),
            set: vi.fn(
              (
                items: Record<string, unknown>,
                callback?: () => void,
              ) => {
                Object.assign(storageBacking, items);
                if (callback) callback();
              },
            ),
            remove: vi.fn((key: string, callback?: () => void) => {
              delete storageBacking[key];
              if (callback) callback();
            }),
          },
        },
      };
    });

    it("getJson fetches via callback API", async () => {
      storageBacking["key"] = { val: 42 };
      expect(await service.getJson<{ val: number }>("key")).toEqual({
        val: 42,
      });
    });

    it("setJson stores via callback API", async () => {
      await service.setJson("key", { val: 99 });
      expect(storageBacking["key"]).toEqual({ val: 99 });
    });

    it("remove works via callback API", async () => {
      storageBacking["key"] = "something";
      await service.remove("key");
      expect(storageBacking["key"]).toBeUndefined();
    });

    it("getJson rejects when chrome.runtime.lastError is set on get", async () => {
      const err = new Error("storage error");
      const chromeMock = (globalThis as AnyGlobal)["chrome"] as {
        storage: {
          local: {
            get: ReturnType<typeof vi.fn>;
          };
        };
      };
      chromeMock.storage.local.get.mockImplementation(
        (_key: string, callback?: (items: Record<string, unknown>) => void) => {
          if (callback) {
            lastError = err;
            callback({});
            lastError = undefined;
          }
        },
      );
      await expect(service.getJson("k")).rejects.toThrow("storage error");
    });

    it("setJson rejects when chrome.runtime.lastError is set on set", async () => {
      const err = new Error("set error");
      const chromeMock = (globalThis as AnyGlobal)["chrome"] as {
        storage: { local: { set: ReturnType<typeof vi.fn> } };
      };
      chromeMock.storage.local.set.mockImplementation(
        (
          _items: Record<string, unknown>,
          callback?: () => void,
        ) => {
          if (callback) {
            lastError = err;
            callback();
            lastError = undefined;
          }
        },
      );
      await expect(service.setJson("k", "v")).rejects.toThrow("set error");
    });

    it("remove rejects when chrome.runtime.lastError is set", async () => {
      const err = new Error("remove error");
      const chromeMock = (globalThis as AnyGlobal)["chrome"] as {
        storage: { local: { remove: ReturnType<typeof vi.fn> } };
      };
      chromeMock.storage.local.remove.mockImplementation(
        (_key: string, callback?: () => void) => {
          if (callback) {
            lastError = err;
            callback();
            lastError = undefined;
          }
        },
      );
      await expect(service.remove("k")).rejects.toThrow("remove error");
    });
  });
});
