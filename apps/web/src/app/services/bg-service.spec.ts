import { DOCUMENT } from "@angular/common";
import { TestBed } from "@angular/core/testing";
import { signal } from "@angular/core";
import { of, throwError } from "rxjs";
import { IApodPhoto } from "../models/IApodPhoto";
import { ApiService } from "./api-service";
import { BgService } from "./bg-service";
import { ConfigService } from "./config.service";
import { ExtensionStorageService } from "./extension-storage.service";

describe("BgService", () => {
  const configured = signal(false);

  const stalePhoto: IApodPhoto = {
    url: "https://images.example.com/stale.jpg",
    pageUrl: "https://apod.nasa.gov/apod/ap260401.html",
    explanation: "Cached APOD photo",
    fetchedAt: "2026-04-01T09:00:00.000Z",
  };

  const freshPhoto: IApodPhoto = {
    url: "https://images.example.com/fresh.jpg",
    pageUrl: "https://apod.nasa.gov/apod/ap260404.html",
    explanation: "Fresh APOD photo",
    fetchedAt: "2026-04-04T09:00:00.000Z",
  };

  const apiMock = {
    getApodImage: vi.fn(),
  };

  const storageMock = {
    getJson: vi.fn(),
    setJson: vi.fn(),
    remove: vi.fn(),
  };

  beforeEach(() => {
    configured.set(false);
    apiMock.getApodImage.mockReset();
    storageMock.getJson.mockReset();
    storageMock.setJson.mockReset();

    TestBed.configureTestingModule({
      providers: [
        BgService,
        { provide: ApiService, useValue: apiMock },
        { provide: ExtensionStorageService, useValue: storageMock },
        { provide: ConfigService, useValue: { isConfigured: configured } },
      ],
    });

    const document = TestBed.inject(DOCUMENT);
    document.body.style.backgroundImage = "";
    document.body.style.backgroundSize = "";
    document.body.style.backgroundPosition = "";
    document.body.style.backgroundRepeat = "";
    document.body.style.backgroundAttachment = "";
  });

  it("falls back to cached APOD when API request fails", async () => {
    configured.set(true);
    storageMock.getJson.mockResolvedValue(stalePhoto);
    apiMock.getApodImage.mockReturnValue(
      throwError(() => new Error("APOD service unavailable")),
    );

    const service = TestBed.inject(BgService);
    await service.loadBackground();

    const document = TestBed.inject(DOCUMENT);
    expect(service.photoDetails()).toEqual(stalePhoto);
    expect(document.body.style.backgroundImage).toContain(stalePhoto.url);
  });

  it("caches and displays fresh APOD when API request succeeds", async () => {
    configured.set(true);
    storageMock.getJson.mockResolvedValue(null);
    storageMock.setJson.mockResolvedValue(undefined);
    apiMock.getApodImage.mockReturnValue(of(freshPhoto));

    const service = TestBed.inject(BgService);
    await service.loadBackground();

    const document = TestBed.inject(DOCUMENT);
    expect(storageMock.setJson).toHaveBeenCalledWith(
      "apod_background",
      freshPhoto,
    );
    expect(service.photoDetails()).toEqual(freshPhoto);
    expect(document.body.style.backgroundImage).toContain(freshPhoto.url);
  });

  it("serves today's cached photo without calling the API", async () => {
    const todayPhoto: IApodPhoto = {
      url: "https://images.example.com/today.jpg",
      pageUrl: "https://apod.nasa.gov/apod/today.html",
      explanation: "Today's photo",
      fetchedAt: new Date().toISOString(),
    };
    configured.set(true);
    storageMock.getJson.mockResolvedValue(todayPhoto);

    const service = TestBed.inject(BgService);
    await service.loadBackground();

    expect(apiMock.getApodImage).not.toHaveBeenCalled();
    expect(service.photoDetails()).toEqual(todayPhoto);
  });

  it("skips API call when not configured after loading a stale cached photo", async () => {
    configured.set(false);
    storageMock.getJson.mockResolvedValue(stalePhoto); // stale, not from today

    const service = TestBed.inject(BgService);
    await service.loadBackground();

    expect(apiMock.getApodImage).not.toHaveBeenCalled();
  });

  it("logs error when API fails with no cached photo to fall back on", async () => {
    configured.set(true);
    storageMock.getJson.mockResolvedValue(null);
    apiMock.getApodImage.mockReturnValue(
      throwError(() => new Error("no network")),
    );
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const service = TestBed.inject(BgService);
    await service.loadBackground();

    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to load APOD background:",
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });

  it("getCachedPhoto returns null when cached data is missing required fields", async () => {
    storageMock.getJson.mockResolvedValue({
      url: "https://images.example.com/photo.jpg",
      // missing pageUrl, explanation, fetchedAt
    });

    const service = TestBed.inject(BgService);
    const result = await service.getCachedPhoto();
    expect(result).toBeNull();
  });

  it("does not apply background when today's cached URL is not https", async () => {
    const httpPhoto: IApodPhoto = {
      url: "http://images.example.com/photo.jpg",
      pageUrl: "https://apod.nasa.gov/apod/today.html",
      explanation: "Photo with http URL",
      fetchedAt: new Date().toISOString(),
    };
    configured.set(true);
    storageMock.getJson.mockResolvedValue(httpPhoto);

    const service = TestBed.inject(BgService);
    await service.loadBackground();

    const document = TestBed.inject(DOCUMENT);
    expect(document.body.style.backgroundImage).toBe("");
  });

  it("effect clears photo and background when service becomes unconfigured", async () => {
    configured.set(true);
    storageMock.getJson.mockResolvedValue(null);
    storageMock.setJson.mockResolvedValue(undefined);
    apiMock.getApodImage.mockReturnValue(of(freshPhoto));

    const service = TestBed.inject(BgService);
    TestBed.flushEffects();
    await new Promise((r) => setTimeout(r, 0));

    configured.set(false);
    TestBed.flushEffects();

    expect(service.photoDetails()).toBeNull();
    const document = TestBed.inject(DOCUMENT);
    expect(document.body.style.backgroundImage).toBe("");
  });

  it("effect triggers loadBackground when service becomes configured", async () => {
    storageMock.getJson.mockResolvedValue(null);
    storageMock.setJson.mockResolvedValue(undefined);
    apiMock.getApodImage.mockReturnValue(of(freshPhoto));

    const service = TestBed.inject(BgService);
    TestBed.flushEffects();
    expect(apiMock.getApodImage).not.toHaveBeenCalled();

    configured.set(true);
    TestBed.flushEffects();
    await new Promise((r) => setTimeout(r, 0));

    expect(apiMock.getApodImage).toHaveBeenCalled();
    expect(service.photoDetails()).toEqual(freshPhoto);
  });
});
