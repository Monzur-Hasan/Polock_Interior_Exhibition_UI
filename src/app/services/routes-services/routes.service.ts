import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { AppConstants } from '../../class/app-constants/app-constants';

@Injectable({
  providedIn: 'root'
})
export class RoutesService {

  apiURL: string = "http://188.68.38.113:8091/api";
  imageURL: string = "http://188.68.38.113:8091/images";

  apiRoot: string = AppConstants.app_environment == "Local" ? "http://localhost:5003/api" : this.apiURL;

 //apiRoot: string = AppConstants.app_environment == "Local" ? "http://192.168.0.15:5500/api" : this.apiURL;

  imageRoot: string = AppConstants.app_environment == "Local" ? "http://localhost:5003/images" : this.imageURL;

  constructor(private httpClient: HttpClient) { }

  observable_get_by_url<T>(url: string, httpOptions: {}): Observable<T> {
    return this.httpClient.get<T>(`${url}`, httpOptions);
  }

  observable_get<T>(url: string, httpOptions: {}): Observable<T> {
    return this.httpClient.get<T>(`${this.apiRoot}${url}`, httpOptions);
  }

  observable_post<T>(url: string, data: any, httpOptions: {}): Observable<T> {
    return this.httpClient.post<T>(`${this.apiRoot}${url}`, data, httpOptions);
  }

  observable_put<T>(url: string, data: any, httpOptions: {}): Observable<T> {
    return this.httpClient.put<T>(`${this.apiRoot}${url}`, data, httpOptions);
  }

  observable_delete<T>(url: string, httpOptions: {}): Observable<T> {
    return this.httpClient.delete<T>(`${this.apiRoot}${url}`, httpOptions);
  }

  observable_delete_data<T>(url: string, httpOptions: {}): Observable<T> {
    return this.httpClient.request<T>("delete", `${this.apiRoot}${url}`, httpOptions);
  }

  promise_get<T>(url: string, httpOptions: {}): Promise<T> {
    return firstValueFrom(this.httpClient.get<T>(`${this.apiRoot}${url}`, httpOptions));
  }

  promise_post<T>(url: string, data: any, httpOptions: {}): Promise<T> {
    return firstValueFrom(this.httpClient.post<T>(`${this.apiRoot}${url}`, data, httpOptions));
  }

  promise_put<T>(url: string, data: any, httpOptions: {}): Promise<T> {
    return firstValueFrom(this.httpClient.put<T>(`${this.apiRoot}${url}`, data, httpOptions));
  }

  promise_delete<T>(url: string, httpOptions: {}): Promise<T> {
    return firstValueFrom(this.httpClient.delete<T>(`${this.apiRoot}${url}`, httpOptions));
  }

}
