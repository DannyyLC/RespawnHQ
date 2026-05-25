import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { AuthService } from '../../services/auth';
import { User } from '../../models/user.model';
import { Navbar } from '../../components/navbar/navbar';

const DASHBOARD_TIMEOUT_MS = 8000;
const ADMIN_EMAIL = 'admin@respawnhq.com';

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error('dashboard-timeout')), DASHBOARD_TIMEOUT_MS);
    }),
  ]);
}

@Component({
  selector: 'app-dashboard',
  imports: [
    RouterLink,
    Navbar,
    MatButtonModule,
    MatCardModule,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  userData: User | null = null;
  loading = true;
  loadError = '';

  async ngOnInit(): Promise<void> {
    console.info('[RespawnHQ Dashboard] Iniciando carga del dashboard.');
    try {
      this.userData = await withTimeout(this.authService.getCurrentUserData());
      if (!this.userData) {
        this.useAuthFallback('No se encontró tu perfil en Firestore.');
      } else {
        console.info('[RespawnHQ Dashboard] Dashboard con perfil Firestore:', this.userData);
      }

      this.redirectByRole();
    } catch (error) {
      console.error('[RespawnHQ Dashboard] Fallo al cargar perfil:', error);
      const reason = error instanceof Error && error.message === 'dashboard-timeout'
        ? 'Firestore tardó demasiado en responder.'
        : 'No se pudo cargar tu perfil desde Firestore.';
      this.useAuthFallback(reason);
      this.redirectByRole();
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
      console.info('[RespawnHQ Dashboard] Carga terminada:', {
        loading: this.loading,
        hasUserData: !!this.userData,
        loadError: this.loadError,
      });
    }
  }

  private useAuthFallback(message: string): void {
    const authUser = this.authService.getCurrentAuthUser();
    console.warn('[RespawnHQ Dashboard] Usando respaldo de Firebase Auth:', {
      message,
      hasAuthUser: !!authUser,
      uid: authUser?.uid ?? null,
      email: authUser?.email ?? null,
    });

    if (!authUser?.email) {
      this.loadError = `${message} Vuelve a iniciar sesión.`;
      return;
    }

    this.userData = {
      id: authUser.uid,
      nombre: authUser.displayName || authUser.email,
      correo: authUser.email,
      rol: authUser.email === ADMIN_EMAIL ? 'admin' : 'user',
      fechaRegistro: new Date(),
    };
    this.loadError = `${message} Mostrando el panel con datos de la sesión.`;
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }

  private redirectByRole(): void {
    this.router.navigate([this.userData?.rol === 'admin' ? '/admin/tournaments' : '/home']);
  }
}
