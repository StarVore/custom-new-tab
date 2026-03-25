import { Component, inject, signal } from "@angular/core";
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { ApiService } from "../services/api-service";
import { ConfigService } from "../services/config.service";

type TestState = "idle" | "testing" | "ok" | "fail";

const URL_PATTERN = /^https?:\/\/.+/;

@Component({
  selector: "app-settings",
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: "./settings.html",
  styleUrl: "./settings.scss",
})
export class SettingsComponent {
  private api = inject(ApiService);
  private config = inject(ConfigService);
  private router = inject(Router);

  readonly form = new FormGroup({
    bookmarkBaseUrl: new FormControl("", [
      Validators.required,
      Validators.pattern(URL_PATTERN),
    ]),
    apodBaseUrl: new FormControl("", [
      Validators.required,
      Validators.pattern(URL_PATTERN),
    ]),
  });

  readonly bookmarkTestState = signal<TestState>("idle");
  readonly apodTestState = signal<TestState>("idle");

  constructor() {
    const existing = this.config.get();
    if (existing) {
      this.form.patchValue(existing);
    }
  }

  testBookmark(): void {
    const url = this.form.get("bookmarkBaseUrl")?.value ?? "";
    if (!url) return;
    this.bookmarkTestState.set("testing");
    this.api.testBookmarkConnection(url).subscribe((ok) => {
      this.bookmarkTestState.set(ok ? "ok" : "fail");
    });
  }

  testApod(): void {
    const url = this.form.get("apodBaseUrl")?.value ?? "";
    if (!url) return;
    this.apodTestState.set("testing");
    this.api.testApodConnection(url).subscribe((ok) => {
      this.apodTestState.set(ok ? "ok" : "fail");
    });
  }

  save(): void {
    if (this.form.invalid) return;
    const { bookmarkBaseUrl, apodBaseUrl } = this.form.value;
    this.config.save({
      bookmarkBaseUrl: bookmarkBaseUrl!,
      apodBaseUrl: apodBaseUrl!,
    });
    this.router.navigate(["/"]);
  }

  resetConfig(): void {
    this.config.clear();
    this.router.navigate(["/setup"]);
  }
}
