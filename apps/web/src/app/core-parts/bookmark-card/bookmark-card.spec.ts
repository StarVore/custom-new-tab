import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { IBookmark } from "../../models/IBookmark";
import { BookmarkCardComponent } from "./bookmark-card";

const baseBookmark: IBookmark = {
  id: "1",
  title: "GitHub",
  url: "https://github.com",
  order: 0,
};

describe("BookmarkCardComponent", () => {
  let component: BookmarkCardComponent;
  let fixture: ComponentFixture<BookmarkCardComponent>;

  async function createComponent(bookmark: IBookmark = baseBookmark) {
    await TestBed.configureTestingModule({
      imports: [BookmarkCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BookmarkCardComponent);
    fixture.componentRef.setInput("bookmark", bookmark);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it("should create", async () => {
    await createComponent();
    expect(component).toBeTruthy();
  });

  describe("getFaviconUrl()", () => {
    it("returns customImageUrl when provided", async () => {
      await createComponent({
        ...baseBookmark,
        customImageUrl: "https://img.example.com/logo.png",
      });
      expect(component.getFaviconUrl()).toBe("https://img.example.com/logo.png");
    });

    it("returns Google favicon URL for a valid URL", async () => {
      await createComponent();
      expect(component.getFaviconUrl()).toBe(
        "https://www.google.com/s2/favicons?domain=github.com&sz=64",
      );
    });

    it("falls back to raw url for invalid URL", async () => {
      await createComponent({ ...baseBookmark, url: "not-a-url" });
      expect(component.getFaviconUrl()).toBe(
        "https://www.google.com/s2/favicons?domain=not-a-url&sz=64",
      );
    });
  });

  describe("onEdit()", () => {
    it("emits the bookmark and prevents default", async () => {
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
});
