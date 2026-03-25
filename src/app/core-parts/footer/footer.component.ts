import { Component, OnInit, signal } from "@angular/core";
import { IApodPhoto } from "../../models/IApodPhoto";

@Component({
  selector: "app-footer",
  templateUrl: "./footer.component.html",
  styleUrl: "./footer.component.css",
  standalone: true,
})
export class Footer implements OnInit {
  photoDetails: IApodPhoto | null = null;
  protected readonly mobileSheetOpen = signal(false);

  ngOnInit(): void {
    this.photoDetails = JSON.parse(
      localStorage.getItem("apod_background") || "null",
    );
  }

  toggleMobileSheet(): void {
    this.mobileSheetOpen.update((value) => !value);
  }

  closeMobileSheet(): void {
    this.mobileSheetOpen.set(false);
  }
}
