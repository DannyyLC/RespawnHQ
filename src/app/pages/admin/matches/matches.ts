import { ChangeDetectorRef, Component, DestroyRef, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  FormGroupDirective,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Timestamp } from 'firebase/firestore';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { Navbar } from '../../../components/navbar/navbar';
import { Equipo } from '../../../models/equipo.model';
import { Partido } from '../../../models/partido.model';
import { Torneo } from '../../../models/torneo.model';
import { MatchService } from '../../../services/match';
import { TeamService } from '../../../services/team';
import { TournamentService } from '../../../services/tournament';

type MatchStatus = Partido['estado'];

const differentTeamsValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const a = group.get('equipoAId')?.value;
  const b = group.get('equipoBId')?.value;
  if (!a || !b) return null;
  return a === b ? { sameTeams: true } : null;
};

@Component({
  selector: 'app-confirm-match-delete-dialog',
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Eliminar partido</h2>
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
export class ConfirmMatchDeleteDialog {
  dialogRef = inject(MatDialogRef<ConfirmMatchDeleteDialog>);
}

@Component({
  selector: 'app-matches',
  imports: [
    ReactiveFormsModule,
    Navbar,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
  ],
  templateUrl: './matches.html',
  styleUrl: './matches.scss',
})
export class Matches {
  @ViewChild(FormGroupDirective) private formDirective?: FormGroupDirective;

  private fb = inject(FormBuilder);
  private matchService = inject(MatchService);
  private teamService = inject(TeamService);
  private tournamentService = inject(TournamentService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);

  matches: Partido[] = [];
  teams: Equipo[] = [];
  tournaments: Torneo[] = [];
  displayedColumns = ['torneo', 'equipoA', 'marcador', 'equipoB', 'fecha', 'estado', 'acciones'];
  loadingMatches = true;
  loadingTeams = true;
  loadingTournaments = true;
  saving = false;
  editingId: string | null = null;

  statuses: Array<{ value: MatchStatus; label: string }> = [
    { value: 'programado', label: 'Programado' },
    { value: 'finalizado', label: 'Finalizado' },
  ];

  form = this.fb.group(
    {
      torneoId: ['', Validators.required],
      equipoAId: ['', Validators.required],
      equipoBId: ['', Validators.required],
      marcadorA: [0, [Validators.required, Validators.min(0)]],
      marcadorB: [0, [Validators.required, Validators.min(0)]],
      fecha: ['', Validators.required],
      estado: ['programado' as MatchStatus, Validators.required],
    },
    { validators: differentTeamsValidator }
  );

  constructor() {
    this.matchService
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: matches => {
          this.matches = matches
            .slice()
            .sort((a, b) => this.toDate(b.fecha).getTime() - this.toDate(a.fecha).getTime());
          this.loadingMatches = false;
          this.cdr.detectChanges();
        },
        error: error => {
          console.error('[RespawnHQ Matches] Error cargando partidos:', error);
          this.loadingMatches = false;
          this.cdr.detectChanges();
          this.snackBar.open('No se pudieron cargar los partidos.', 'Cerrar', { duration: 4000 });
        },
      });

    this.teamService
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: teams => {
          this.teams = teams;
          this.loadingTeams = false;
          this.cdr.detectChanges();
        },
        error: error => {
          console.error('[RespawnHQ Matches] Error cargando equipos:', error);
          this.loadingTeams = false;
          this.cdr.detectChanges();
          this.snackBar.open('No se pudieron cargar los equipos.', 'Cerrar', { duration: 4000 });
        },
      });

    this.tournamentService
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: tournaments => {
          this.tournaments = tournaments;
          this.loadingTournaments = false;
          this.cdr.detectChanges();
        },
        error: error => {
          console.error('[RespawnHQ Matches] Error cargando torneos:', error);
          this.loadingTournaments = false;
          this.cdr.detectChanges();
          this.snackBar.open('No se pudieron cargar los torneos.', 'Cerrar', { duration: 4000 });
        },
      });
  }

  get isEditing(): boolean {
    return this.editingId !== null;
  }

  get loading(): boolean {
    return this.loadingMatches || this.loadingTeams || this.loadingTournaments;
  }

  get availableTeams(): Equipo[] {
    const torneoId = this.form.controls.torneoId.value;
    if (!torneoId) return [];
    return this.teams.filter(team => team.torneoId === torneoId);
  }

  onTournamentChange(): void {
    // Al cambiar de torneo, limpiar equipos seleccionados para evitar combinaciones invalidas.
    this.form.patchValue({ equipoAId: '', equipoBId: '' });
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formValue = this.form.getRawValue();
    const match: Omit<Partido, 'id'> = {
      torneoId: formValue.torneoId!,
      equipoAId: formValue.equipoAId!,
      equipoBId: formValue.equipoBId!,
      marcadorA: Number(formValue.marcadorA ?? 0),
      marcadorB: Number(formValue.marcadorB ?? 0),
      fecha: new Date(formValue.fecha!),
      estado: formValue.estado!,
    };

    this.saving = true;
    try {
      if (this.editingId) {
        await this.matchService.update(this.editingId, match);
        this.snackBar.open('Partido actualizado exitosamente.', 'Cerrar', { duration: 3000 });
      } else {
        await this.matchService.create(match);
        this.snackBar.open('Partido creado exitosamente.', 'Cerrar', { duration: 3000 });
      }
      this.resetForm();
    } catch (error) {
      console.error('[RespawnHQ Matches] Error guardando partido:', error);
      this.snackBar.open('No se pudo guardar el partido.', 'Cerrar', { duration: 4000 });
    } finally {
      this.saving = false;
    }
  }

  editMatch(match: Partido): void {
    this.editingId = match.id ?? null;
    this.form.setValue({
      torneoId: match.torneoId,
      equipoAId: match.equipoAId,
      equipoBId: match.equipoBId,
      marcadorA: match.marcadorA,
      marcadorB: match.marcadorB,
      fecha: this.toInputValue(match.fecha),
      estado: match.estado,
    });
  }

  confirmDelete(match: Partido): void {
    if (!match.id) return;

    const ref = this.dialog.open(ConfirmMatchDeleteDialog, { width: '360px' });

    ref.afterClosed().subscribe(async confirmed => {
      if (!confirmed || !match.id) return;

      try {
        await this.matchService.delete(match.id);
        if (this.editingId === match.id) {
          this.resetForm();
        }
        this.snackBar.open('Partido eliminado exitosamente.', 'Cerrar', { duration: 3000 });
      } catch (error) {
        console.error('[RespawnHQ Matches] Error eliminando partido:', error);
        this.snackBar.open('No se pudo eliminar el partido.', 'Cerrar', { duration: 4000 });
      }
    });
  }

  resetForm(): void {
    this.editingId = null;
    const defaults = {
      torneoId: '',
      equipoAId: '',
      equipoBId: '',
      marcadorA: 0,
      marcadorB: 0,
      fecha: '',
      estado: 'programado' as MatchStatus,
    };
    this.formDirective?.resetForm(defaults);
    this.form.reset(defaults);
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.form.updateValueAndValidity();
  }

  tournamentName(torneoId: string): string {
    return this.tournaments.find(t => t.id === torneoId)?.nombre ?? 'Sin torneo';
  }

  teamLabel(equipoId: string): string {
    const team = this.teams.find(t => t.id === equipoId);
    return team ? `${team.nombre} (${team.tag})` : 'Equipo eliminado';
  }

  statusLabel(status: MatchStatus): string {
    return this.statuses.find(s => s.value === status)?.label ?? status;
  }

  formatDate(value: Timestamp | Date): string {
    return this.toDate(value).toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private toDate(value: Timestamp | Date): Date {
    if (value instanceof Date) return value;
    return value.toDate();
  }

  private toInputValue(value: Timestamp | Date): string {
    const date = this.toDate(value);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}
