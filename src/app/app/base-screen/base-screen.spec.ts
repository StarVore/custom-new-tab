import { ComponentFixture, TestBed } from "@angular/core/testing";

import { BaseScreen } from "./base-screen";

describe("BaseScreen", () => {
  let component: BaseScreen;
  let fixture: ComponentFixture<BaseScreen>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BaseScreen],
    }).compileComponents();

    fixture = TestBed.createComponent(BaseScreen);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
