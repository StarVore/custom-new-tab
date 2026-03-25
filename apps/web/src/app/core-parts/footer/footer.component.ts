import { Component, inject, signal } from "@angular/core";
import { BgService } from "../../services/bg-service";

@Component({
  selector: "app-footer",
  templateUrl: "./footer.component.html",
  styleUrl: "./footer.component.css",
  standalone: true,
})
export class Footer {
  protected readonly mobileSheetOpen = signal(false);
  protected readonly photoDetails = inject(BgService).photoDetails;

  toggleMobileSheet(): void {
    this.mobileSheetOpen.update((value) => !value);
  }

  closeMobileSheet(): void {
    this.mobileSheetOpen.set(false);
  }
}
