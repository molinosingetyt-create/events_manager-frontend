import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { EMPTY, Observable, expand, reduce } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number | null;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly base = environment.apiUrl;

  /** Máximo permitido por el backend en `page_size` (listados paginados). */
  readonly maxPageSize = 200;

  constructor(private readonly http: HttpClient) {}

  /**
   * Obtiene todos los ítems de un listado paginado, haciendo las peticiones necesarias
   * con `page_size` acotado al máximo del API.
   */
  getAllPages<T>(
    path: string,
    baseParams: Record<string, string | number | boolean | undefined> = {},
  ): Observable<T[]> {
    const pageSize = this.maxPageSize;
    return this.get<Paginated<T>>(path, { ...baseParams, page: 1, page_size: pageSize }).pipe(
      expand((res) => {
        const totalPages = res.pages ?? Math.max(1, Math.ceil(res.total / pageSize));
        if (res.page >= totalPages || res.items.length === 0) {
          return EMPTY;
        }
        return this.get<Paginated<T>>(path, { ...baseParams, page: res.page + 1, page_size: pageSize });
      }),
      reduce((acc: T[], res: Paginated<T>) => [...acc, ...res.items], [] as T[]),
    );
  }

  get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Observable<T> {
    let hp = new HttpParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') {
          hp = hp.set(k, String(v));
        }
      }
    }
    return this.http.get<T>(`${this.base}${path}`, { params: hp });
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.base}${path}`, body);
  }

  /** Multipart (p. ej. `FormData` con `file`). */
  postFormData<T>(path: string, formData: FormData): Observable<T> {
    return this.http.post<T>(`${this.base}${path}`, formData);
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    return this.http.patch<T>(`${this.base}${path}`, body);
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.base}${path}`);
  }
}
