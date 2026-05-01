import { ComponentFixture, TestBed } from "@angular/core/testing";
import { signal } from "@angular/core";
import { of, throwError } from "rxjs";
import { BookmarkStatsComponent } from "./bookmark-stats";
import { BookmarkService } from "../../services/bookmark.service";
import { BookmarkVisitService } from "../../services/bookmark-visit.service";
import { IBookmark } from "../../models/IBookmark";
import { IBookmarkVisit } from "../../models/IBookmarkVisit";

const bm1: IBookmark = { id: "bm1", title: "GitHub", url: "https://github.com", order: 0 };
const bm2: IBookmark = { id: "bm2", title: "YouTube", url: "https://youtube.com", order: 1 };

function makeVisit(
  bookmarkId: string,
  title: string,
  created: string,
): IBookmarkVisit {
  return {
    id: `v-${bookmarkId}-${created}`,
    bookmarkId,
    bookmarkTitle: title,
    bookmarkUrl: "https://example.com",
    source: "web",
    context: "bookmark-card",
    platform: "",
    userAgent: "",
    created,
    updated: created,
  };
}

// Visits within the last 30 days
const recentVisitBm1 = makeVisit("bm1", "GitHub", new Date().toISOString());
const recentVisitBm2 = makeVisit("bm2", "YouTube", new Date().toISOString());

// Visit older than 90 days
const oldVisitBm1 = makeVisit("bm1", "GitHub", "2020-01-01T00:00:00.000Z");

describe("BookmarkStatsComponent", () => {
  let component: BookmarkStatsComponent;
  let fixture: ComponentFixture<BookmarkStatsComponent>;

  const bookmarksMock = { bookmarks: signal<IBookmark[]>([bm1, bm2]) };
  const visitMock = { getVisits: vi.fn() };

  async function setup(visits: IBookmarkVisit[] = [recentVisitBm1, recentVisitBm2]) {
    visitMock.getVisits.mockReset();
    visitMock.getVisits.mockReturnValue(of(visits));

    await TestBed.configureTestingModule({
      imports: [BookmarkStatsComponent],
      providers: [
        { provide: BookmarkService, useValue: bookmarksMock },
        { provide: BookmarkVisitService, useValue: visitMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BookmarkStatsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  // ── initialisation ────────────────────────────────────────────────────────

  it("creates the component", async () => {
    await setup();
    expect(component).toBeTruthy();
  });

  it("loads visits on init and clears loading state", async () => {
    await setup([recentVisitBm1]);
    expect(component.isLoading()).toBe(false);
    expect(component.visits()).toHaveLength(1);
  });

  it("sets loadError when getVisits fails", async () => {
    visitMock.getVisits.mockReturnValue(throwError(() => new Error("fail")));
    await setup([]);
    // re-init after mock change already handled by setup — trigger fresh create
    TestBed.resetTestingModule();
    visitMock.getVisits.mockReturnValue(throwError(() => new Error("fail")));
    await TestBed.configureTestingModule({
      imports: [BookmarkStatsComponent],
      providers: [
        { provide: BookmarkService, useValue: bookmarksMock },
        { provide: BookmarkVisitService, useValue: visitMock },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(BookmarkStatsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.isLoading()).toBe(false);
    expect(component.loadError()).toBeTruthy();
  });

  it("auto-selects all bookmarks on first load", async () => {
    await setup();
    expect(component.selectedBookmarkIds()).toEqual(
      expect.arrayContaining(["bm1", "bm2"]),
    );
  });

  // ── preset filtering ──────────────────────────────────────────────────────

  it("selectPreset() updates rangePreset", async () => {
    await setup();
    component.selectPreset("7d");
    expect(component.rangePreset()).toBe("7d");
  });

  it("isPresetActive() returns true for active preset", async () => {
    await setup();
    component.selectPreset("90d");
    expect(component.isPresetActive("90d")).toBe(true);
    expect(component.isPresetActive("7d")).toBe(false);
  });

  it("'all' preset includes old visits", async () => {
    await setup([oldVisitBm1, recentVisitBm1]);
    component.selectPreset("all");
    expect(component.filteredVisits().length).toBe(2);
  });

  it("'7d' preset excludes old visits", async () => {
    await setup([oldVisitBm1, recentVisitBm1]);
    component.selectPreset("7d");
    expect(component.filteredVisits().length).toBe(1);
  });

  // ── custom range ──────────────────────────────────────────────────────────

  it("onCustomStartChange() switches preset to custom", async () => {
    await setup();
    component.onCustomStartChange("2026-01-01");
    expect(component.rangePreset()).toBe("custom");
    expect(component.customStart()).toBe("2026-01-01");
  });

  it("onCustomEndChange() switches preset to custom", async () => {
    await setup();
    component.onCustomEndChange("2026-12-31");
    expect(component.rangePreset()).toBe("custom");
    expect(component.customEnd()).toBe("2026-12-31");
  });

  it("custom range with no bounds passes all visits through", async () => {
    await setup([recentVisitBm1, oldVisitBm1]);
    component.rangePreset.set("custom");
    component.customStart.set("");
    component.customEnd.set("");
    expect(component.filteredVisits().length).toBe(2);
  });

  // ── bookmark toggles ──────────────────────────────────────────────────────

  it("onBookmarkToggle() adds bookmark when checked", async () => {
    await setup();
    component.selectedBookmarkIds.set([]);
    const event = { target: { checked: true } } as unknown as Event;
    component.onBookmarkToggle("bm1", event);
    expect(component.selectedBookmarkIds()).toContain("bm1");
  });

  it("onBookmarkToggle() removes bookmark when unchecked", async () => {
    await setup();
    const event = { target: { checked: false } } as unknown as Event;
    component.onBookmarkToggle("bm1", event);
    expect(component.selectedBookmarkIds()).not.toContain("bm1");
  });

  it("onBookmarkToggle() does not duplicate an already-selected bookmark", async () => {
    await setup();
    const event = { target: { checked: true } } as unknown as Event;
    component.onBookmarkToggle("bm1", event);
    const ids = component.selectedBookmarkIds();
    expect(ids.filter((id) => id === "bm1").length).toBe(1);
  });

  it("isBookmarkSelected() reflects current selection", async () => {
    await setup();
    component.selectedBookmarkIds.set(["bm1"]);
    expect(component.isBookmarkSelected("bm1")).toBe(true);
    expect(component.isBookmarkSelected("bm2")).toBe(false);
  });

  it("selectAllBookmarks() selects every bookmark", async () => {
    await setup();
    component.selectedBookmarkIds.set([]);
    component.selectAllBookmarks();
    expect(component.selectedBookmarkIds()).toEqual(
      expect.arrayContaining(["bm1", "bm2"]),
    );
  });

  it("clearBookmarkSelection() empties the selection", async () => {
    await setup();
    component.clearBookmarkSelection();
    expect(component.selectedBookmarkIds()).toEqual([]);
  });

  // ── chart rows ────────────────────────────────────────────────────────────

  it("chartRows() aggregates visit counts per bookmark", async () => {
    const twoVisitsBm1 = [recentVisitBm1, recentVisitBm1, recentVisitBm2];
    await setup(twoVisitsBm1);
    component.selectPreset("all");

    const rows = component.chartRows();
    const bm1Row = rows.find((r) => r.bookmarkId === "bm1");
    const bm2Row = rows.find((r) => r.bookmarkId === "bm2");

    expect(bm1Row?.count).toBe(2);
    expect(bm2Row?.count).toBe(1);
  });

  it("chartRows() sets widthPercent=100 for the top bookmark", async () => {
    await setup([recentVisitBm1, recentVisitBm1, recentVisitBm2]);
    component.selectPreset("all");

    const rows = component.chartRows();
    expect(rows[0].widthPercent).toBe(100);
  });

  it("chartRows() returns zero widthPercent when there are no visits", async () => {
    await setup([]);
    component.selectPreset("all");

    const rows = component.chartRows();
    rows.forEach((r) => expect(r.widthPercent).toBe(0));
  });

  it("chartRows() sorts by count descending", async () => {
    await setup([recentVisitBm1, recentVisitBm1, recentVisitBm2]);
    component.selectPreset("all");

    const rows = component.chartRows();
    expect(rows[0].bookmarkId).toBe("bm1");
    expect(rows[1].bookmarkId).toBe("bm2");
  });

  it("totalVisitCount reflects filtered visit count", async () => {
    await setup([recentVisitBm1, recentVisitBm2]);
    component.selectPreset("all");
    expect(component.totalVisitCount()).toBe(2);
  });

  // ── refresh ───────────────────────────────────────────────────────────────

  it("refresh() reloads visits from the service", async () => {
    await setup();
    visitMock.getVisits.mockReturnValue(of([recentVisitBm1]));
    component.refresh();
    expect(visitMock.getVisits).toHaveBeenCalledTimes(2);
  });

  // ── trackBookmark ─────────────────────────────────────────────────────────

  it("trackBookmark() returns the bookmark id", async () => {
    await setup();
    expect(component.trackBookmark(0, bm1)).toBe("bm1");
  });
});
