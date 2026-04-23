import { ComponentFixture, TestBed } from "@angular/core/testing";
import { RouterModule } from "@angular/router";
import { of } from "rxjs";
import { SettingsComponent } from "./settings";
import { ApiService } from "../services/api-service";
import { ConfigService, AppConfig } from "../services/config.service";
import { HostPermissionService } from "../services/host-permission.service";

describe("SettingsComponent", () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;

  const existingConfig: AppConfig = {
    bookmarkBaseUrl: "https://pb.example.com",
    apodBaseUrl: "https://apod.example.com",
  };

  const apiMock = {
    testBookmarkConnection: vi.fn(),
    testApodConnection: vi.fn(),
  };
  const hostPermMock = {
    ensureOriginPermission: vi.fn(),
    ensureOriginPermissions: vi.fn(),
  };
  const configMock = {
    get: vi.fn(),
    save: vi.fn(),
    clear: vi.fn(),
    isConfigured: vi.fn().mockReturnValue(true),
    waitForLoad: vi.fn().mockResolvedValue(undefined),
  };

  const routerSpy = { navigate: vi.fn() };

  async function createComponent(config: AppConfig | null = existingConfig) {
    configMock.get.mockReturnValue(config);
    apiMock.testBookmarkConnection.mockReset();
    apiMock.testApodConnection.mockReset();
    hostPermMock.ensureOriginPermission.mockReset();
    hostPermMock.ensureOriginPermissions.mockReset();
    configMock.save.mockReset();
    configMock.clear.mockReset();
    routerSpy.navigate.mockReset();

    await TestBed.configureTestingModule({
      imports: [SettingsComponent, RouterModule.forRoot([])],
      providers: [
        { provide: ApiService, useValue: apiMock },
        { provide: ConfigService, useValue: configMock },
        { provide: HostPermissionService, useValue: hostPermMock },
      ],
    }).compileComponents();

    // Override router after module creation
    const router = TestBed.inject(
      await import("@angular/router").then((m) => m.Router),
    );
    vi.spyOn(router, "navigate").mockImplementation(routerSpy.navigate as typeof router.navigate);

    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it("should create", async () => {
    await createComponent();
    expect(component).toBeTruthy();
  });

  it("pre-populates form from existing config", async () => {
    await createComponent();
    expect(component.form.get("bookmarkBaseUrl")?.value).toBe(
      existingConfig.bookmarkBaseUrl,
    );
    expect(component.form.get("apodBaseUrl")?.value).toBe(
      existingConfig.apodBaseUrl,
    );
  });

  it("leaves form blank when no existing config", async () => {
    await createComponent(null);
    expect(component.form.get("bookmarkBaseUrl")?.value).toBe("");
    expect(component.form.get("apodBaseUrl")?.value).toBe("");
  });

  it("testBookmark() sets state to 'fail' when permission denied", async () => {
    await createComponent();
    hostPermMock.ensureOriginPermission.mockResolvedValue(false);
    await component.testBookmark();
    expect(component.bookmarkTestState()).toBe("fail");
    expect(component.permissionError()).toContain("Bookmark Service");
  });

  it("testBookmark() skips when URL is empty", async () => {
    await createComponent(null);
    component.form.get("bookmarkBaseUrl")?.setValue("");
    await component.testBookmark();
    expect(hostPermMock.ensureOriginPermission).not.toHaveBeenCalled();
  });

  it("testBookmark() sets 'ok' when connection succeeds", async () => {
    await createComponent();
    hostPermMock.ensureOriginPermission.mockResolvedValue(true);
    apiMock.testBookmarkConnection.mockReturnValue(of(true));
    await component.testBookmark();
    expect(component.bookmarkTestState()).toBe("ok");
  });

  it("testBookmark() sets 'fail' when connection fails", async () => {
    await createComponent();
    hostPermMock.ensureOriginPermission.mockResolvedValue(true);
    apiMock.testBookmarkConnection.mockReturnValue(of(false));
    await component.testBookmark();
    expect(component.bookmarkTestState()).toBe("fail");
  });

  it("testApod() sets state to 'fail' when permission denied", async () => {
    await createComponent();
    hostPermMock.ensureOriginPermission.mockResolvedValue(false);
    await component.testApod();
    expect(component.apodTestState()).toBe("fail");
    expect(component.permissionError()).toContain("APOD Service");
  });

  it("testApod() skips when URL is empty", async () => {
    await createComponent(null);
    component.form.get("apodBaseUrl")?.setValue("");
    await component.testApod();
    expect(hostPermMock.ensureOriginPermission).not.toHaveBeenCalled();
  });

  it("testApod() sets 'ok' when connection succeeds", async () => {
    await createComponent();
    hostPermMock.ensureOriginPermission.mockResolvedValue(true);
    apiMock.testApodConnection.mockReturnValue(of(true));
    await component.testApod();
    expect(component.apodTestState()).toBe("ok");
  });

  it("save() does nothing when form is invalid", async () => {
    await createComponent(null);
    component.form.get("bookmarkBaseUrl")?.setValue("");
    component.form.get("apodBaseUrl")?.setValue("");
    await component.save();
    expect(configMock.save).not.toHaveBeenCalled();
  });

  it("save() shows permission error when host permissions denied", async () => {
    await createComponent();
    hostPermMock.ensureOriginPermissions.mockResolvedValue({
      granted: false,
      denied: ["https://pb.example.com"],
    });
    await component.save();
    expect(component.permissionError()).toContain("https://pb.example.com");
    expect(configMock.save).not.toHaveBeenCalled();
  });

  it("save() saves config and navigates to home on success", async () => {
    await createComponent();
    hostPermMock.ensureOriginPermissions.mockResolvedValue({
      granted: true,
      denied: [],
    });
    await component.save();
    expect(configMock.save).toHaveBeenCalledWith(existingConfig);
  });

  it("resetConfig() clears config and navigates to setup", async () => {
    await createComponent();
    component.resetConfig();
    expect(configMock.clear).toHaveBeenCalled();
  });
});
