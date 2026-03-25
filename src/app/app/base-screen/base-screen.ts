import { ChangeDetectorRef, Component, OnInit } from "@angular/core";
import { ApiService } from "../../services/api-service";

@Component({
  selector: "app-base-screen",
  standalone: true,
  imports: [],
  templateUrl: "./base-screen.html",
  styleUrl: "./base-screen.css",
})
export class BaseScreen implements OnInit {
  testSuccess: boolean | null = null;

  constructor(
    private apiService: ApiService,
    private changeDetectorRef: ChangeDetectorRef,
  ) { }

  ngOnInit() {
    this.apiService.test({}).subscribe({
      next: (response) => {
        console.log('API Response:', response);
        this.testSuccess=true;
        this.changeDetectorRef.detectChanges();
      },
      error: (error) => {
        console.error('API Error:', error);
        this.testSuccess = false;
        this.changeDetectorRef.detectChanges();
      }
    });
  }
}
