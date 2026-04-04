//

import { DOCUMENT } from "@angular/common";
import { effect, inject, Injectable, signal } from "@angular/core";
import { IApodPhoto } from "../models/IApodPhoto";
import { ApiService } from "./api-service";
import { ConfigService } from "./config.service";
import { ExtensionStorageService } from "./extension-storage.service";

const STORAGE_KEY = "apod_background";

@Injectable({
  providedIn: "root",
})
export class BgService {
  private apiService = inject(ApiService);
  private configService = inject(ConfigService);
  private storage = inject(ExtensionStorageService);
  private document = inject(DOCUMENT);
  readonly photoDetails = signal<IApodPhoto | null>(null);

  constructor() {
    effect(() => {
      const isConfigured = this.configService.isConfigured();

      if (!isConfigured) {
        this.photoDetails.set(null);
        this.clearBackground();
        return;
      }

      void this.loadBackground();
    });
  }

  async loadBackground(): Promise<void> {
    const cached = await this.getCachedPhoto();
    if (cached && this.isPhotoFromToday(cached)) {
      this.photoDetails.set(cached);
      this.applyBackground(cached.url);
      return;
    }

    if (!this.configService.isConfigured()) {
      return;
    }

    this.apiService.getApodImage().subscribe({
      next: (photo) => {
        void this.cachePhoto(photo);
        this.photoDetails.set(photo);
        this.applyBackground(photo.url);
      },
      error: (err) => {
        if (cached) {
          this.photoDetails.set(cached);
          this.applyBackground(cached.url);
          return;
        }

        console.error("Failed to load APOD background:", err);
      },
    });
  }

  async getCachedPhoto(): Promise<IApodPhoto | null> {
    const cached = await this.storage.getJson<IApodPhoto>(STORAGE_KEY);
    if (!cached) return null;

    if (
      !cached.url ||
      !cached.pageUrl ||
      !cached.explanation ||
      !cached.fetchedAt
    ) {
      return null;
    }

    return cached;
  }

  private isPhotoFromToday(photo: IApodPhoto): boolean {
    try {
      const fetchedAt = new Date(photo.fetchedAt);
      const today = new Date();
      return (
        fetchedAt.getFullYear() === today.getFullYear() &&
        fetchedAt.getMonth() === today.getMonth() &&
        fetchedAt.getDate() === today.getDate()
      );
    } catch {
      return false;
    }
  }

  private async cachePhoto(photo: IApodPhoto): Promise<void> {
    await this.storage.setJson(STORAGE_KEY, photo);
  }

  private applyBackground(url: string): void {
    if (!url.startsWith("https://")) return;
    this.document.body.style.backgroundImage = `url('${url}')`;
    this.document.body.style.backgroundSize = "cover";
    this.document.body.style.backgroundPosition = "center";
    this.document.body.style.backgroundRepeat = "no-repeat";
    this.document.body.style.backgroundAttachment = "fixed";
  }

  private clearBackground(): void {
    this.document.body.style.backgroundImage = "";
    this.document.body.style.backgroundSize = "";
    this.document.body.style.backgroundPosition = "";
    this.document.body.style.backgroundRepeat = "";
    this.document.body.style.backgroundAttachment = "";
  }
}
