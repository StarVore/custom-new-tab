import { Injectable, inject } from "@angular/core";
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
} from "@angular/common/http";
import { Observable, of, forkJoin } from "rxjs";
import { map, catchError, switchMap } from "rxjs/operators";
import { API_ENDPOINTS } from "./api-service.config";
import { IAPIResponse } from "../models/IAPIResponse";
import { IApodPhoto } from "../models/IApodPhoto";
import { IBookmark } from "../models/IBookmark";
import { ConfigService } from "./config.service";

interface PocketBaseListResponse<T> {
  items: T[];
}

interface PocketBaseBookmarkRecord {
  id: string;
  title: string;
  url: string;
  customImageUrl?: string;
  order: number;
}

@Injectable({
  providedIn: "root",
})
export class ApiService {
  private http = inject(HttpClient);
  private config = inject(ConfigService);

  private get bookmarkBase(): string {
    return (this.config.get()?.bookmarkBaseUrl ?? "").replace(/\/+$/, "");
  }

  private get apodBase(): string {
    return (this.config.get()?.apodBaseUrl ?? "").replace(/\/+$/, "");
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({ "Content-Type": "application/json" });
  }

  private get pocketBaseRecordsUrl(): string {
    return `${this.bookmarkBase}/api/collections/bookmarks/records`;
  }

  private mapPocketBaseBookmark(record: PocketBaseBookmarkRecord): IBookmark {
    return {
      id: record.id,
      title: record.title,
      url: record.url,
      customImageUrl: record.customImageUrl,
      order: record.order,
    };
  }

  testBookmarkConnection(baseUrl: string): Observable<boolean> {
    const url = baseUrl.replace(/\/+$/, "");
    return this.http
      .get(`${url}/api/collections/bookmarks/records?perPage=1`, {
        observe: "response",
      })
      .pipe(
        map((r) => r.status >= 200 && r.status < 300),
        catchError(() => of(false)),
      );
  }

  testApodConnection(baseUrl: string): Observable<boolean> {
    const url = baseUrl.replace(/\/+$/, "");
    return this.http.get(`${url}/health`, { observe: "response" }).pipe(
      map((r) => r.status >= 200 && r.status < 300),
      catchError(() => of(false)),
    );
  }

  test(body: unknown): Observable<IAPIResponse> {
    return this.http.post<IAPIResponse>(
      `${this.bookmarkBase}/api/${API_ENDPOINTS.TEST}`,
      body,
      { headers: this.getHeaders() },
    );
  }

  getApodImage(): Observable<IApodPhoto> {
    return this.http.get<IApodPhoto>(
      `${this.apodBase}/api/${API_ENDPOINTS.APOD}`,
    );
  }

  getBookmarks(): Observable<IBookmark[]> {
    return this.http
      .get<
        PocketBaseListResponse<PocketBaseBookmarkRecord>
      >(`${this.pocketBaseRecordsUrl}?sort=order&perPage=200`)
      .pipe(
        map((response) =>
          response.items.map((record) => this.mapPocketBaseBookmark(record)),
        ),
      );
  }

  createBookmark(bookmark: Omit<IBookmark, "id">): Observable<IBookmark> {
    return this.http
      .post<PocketBaseBookmarkRecord>(this.pocketBaseRecordsUrl, bookmark, {
        headers: this.getHeaders(),
      })
      .pipe(map((record) => this.mapPocketBaseBookmark(record)));
  }

  updateBookmark(
    id: string,
    changes: Partial<Omit<IBookmark, "id">>,
  ): Observable<IBookmark> {
    return this.http
      .patch<PocketBaseBookmarkRecord>(
        `${this.pocketBaseRecordsUrl}/${id}`,
        changes,
        {
          headers: this.getHeaders(),
        },
      )
      .pipe(map((record) => this.mapPocketBaseBookmark(record)));
  }

  deleteBookmark(id: string): Observable<void> {
    return this.http.delete<void>(`${this.pocketBaseRecordsUrl}/${id}`);
  }

  reorderBookmarks(ids: string[]): Observable<IBookmark[]> {
    return forkJoin(
      ids.map((id, index) =>
        this.http.patch(
          `${this.pocketBaseRecordsUrl}/${id}`,
          { order: index },
          { headers: this.getHeaders() },
        ),
      ),
    ).pipe(switchMap(() => this.getBookmarks()));
  }
}
