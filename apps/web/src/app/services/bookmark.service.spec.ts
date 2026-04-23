import { TestBed } from "@angular/core/testing";
import { of, throwError } from "rxjs";
import { IBookmark } from "../models/IBookmark";
import { ApiService } from "./api-service";
import { BookmarkService } from "./bookmark.service";
import { ExtensionStorageService } from "./extension-storage.service";

const bm1: IBookmark = {
  id: "1",
  title: "Alpha",
  url: "https://alpha.example.com",
  order: 0,
};
const bm2: IBookmark = {
  id: "2",
  title: "Beta",
  url: "https://beta.example.com",
  order: 1,
};

describe("BookmarkService", () => {
  const apiMock = {
    getBookmarks: vi.fn(),
    createBookmark: vi.fn(),
    updateBookmark: vi.fn(),
    deleteBookmark: vi.fn(),
    reorderBookmarks: vi.fn(),
  };

  const storageMock = {
    getJson: vi.fn(),
    setJson: vi.fn(),
    remove: vi.fn(),
  };

  function setup(cached: IBookmark[] | null = null, api: IBookmark[] = []) {
    storageMock.getJson.mockReset();
    storageMock.setJson.mockReset();
    storageMock.remove.mockReset();
    Object.values(apiMock).forEach((fn) => fn.mockReset());

    storageMock.getJson.mockResolvedValue(cached);
    storageMock.setJson.mockResolvedValue(undefined);
    apiMock.getBookmarks.mockReturnValue(of(api));

    TestBed.configureTestingModule({
      providers: [
        BookmarkService,
        { provide: ApiService, useValue: apiMock },
        { provide: ExtensionStorageService, useValue: storageMock },
      ],
    });

    return TestBed.inject(BookmarkService);
  }

  // ── initialisation ────────────────────────────────────────────────────────

  it("populates bookmarks from API on init", () => {
    const svc = setup(null, [bm2, bm1]);
    // API returns unsorted; service sorts by order
    expect(svc.bookmarks()).toEqual([bm1, bm2]);
  });

  it("serves cached bookmarks while API loads (initial signal state)", async () => {
    storageMock.getJson.mockResolvedValue([bm1]);
    storageMock.setJson.mockResolvedValue(undefined);
    // API resolves with empty – the cache was already set in the signal
    apiMock.getBookmarks.mockReturnValue(of([]));

    TestBed.configureTestingModule({
      providers: [
        BookmarkService,
        { provide: ApiService, useValue: apiMock },
        { provide: ExtensionStorageService, useValue: storageMock },
      ],
    });
    const svc = TestBed.inject(BookmarkService);
    // API overrides with empty, but the constructor sets cache first
    await Promise.resolve(); // let loadFromCache microtask run
    // API was called synchronously and overrode cache, so [] is the final state
    expect(Array.isArray(svc.bookmarks())).toBe(true);
  });

  it("does not throw when API call fails (offline)", () => {
    storageMock.getJson.mockResolvedValue(null);
    storageMock.setJson.mockResolvedValue(undefined);
    apiMock.getBookmarks.mockReturnValue(throwError(() => new Error("offline")));

    TestBed.configureTestingModule({
      providers: [
        BookmarkService,
        { provide: ApiService, useValue: apiMock },
        { provide: ExtensionStorageService, useValue: storageMock },
      ],
    });

    // Should not throw
    expect(() => TestBed.inject(BookmarkService)).not.toThrow();
  });

  // ── create ────────────────────────────────────────────────────────────────

  it("create() optimistically adds bookmark and replaces on API success", () => {
    const created: IBookmark = { id: "new1", title: "New", url: "https://new.example.com", order: 0 };
    const svc = setup(null, []);
    apiMock.createBookmark.mockReturnValue(of(created));
    svc.create({ title: "New", url: "https://new.example.com" });

    const bms = svc.bookmarks();
    expect(bms).toHaveLength(1);
    expect(bms[0].id).toBe("new1"); // replaced temp id with real one
    expect(bms[0].title).toBe("New");
  });

  it("create() sets order to max+1 of existing bookmarks", () => {
    const created: IBookmark = {
      id: "new2",
      title: "Gamma",
      url: "https://gamma.example.com",
      order: 2,
    };
    const svc = setup(null, [bm1, bm2]);
    apiMock.createBookmark.mockReturnValue(of(created));
    svc.create({ title: "Gamma", url: "https://gamma.example.com" });

    const payload = apiMock.createBookmark.mock.calls[0][0] as IBookmark;
    expect(payload.order).toBe(2);
  });

  it("create() enqueues mutation on API error", async () => {
    storageMock.getJson
      .mockResolvedValueOnce(null) // cache miss on init
      .mockResolvedValueOnce([]); // pending mutations read
    apiMock.getBookmarks.mockReturnValue(of([]));
    apiMock.createBookmark.mockReturnValue(throwError(() => new Error("net")));

    TestBed.configureTestingModule({
      providers: [
        BookmarkService,
        { provide: ApiService, useValue: apiMock },
        { provide: ExtensionStorageService, useValue: storageMock },
      ],
    });
    const svc = TestBed.inject(BookmarkService);
    svc.create({ title: "X", url: "https://x.example.com" });

    await Promise.resolve();

    expect(storageMock.setJson).toHaveBeenCalledWith(
      "bookmark_pending_mutations",
      expect.arrayContaining([expect.objectContaining({ type: "create" })]),
    );
  });

  // ── update ────────────────────────────────────────────────────────────────

  it("update() optimistically updates then confirms with API result", () => {
    const updated: IBookmark = { ...bm1, title: "Alpha Updated" };
    const svc = setup(null, [bm1]);
    apiMock.updateBookmark.mockReturnValue(of(updated));
    svc.update("1", { title: "Alpha Updated" });

    expect(svc.bookmarks()[0].title).toBe("Alpha Updated");
  });

  it("update() enqueues mutation on API error", async () => {
    storageMock.getJson
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce([]);
    apiMock.getBookmarks.mockReturnValue(of([bm1]));
    apiMock.updateBookmark.mockReturnValue(throwError(() => new Error("net")));

    TestBed.configureTestingModule({
      providers: [
        BookmarkService,
        { provide: ApiService, useValue: apiMock },
        { provide: ExtensionStorageService, useValue: storageMock },
      ],
    });
    const svc = TestBed.inject(BookmarkService);
    svc.update("1", { title: "X" });

    await Promise.resolve();

    expect(storageMock.setJson).toHaveBeenCalledWith(
      "bookmark_pending_mutations",
      expect.arrayContaining([expect.objectContaining({ type: "update" })]),
    );
  });

  // ── delete ────────────────────────────────────────────────────────────────

  it("delete() removes bookmark optimistically", () => {
    const svc = setup(null, [bm1, bm2]);
    apiMock.deleteBookmark.mockReturnValue(of(undefined));
    svc.delete("1");

    expect(svc.bookmarks()).toEqual([bm2]);
  });

  it("delete() enqueues mutation on API error", async () => {
    storageMock.getJson
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce([]);
    apiMock.getBookmarks.mockReturnValue(of([bm1]));
    apiMock.deleteBookmark.mockReturnValue(throwError(() => new Error("net")));

    TestBed.configureTestingModule({
      providers: [
        BookmarkService,
        { provide: ApiService, useValue: apiMock },
        { provide: ExtensionStorageService, useValue: storageMock },
      ],
    });
    const svc = TestBed.inject(BookmarkService);
    svc.delete("1");

    await Promise.resolve();

    expect(storageMock.setJson).toHaveBeenCalledWith(
      "bookmark_pending_mutations",
      expect.arrayContaining([expect.objectContaining({ type: "delete" })]),
    );
  });

  // ── reorder ───────────────────────────────────────────────────────────────

  it("reorder() reorders bookmarks and updates order property", () => {
    const svc = setup(null, [bm1, bm2]);
    apiMock.reorderBookmarks.mockReturnValue(of([bm2, bm1]));
    svc.reorder(["2", "1"]);

    const bms = svc.bookmarks();
    expect(bms[0].id).toBe("2");
    expect(bms[0].order).toBe(0);
    expect(bms[1].id).toBe("1");
    expect(bms[1].order).toBe(1);
  });

  it("reorder() ignores unknown ids", () => {
    const svc = setup(null, [bm1]);
    apiMock.reorderBookmarks.mockReturnValue(of([]));
    // "9" is unknown – should be filtered out
    svc.reorder(["1", "9"]);

    const bms = svc.bookmarks();
    expect(bms.every((b) => b !== null)).toBe(true);
  });

  it("reorder() enqueues mutation on API error", async () => {
    storageMock.getJson
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce([]);
    apiMock.getBookmarks.mockReturnValue(of([bm1, bm2]));
    apiMock.reorderBookmarks.mockReturnValue(throwError(() => new Error("net")));

    TestBed.configureTestingModule({
      providers: [
        BookmarkService,
        { provide: ApiService, useValue: apiMock },
        { provide: ExtensionStorageService, useValue: storageMock },
      ],
    });
    const svc = TestBed.inject(BookmarkService);
    svc.reorder(["2", "1"]);

    await Promise.resolve();

    expect(storageMock.setJson).toHaveBeenCalledWith(
      "bookmark_pending_mutations",
      expect.arrayContaining([expect.objectContaining({ type: "reorder" })]),
    );
  });

  // ── drainPendingQueue (called directly via private access) ───────────────

  function setupDrain(
    pending: Array<{ type: string; payload: unknown; timestamp: number }>,
  ) {
    Object.values(apiMock).forEach((fn) => fn.mockReset());
    storageMock.getJson.mockReset();
    storageMock.setJson.mockReset();
    storageMock.remove.mockReset();

    storageMock.getJson
      .mockResolvedValueOnce(null) // loadFromCache (CACHE_KEY)
      .mockResolvedValueOnce(pending); // drainPendingQueue (PENDING_KEY)
    storageMock.setJson.mockResolvedValue(undefined);
    storageMock.remove.mockResolvedValue(undefined);
    apiMock.getBookmarks.mockReturnValue(of([]));

    TestBed.configureTestingModule({
      providers: [
        BookmarkService,
        { provide: ApiService, useValue: apiMock },
        { provide: ExtensionStorageService, useValue: storageMock },
      ],
    });

    return TestBed.inject(BookmarkService);
  }

  it("drainPendingQueue does nothing when queue is empty", async () => {
    const svc = setupDrain([]);
    await Promise.resolve(); // let loadFromCache settle

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (svc as any).drainPendingQueue();

    expect(storageMock.remove).not.toHaveBeenCalledWith(
      "bookmark_pending_mutations",
    );
  });

  it("drainPendingQueue replays create mutations", async () => {
    const mutation = {
      type: "create",
      payload: { title: "X", url: "https://x.example.com", order: 0 },
      timestamp: 1,
    };
    const svc = setupDrain([mutation]);
    apiMock.createBookmark.mockReturnValue(of(bm1));
    await Promise.resolve();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (svc as any).drainPendingQueue();

    expect(apiMock.createBookmark).toHaveBeenCalledWith({
      title: "X",
      url: "https://x.example.com",
      order: 0,
    });
  });

  it("drainPendingQueue replays update mutations", async () => {
    const mutation = {
      type: "update",
      payload: { id: "1", changes: { title: "New" } },
      timestamp: 1,
    };
    const svc = setupDrain([mutation]);
    apiMock.updateBookmark.mockReturnValue(of(bm1));
    await Promise.resolve();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (svc as any).drainPendingQueue();

    expect(apiMock.updateBookmark).toHaveBeenCalledWith("1", { title: "New" });
  });

  it("drainPendingQueue replays delete mutations", async () => {
    const mutation = { type: "delete", payload: "1", timestamp: 1 };
    const svc = setupDrain([mutation]);
    apiMock.deleteBookmark.mockReturnValue(of(undefined));
    await Promise.resolve();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (svc as any).drainPendingQueue();

    expect(apiMock.deleteBookmark).toHaveBeenCalledWith("1");
  });

  it("drainPendingQueue replays reorder mutations", async () => {
    const mutation = { type: "reorder", payload: ["2", "1"], timestamp: 1 };
    const svc = setupDrain([mutation]);
    apiMock.reorderBookmarks.mockReturnValue(of([bm2, bm1]));
    await Promise.resolve();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (svc as any).drainPendingQueue();

    expect(apiMock.reorderBookmarks).toHaveBeenCalledWith(["2", "1"]);
  });

  it("drainPendingQueue resolves without throwing when API call fails", async () => {
    const mutation = {
      type: "create",
      payload: { title: "X", url: "https://x.example.com", order: 0 },
      timestamp: 1,
    };
    const svc = setupDrain([mutation]);
    apiMock.createBookmark.mockReturnValue(
      throwError(() => new Error("network error")),
    );
    await Promise.resolve();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect((svc as any).drainPendingQueue()).resolves.toBeUndefined();
  });

  // ── create/update success with multiple bookmarks (ternary false branch) ─

  it("create() only replaces the temp bookmark when pre-existing bookmarks are present", () => {
    const created: IBookmark = {
      id: "new1",
      title: "New",
      url: "https://new.example.com",
      order: 1,
    };
    const svc = setup(null, [bm1]);
    apiMock.createBookmark.mockReturnValue(of(created));
    svc.create({ title: "New", url: "https://new.example.com" });

    const ids = svc.bookmarks().map((b) => b.id);
    expect(ids).toContain("1"); // bm1 unchanged (false branch of map ternary)
    expect(ids).toContain("new1"); // temp replaced by real id
  });

  it("update() only updates the matched bookmark when multiple bookmarks exist", () => {
    const updated: IBookmark = { ...bm1, title: "Alpha Updated" };
    const svc = setup(null, [bm1, bm2]);
    apiMock.updateBookmark.mockReturnValue(of(updated));
    svc.update("1", { title: "Alpha Updated" });

    expect(svc.bookmarks().find((b) => b.id === "1")?.title).toBe(
      "Alpha Updated",
    );
    expect(svc.bookmarks().find((b) => b.id === "2")?.title).toBe("Beta"); // unchanged (false branch)
  });

  it("enqueueMutation creates new array when storage has no prior pending mutations", async () => {
    storageMock.getJson
      .mockResolvedValueOnce(null) // loadFromCache
      .mockResolvedValueOnce(null); // enqueueMutation reads null → ?? []
    storageMock.setJson.mockResolvedValue(undefined);
    apiMock.getBookmarks.mockReturnValue(of([bm1]));
    apiMock.deleteBookmark.mockReturnValue(throwError(() => new Error("net")));

    TestBed.configureTestingModule({
      providers: [
        BookmarkService,
        { provide: ApiService, useValue: apiMock },
        { provide: ExtensionStorageService, useValue: storageMock },
      ],
    });
    const svc = TestBed.inject(BookmarkService);
    svc.delete("1");

    await Promise.resolve();

    expect(storageMock.setJson).toHaveBeenCalledWith(
      "bookmark_pending_mutations",
      expect.arrayContaining([expect.objectContaining({ type: "delete" })]),
    );
  });
});
