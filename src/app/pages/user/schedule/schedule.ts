import { ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Timestamp } from 'firebase/firestore';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Navbar } from '../../../components/navbar/navbar';
import { Equipo } from '../../../models/equipo.model';
import { Partido } from '../../../models/partido.model';
import { Torneo } from '../../../models/torneo.model';
import { MatchService } from '../../../services/match';
import { TeamService } from '../../../services/team';
import { TournamentService } from '../../../services/tournament';

@Component({
  selector: 'app-schedule',
  imports: [
    ReactiveFormsModule,
    Navbar,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
  ],
  templateUrl: './schedule.html',
  styleUrl: './schedule.scss',
})
export class Schedule {
  private matchService = inject(MatchService);
  private teamService = inject(TeamService);
  private tournamentService = inject(TournamentService);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);

  matches: Partido[] = [];
  teams: Equipo[] = [];
  tournaments: Torneo[] = [];
  tournamentControl = new FormControl<string>('all');
  loadingMatches = true;
  loadingTeams = true;
  loadingTournaments = true;

  constructor() {
    this.matchService
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: matches => {
          this.matches = matches;
          this.loadingMatches = false;
          this.cdr.detectChanges();
        },
        error: error => {
          console.error('[RespawnHQ Schedule] Error cargando partidos:', error);
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
          console.error('[RespawnHQ Schedule] Error cargando equipos:', error);
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
          console.error('[RespawnHQ Schedule] Error cargando torneos:', error);
          this.loadingTournaments = false;
          this.cdr.detectChanges();
          this.snackBar.open('No se pudieron cargar los torneos.', 'Cerrar', { duration: 4000 });
        },
      });
  }

  get loading(): boolean {
    return this.loadingMatches || this.loadingTeams || this.loadingTournaments;
  }

  get filteredMatches(): Partido[] {
    const selectedTournament = this.tournamentControl.value;
    return this.matches
      .filter(match => selectedTournament === 'all' || match.torneoId === selectedTournament)
      .slice()
      .sort((a, b) => this.toDate(a.fecha).getTime() - this.toDate(b.fecha).getTime());
  }

  get upcomingMatches(): Partido[] {
    return this.filteredMatches.filter(match => match.estado === 'programado');
  }

  get finishedMatches(): Partido[] {
    return this.filteredMatches.filter(match => match.estado === 'finalizado').reverse();
  }

  teamName(teamId: string): string {
    return this.teams.find(team => team.id === teamId)?.nombre ?? 'Equipo pendiente';
  }

  teamTag(teamId: string): string {
    return this.teams.find(team => team.id === teamId)?.tag ?? 'TBD';
  }

  tournamentName(tournamentId: string): string {
    return this.tournaments.find(tournament => tournament.id === tournamentId)?.nombre ?? 'Torneo pendiente';
  }

  formatDate(value: Timestamp | Date): string {
    return this.toDate(value).toLocaleDateString('es-MX', {
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
}
