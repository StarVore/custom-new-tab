import { ComponentFixture, TestBed } from "@angular/core/testing";
import { RouterModule } from "@angular/router";
import { signal } from "@angular/core";
import { HomeComponent } from "./home";
import { BookmarkService } from "../services/bookmark.service";
import { BgService } from "../services/bg-service";

describe("HomeComponent", () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  const bookmarksMock = { bookmarks: signal([]) };
  const bgMock = { photoDetails: signal(null) };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent, RouterModule.forRoot([])],
      providers: [
        { provide: BookmarkService, useValue: bookmarksMock },
        { provide: BgService, useValue: bgMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("starts with bookmarks visible and label 'Hide'", () => {
    expect(component.showBookmarks).toBe(true);
    expect(component.hideShowLbl).toBe("Hide");
  });

  it("toggleHide() hides bookmarks and sets label to 'Show'", () => {
    component.toggleHide();
    expect(component.showBookmarks).toBe(false);
    expect(component.hideShowLbl).toBe("Show");
  });

  it("toggleHide() called twice restores original state", () => {
    component.toggleHide();
    component.toggleHide();
    expect(component.showBookmarks).toBe(true);
    expect(component.hideShowLbl).toBe("Hide");
  });
});
