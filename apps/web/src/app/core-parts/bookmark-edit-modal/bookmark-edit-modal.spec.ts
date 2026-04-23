import { ComponentFixture, TestBed } from "@angular/core/testing";
import { IBookmark } from "../../models/IBookmark";
import { BookmarkEditModalComponent } from "./bookmark-edit-modal";

const existingBookmark: IBookmark = {
  id: "1",
  title: "GitHub",
  url: "https://github.com",
  customImageUrl: "https://img.example.com/gh.png",
  order: 0,
};

describe("BookmarkEditModalComponent", () => {
  async function createComponent(
    bookmark: IBookmark | null | undefined = null,
  ) {
    await TestBed.configureTestingModule({
      imports: [BookmarkEditModalComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(BookmarkEditModalComponent);
    fixture.componentRef.setInput("bookmark", bookmark);
    fixture.componentInstance; // trigger ngOnInit via detectChanges
    fixture.detectChanges();
    return fixture;
  }

  // ── add mode (bookmark = null) ────────────────────────────────────────────

  describe("add mode (bookmark = null)", () => {
    let fixture: ComponentFixture<BookmarkEditModalComponent>;
    let component: BookmarkEditModalComponent;

    beforeEach(async () => {
      fixture = await createComponent(null);
      component = fixture.componentInstance;
    });

    it("should create", () => {
      expect(component).toBeTruthy();
    });

    it("isEditMode is false", () => {
      expect(component.isEditMode).toBe(false);
    });

    it("form starts empty", () => {
      expect(component.form.get("title")?.value).toBe("");
      expect(component.form.get("url")?.value).toBe("");
    });

    it("onSave() marks form touched and does not emit when invalid", () => {
      let emitted = false;
      component.save.subscribe(() => (emitted = true));
      component.onSave();
      expect(emitted).toBe(false);
      expect(component.form.get("title")?.touched).toBe(true);
    });

    it("onSave() emits form values when valid", () => {
      let emitted: unknown;
      component.save.subscribe((v) => (emitted = v));

      component.form.get("title")?.setValue("Test");
      component.form.get("url")?.setValue("https://test.example.com");
      component.onSave();

      expect(emitted).toMatchObject({
        title: "Test",
        url: "https://test.example.com",
      });
    });

    it("onCancel() emits cancel", () => {
      let cancelled = false;
      component.cancel.subscribe(() => (cancelled = true));
      component.onCancel();
      expect(cancelled).toBe(true);
    });

    it("onBackdropClick() emits cancel when clicking the backdrop element", () => {
      let cancelled = false;
      component.cancel.subscribe(() => (cancelled = true));

      const fakeTarget = document.createElement("div");
      fakeTarget.classList.add("modal-backdrop");
      const event = new MouseEvent("click");
      Object.defineProperty(event, "target", { value: fakeTarget });

      component.onBackdropClick(event);
      expect(cancelled).toBe(true);
    });

    it("onBackdropClick() does NOT emit when clicking inner content", () => {
      let cancelled = false;
      component.cancel.subscribe(() => (cancelled = true));

      const fakeTarget = document.createElement("div");
      // no modal-backdrop class
      const event = new MouseEvent("click");
      Object.defineProperty(event, "target", { value: fakeTarget });

      component.onBackdropClick(event);
      expect(cancelled).toBe(false);
    });

    it("favicon preview updates when URL changes", () => {
      component.form.get("url")?.setValue("https://example.com");
      expect(component.faviconPreview()).toContain("example.com");
    });

    it("favicon preview uses customImageUrl when provided", () => {
      component.form.get("customImageUrl")?.setValue("https://img.example.com/logo.png");
      expect(component.faviconPreview()).toBe("https://img.example.com/logo.png");
    });

    it("favicon preview falls back to url favicon when customImageUrl is cleared", () => {
      component.form.get("url")?.setValue("https://example.com");
      component.form.get("customImageUrl")?.setValue("https://img.example.com/logo.png");
      component.form.get("customImageUrl")?.setValue("");
      expect(component.faviconPreview()).toContain("example.com");
    });
  });

  // ── edit mode (bookmark = IBookmark) ─────────────────────────────────────

  describe("edit mode (bookmark = IBookmark)", () => {
    let fixture: ComponentFixture<BookmarkEditModalComponent>;
    let component: BookmarkEditModalComponent;

    beforeEach(async () => {
      fixture = await createComponent(existingBookmark);
      component = fixture.componentInstance;
    });

    it("isEditMode is true", () => {
      expect(component.isEditMode).toBe(true);
    });

    it("form is pre-populated with bookmark values", () => {
      expect(component.form.get("title")?.value).toBe("GitHub");
      expect(component.form.get("url")?.value).toBe("https://github.com");
      expect(component.form.get("customImageUrl")?.value).toBe(
        "https://img.example.com/gh.png",
      );
    });

    it("faviconPreview uses customImageUrl from bookmark", () => {
      expect(component.faviconPreview()).toBe("https://img.example.com/gh.png");
    });
  });
});
