import { TestBed } from "@angular/core/testing";
import {
  Router,
  RouterModule,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from "@angular/router";
import { configGuard } from "./config.guard";
import { ConfigService } from "../services/config.service";

describe("configGuard", () => {
  const configMock = {
    isConfigured: vi.fn(),
    waitForLoad: vi.fn().mockResolvedValue(undefined),
  };

  function runGuard() {
    return TestBed.runInInjectionContext(() =>
      configGuard(
        {} as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot,
      ),
    );
  }

  beforeEach(() => {
    configMock.isConfigured.mockReset();
    configMock.waitForLoad.mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      imports: [RouterModule.forRoot([])],
      providers: [{ provide: ConfigService, useValue: configMock }],
    });
  });

  it("returns true when config is loaded and configured", async () => {
    configMock.isConfigured.mockReturnValue(true);
    const result = await runGuard();
    expect(result).toBe(true);
  });

  it("returns a UrlTree to /setup when not configured", async () => {
    configMock.isConfigured.mockReturnValue(false);
    const result = await runGuard();
    const router = TestBed.inject(Router);
    expect(result).toEqual(router.createUrlTree(["/setup"]));
  });

  it("awaits waitForLoad before checking isConfigured", async () => {
    let resolveLoad!: () => void;
    const loadPromise = new Promise<void>((resolve) => {
      resolveLoad = resolve;
    });
    configMock.waitForLoad.mockReturnValue(loadPromise);
    configMock.isConfigured.mockReturnValue(false);

    let settled = false;
    const guardPromise = (runGuard() as Promise<unknown>).then(() => {
      settled = true;
    });

    // Guard should still be pending
    expect(settled).toBe(false);

    resolveLoad();
    await guardPromise;

    expect(settled).toBe(true);
    expect(configMock.isConfigured).toHaveBeenCalled();
  });
});
