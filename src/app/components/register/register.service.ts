import { Injectable } from '@angular/core';
import { RoutesService } from '../../services/routes-services/routes.service';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class RegisterService {
    constructor(private routesService: RoutesService) { }

    private controllerName = "Auth";

    getByPhone(phoneNumber: string): Observable<any> {
        const url = `/${this.controllerName}/GetByPhone?phoneNumber=${phoneNumber}`;
        return this.routesService.observable_get<any>(url, {});
    }
    
    submitForm(formData: any): Observable<any> {
        const url = `/${this.controllerName}/${"Register"}`;
        return this.routesService.observable_post<any>(url, formData, {});
    }
}