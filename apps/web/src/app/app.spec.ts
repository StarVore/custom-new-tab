import { TestBed } from "@angular/core/testing";
import { signal } from "@angular/core";
import { RouterModule } from "@angular/router";
import { Subject } from "rxjs";
import { App } from "./app";
import { BgService } from "./services/bg-service";
import { SwUpdate, VersionReadyEvent } from "@angular/service-worker";

describe("App", () => {
  const bgMock = { photoDetails: signal(null) };

  async function setup(swUpdate?: Partial<SwUpdate>) {
    await TestBed.configureTestingModule({
      imports: [App, RouterModule.forRoot([])],
      providers: [
        { provide: BgService, useValue: bgMock },
        ...(swUpdate ? [{ provide: SwUpdate, useValue: swUpdate }] : []),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(App);
    return { fixture, component: fixture.componentInstance };
  }

  it("should create the app", async () => {
    const { component } = await setup();
    expect(component).toBeTruthy();
  });

  it("updateAvailable starts as false", async () => {
    const { component } = await setup();
    expect(component.updateAvailable()).toBe(false);
  });

  it("reloadPage() calls window.location.reload", async () => {
    const { component } = await setup();
    const reloadFn = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { reload: reloadFn },
    });
    component.reloadPage();
    expect(reloadFn).toHaveBeenCalled();
  });
});
