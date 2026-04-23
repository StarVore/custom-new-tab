import { ComponentFixture, TestBed } from "@angular/core/testing";
import { Observable, of, throwError, Subject } from "rxjs";
import { BaseScreen } from "./base-screen";
import { ApiService } from "../services/api-service";

describe("BaseScreen", () => {
  let component: BaseScreen;
  let fixture: ComponentFixture<BaseScreen>;

  const apiMock = { test: vi.fn() };

  async function createComponent(testObs: Observable<unknown> = of({ success: true })) {
    apiMock.test.mockReset();
    apiMock.test.mockReturnValue(testObs);

    await TestBed.configureTestingModule({
      imports: [BaseScreen],
      providers: [{ provide: ApiService, useValue: apiMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(BaseScreen);
    component = fixture.componentInstance;
  }

  it("should create", async () => {
    await createComponent();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component).toBeTruthy();
  });

  it("sets testSuccess to true on successful API call", async () => {
    await createComponent(of({ success: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.testSuccess).toBe(true);
  });

  it("sets testSuccess to false on API error", async () => {
    await createComponent(throwError(() => new Error("fail")));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.testSuccess).toBe(false);
  });

  it("starts with testSuccess null before ngOnInit", async () => {
    await createComponent(new Subject());
    // Don't call detectChanges so ngOnInit doesn't run
    expect(component.testSuccess).toBeNull();
  });
});
