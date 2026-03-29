import { Component, inject, signal } from "@angular/core";
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { Router } from "@angular/router";
import { ApiService } from "../services/api-service";
import { ConfigService } from "../services/config.service";
import { HostPermissionService } from "../services/host-permission.service";

type TestState = "idle" | "testing" | "ok" | "fail";

const URL_PATTERN = /^https?:\/\/.+/;

@Component({
  selector: "app-setup",
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: "./setup.html",
  styleUrl: "./setup.scss",
})
export class SetupComponent {
  private api = inject(ApiService);
  private config = inject(ConfigService);
  private hostPermissions = inject(HostPermissionService);
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
  readonly permissionError = signal<string | null>(null);

  constructor() {
    if (this.config.isConfigured()) {
      this.router.navigate(["/"]);
    }
  }

  async testBookmark(): Promise<void> {
    const url = this.form.get("bookmarkBaseUrl")?.value ?? "";
    if (!url) return;
    this.permissionError.set(null);

    const granted = await this.hostPermissions.ensureOriginPermission(url);
    if (!granted) {
      this.bookmarkTestState.set("fail");
      this.permissionError.set(
        "Host permission was denied for the Bookmark Service URL.",
      );
      return;
    }

    this.bookmarkTestState.set("testing");
    this.api.testBookmarkConnection(url).subscribe((ok) => {
      this.bookmarkTestState.set(ok ? "ok" : "fail");
    });
  }

  async testApod(): Promise<void> {
    const url = this.form.get("apodBaseUrl")?.value ?? "";
    if (!url) return;
    this.permissionError.set(null);

    const granted = await this.hostPermissions.ensureOriginPermission(url);
    if (!granted) {
      this.apodTestState.set("fail");
      this.permissionError.set(
        "Host permission was denied for the APOD Service URL.",
      );
      return;
    }

    this.apodTestState.set("testing");
    this.api.testApodConnection(url).subscribe((ok) => {
      this.apodTestState.set(ok ? "ok" : "fail");
    });
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    const { bookmarkBaseUrl, apodBaseUrl } = this.form.value;

    this.permissionError.set(null);
    const perms = await this.hostPermissions.ensureOriginPermissions([
      bookmarkBaseUrl!,
      apodBaseUrl!,
    ]);

    if (!perms.granted) {
      this.permissionError.set(
        `Host permission denied for: ${perms.denied.join(", ")}`,
      );
      return;
    }

    this.config.save({
      bookmarkBaseUrl: bookmarkBaseUrl!,
      apodBaseUrl: apodBaseUrl!,
    });
    this.router.navigate(["/"]);
  }
}
