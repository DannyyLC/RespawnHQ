import { ChangeDetectorRef, Component, DestroyRef, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroupDirective, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { Jugador } from '../../../models/jugador.model';
import { PlayerService } from '../../../services/player';
import { TeamService } from '../../../services/team';

@Component({
  selector: 'app-confirm-player-delete-dialog',
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Eliminar jugador</h2>
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
export class ConfirmPlayerDeleteDialog {
  dialogRef = inject(MatDialogRef<ConfirmPlayerDeleteDialog>);
}

@Component({
  selector: 'app-players',
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
  templateUrl: './players.html',
  styleUrl: './players.scss',
})
export class Players {
  @ViewChild(FormGroupDirective) private formDirective?: FormGroupDirective;

  private fb = inject(FormBuilder);
  private playerService = inject(PlayerService);
  private teamService = inject(TeamService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);

  players: Jugador[] = [];
  teams: Equipo[] = [];
  displayedColumns = ['alias', 'nombreReal', 'equipo', 'rolJuego', 'pais', 'acciones'];
  loadingPlayers = true;
  loadingTeams = true;
  saving = false;
  editingId: string | null = null;

  form = this.fb.group({
    alias: ['', Validators.required],
    nombreReal: ['', Validators.required],
    equipoId: ['', Validators.required],
    rolJuego: ['', Validators.required],
    pais: ['', Validators.required],
  });

  constructor() {
    this.playerService
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: players => {
          this.players = players;
          this.loadingPlayers = false;
          this.cdr.detectChanges();
        },
        error: error => {
          console.error('[RespawnHQ Players] Error cargando jugadores:', error);
          this.loadingPlayers = false;
          this.cdr.detectChanges();
          this.snackBar.open('No se pudieron cargar los jugadores.', 'Cerrar', { duration: 4000 });
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
          console.error('[RespawnHQ Players] Error cargando equipos:', error);
          this.loadingTeams = false;
          this.cdr.detectChanges();
          this.snackBar.open('No se pudieron cargar los equipos.', 'Cerrar', { duration: 4000 });
        },
      });
  }

  get isEditing(): boolean {
    return this.editingId !== null;
  }

  get loading(): boolean {
    return this.loadingPlayers || this.loadingTeams;
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formValue = this.form.getRawValue();
    const player: Omit<Jugador, 'id'> = {
      alias: formValue.alias!,
      nombreReal: formValue.nombreReal!,
      equipoId: formValue.equipoId!,
      rolJuego: formValue.rolJuego!,
      pais: formValue.pais!,
    };

    this.saving = true;
    try {
      if (this.editingId) {
        await this.playerService.update(this.editingId, player);
        this.snackBar.open('Jugador actualizado exitosamente.', 'Cerrar', { duration: 3000 });
      } else {
        await this.playerService.create(player);
        this.snackBar.open('Jugador creado exitosamente.', 'Cerrar', { duration: 3000 });
      }
      this.resetForm();
    } catch (error) {
      console.error('[RespawnHQ Players] Error guardando jugador:', error);
      this.snackBar.open('No se pudo guardar el jugador.', 'Cerrar', { duration: 4000 });
    } finally {
      this.saving = false;
    }
  }

  editPlayer(player: Jugador): void {
    this.editingId = player.id ?? null;
    this.form.setValue({
      alias: player.alias,
      nombreReal: player.nombreReal,
      equipoId: player.equipoId,
      rolJuego: player.rolJuego,
      pais: player.pais,
    });
  }

  confirmDelete(player: Jugador): void {
    if (!player.id) return;

    const ref = this.dialog.open(ConfirmPlayerDeleteDialog, {
      width: '360px',
    });

    ref.afterClosed().subscribe(async confirmed => {
      if (!confirmed || !player.id) return;

      try {
        await this.playerService.delete(player.id);
        if (this.editingId === player.id) {
          this.resetForm();
        }
        this.snackBar.open('Jugador eliminado exitosamente.', 'Cerrar', { duration: 3000 });
      } catch (error) {
        console.error('[RespawnHQ Players] Error eliminando jugador:', error);
        this.snackBar.open('No se pudo eliminar el jugador.', 'Cerrar', { duration: 4000 });
      }
    });
  }

  resetForm(): void {
    this.editingId = null;
    const defaults = {
      alias: '',
      nombreReal: '',
      equipoId: '',
      rolJuego: '',
      pais: '',
    };
    this.formDirective?.resetForm(defaults);
    this.form.reset(defaults);
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.form.updateValueAndValidity();
  }

  teamName(equipoId: string): string {
    const team = this.teams.find(item => item.id === equipoId);
    return team ? `${team.nombre} (${team.tag})` : 'Sin equipo';
  }
}
