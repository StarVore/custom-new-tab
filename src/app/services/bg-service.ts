//

import { DOCUMENT } from "@angular/common";
import { inject, Injectable } from "@angular/core";
import { IApodPhoto } from "../models/IApodPhoto";
import { ApiService } from "./api-service";

const STORAGE_KEY = "apod_background";

@Injectable({
  providedIn: "root",
})
export class BgService {
  private apiService = inject(ApiService);
  private document = inject(DOCUMENT);

  loadBackground(): void {
    const cached = this.getCachedPhoto();
    if (cached) {
      this.applyBackground(cached.url);
      return;
    }

    this.apiService.getApodImage().subscribe({
      next: (photo) => {
        this.cachePhoto(photo);
        this.applyBackground(photo.url);
      },
      error: (err) => console.error("Failed to load APOD background:", err),
    });
  }

  getCachedPhoto(): IApodPhoto | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      const cached: IApodPhoto = JSON.parse(raw);
      const fetchedAt = new Date(cached.fetchedAt);
      const today = new Date();
      const isSameDay =
        fetchedAt.getFullYear() === today.getFullYear() &&
        fetchedAt.getMonth() === today.getMonth() &&
        fetchedAt.getDate() === today.getDate();
      return isSameDay ? cached : null;
    } catch {
      return null;
    }
  }

  private cachePhoto(photo: IApodPhoto): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(photo));
  }

  private applyBackground(url: string): void {
    if (!url.startsWith("https://")) return;
    this.document.body.style.backgroundImage = `url('${url}')`;
    this.document.body.style.backgroundSize = "cover";
    this.document.body.style.backgroundPosition = "center";
    this.document.body.style.backgroundRepeat = "no-repeat";
    this.document.body.style.backgroundAttachment = "fixed";
  }
}
