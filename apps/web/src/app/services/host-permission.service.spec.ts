import { TestBed } from "@angular/core/testing";
import { HostPermissionService } from "./host-permission.service";

type AnyGlobal = Record<string, unknown>;

describe("HostPermissionService", () => {
  let service: HostPermissionService;

  function removePermissionsApi(): void {
    delete (globalThis as AnyGlobal)["browser"];
    delete (globalThis as AnyGlobal)["chrome"];
  }

  beforeEach(() => {
    removePermissionsApi();
    TestBed.configureTestingModule({ providers: [HostPermissionService] });
    service = TestBed.inject(HostPermissionService);
  });

  afterEach(removePermissionsApi);

  // ── website mode (no extension API) ───────────────────────────────────────

  it("ensureOriginPermissions grants when no extension API is present", async () => {
    const result = await service.ensureOriginPermissions([
      "https://example.com",
    ]);
    expect(result).toEqual({ granted: true, denied: [] });
  });

  it("ensureOriginPermission returns true when no extension API", async () => {
    expect(await service.ensureOriginPermission("https://example.com")).toBe(
      true,
    );
  });

  it("ensureOriginPermissions returns denied when URL list is empty", async () => {
    // Empty list generates no patterns → denied
    const result = await service.ensureOriginPermissions([]);
    expect(result.granted).toBe(false);
  });

  it("ensureOriginPermissions returns denied for non-http URLs without extension API", async () => {
    // All URLs filtered out → no valid patterns
    const result = await service.ensureOriginPermissions(["ftp://bad.example"]);
    expect(result.granted).toBe(false);
  });

  // ── browser.permissions – Promise API ────────────────────────────────────

  describe("browser.permissions (Promise API)", () => {
    function mockBrowserPermissions(granted: boolean): void {
      (globalThis as AnyGlobal)["browser"] = {
        permissions: {
          request: vi.fn().mockResolvedValue(granted),
        },
      };
    }

    it("returns granted when browser.permissions.request resolves true", async () => {
      mockBrowserPermissions(true);
      const result = await service.ensureOriginPermissions([
        "https://example.com",
      ]);
      expect(result).toEqual({ granted: true, denied: [] });
    });

    it("returns denied when browser.permissions.request resolves false", async () => {
      mockBrowserPermissions(false);
      const result = await service.ensureOriginPermissions([
        "https://example.com",
      ]);
      expect(result.granted).toBe(false);
      expect(result.denied).toContain("https://example.com");
    });

    it("deduplicates origins with the same host", async () => {
      mockBrowserPermissions(true);
      await service.ensureOriginPermissions([
        "https://example.com/path1",
        "https://example.com/path2",
      ]);
      const requestArg = (
        (globalThis as AnyGlobal)["browser"] as {
          permissions: { request: ReturnType<typeof vi.fn> };
        }
      ).permissions.request.mock.calls[0][0] as { origins: string[] };
      expect(requestArg.origins).toHaveLength(1);
      expect(requestArg.origins[0]).toBe("https://example.com/*");
    });
  });

  // ── chrome.permissions – callback API ────────────────────────────────────

  describe("chrome.permissions (callback API)", () => {
    function mockChromePermissions(granted: boolean): void {
      (globalThis as AnyGlobal)["chrome"] = {
        permissions: {
          // Callback style: first call without callback returns undefined
          request: vi.fn(
            (
              _perms: unknown,
              callback?: (result: boolean) => void,
            ) => {
              if (callback) callback(granted);
              // returns undefined when no callback
            },
          ),
        },
      };
    }

    it("returns granted when chrome.permissions.request calls back true", async () => {
      mockChromePermissions(true);
      const result = await service.ensureOriginPermissions([
        "https://example.com",
      ]);
      expect(result).toEqual({ granted: true, denied: [] });
    });

    it("returns denied when chrome.permissions.request calls back false", async () => {
      mockChromePermissions(false);
      const result = await service.ensureOriginPermissions([
        "https://example.com",
      ]);
      expect(result.granted).toBe(false);
    });
  });
});
