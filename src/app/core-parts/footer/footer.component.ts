import { Component, OnInit } from "@angular/core";
import { IApodPhoto } from "../../models/IApodPhoto";

@Component({
  selector: "app-footer",
  templateUrl: "./footer.component.html",
  styleUrl: "./footer.component.css",
  standalone: true,
})
export class Footer implements OnInit {
  photoDetails: IApodPhoto | null = null;

  ngOnInit(): void {
    this.photoDetails = JSON.parse(
      localStorage.getItem("apod_background") || "null",
    );
    console.log("Loaded photo details for footer:", this.photoDetails);
  }
}
