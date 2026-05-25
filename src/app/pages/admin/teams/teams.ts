import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { Torneo } from '../../../models/torneo.model';
import { TeamService } from '../../../services/team';
import { TournamentService } from '../../../services/tournament';

@Component({
  selector: 'app-confirm-team-delete-dialog',
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Eliminar equipo</h2>
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
export class ConfirmTeamDeleteDialog {
  dialogRef = inject(MatDialogRef<ConfirmTeamDeleteDialog>);
}

@Component({
  selector: 'app-teams',
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
  templateUrl: './teams.html',
  styleUrl: './teams.scss',
})
export class Teams {
  private fb = inject(FormBuilder);
  private teamService = inject(TeamService);
  private tournamentService = inject(TournamentService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);

  teams: Equipo[] = [];
  tournaments: Torneo[] = [];
  displayedColumns = ['nombre', 'tag', 'torneo', 'region', 'logoUrl', 'acciones'];
  loadingTeams = true;
  loadingTournaments = true;
  saving = false;
  editingId: string | null = null;

  form = this.fb.group({
    nombre: ['', Validators.required],
    tag: ['', [Validators.required, Validators.maxLength(8)]],
    torneoId: ['', Validators.required],
    region: ['', Validators.required],
    logoUrl: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
  });

  constructor() {
    this.teamService
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: teams => {
          this.teams = teams;
          this.loadingTeams = false;
        },
        error: error => {
          console.error('[RespawnHQ Teams] Error cargando equipos:', error);
          this.loadingTeams = false;
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
        },
        error: error => {
          console.error('[RespawnHQ Teams] Error cargando torneos:', error);
          this.loadingTournaments = false;
          this.snackBar.open('No se pudieron cargar los torneos.', 'Cerrar', { duration: 4000 });
        },
      });
  }

  get isEditing(): boolean {
    return this.editingId !== null;
  }

  get loading(): boolean {
    return this.loadingTeams || this.loadingTournaments;
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formValue = this.form.getRawValue();
    const team: Omit<Equipo, 'id'> = {
      nombre: formValue.nombre!,
      tag: formValue.tag!.toUpperCase(),
      torneoId: formValue.torneoId!,
      region: formValue.region!,
      logoUrl: formValue.logoUrl!,
    };

    this.saving = true;
    try {
      if (this.editingId) {
        await this.teamService.update(this.editingId, team);
        this.snackBar.open('Equipo actualizado exitosamente.', 'Cerrar', { duration: 3000 });
      } else {
        await this.teamService.create(team);
        this.snackBar.open('Equipo creado exitosamente.', 'Cerrar', { duration: 3000 });
      }
      this.resetForm();
    } catch (error) {
      console.error('[RespawnHQ Teams] Error guardando equipo:', error);
      this.snackBar.open('No se pudo guardar el equipo.', 'Cerrar', { duration: 4000 });
    } finally {
      this.saving = false;
    }
  }

  editTeam(team: Equipo): void {
    this.editingId = team.id ?? null;
    this.form.setValue({
      nombre: team.nombre,
      tag: team.tag,
      torneoId: team.torneoId,
      region: team.region,
      logoUrl: team.logoUrl,
    });
  }

  confirmDelete(team: Equipo): void {
    if (!team.id) return;

    const ref = this.dialog.open(ConfirmTeamDeleteDialog, {
      width: '360px',
    });

    ref.afterClosed().subscribe(async confirmed => {
      if (!confirmed || !team.id) return;

      try {
        await this.teamService.delete(team.id);
        if (this.editingId === team.id) {
          this.resetForm();
        }
        this.snackBar.open('Equipo eliminado exitosamente.', 'Cerrar', { duration: 3000 });
      } catch (error) {
        console.error('[RespawnHQ Teams] Error eliminando equipo:', error);
        this.snackBar.open('No se pudo eliminar el equipo.', 'Cerrar', { duration: 4000 });
      }
    });
  }

  resetForm(): void {
    this.editingId = null;
    this.form.reset({
      nombre: '',
      tag: '',
      torneoId: '',
      region: '',
      logoUrl: '',
    });
  }

  tournamentName(torneoId: string): string {
    return this.tournaments.find(tournament => tournament.id === torneoId)?.nombre ?? 'Sin torneo';
  }
}
