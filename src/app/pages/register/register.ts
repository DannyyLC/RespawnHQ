import { Component, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroupDirective,
  NgForm,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ErrorStateMatcher } from '@angular/material/core';
import { AuthService } from '../../services/auth';

// Validators individuales para la contraseña
function hasUppercase(control: AbstractControl): ValidationErrors | null {
  const value: string = control.value ?? '';
  return /[A-Z]/.test(value) ? null : { noUppercase: true };
}

function hasDigit(control: AbstractControl): ValidationErrors | null {
  const value: string = control.value ?? '';
  return /\d/.test(value) ? null : { noDigit: true };
}

function validCharsOnly(control: AbstractControl): ValidationErrors | null {
  const value: string = control.value ?? '';
  return /^[A-Za-z\d_]*$/.test(value) ? null : { invalidChars: true };
}

// Validator a nivel de formulario para confirmación de contraseña
const passwordsMatchValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  if (!confirm) return null;
  return password === confirm ? null : { passwordMismatch: true };
};

// ErrorStateMatcher que también activa el estado de error por errores del grupo padre
export class ConfirmPasswordErrorMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    const submitted = !!(form && form.submitted);
    const touched = !!(control && (control.dirty || control.touched || submitted));
    const controlInvalid = !!(control && control.invalid);
    const parentInvalid = !!(control?.parent?.errors?.['passwordMismatch']);
    return touched && (controlInvalid || parentInvalid);
  }
}

@Component({
  selector: 'app-register',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  loading = false;
  confirmMatcher = new ConfirmPasswordErrorMatcher();

  form = this.fb.group(
    {
      nombre: ['', Validators.required],
      correo: ['', [Validators.required, Validators.email]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(20),
          validCharsOnly,
          hasUppercase,
          hasDigit,
        ],
      ],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatchValidator }
  );

  get nombre() { return this.form.get('nombre')!; }
  get correo() { return this.form.get('correo')!; }
  get password() { return this.form.get('password')!; }
  get confirmPassword() { return this.form.get('confirmPassword')!; }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    try {
      await this.authService.register(
        this.form.value.nombre as string,
        this.form.value.correo as string,
        this.form.value.password as string
      );
      this.snackBar.open('¡Cuenta creada exitosamente!', 'Cerrar', { duration: 3000 });
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      this.snackBar.open(this.getErrorMessage(error.code), 'Cerrar', { duration: 4000 });
    } finally {
      this.loading = false;
    }
  }

  private getErrorMessage(code: string): string {
    switch (code) {
      case 'auth/email-already-in-use':
        return 'Este correo ya está registrado.';
      case 'auth/invalid-email':
        return 'El formato del correo no es válido.';
      case 'auth/weak-password':
        return 'La contraseña es demasiado débil.';
      default:
        return 'Ocurrió un error al crear la cuenta.';
    }
  }
}
