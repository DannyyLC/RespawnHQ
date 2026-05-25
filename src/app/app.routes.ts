import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';
import { adminGuard } from './guards/admin-guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },

  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.Login),
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register').then(m => m.Register),
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.Dashboard),
    canActivate: [authGuard],
  },

  // Rutas de admin — requieren login y rol admin
  {
    path: 'admin/tournaments',
    loadComponent: () =>
      import('./pages/admin/tournaments/tournaments').then(m => m.Tournaments),
    canActivate: [authGuard, adminGuard],
  },
  {
    path: 'admin/teams',
    loadComponent: () =>
      import('./pages/admin/teams/teams').then(m => m.Teams),
    canActivate: [authGuard, adminGuard],
  },
  {
    path: 'admin/players',
    loadComponent: () =>
      import('./pages/admin/players/players').then(m => m.Players),
    canActivate: [authGuard, adminGuard],
  },

  // Rutas de usuario normal — requieren solo login
  {
    path: 'home',
    loadComponent: () => import('./pages/user/home/home').then(m => m.Home),
    canActivate: [authGuard],
  },
  {
    path: 'standings',
    loadComponent: () =>
      import('./pages/user/standings/standings').then(m => m.Standings),
    canActivate: [authGuard],
  },
  {
    path: 'schedule',
    loadComponent: () =>
      import('./pages/user/schedule/schedule').then(m => m.Schedule),
    canActivate: [authGuard],
  },

  { path: '**', redirectTo: '/login' },
];
