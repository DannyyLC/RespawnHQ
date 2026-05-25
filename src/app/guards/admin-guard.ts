import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { first } from 'rxjs/operators';
import { AuthService } from '../services/auth';

export const adminGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = await firstValueFrom(authService.currentUser$.pipe(first()));
  if (!user) return router.createUrlTree(['/login']);

  const isAdmin = await authService.isAdmin();
  if (isAdmin) return true;
  return router.createUrlTree(['/home']);
};
