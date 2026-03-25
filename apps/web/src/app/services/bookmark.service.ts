import { Injectable, signal, inject } from "@angular/core";
import { Observable } from "rxjs";
import { IBookmark } from "../models/IBookmark";
import { ApiService } from "./api-service";

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

  readonly bookmarks = signal<IBookmark[]>([]);

  constructor() {
    this.loadFromCache();
    this.loadFromApi();
    window.addEventListener("online", () => this.drainPendingQueue());
  }

  private loadFromCache(): void {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        this.bookmarks.set(JSON.parse(cached));
      }
    } catch {
      // ignore corrupt cache
    }
  }

  private writeCache(bookmarks: IBookmark[]): void {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(bookmarks));
    } catch {
      // ignore storage errors
    }
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

  private enqueueMutation(mutation: PendingMutation): void {
    try {
      const existing: PendingMutation[] = JSON.parse(
        localStorage.getItem(PENDING_KEY) ?? "[]",
      );
      existing.push(mutation);
      localStorage.setItem(PENDING_KEY, JSON.stringify(existing));
    } catch {
      // ignore storage errors
    }
  }

  private drainPendingQueue(): void {
    let pending: PendingMutation[];
    try {
      pending = JSON.parse(localStorage.getItem(PENDING_KEY) ?? "[]");
    } catch {
      return;
    }
    if (!pending.length) return;
    localStorage.removeItem(PENDING_KEY);

    const runNext = (queue: PendingMutation[]): void => {
      if (!queue.length) {
        this.loadFromApi();
        return;
      }
      const [head, ...tail] = queue;
      this.replayMutation(head).then(() => runNext(tail));
    };
    runNext(pending);
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
        this.enqueueMutation({
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
        this.enqueueMutation({
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
        this.enqueueMutation({
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
        this.enqueueMutation({
          type: "reorder",
          payload: orderedIds,
          timestamp: Date.now(),
        });
      },
    });
  }
}
