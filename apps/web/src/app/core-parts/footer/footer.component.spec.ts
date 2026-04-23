import { ComponentFixture, TestBed } from "@angular/core/testing";
import { signal } from "@angular/core";
import { Footer } from "./footer.component";
import { BgService } from "../../services/bg-service";
import { IApodPhoto } from "../../models/IApodPhoto";

describe("Footer", () => {
  let component: Footer;
  let fixture: ComponentFixture<Footer>;

  const photo: IApodPhoto = {
    url: "https://images.example.com/photo.jpg",
    pageUrl: "https://apod.nasa.gov/apod/ap260401.html",
    explanation: "A beautiful galaxy",
    fetchedAt: new Date().toISOString(),
  };

  const bgMock = { photoDetails: signal<IApodPhoto | null>(null) };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Footer],
      providers: [{ provide: BgService, useValue: bgMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(Footer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("mobileSheetOpen starts as false", () => {
    expect((component as unknown as { mobileSheetOpen: ReturnType<typeof signal> }).mobileSheetOpen()).toBe(false);
  });

  it("toggleMobileSheet() opens the sheet", () => {
    (component as unknown as { toggleMobileSheet: () => void }).toggleMobileSheet();
    expect((component as unknown as { mobileSheetOpen: ReturnType<typeof signal> }).mobileSheetOpen()).toBe(true);
  });

  it("toggleMobileSheet() called twice closes the sheet", () => {
    const comp = component as unknown as {
      toggleMobileSheet: () => void;
      mobileSheetOpen: ReturnType<typeof signal>;
    };
    comp.toggleMobileSheet();
    comp.toggleMobileSheet();
    expect(comp.mobileSheetOpen()).toBe(false);
  });

  it("closeMobileSheet() sets sheet to closed", () => {
    const comp = component as unknown as {
      toggleMobileSheet: () => void;
      closeMobileSheet: () => void;
      mobileSheetOpen: ReturnType<typeof signal>;
    };
    comp.toggleMobileSheet(); // open it
    comp.closeMobileSheet();
    expect(comp.mobileSheetOpen()).toBe(false);
  });

  it("photoDetails reflects BgService signal", () => {
    bgMock.photoDetails.set(photo);
    expect(
      (component as unknown as { photoDetails: ReturnType<typeof signal> }).photoDetails(),
    ).toEqual(photo);
  });
});
