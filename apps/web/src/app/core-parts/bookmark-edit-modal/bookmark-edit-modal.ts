import {
  Component,
  input,
  output,
  OnInit,
  signal,
  effect,
} from "@angular/core";
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from "@angular/forms";
import { IBookmark } from "../../models/IBookmark";

@Component({
  selector: "app-bookmark-edit-modal",
  imports: [ReactiveFormsModule],
  templateUrl: "./bookmark-edit-modal.html",
  styleUrl: "./bookmark-edit-modal.scss",
})
export class BookmarkEditModalComponent implements OnInit {
  // null = add mode, IBookmark = edit mode
  bookmark = input<IBookmark | null | undefined>(null);

  save = output<{ title: string; url: string; customImageUrl: string }>();
  cancel = output<void>();

  form!: FormGroup;
  faviconPreview = signal<string>("");

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    const bm = this.bookmark();
    this.form = this.fb.group({
      title: [bm?.title ?? "", [Validators.required]],
      url: [bm?.url ?? "", [Validators.required]],
      customImageUrl: [bm?.customImageUrl ?? ""],
    });

    // Live favicon preview
    this.form.get("url")!.valueChanges.subscribe((val: string) => {
      if (!this.form.get("customImageUrl")!.value) {
        this.updateFaviconPreview(val);
      }
    });
    this.form.get("customImageUrl")!.valueChanges.subscribe((val: string) => {
      this.faviconPreview.set(
        val || this.getFaviconFromUrl(this.form.get("url")!.value),
      );
    });

    this.updateFaviconPreview(bm?.url ?? "");
    if (bm?.customImageUrl) {
      this.faviconPreview.set(bm.customImageUrl);
    }
  }

  get isEditMode(): boolean {
    return this.bookmark() !== null && this.bookmark() !== undefined;
  }

  private getFaviconFromUrl(url: string): string {
    try {
      const { hostname } = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
    } catch {
      return "";
    }
  }

  private updateFaviconPreview(url: string): void {
    this.faviconPreview.set(this.getFaviconFromUrl(url));
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.save.emit(this.form.value);
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains("modal-backdrop")) {
      this.cancel.emit();
    }
  }
}
