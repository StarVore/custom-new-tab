import { Injectable, signal, inject } from "@angular/core";
import { Observable } from "rxjs";
import { IBookmark } from "../models/IBookmark";
import { ApiService } from "./api-service";
import { ExtensionStorageService } from "./extension-storage.service";

interface PendingMutation {
  type: "create" | "update" | "delete" | "reorder";
  payload: unknown;
  timestamp: number;
}

const CACHE_KEY = "bookmark_cache";
const PENDING_KEY = "bookmark_pending_mutations";

@Injectable({
  providedIn: "root",
})
export class BookmarkService {
  private api = inject(ApiService);
  private storage = inject(ExtensionStorageService);

  readonly bookmarks = signal<IBookmark[]>([]);

  constructor() {
    void this.loadFromCache();
    this.loadFromApi();
    window.addEventListener("online", () => void this.drainPendingQueue());
  }

  private async loadFromCache(): Promise<void> {
    const cached = await this.storage.getJson<IBookmark[]>(CACHE_KEY);
    if (cached) {
      this.bookmarks.set(cached);
    }
  }

  private writeCache(bookmarks: IBookmark[]): void {
    void this.storage.setJson(CACHE_KEY, bookmarks);
  }

  private loadFromApi(): void {
    this.api.getBookmarks().subscribe({
      next: (bookmarks) => {
        const sorted = [...bookmarks].sort((a, b) => a.order - b.order);
        this.bookmarks.set(sorted);
        this.writeCache(sorted);
      },
      error: () => {
        // offline – served from cache already
      },
    });
  }

  private async enqueueMutation(mutation: PendingMutation): Promise<void> {
    const existing =
      (await this.storage.getJson<PendingMutation[]>(PENDING_KEY)) ?? [];
    existing.push(mutation);
    await this.storage.setJson(PENDING_KEY, existing);
  }

  private async drainPendingQueue(): Promise<void> {
    const pending =
      (await this.storage.getJson<PendingMutation[]>(PENDING_KEY)) ?? [];
    if (!pending.length) return;

    await this.storage.remove(PENDING_KEY);

    for (const mutation of pending) {
      await this.replayMutation(mutation);
    }

    this.loadFromApi();
  }

  private replayMutation(mutation: PendingMutation): Promise<void> {
    return new Promise((resolve) => {
      let obs$: Observable<unknown>;
      if (mutation.type === "create") {
        obs$ = this.api.createBookmark(
          mutation.payload as Omit<IBookmark, "id">,
        );
      } else if (mutation.type === "update") {
        const { id, changes } = mutation.payload as {
          id: string;
          changes: Partial<IBookmark>;
        };
        obs$ = this.api.updateBookmark(id, changes);
      } else if (mutation.type === "delete") {
        obs$ = this.api.deleteBookmark(mutation.payload as string);
      } else {
        obs$ = this.api.reorderBookmarks(mutation.payload as string[]);
      }
      obs$.subscribe({ next: () => resolve(), error: () => resolve() });
    });
  }

  // --- Public mutation methods ---

  create(data: { title: string; url: string; customImageUrl?: string }): void {
    const nextOrder =
      this.bookmarks().reduce((max, b) => Math.max(max, b.order), -1) + 1;
    const optimistic: IBookmark = {
      id: `tmp_${Date.now()}`,
      ...data,
      order: nextOrder,
    };
    this.bookmarks.update((prev) => [...prev, optimistic]);

    this.api.createBookmark({ ...data, order: nextOrder }).subscribe({
      next: (created) => {
        this.bookmarks.update((prev) =>
          prev.map((b) => (b.id === optimistic.id ? created : b)),
        );
        this.writeCache(this.bookmarks());
      },
      error: () => {
        void this.enqueueMutation({
          type: "create",
          payload: { ...data, order: nextOrder },
          timestamp: Date.now(),
        });
        this.writeCache(this.bookmarks());
      },
    });
  }

  update(
    id: string,
    changes: Partial<{ title: string; url: string; customImageUrl: string }>,
  ): void {
    this.bookmarks.update((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...changes } : b)),
    );
    this.writeCache(this.bookmarks());

    this.api.updateBookmark(id, changes).subscribe({
      next: (updated) => {
        this.bookmarks.update((prev) =>
          prev.map((b) => (b.id === id ? updated : b)),
        );
        this.writeCache(this.bookmarks());
      },
      error: () => {
        void this.enqueueMutation({
          type: "update",
          payload: { id, changes },
          timestamp: Date.now(),
        });
      },
    });
  }

  delete(id: string): void {
    this.bookmarks.update((prev) => prev.filter((b) => b.id !== id));
    this.writeCache(this.bookmarks());

    this.api.deleteBookmark(id).subscribe({
      error: () => {
        void this.enqueueMutation({
          type: "delete",
          payload: id,
          timestamp: Date.now(),
        });
      },
    });
  }

  reorder(orderedIds: string[]): void {
    const byId = new Map(this.bookmarks().map((b) => [b.id, b]));
    const reordered = orderedIds
      .map((id, index) => {
        const b = byId.get(id);
        return b ? { ...b, order: index } : null;
      })
      .filter((b): b is IBookmark => b !== null);
    this.bookmarks.set(reordered);
    this.writeCache(reordered);

    this.api.reorderBookmarks(orderedIds).subscribe({
      error: () => {
        void this.enqueueMutation({
          type: "reorder",
          payload: orderedIds,
          timestamp: Date.now(),
        });
      },
    });
  }
}
