import { TestBed } from "@angular/core/testing";
import { of, throwError } from "rxjs";
import { IBookmark } from "../models/IBookmark";
import { IBookmarkVisit, IBookmarkVisitPayload } from "../models/IBookmarkVisit";
import { ApiService } from "./api-service";
import { BookmarkVisitService } from "./bookmark-visit.service";
import { ConfigService } from "./config.service";
import { ExtensionStorageService } from "./extension-storage.service";

const bookmark: IBookmark = {
  id: "bm1",
  title: "GitHub",
  url: "https://github.com",
  order: 0,
};

const visitRecord: IBookmarkVisit = {
  id: "v1",
  bookmarkId: "bm1",
  bookmarkTitle: "GitHub",
  bookmarkUrl: "https://github.com",
  source: "web",
  context: "bookmark-card",
  platform: "",
  userAgent: "",
  created: "2026-04-30T12:00:00.000Z",
  updated: "2026-04-30T12:00:00.000Z",
};

describe("BookmarkVisitService", () => {
  const apiMock = {
    getBookmarkVisits: vi.fn(),
    createBookmarkVisit: vi.fn(),
  };

  const storageMock = {
    getJson: vi.fn(),
    setJson: vi.fn(),
    remove: vi.fn(),
  };

  const configMock = {
    get: vi.fn(),
  };

  function setup() {
    apiMock.getBookmarkVisits.mockReset();
    apiMock.createBookmarkVisit.mockReset();
    storageMock.getJson.mockReset();
    storageMock.setJson.mockReset();
    storageMock.remove.mockReset();
    configMock.get.mockReset();

    storageMock.getJson.mockResolvedValue(null);
    storageMock.setJson.mockResolvedValue(undefined);
    storageMock.remove.mockResolvedValue(undefined);
    configMock.get.mockReturnValue({ bookmarkBaseUrl: "http://localhost:8090", apodBaseUrl: "" });

    TestBed.configureTestingModule({
      providers: [
        BookmarkVisitService,
        { provide: ApiService, useValue: apiMock },
        { provide: ConfigService, useValue: configMock },
        { provide: ExtensionStorageService, useValue: storageMock },
      ],
    });

    return TestBed.inject(BookmarkVisitService);
  }

  // ── getVisits ─────────────────────────────────────────────────────────────

  it("getVisits() delegates to ApiService", () => {
    const svc = setup();
    // Set mock AFTER setup() so it isn't wiped by the internal mockReset()
    apiMock.getBookmarkVisits.mockReturnValue(of([visitRecord]));

    let result: IBookmarkVisit[] | undefined;
    svc.getVisits().subscribe((v) => (result = v));

    expect(apiMock.getBookmarkVisits).toHaveBeenCalledTimes(1);
    expect(result).toEqual([visitRecord]);
  });

  // ── recordVisit ───────────────────────────────────────────────────────────

  it("recordVisit() posts visit with correct fields", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response());
    const svc = setup();

    svc.recordVisit(bookmark);

    await new Promise((r) => setTimeout(r, 0));

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:8090/api/collections/bookmark_visits/records");
    expect(init.keepalive).toBe(true);
    expect(init.method).toBe("POST");
    const payload = JSON.parse(init.body as string) as IBookmarkVisitPayload;
    expect(payload.bookmarkId).toBe("bm1");
    expect(payload.bookmarkTitle).toBe("GitHub");
    expect(payload.bookmarkUrl).toBe("https://github.com");
    expect(payload.context).toBe("bookmark-card");
    expect(["web", "chrome-extension", "firefox-extension"]).toContain(payload.source);

    fetchSpy.mockRestore();
  });

  it("recordVisit() uses the supplied context argument", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response());
    const svc = setup();

    svc.recordVisit(bookmark, "custom-context");

    await new Promise((r) => setTimeout(r, 0));

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(init.body as string) as IBookmarkVisitPayload;
    expect(payload.context).toBe("custom-context");

    fetchSpy.mockRestore();
  });

  it("recordVisit() enqueues payload when fetch fails", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    const svc = setup();

    svc.recordVisit(bookmark);

    // Allow the microtask queue to flush
    await new Promise((r) => setTimeout(r, 0));

    expect(storageMock.setJson).toHaveBeenCalledWith(
      "bookmark_pending_visits",
      expect.arrayContaining([
        expect.objectContaining({ bookmarkId: "bm1" }),
      ]),
    );

    fetchSpy.mockRestore();
  });

  // ── online queue drain ────────────────────────────────────────────────────

  it("drains pending queue and clears storage when back online", async () => {
    const pendingPayload: IBookmarkVisitPayload = {
      bookmarkId: "bm1",
      bookmarkTitle: "GitHub",
      bookmarkUrl: "https://github.com",
      source: "web",
      context: "bookmark-card",
      platform: "",
      userAgent: "",
    };

    setup();

    // Set mocks AFTER setup() so they are not wiped by the internal mockReset()
    storageMock.getJson.mockResolvedValue([pendingPayload]);
    apiMock.createBookmarkVisit.mockReturnValue(of(visitRecord));

    window.dispatchEvent(new Event("online"));
    await new Promise((r) => setTimeout(r, 0));

    expect(storageMock.remove).toHaveBeenCalledWith("bookmark_pending_visits");
    expect(apiMock.createBookmarkVisit).toHaveBeenCalledWith(pendingPayload);
  });

  it("re-enqueues visit if replay fails while draining", async () => {
    const pendingPayload: IBookmarkVisitPayload = {
      bookmarkId: "bm1",
      bookmarkTitle: "GitHub",
      bookmarkUrl: "https://github.com",
      source: "web",
      context: "bookmark-card",
      platform: "",
      userAgent: "",
    };

    setup();

    // Set mocks AFTER setup() so they are not wiped by the internal mockReset()
    storageMock.getJson
      .mockResolvedValueOnce([pendingPayload]) // initial drain read
      .mockResolvedValue(null); // re-enqueue read
    apiMock.createBookmarkVisit.mockReturnValue(
      throwError(() => new Error("still offline")),
    );

    window.dispatchEvent(new Event("online"));
    await new Promise((r) => setTimeout(r, 0));

    expect(storageMock.setJson).toHaveBeenCalledWith(
      "bookmark_pending_visits",
      expect.arrayContaining([expect.objectContaining({ bookmarkId: "bm1" })]),
    );
  });

  it("does nothing when pending queue is empty", async () => {
    storageMock.getJson.mockResolvedValue([]);
    apiMock.createBookmarkVisit.mockReturnValue(of(visitRecord));

    setup();

    window.dispatchEvent(new Event("online"));
    await new Promise((r) => setTimeout(r, 0));

    expect(storageMock.remove).not.toHaveBeenCalled();
    expect(apiMock.createBookmarkVisit).not.toHaveBeenCalled();
  });
});
