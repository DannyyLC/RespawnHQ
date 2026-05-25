import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService } from '../../services/auth';
import { User } from '../../models/user.model';

const ADMIN_EMAIL = 'admin@respawnhq.com';

@Component({
  selector: 'app-confirm-logout-dialog',
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Cerrar sesion</h2>
    <mat-dialog-content>
      ¿Quieres cerrar tu sesion actual?
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="dialogRef.close(false)">Cancelar</button>
      <button mat-flat-button type="button" (click)="dialogRef.close(true)">Cerrar sesion</button>
    </mat-dialog-actions>
  `,
})
export class ConfirmLogoutDialog {
  dialogRef = inject(MatDialogRef<ConfirmLogoutDialog>);
}

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, MatButtonModule, MatDialogModule, MatToolbarModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private dialog = inject(MatDialog);

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

  confirmLogout(): void {
    const ref = this.dialog.open(ConfirmLogoutDialog, {
      width: '360px',
    });

    ref.afterClosed().subscribe(async confirmed => {
      if (!confirmed) return;
      await this.logout();
    });
  }

  private async logout(): Promise<void> {
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
