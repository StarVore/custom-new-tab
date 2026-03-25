import { ChangeDetectorRef, Component, OnInit } from "@angular/core";
import { ApiService } from "../services/api-service";
import { IAPIResponse } from "../models/IAPIResponse";

@Component({
  selector: "app-base-screen",
  standalone: true,
  imports: [],
  templateUrl: "./base-screen.html",
  styleUrl: "./base-screen.scss",
})
export class BaseScreen implements OnInit {
  testSuccess: boolean | null = null;

  constructor(
    private apiService: ApiService,
    private changeDetectorRef: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.apiService.test({}).subscribe({
      next: (response: IAPIResponse) => {
        console.log("API Response:", response);
        this.testSuccess = true;
        this.changeDetectorRef.detectChanges();
      },
      error: (error: any) => {
        console.error("API Error:", error);
        this.testSuccess = false;
        this.changeDetectorRef.detectChanges();
      },
    });
  }
}
