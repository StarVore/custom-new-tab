import { Component } from "@angular/core";
import { Footer } from "../core-parts/footer/footer.component";
import { BookmarksGridComponent } from "../core-parts/bookmarks-grid/bookmarks-grid";
import { BookmarkStatsComponent } from "../core-parts/bookmark-stats/bookmark-stats";
import { RouterLink } from "@angular/router";

type HomeViewMode = "bookmarks" | "stats" | "hidden";

@Component({
  selector: "app-home",
  standalone: true,
  imports: [Footer, BookmarksGridComponent, BookmarkStatsComponent, RouterLink],
  templateUrl: "./home.html",
  styleUrl: "./home.scss",
})
export class HomeComponent {
  viewMode: HomeViewMode = "bookmarks";

  get hideShowLbl(): string {
    return this.viewMode === "hidden" ? "Show" : "Hide";
  }

  get statsLbl(): string {
    return this.viewMode === "stats" ? "Bookmarks" : "Stats";
  }

  get showBookmarks(): boolean {
    return this.viewMode === "bookmarks";
  }

  get showStats(): boolean {
    return this.viewMode === "stats";
  }

  toggleHide(): void {
    this.viewMode = this.viewMode === "hidden" ? "bookmarks" : "hidden";
  }

  toggleStats(): void {
    this.viewMode = this.viewMode === "stats" ? "bookmarks" : "stats";
  }
}
