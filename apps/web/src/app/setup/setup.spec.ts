import { ComponentFixture, TestBed } from "@angular/core/testing";
import { Router, RouterModule } from "@angular/router";
import { of } from "rxjs";
import { SetupComponent } from "./setup";
import { ApiService } from "../services/api-service";
import { ConfigService } from "../services/config.service";
import { HostPermissionService } from "../services/host-permission.service";

describe("SetupComponent", () => {
  let component: SetupComponent;
  let fixture: ComponentFixture<SetupComponent>;

  const apiMock = {
    testBookmarkConnection: vi.fn(),
    testApodConnection: vi.fn(),
  };
  const hostPermMock = {
    ensureOriginPermission: vi.fn(),
    ensureOriginPermissions: vi.fn(),
  };
  const configMock = {
    isConfigured: vi.fn().mockReturnValue(false),
    save: vi.fn(),
    waitForLoad: vi.fn().mockResolvedValue(undefined),
  };

  async function createComponent(isConfigured = false) {
    configMock.isConfigured.mockReturnValue(isConfigured);
    apiMock.testBookmarkConnection.mockReset();
    apiMock.testApodConnection.mockReset();
    hostPermMock.ensureOriginPermission.mockReset();
    hostPermMock.ensureOriginPermissions.mockReset();
    configMock.save.mockReset();

    await TestBed.configureTestingModule({
      imports: [SetupComponent, RouterModule.forRoot([])],
      providers: [
        { provide: ApiService, useValue: apiMock },
        { provide: ConfigService, useValue: configMock },
        { provide: HostPermissionService, useValue: hostPermMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it("should create", async () => {
    await createComponent();
    expect(component).toBeTruthy();
  });

  it("form starts empty and invalid", async () => {
    await createComponent();
    expect(component.form.invalid).toBe(true);
    expect(component.form.get("bookmarkBaseUrl")?.value).toBe("");
  });

  it("testBookmark() skips when URL is empty", async () => {
    await createComponent();
    await component.testBookmark();
    expect(hostPermMock.ensureOriginPermission).not.toHaveBeenCalled();
  });

  it("testBookmark() sets 'fail' when permission denied", async () => {
    await createComponent();
    component.form.get("bookmarkBaseUrl")?.setValue("https://pb.example.com");
    hostPermMock.ensureOriginPermission.mockResolvedValue(false);
    await component.testBookmark();
    expect(component.bookmarkTestState()).toBe("fail");
    expect(component.permissionError()).toContain("Bookmark Service");
  });

  it("testBookmark() sets 'ok' when connection succeeds", async () => {
    await createComponent();
    component.form.get("bookmarkBaseUrl")?.setValue("https://pb.example.com");
    hostPermMock.ensureOriginPermission.mockResolvedValue(true);
    apiMock.testBookmarkConnection.mockReturnValue(of(true));
    await component.testBookmark();
    expect(component.bookmarkTestState()).toBe("ok");
  });

  it("testBookmark() sets 'fail' when connection fails", async () => {
    await createComponent();
    component.form.get("bookmarkBaseUrl")?.setValue("https://pb.example.com");
    hostPermMock.ensureOriginPermission.mockResolvedValue(true);
    apiMock.testBookmarkConnection.mockReturnValue(of(false));
    await component.testBookmark();
    expect(component.bookmarkTestState()).toBe("fail");
  });

  it("testApod() skips when URL is empty", async () => {
    await createComponent();
    await component.testApod();
    expect(hostPermMock.ensureOriginPermission).not.toHaveBeenCalled();
  });

  it("testApod() sets 'fail' when permission denied", async () => {
    await createComponent();
    component.form.get("apodBaseUrl")?.setValue("https://apod.example.com");
    hostPermMock.ensureOriginPermission.mockResolvedValue(false);
    await component.testApod();
    expect(component.apodTestState()).toBe("fail");
    expect(component.permissionError()).toContain("APOD Service");
  });

  it("testApod() sets 'ok' when connection succeeds", async () => {
    await createComponent();
    component.form.get("apodBaseUrl")?.setValue("https://apod.example.com");
    hostPermMock.ensureOriginPermission.mockResolvedValue(true);
    apiMock.testApodConnection.mockReturnValue(of(true));
    await component.testApod();
    expect(component.apodTestState()).toBe("ok");
  });

  it("save() does nothing when form is invalid", async () => {
    await createComponent();
    await component.save();
    expect(configMock.save).not.toHaveBeenCalled();
  });

  it("save() shows permission error when host permissions denied", async () => {
    await createComponent();
    component.form.get("bookmarkBaseUrl")?.setValue("https://pb.example.com");
    component.form.get("apodBaseUrl")?.setValue("https://apod.example.com");
    hostPermMock.ensureOriginPermissions.mockResolvedValue({
      granted: false,
      denied: ["https://pb.example.com"],
    });
    await component.save();
    expect(component.permissionError()).toContain("https://pb.example.com");
    expect(configMock.save).not.toHaveBeenCalled();
  });

  it("save() saves config when form valid and permissions granted", async () => {
    await createComponent();
    component.form.get("bookmarkBaseUrl")?.setValue("https://pb.example.com");
    component.form.get("apodBaseUrl")?.setValue("https://apod.example.com");
    hostPermMock.ensureOriginPermissions.mockResolvedValue({
      granted: true,
      denied: [],
    });
    await component.save();
    expect(configMock.save).toHaveBeenCalledWith({
      bookmarkBaseUrl: "https://pb.example.com",
      apodBaseUrl: "https://apod.example.com",
    });
  });

  it("redirects to home when already configured on load", async () => {
    await TestBed.configureTestingModule({
      imports: [SetupComponent, RouterModule.forRoot([])],
      providers: [
        { provide: ApiService, useValue: apiMock },
        { provide: ConfigService, useValue: configMock },
        { provide: HostPermissionService, useValue: hostPermMock },
      ],
    }).compileComponents();

    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, "navigate").mockResolvedValue(true);
    configMock.isConfigured.mockReturnValue(true);

    const f = TestBed.createComponent(SetupComponent);
    f.detectChanges();

    expect(navigateSpy).toHaveBeenCalledWith(["/"]);
  });

  it("testApod() sets 'fail' when connection fails", async () => {
    await createComponent();
    component.form.get("apodBaseUrl")?.setValue("https://apod.example.com");
    hostPermMock.ensureOriginPermission.mockResolvedValue(true);
    apiMock.testApodConnection.mockReturnValue(of(false));
    await component.testApod();
    expect(component.apodTestState()).toBe("fail");
  });
});
