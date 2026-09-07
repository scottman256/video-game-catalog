import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { Auth } from '../services/auth';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  const withCredentials = req.clone({ withCredentials: true });

  return next(withCredentials).pipe(
    catchError((error: HttpErrorResponse) => {
      const isAuthEndpoint = req.url.includes('/auth/');
      if (error.status !== 401 || isAuthEndpoint) {
        return throwError(() => error);
      }
      return auth.refresh().pipe(switchMap(() => next(withCredentials)));
    }),
  );
};
