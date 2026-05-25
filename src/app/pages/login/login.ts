import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth';

const LOGIN_TIMEOUT_MS = 12000;

function withTimeout<T>(promise: Promise<T>, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), LOGIN_TIMEOUT_MS);
    }),
  ]);
}

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  loading = false;

  form = this.fb.group({
    correo: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  get correo() { return this.form.get('correo')!; }
  get password() { return this.form.get('password')!; }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading = true;
    try {
      await withTimeout(
        this.authService.login(
          this.form.value.correo as string,
          this.form.value.password as string
        ),
        'login-timeout'
      );
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      this.snackBar.open(this.getErrorMessage(error.code), 'Cerrar', { duration: 4000 });
    } finally {
      this.loading = false;
    }
  }

  async onGoogleLogin(): Promise<void> {
    this.loading = true;
    try {
      await withTimeout(this.authService.loginWithGoogle(), 'google-login-timeout');
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      const message = error.message === 'google-login-timeout'
        ? 'El inicio con Google tardó demasiado. Intenta de nuevo.'
        : 'No se pudo iniciar sesión con Google.';
      this.snackBar.open(message, 'Cerrar', { duration: 4000 });
    } finally {
      this.loading = false;
    }
  }

  private getErrorMessage(code: string): string {
    if (!code) return 'El inicio de sesión tardó demasiado. Intenta de nuevo.';

    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Credenciales inválidas. Verifica tu correo y contraseña.';
      case 'auth/invalid-email':
        return 'El formato del correo no es válido.';
      case 'auth/too-many-requests':
        return 'Demasiados intentos fallidos. Intenta más tarde.';
      default:
        return 'Ocurrió un error al iniciar sesión.';
    }
  }
}
