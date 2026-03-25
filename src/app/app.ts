import { Component, OnInit, signal } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { BaseScreen } from "./base-screen/base-screen";
import { Footer } from "./core-parts/footer/footer.component";
import { BgService } from "./services/bg-service";

@Component({
  selector: "app-root",
  imports: [RouterOutlet, BaseScreen, Footer],
  templateUrl: "./app.html",
  styleUrl: "./app.css",
})
export class App implements OnInit {
  protected readonly title = signal("CustomNewTab");

  constructor(private bgService: BgService) {}

  ngOnInit(): void {
    this.bgService.loadBackground();
  }
}
