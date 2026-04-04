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
});
