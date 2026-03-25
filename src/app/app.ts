import { Component, OnInit, signal, inject, isDevMode } from "@angular/core";
import { Footer } from "./core-parts/footer/footer.component";
import { BgService } from "./services/bg-service";
import { BookmarksGridComponent } from "./core-parts/bookmarks-grid/bookmarks-grid";
import { SwUpdate, VersionReadyEvent } from "@angular/service-worker";
import { filter } from "rxjs";

@Component({
  selector: "app-root",
  imports: [Footer, BookmarksGridComponent],
  templateUrl: "./app.html",
  styleUrl: "./app.css",
})
export class App implements OnInit {
  protected readonly title = signal("CustomNewTab");
  readonly updateAvailable = signal(false);

  private bgService = inject(BgService);
  private swUpdate = inject(SwUpdate, { optional: true });

  ngOnInit(): void {
    this.bgService.loadBackground();

    if (!isDevMode() && this.swUpdate?.isEnabled) {
      this.swUpdate.versionUpdates
        .pipe(filter((e): e is VersionReadyEvent => e.type === "VERSION_READY"))
        .subscribe(() => this.updateAvailable.set(true));
    }
  }

  reloadPage(): void {
    window.location.reload();
  }
}
