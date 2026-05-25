import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService } from '../../services/auth';
import { User } from '../../models/user.model';

const ADMIN_EMAIL = 'admin@respawnhq.com';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, MatButtonModule, MatToolbarModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  userData: User | null = null;

  async ngOnInit(): Promise<void> {
    try {
      this.userData = await this.authService.getCurrentUserData();
    } catch {
      this.useAuthFallback();
    }

    if (!this.userData) {
      this.useAuthFallback();
    }

    this.cdr.detectChanges();
  }

  get isAdmin(): boolean {
    return this.userData?.rol === 'admin';
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }

  private useAuthFallback(): void {
    const authUser = this.authService.getCurrentAuthUser();
    if (!authUser?.email) return;

    this.userData = {
      id: authUser.uid,
      nombre: authUser.displayName || authUser.email,
      correo: authUser.email,
      rol: authUser.email === ADMIN_EMAIL ? 'admin' : 'user',
      fechaRegistro: new Date(),
    };
  }
}
