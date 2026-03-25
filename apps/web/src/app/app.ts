import { Component, OnInit, signal, inject, isDevMode } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { BgService } from "./services/bg-service";
import { SwUpdate, VersionReadyEvent } from "@angular/service-worker";
import { filter } from "rxjs";

@Component({
  selector: "app-root",
  imports: [RouterOutlet],
  templateUrl: "./app.html",
  styleUrl: "./app.scss",
})
export class App implements OnInit {
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
