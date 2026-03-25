import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable } from "rxjs";
import { API_ENDPOINTS } from "./api-service.config";
import { IAPIResponse } from "../models/IAPIResponse";
import { IApodPhoto } from "../models/IApodPhoto";
import { IBookmark } from "../models/IBookmark";

@Injectable({
  providedIn: "root",
})
export class ApiService {
  private apiUrl = "http://localhost:3000/api/";

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      "Content-Type": "application/json",
    });
  }

  test(body: unknown): Observable<IAPIResponse> {
    return this.http.post<IAPIResponse>(
      `${this.apiUrl}${API_ENDPOINTS.TEST}`,
      body,
      {
        headers: this.getHeaders(),
      },
    );
  }

  getApodImage(): Observable<IApodPhoto> {
    return this.http.get<IApodPhoto>(`${this.apiUrl}${API_ENDPOINTS.APOD}`);
  }

  getBookmarks(): Observable<IBookmark[]> {
    return this.http.get<IBookmark[]>(
      `${this.apiUrl}${API_ENDPOINTS.BOOKMARKS_GET}`,
    );
  }

  createBookmark(bookmark: Omit<IBookmark, "id">): Observable<IBookmark> {
    return this.http.post<IBookmark>(
      `${this.apiUrl}${API_ENDPOINTS.BOOKMARKS_CREATE}`,
      bookmark,
      { headers: this.getHeaders() },
    );
  }

  updateBookmark(
    id: string,
    changes: Partial<Omit<IBookmark, "id">>,
  ): Observable<IBookmark> {
    return this.http.put<IBookmark>(
      `${this.apiUrl}${API_ENDPOINTS.BOOKMARKS_UPDATE(id)}`,
      changes,
      { headers: this.getHeaders() },
    );
  }

  deleteBookmark(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}${API_ENDPOINTS.BOOKMARKS_DELETE(id)}`,
    );
  }

  reorderBookmarks(ids: string[]): Observable<IBookmark[]> {
    return this.http.put<IBookmark[]>(
      `${this.apiUrl}${API_ENDPOINTS.BOOKMARKS_REORDER}`,
      { ids },
      { headers: this.getHeaders() },
    );
  }
}
