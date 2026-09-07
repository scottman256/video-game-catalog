import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth-guard';
import { guestGuard } from './core/guards/guest-guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
  },
  {
    path: 'my-games',
    canActivate: [authGuard],
    loadComponent: () => import('./features/my-games/my-games').then((m) => m.MyGames),
  },
  {
    path: 'search',
    canActivate: [authGuard],
    loadComponent: () => import('./features/search-add-game/search-add-game').then((m) => m.SearchAddGame),
  },
  {
    path: 'library/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/game-detail/game-detail').then((m) => m.GameDetail),
  },
  { path: '', pathMatch: 'full', redirectTo: 'my-games' },
  { path: '**', redirectTo: 'my-games' },
];
