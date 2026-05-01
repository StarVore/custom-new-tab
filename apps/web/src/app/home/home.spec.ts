import { ComponentFixture, TestBed } from "@angular/core/testing";
import { RouterModule } from "@angular/router";
import { signal } from "@angular/core";
import { of } from "rxjs";
import { HomeComponent } from "./home";
import { BookmarkService } from "../services/bookmark.service";
import { BookmarkVisitService } from "../services/bookmark-visit.service";
import { BgService } from "../services/bg-service";

describe("HomeComponent", () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  const bookmarksMock = { bookmarks: signal([]) };
  const bookmarkVisitMock = { getVisits: vi.fn().mockReturnValue(of([])) };
  const bgMock = { photoDetails: signal(null) };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent, RouterModule.forRoot([])],
      providers: [
        { provide: BookmarkService, useValue: bookmarksMock },
        { provide: BookmarkVisitService, useValue: bookmarkVisitMock },
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
    expect(component.showStats).toBe(false);
    expect(component.hideShowLbl).toBe("Hide");
    expect(component.statsLbl).toBe("Stats");
  });

  it("toggleHide() hides bookmarks and sets label to 'Show'", () => {
    component.toggleHide();
    expect(component.showBookmarks).toBe(false);
    expect(component.showStats).toBe(false);
    expect(component.hideShowLbl).toBe("Show");
  });

  it("toggleHide() called twice restores original state", () => {
    component.toggleHide();
    component.toggleHide();
    expect(component.showBookmarks).toBe(true);
    expect(component.hideShowLbl).toBe("Hide");
  });

  it("toggleStats() shows stats and updates the stats label", () => {
    component.toggleStats();

    expect(component.showBookmarks).toBe(false);
    expect(component.showStats).toBe(true);
    expect(component.statsLbl).toBe("Bookmarks");
  });

  it("toggleHide() from stats switches to hidden mode", () => {
    component.toggleStats();
    component.toggleHide();

    expect(component.showBookmarks).toBe(false);
    expect(component.showStats).toBe(false);
    expect(component.hideShowLbl).toBe("Show");
  });
});
