import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService } from '../../services/auth';

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
  imports: [
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatDialogModule,
    MatDividerModule,
    MatIconModule,
    MatListModule,
    MatSidenavModule,
    MatToolbarModule,
  ],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  private authService = inject(AuthService);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  userData = this.authService.userProfile;
  isAdmin = computed(() => this.userData()?.rol === 'admin');
  drawerOpen = signal(false);

  openDrawer(): void {
    this.drawerOpen.set(true);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
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
}
