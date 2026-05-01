import { Component, computed, effect, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { IBookmark } from "../../models/IBookmark";
import { IBookmarkVisit } from "../../models/IBookmarkVisit";
import { BookmarkService } from "../../services/bookmark.service";
import { BookmarkVisitService } from "../../services/bookmark-visit.service";

type RangePreset = "7d" | "30d" | "90d" | "all" | "custom";

interface BookmarkStatsRow {
  bookmarkId: string;
  title: string;
  count: number;
  widthPercent: number;
}

@Component({
  selector: "app-bookmark-stats",
  imports: [FormsModule],
  templateUrl: "./bookmark-stats.html",
  styleUrl: "./bookmark-stats.scss",
})
export class BookmarkStatsComponent {
  private bookmarkService = inject(BookmarkService);
  private bookmarkVisitService = inject(BookmarkVisitService);

  private selectionInitialized = false;

  readonly bookmarks = this.bookmarkService.bookmarks;
  readonly visits = signal<IBookmarkVisit[]>([]);
  readonly isLoading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly rangePreset = signal<RangePreset>("30d");
  readonly customStart = signal("");
  readonly customEnd = signal("");
  readonly selectedBookmarkIds = signal<string[]>([]);

  readonly totalVisitCount = computed(() =>
    this.filteredVisits().reduce((sum, visit) => sum + 1, 0),
  );

  readonly filteredVisits = computed(() => {
    const selectedIds = new Set(this.selectedBookmarkIds());
    const { start, end } = this.getDateBounds();

    return this.visits().filter((visit) => {
      if (selectedIds.size && !selectedIds.has(visit.bookmarkId)) {
        return false;
      }

      const visitedAt = new Date(visit.created);
      if (start && visitedAt < start) {
        return false;
      }

      if (end && visitedAt > end) {
        return false;
      }

      return true;
    });
  });

  readonly chartRows = computed<BookmarkStatsRow[]>(() => {
    const counts = new Map<string, number>();
    for (const bookmarkId of this.selectedBookmarkIds()) {
      counts.set(bookmarkId, 0);
    }

    for (const visit of this.filteredVisits()) {
      counts.set(visit.bookmarkId, (counts.get(visit.bookmarkId) ?? 0) + 1);
    }

    const bookmarkMap = new Map(this.bookmarks().map((bookmark) => [bookmark.id, bookmark]));
    const maxCount = Math.max(...counts.values(), 0);

    return [...counts.entries()]
      .map(([bookmarkId, count]) => {
        const bookmark = bookmarkMap.get(bookmarkId);
        return {
          bookmarkId,
          title: bookmark?.title ?? this.getVisitTitle(bookmarkId),
          count,
          widthPercent: maxCount > 0 ? (count / maxCount) * 100 : 0,
        };
      })
      .sort((left, right) => right.count - left.count || left.title.localeCompare(right.title));
  });

  constructor() {
    effect(
      () => {
        const bookmarkIds = this.bookmarks().map((bookmark) => bookmark.id);
        this.selectedBookmarkIds.update((current) => {
          if (!bookmarkIds.length) {
            return [];
          }

          if (!this.selectionInitialized) {
            this.selectionInitialized = true;
            return bookmarkIds;
          }

          const retained = current.filter((bookmarkId) => bookmarkIds.includes(bookmarkId));
          const additions = bookmarkIds.filter((bookmarkId) => !retained.includes(bookmarkId));
          return [...retained, ...additions];
        });
      },
      { allowSignalWrites: true },
    );

    this.loadVisits();
  }

  selectPreset(preset: RangePreset): void {
    this.rangePreset.set(preset);
  }

  onCustomStartChange(value: string): void {
    this.customStart.set(value);
    this.rangePreset.set("custom");
  }

  onCustomEndChange(value: string): void {
    this.customEnd.set(value);
    this.rangePreset.set("custom");
  }

  isPresetActive(preset: RangePreset): boolean {
    return this.rangePreset() === preset;
  }

  isBookmarkSelected(bookmarkId: string): boolean {
    return this.selectedBookmarkIds().includes(bookmarkId);
  }

  onBookmarkToggle(bookmarkId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement | null)?.checked ?? false;
    this.selectedBookmarkIds.update((current) => {
      if (checked) {
        return current.includes(bookmarkId) ? current : [...current, bookmarkId];
      }

      return current.filter((id) => id !== bookmarkId);
    });
  }

  selectAllBookmarks(): void {
    this.selectedBookmarkIds.set(this.bookmarks().map((bookmark) => bookmark.id));
  }

  clearBookmarkSelection(): void {
    this.selectedBookmarkIds.set([]);
  }

  refresh(): void {
    this.loadVisits();
  }

  trackBookmark(_: number, bookmark: IBookmark): string {
    return bookmark.id;
  }

  private loadVisits(): void {
    this.isLoading.set(true);
    this.loadError.set(null);

    this.bookmarkVisitService.getVisits().subscribe({
      next: (visits) => {
        this.visits.set(visits);
        this.isLoading.set(false);
      },
      error: () => {
        this.loadError.set("Stats are unavailable right now.");
        this.isLoading.set(false);
      },
    });
  }

  private getDateBounds(): { start: Date | null; end: Date | null } {
    const now = new Date();
    const preset = this.rangePreset();

    if (preset === "all") {
      return { start: null, end: null };
    }

    if (preset === "custom") {
      return {
        start: this.customStart() ? new Date(`${this.customStart()}T00:00:00`) : null,
        end: this.customEnd() ? new Date(`${this.customEnd()}T23:59:59.999`) : null,
      };
    }

    const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
    const start = new Date(now);
    start.setDate(start.getDate() - days + 1);
    start.setHours(0, 0, 0, 0);
    return { start, end: now };
  }

  private getVisitTitle(bookmarkId: string): string {
    const matchingVisit = this.visits().find((visit) => visit.bookmarkId === bookmarkId);
    return matchingVisit?.bookmarkTitle ?? bookmarkId;
  }
}