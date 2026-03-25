import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable, of } from "rxjs";
import { map, catchError } from "rxjs/operators";
import { API_ENDPOINTS } from "./api-service.config";
import { IAPIResponse } from "../models/IAPIResponse";
import { IApodPhoto } from "../models/IApodPhoto";
import { IBookmark } from "../models/IBookmark";
import { ConfigService } from "./config.service";

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

  testBookmarkConnection(baseUrl: string): Observable<boolean> {
    const url = baseUrl.replace(/\/+$/, "");
    return this.http.get(`${url}/api/bookmarks`, { observe: "response" }).pipe(
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
    return this.http.get<IBookmark[]>(
      `${this.bookmarkBase}/api/${API_ENDPOINTS.BOOKMARKS_GET}`,
    );
  }

  createBookmark(bookmark: Omit<IBookmark, "id">): Observable<IBookmark> {
    return this.http.post<IBookmark>(
      `${this.bookmarkBase}/api/${API_ENDPOINTS.BOOKMARKS_CREATE}`,
      bookmark,
      { headers: this.getHeaders() },
    );
  }

  updateBookmark(
    id: string,
    changes: Partial<Omit<IBookmark, "id">>,
  ): Observable<IBookmark> {
    return this.http.put<IBookmark>(
      `${this.bookmarkBase}/api/${API_ENDPOINTS.BOOKMARKS_UPDATE(id)}`,
      changes,
      { headers: this.getHeaders() },
    );
  }

  deleteBookmark(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.bookmarkBase}/api/${API_ENDPOINTS.BOOKMARKS_DELETE(id)}`,
    );
  }

  reorderBookmarks(ids: string[]): Observable<IBookmark[]> {
    return this.http.put<IBookmark[]>(
      `${this.bookmarkBase}/api/${API_ENDPOINTS.BOOKMARKS_REORDER}`,
      { ids },
      { headers: this.getHeaders() },
    );
  }
}
