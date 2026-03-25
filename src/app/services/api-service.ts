import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from './api-service.config';
import { IAPIResponse } from '../models/IAPIResponse';

@Injectable({
    providedIn: 'root'
})
export class ApiService {
    private apiUrl = 'http://localhost:3000/api/';

    constructor(private http: HttpClient) {}

    private getHeaders(): HttpHeaders {
        return new HttpHeaders({
            'Content-Type': 'application/json'
        });
    }

    test(body: unknown): Observable<IAPIResponse> {
        return this.http.post<IAPIResponse>(`${this.apiUrl}${API_ENDPOINTS.TEST}`, body, {
            headers: this.getHeaders()
        });
    }
}