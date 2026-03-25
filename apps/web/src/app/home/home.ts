import { Component } from "@angular/core";
import { Footer } from "../core-parts/footer/footer.component";
import { BookmarksGridComponent } from "../core-parts/bookmarks-grid/bookmarks-grid";
import { RouterLink } from "@angular/router";

@Component({
  selector: "app-home",
  standalone: true,
  imports: [Footer, BookmarksGridComponent, RouterLink],
  templateUrl: "./home.html",
  styleUrl: "./home.scss",
})
export class HomeComponent {}
