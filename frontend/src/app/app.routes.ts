import { Routes } from '@angular/router';

import { adminGuard } from './core/guards/admin-guard';
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
    path: 'wishlist',
    canActivate: [authGuard],
    loadComponent: () => import('./features/wishlist/wishlist').then((m) => m.Wishlist),
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
  {
    path: 'admin',
    canActivate: [adminGuard],
    children: [
      {
        path: 'games',
        loadComponent: () => import('./features/admin/admin-games/admin-games').then((m) => m.AdminGames),
      },
      {
        path: 'games/:id',
        loadComponent: () =>
          import('./features/admin/admin-game-editor/admin-game-editor').then((m) => m.AdminGameEditor),
      },
      {
        path: 'queue',
        loadComponent: () => import('./features/admin/approval-queue/approval-queue').then((m) => m.ApprovalQueue),
      },
      {
        path: 'users',
        loadComponent: () => import('./features/admin/assume-user/assume-user').then((m) => m.AssumeUser),
      },
      { path: '', pathMatch: 'full', redirectTo: 'games' },
    ],
  },
  { path: '', pathMatch: 'full', redirectTo: 'my-games' },
  { path: '**', redirectTo: 'my-games' },
];
