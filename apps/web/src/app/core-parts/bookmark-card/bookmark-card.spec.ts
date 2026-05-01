import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { IBookmark } from "../../models/IBookmark";
import { BookmarkCardComponent } from "./bookmark-card";
import { BookmarkVisitService } from "../../services/bookmark-visit.service";

const baseBookmark: IBookmark = {
  id: "1",
  title: "GitHub",
  url: "https://github.com",
  order: 0,
};

describe("BookmarkCardComponent", () => {
  let component: BookmarkCardComponent;
  let fixture: ComponentFixture<BookmarkCardComponent>;

  const bookmarkVisitServiceMock = {
    recordVisit: vi.fn(),
  };

  async function createComponent(bookmark: IBookmark = baseBookmark) {
    await TestBed.configureTestingModule({
      imports: [BookmarkCardComponent],
      providers: [
        { provide: BookmarkVisitService, useValue: bookmarkVisitServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BookmarkCardComponent);
    fixture.componentRef.setInput("bookmark", bookmark);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it("should create", async () => {
    bookmarkVisitServiceMock.recordVisit.mockReset();
    await createComponent();
    expect(component).toBeTruthy();
  });

  describe("getFaviconUrl()", () => {
    it("returns customImageUrl when provided", async () => {
      bookmarkVisitServiceMock.recordVisit.mockReset();
      await createComponent({
        ...baseBookmark,
        customImageUrl: "https://img.example.com/logo.png",
      });
      expect(component.getFaviconUrl()).toBe("https://img.example.com/logo.png");
    });

    it("returns Google favicon URL for a valid URL", async () => {
      bookmarkVisitServiceMock.recordVisit.mockReset();
      await createComponent();
      expect(component.getFaviconUrl()).toBe(
        "https://www.google.com/s2/favicons?domain=github.com&sz=64",
      );
    });

    it("falls back to raw url for invalid URL", async () => {
      bookmarkVisitServiceMock.recordVisit.mockReset();
      await createComponent({ ...baseBookmark, url: "not-a-url" });
      expect(component.getFaviconUrl()).toBe(
        "https://www.google.com/s2/favicons?domain=not-a-url&sz=64",
      );
    });
  });

  describe("onEdit()", () => {
    it("emits the bookmark and prevents default", async () => {
      bookmarkVisitServiceMock.recordVisit.mockReset();
      await createComponent();
      let emitted: IBookmark | undefined;
      component.edit.subscribe((b) => (emitted = b));

      const event = new MouseEvent("click");
      vi.spyOn(event, "preventDefault");
      vi.spyOn(event, "stopPropagation");

      component.onEdit(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
      expect(emitted).toEqual(baseBookmark);
    });
  });

  describe("onDelete()", () => {
    it("emits the bookmark and prevents default", async () => {
      bookmarkVisitServiceMock.recordVisit.mockReset();
      await createComponent();
      let emitted: IBookmark | undefined;
      component.delete.subscribe((b) => (emitted = b));

      const event = new MouseEvent("click");
      vi.spyOn(event, "preventDefault");
      vi.spyOn(event, "stopPropagation");

      component.onDelete(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
      expect(emitted).toEqual(baseBookmark);
    });
  });

  describe("onOpen()", () => {
    it("records a visit for the bookmark", async () => {
      bookmarkVisitServiceMock.recordVisit.mockReset();
      await createComponent();

      component.onOpen();

      expect(bookmarkVisitServiceMock.recordVisit).toHaveBeenCalledWith(
        baseBookmark,
      );
    });

    it("records a visit when the card anchor is clicked", async () => {
      bookmarkVisitServiceMock.recordVisit.mockReset();
      await createComponent();

      fixture.debugElement.query(By.css("a.bookmark-card")).triggerEventHandler(
        "click",
        new MouseEvent("click"),
      );

      expect(bookmarkVisitServiceMock.recordVisit).toHaveBeenCalledWith(
        baseBookmark,
      );
    });
  });
});
