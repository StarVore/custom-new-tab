import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { IBookmark } from "../models/IBookmark";
import { IBookmarkVisit, IBookmarkVisitPayload } from "../models/IBookmarkVisit";
import { ApiService } from "./api-service";
import { ExtensionStorageService } from "./extension-storage.service";

const PENDING_VISITS_KEY = "bookmark_pending_visits";

@Injectable({
  providedIn: "root",
})
export class BookmarkVisitService {
  private api = inject(ApiService);
  private storage = inject(ExtensionStorageService);

  constructor() {
    window.addEventListener("online", () => void this.drainPendingQueue());
  }

  getVisits(): Observable<IBookmarkVisit[]> {
    return this.api.getBookmarkVisits();
  }

  recordVisit(bookmark: IBookmark, context = "bookmark-card"): void {
    const payload = this.buildPayload(bookmark, context);

    this.api.createBookmarkVisit(payload).subscribe({
      error: () => {
        void this.enqueueVisit(payload);
      },
    });
  }

  private buildPayload(
    bookmark: IBookmark,
    context: string,
  ): IBookmarkVisitPayload {
    return {
      bookmarkId: bookmark.id,
      bookmarkTitle: bookmark.title,
      bookmarkUrl: bookmark.url,
      source: this.getSource(),
      context,
      platform: navigator.platform || "",
      userAgent: navigator.userAgent || "",
    };
  }

  private getSource(): string {
    const globalObject = globalThis as unknown as {
      browser?: { runtime?: unknown };
      chrome?: { runtime?: unknown };
    };

    if (globalObject.browser?.runtime) {
      return "firefox-extension";
    }

    if (globalObject.chrome?.runtime) {
      return "chrome-extension";
    }

    return "web";
  }

  private async enqueueVisit(payload: IBookmarkVisitPayload): Promise<void> {
    const existing =
      (await this.storage.getJson<IBookmarkVisitPayload[]>(PENDING_VISITS_KEY)) ??
      [];
    existing.push(payload);
    await this.storage.setJson(PENDING_VISITS_KEY, existing);
  }

  private async drainPendingQueue(): Promise<void> {
    const pending =
      (await this.storage.getJson<IBookmarkVisitPayload[]>(PENDING_VISITS_KEY)) ??
      [];
    if (!pending.length) {
      return;
    }

    await this.storage.remove(PENDING_VISITS_KEY);

    for (const payload of pending) {
      await this.replayVisit(payload);
    }
  }

  private replayVisit(payload: IBookmarkVisitPayload): Promise<void> {
    return new Promise((resolve) => {
      this.api.createBookmarkVisit(payload).subscribe({
        next: () => resolve(),
        error: () => {
          void this.enqueueVisit(payload).finally(() => resolve());
        },
      });
    });
  }
}