import { Component, input, output } from "@angular/core";
import { IBookmark } from "../../models/IBookmark";
import { CdkDrag } from "@angular/cdk/drag-drop";

@Component({
  selector: "app-bookmark-card",
  imports: [CdkDrag],
  templateUrl: "./bookmark-card.html",
  styleUrl: "./bookmark-card.css",
})
export class BookmarkCardComponent {
  bookmark = input.required<IBookmark>();
  edit = output<IBookmark>();
  delete = output<IBookmark>();

  getFaviconUrl(): string {
    const bm = this.bookmark();
    if (bm.customImageUrl) return bm.customImageUrl;
    try {
      const { hostname } = new URL(bm.url);
      return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
    } catch {
      return `https://www.google.com/s2/favicons?domain=${bm.url}&sz=64`;
    }
  }

  onEdit(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.edit.emit(this.bookmark());
  }

  onDelete(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.delete.emit(this.bookmark());
  }
}
