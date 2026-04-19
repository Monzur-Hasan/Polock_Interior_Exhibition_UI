import { Routes } from '@angular/router';
import { Register } from './components/register/register';
import { NotFoundComponent } from './components/not-found/not-found.component';

export const routes: Routes = [
    {
        path: '',
        component: Register,
        pathMatch: 'full'
    },
    { path: '', redirectTo: '', pathMatch: 'full' },


    {
        path: '**',
        component: NotFoundComponent
    }
];
