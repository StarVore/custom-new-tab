import { TestBed } from "@angular/core/testing";
import { AppConfig, ConfigService } from "./config.service";
import { ExtensionStorageService } from "./extension-storage.service";

describe("ConfigService", () => {
  const stored: AppConfig = {
    bookmarkBaseUrl: "https://pb.example.com",
    apodBaseUrl: "https://apod.example.com",
  };

  const storageMock = {
    getJson: vi.fn(),
    setJson: vi.fn(),
    remove: vi.fn(),
  };

  function setup(resolved: AppConfig | null | Record<string, unknown>) {
    storageMock.getJson.mockResolvedValue(resolved);
    storageMock.setJson.mockResolvedValue(undefined);
    storageMock.remove.mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [
        ConfigService,
        { provide: ExtensionStorageService, useValue: storageMock },
      ],
    });

    return TestBed.inject(ConfigService);
  }

  beforeEach(() => {
    storageMock.getJson.mockReset();
    storageMock.setJson.mockReset();
    storageMock.remove.mockReset();
  });

  it("isConfigured() is false synchronously before storage resolves", () => {
    // Promise that never resolves synchronously
    storageMock.getJson.mockReturnValue(new Promise(() => {}));
    TestBed.configureTestingModule({
      providers: [
        ConfigService,
        { provide: ExtensionStorageService, useValue: storageMock },
      ],
    });
    const svc = TestBed.inject(ConfigService);
    expect(svc.isConfigured()).toBe(false);
  });

  it("loads config from storage on init", async () => {
    const svc = setup(stored);
    await svc.waitForLoad();
    expect(svc.isConfigured()).toBe(true);
    expect(svc.get()).toEqual(stored);
  });

  it("stays unconfigured when storage returns null", async () => {
    const svc = setup(null);
    await svc.waitForLoad();
    expect(svc.isConfigured()).toBe(false);
    expect(svc.get()).toBeNull();
  });

  it("stays unconfigured when only bookmarkBaseUrl is present", async () => {
    const svc = setup({ bookmarkBaseUrl: "https://pb.example.com" });
    await svc.waitForLoad();
    expect(svc.isConfigured()).toBe(false);
  });

  it("stays unconfigured when only apodBaseUrl is present", async () => {
    const svc = setup({ apodBaseUrl: "https://apod.example.com" });
    await svc.waitForLoad();
    expect(svc.isConfigured()).toBe(false);
  });

  it("save() marks as configured and persists to storage", async () => {
    const svc = setup(null);
    await svc.waitForLoad();

    svc.save(stored);

    expect(svc.isConfigured()).toBe(true);
    expect(svc.get()).toEqual(stored);
    expect(storageMock.setJson).toHaveBeenCalledWith("app_config", stored);
  });

  it("clear() marks as unconfigured and removes from storage", async () => {
    const svc = setup(stored);
    await svc.waitForLoad();
    expect(svc.isConfigured()).toBe(true);

    svc.clear();

    expect(svc.isConfigured()).toBe(false);
    expect(svc.get()).toBeNull();
    expect(storageMock.remove).toHaveBeenCalledWith("app_config");
  });
});
