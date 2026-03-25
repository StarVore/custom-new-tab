import { Component, inject, signal } from "@angular/core";
import {
  CdkDropList,
  CdkDropListGroup,
  moveItemInArray,
} from "@angular/cdk/drag-drop";
import { BookmarkService } from "../../services/bookmark.service";
import { IBookmark } from "../../models/IBookmark";
import { BookmarkCardComponent } from "../bookmark-card/bookmark-card";
import { BookmarkEditModalComponent } from "../bookmark-edit-modal/bookmark-edit-modal";

@Component({
  selector: "app-bookmarks-grid",
  imports: [
    CdkDropList,
    CdkDropListGroup,
    BookmarkCardComponent,
    BookmarkEditModalComponent,
  ],
  templateUrl: "./bookmarks-grid.html",
  styleUrl: "./bookmarks-grid.css",
})
export class BookmarksGridComponent {
  private bookmarkService = inject(BookmarkService);

  readonly bookmarks = this.bookmarkService.bookmarks;
  readonly editingBookmark = signal<IBookmark | null | undefined>(undefined);
  // null = add mode, IBookmark = edit mode, undefined = modal closed

  onDrop(event: { previousIndex: number; currentIndex: number }): void {
    const reordered = [...this.bookmarks()];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    this.bookmarkService.reorder(reordered.map((b) => b.id));
  }

  openAdd(): void {
    this.editingBookmark.set(null);
  }

  openEdit(bookmark: IBookmark): void {
    this.editingBookmark.set(bookmark);
  }

  onDelete(bookmark: IBookmark): void {
    this.bookmarkService.delete(bookmark.id);
  }

  onModalSave(data: {
    title: string;
    url: string;
    customImageUrl: string;
  }): void {
    const editing = this.editingBookmark();
    if (editing === null) {
      // add mode
      this.bookmarkService.create({
        title: data.title,
        url: data.url,
        customImageUrl: data.customImageUrl || undefined,
      });
    } else if (editing) {
      // edit mode
      this.bookmarkService.update(editing.id, {
        title: data.title,
        url: data.url,
        customImageUrl: data.customImageUrl || undefined,
      });
    }
    this.editingBookmark.set(undefined);
  }

  onModalCancel(): void {
    this.editingBookmark.set(undefined);
  }

  isModalOpen(): boolean {
    return this.editingBookmark() !== undefined;
  }
}
