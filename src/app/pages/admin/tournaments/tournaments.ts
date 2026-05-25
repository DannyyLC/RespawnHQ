import { ChangeDetectorRef, Component, DestroyRef, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroupDirective, ReactiveFormsModule, Validators } from '@angular/forms';
import { Timestamp } from 'firebase/firestore';
import { MatButtonModule } from '@angular/material/button';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { TournamentService } from '../../../services/tournament';
import { Torneo } from '../../../models/torneo.model';
import { Navbar } from '../../../components/navbar/navbar';

type TournamentStatus = Torneo['estado'];

@Component({
  selector: 'app-confirm-delete-dialog',
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Eliminar torneo</h2>
    <mat-dialog-content>
      Esta accion no se puede deshacer.
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="dialogRef.close(false)">Cancelar</button>
      <button mat-flat-button color="warn" type="button" (click)="dialogRef.close(true)">
        Eliminar
      </button>
    </mat-dialog-actions>
  `,
})
export class ConfirmDeleteDialog {
  dialogRef = inject(MatDialogRef<ConfirmDeleteDialog>);
}

@Component({
  selector: 'app-tournaments',
  imports: [
    ReactiveFormsModule,
    Navbar,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './tournaments.html',
  styleUrl: './tournaments.scss',
})
export class Tournaments {
  @ViewChild(FormGroupDirective) private formDirective?: FormGroupDirective;

  private fb = inject(FormBuilder);
  private tournamentService = inject(TournamentService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);

  tournaments: Torneo[] = [];
  displayedColumns = ['nombre', 'juego', 'estado', 'fechaInicio', 'fechaFin', 'premio', 'acciones'];
  loading = true;
  saving = false;
  editingId: string | null = null;

  statuses: Array<{ value: TournamentStatus; label: string }> = [
    { value: 'proximo', label: 'Proximo' },
    { value: 'en_curso', label: 'En curso' },
    { value: 'finalizado', label: 'Finalizado' },
  ];

  form = this.fb.group({
    nombre: ['', Validators.required],
    juego: ['', Validators.required],
    descripcion: ['', Validators.required],
    fechaInicio: [null as Date | null, Validators.required],
    fechaFin: [null as Date | null, Validators.required],
    estado: ['proximo' as TournamentStatus, Validators.required],
    premio: ['', Validators.required],
    imagenUrl: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
  });

  constructor() {
    this.tournamentService
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: tournaments => {
          this.tournaments = tournaments;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: error => {
          console.error('[RespawnHQ Tournaments] Error cargando torneos:', error);
          this.loading = false;
          this.cdr.detectChanges();
          this.snackBar.open('No se pudieron cargar los torneos.', 'Cerrar', { duration: 4000 });
        },
      });
  }

  get isEditing(): boolean {
    return this.editingId !== null;
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formValue = this.form.getRawValue();
    const tournament: Omit<Torneo, 'id'> = {
      nombre: formValue.nombre!,
      juego: formValue.juego!,
      descripcion: formValue.descripcion!,
      fechaInicio: formValue.fechaInicio!,
      fechaFin: formValue.fechaFin!,
      estado: formValue.estado!,
      premio: formValue.premio!,
      imagenUrl: formValue.imagenUrl!,
    };

    this.saving = true;
    try {
      if (this.editingId) {
        await this.tournamentService.update(this.editingId, tournament);
        this.snackBar.open('Torneo actualizado exitosamente.', 'Cerrar', { duration: 3000 });
      } else {
        await this.tournamentService.create(tournament);
        this.snackBar.open('Torneo creado exitosamente.', 'Cerrar', { duration: 3000 });
      }
      this.resetForm();
    } catch (error) {
      console.error('[RespawnHQ Tournaments] Error guardando torneo:', error);
      this.snackBar.open('No se pudo guardar el torneo.', 'Cerrar', { duration: 4000 });
    } finally {
      this.saving = false;
    }
  }

  editTournament(tournament: Torneo): void {
    this.editingId = tournament.id ?? null;
    this.form.setValue({
      nombre: tournament.nombre,
      juego: tournament.juego,
      descripcion: tournament.descripcion,
      fechaInicio: this.toDate(tournament.fechaInicio),
      fechaFin: this.toDate(tournament.fechaFin),
      estado: tournament.estado,
      premio: tournament.premio,
      imagenUrl: tournament.imagenUrl,
    });
  }

  confirmDelete(tournament: Torneo): void {
    if (!tournament.id) return;

    const ref = this.dialog.open(ConfirmDeleteDialog, {
      width: '360px',
    });

    ref.afterClosed().subscribe(async confirmed => {
      if (!confirmed || !tournament.id) return;

      try {
        await this.tournamentService.delete(tournament.id);
        if (this.editingId === tournament.id) {
          this.resetForm();
        }
        this.snackBar.open('Torneo eliminado exitosamente.', 'Cerrar', { duration: 3000 });
      } catch (error) {
        console.error('[RespawnHQ Tournaments] Error eliminando torneo:', error);
        this.snackBar.open('No se pudo eliminar el torneo.', 'Cerrar', { duration: 4000 });
      }
    });
  }

  resetForm(): void {
    this.editingId = null;
    const defaults = {
      nombre: '',
      juego: '',
      descripcion: '',
      fechaInicio: null,
      fechaFin: null,
      estado: 'proximo' as TournamentStatus,
      premio: '',
      imagenUrl: '',
    };
    this.formDirective?.resetForm(defaults);
    this.form.reset(defaults);
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.form.updateValueAndValidity();
  }

  formatDate(value: Timestamp | Date): string {
    return this.toDate(value).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  statusLabel(status: TournamentStatus): string {
    return this.statuses.find(item => item.value === status)?.label ?? status;
  }

  private toDate(value: Timestamp | Date): Date {
    if (value instanceof Date) return value;
    return value.toDate();
  }
}
