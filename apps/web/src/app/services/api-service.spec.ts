import { TestBed } from "@angular/core/testing";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { provideHttpClient } from "@angular/common/http";
import { ApiService } from "./api-service";
import { ConfigService } from "./config.service";
import { IApodPhoto } from "../models/IApodPhoto";
import { IBookmark } from "../models/IBookmark";

describe("ApiService", () => {
  let service: ApiService;
  let http: HttpTestingController;

  const configMock = {
    get: vi.fn().mockReturnValue({
      bookmarkBaseUrl: "https://pb.example.com",
      apodBaseUrl: "https://apod.example.com",
    }),
  };

  beforeEach(() => {
    configMock.get.mockReturnValue({
      bookmarkBaseUrl: "https://pb.example.com",
      apodBaseUrl: "https://apod.example.com",
    });

    TestBed.configureTestingModule({
      providers: [
        ApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ConfigService, useValue: configMock },
      ],
    });

    service = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  // ── connection tests ──────────────────────────────────────────────────────

  it("testBookmarkConnection returns true on 2xx", () => {
    let result: boolean | undefined;
    service
      .testBookmarkConnection("https://pb.example.com")
      .subscribe((v) => (result = v));

    const req = http.expectOne(
      "https://pb.example.com/api/collections/bookmarks/records?perPage=1",
    );
    req.flush({}, { status: 200, statusText: "OK" });
    expect(result).toBe(true);
  });

  it("testBookmarkConnection strips trailing slash from base URL", () => {
    service.testBookmarkConnection("https://pb.example.com/").subscribe();
    http
      .expectOne(
        "https://pb.example.com/api/collections/bookmarks/records?perPage=1",
      )
      .flush({});
  });

  it("testBookmarkConnection returns false on HTTP error", () => {
    let result: boolean | undefined;
    service
      .testBookmarkConnection("https://pb.example.com")
      .subscribe((v) => (result = v));

    http
      .expectOne(
        "https://pb.example.com/api/collections/bookmarks/records?perPage=1",
      )
      .flush("error", { status: 500, statusText: "Server Error" });
    expect(result).toBe(false);
  });

  it("testApodConnection returns true on 2xx", () => {
    let result: boolean | undefined;
    service
      .testApodConnection("https://apod.example.com")
      .subscribe((v) => (result = v));

    http
      .expectOne("https://apod.example.com/health")
      .flush({}, { status: 200, statusText: "OK" });
    expect(result).toBe(true);
  });

  it("testApodConnection strips trailing slash", () => {
    service.testApodConnection("https://apod.example.com/").subscribe();
    http.expectOne("https://apod.example.com/health").flush({});
  });

  it("testApodConnection returns false on HTTP error", () => {
    let result: boolean | undefined;
    service
      .testApodConnection("https://apod.example.com")
      .subscribe((v) => (result = v));

    http
      .expectOne("https://apod.example.com/health")
      .flush("err", { status: 503, statusText: "Unavailable" });
    expect(result).toBe(false);
  });

  // ── APOD ─────────────────────────────────────────────────────────────────

  it("getApodImage fetches from apod base URL", () => {
    const photo: IApodPhoto = {
      url: "https://img.example.com/photo.jpg",
      pageUrl: "https://apod.nasa.gov/apod/ap260101.html",
      explanation: "A beautiful galaxy",
      fetchedAt: new Date().toISOString(),
    };

    let result: IApodPhoto | undefined;
    service.getApodImage().subscribe((v) => (result = v));

    http
      .expectOne("https://apod.example.com/api/apod")
      .flush(photo);
    expect(result).toEqual(photo);
  });

  // ── bookmarks CRUD ────────────────────────────────────────────────────────

  const rawRecord = {
    id: "rec1",
    title: "GitHub",
    url: "https://github.com",
    customImageUrl: undefined,
    order: 0,
  };

  const bookmark: IBookmark = {
    id: "rec1",
    title: "GitHub",
    url: "https://github.com",
    customImageUrl: undefined,
    order: 0,
  };

  it("getBookmarks maps PocketBase records to IBookmark[]", () => {
    let result: IBookmark[] | undefined;
    service.getBookmarks().subscribe((v) => (result = v));

    http
      .expectOne(
        "https://pb.example.com/api/collections/bookmarks/records?sort=order&perPage=200",
      )
      .flush({ items: [rawRecord] });

    expect(result).toEqual([bookmark]);
  });

  it("createBookmark posts and maps result", () => {
    let result: IBookmark | undefined;
    const payload = { title: "GitHub", url: "https://github.com", order: 0 };
    service.createBookmark(payload).subscribe((v) => (result = v));

    const req = http.expectOne(
      "https://pb.example.com/api/collections/bookmarks/records",
    );
    expect(req.request.method).toBe("POST");
    req.flush(rawRecord);
    expect(result).toEqual(bookmark);
  });

  it("updateBookmark patches and maps result", () => {
    let result: IBookmark | undefined;
    service
      .updateBookmark("rec1", { title: "GitHub Updated" })
      .subscribe((v) => (result = v));

    const req = http.expectOne(
      "https://pb.example.com/api/collections/bookmarks/records/rec1",
    );
    expect(req.request.method).toBe("PATCH");
    req.flush({ ...rawRecord, title: "GitHub Updated" });
    expect(result?.title).toBe("GitHub Updated");
  });

  it("deleteBookmark sends DELETE request", () => {
    let called = false;
    service.deleteBookmark("rec1").subscribe(() => (called = true));

    const req = http.expectOne(
      "https://pb.example.com/api/collections/bookmarks/records/rec1",
    );
    expect(req.request.method).toBe("DELETE");
    req.flush(null);
    expect(called).toBe(true);
  });

  it("reorderBookmarks patches each id with its index then fetches", () => {
    service.reorderBookmarks(["rec1", "rec2"]).subscribe();

    http
      .expectOne(
        "https://pb.example.com/api/collections/bookmarks/records/rec1",
      )
      .flush({ ...rawRecord, id: "rec1", order: 0 });
    http
      .expectOne(
        "https://pb.example.com/api/collections/bookmarks/records/rec2",
      )
      .flush({ ...rawRecord, id: "rec2", order: 1 });
    // After forkJoin switchMaps to getBookmarks
    http
      .expectOne(
        "https://pb.example.com/api/collections/bookmarks/records?sort=order&perPage=200",
      )
      .flush({ items: [rawRecord] });
  });

  // ── graceful handling when config is null ─────────────────────────────────

  it("getApodImage uses empty string base when config is null", () => {
    configMock.get.mockReturnValue(null);
    service.getApodImage().subscribe();
    http.expectOne("/api/apod").flush({});
  });
});
