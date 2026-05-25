import { ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
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

interface StandingRow {
  team: Equipo;
  played: number;
  wins: number;
  losses: number;
  points: number;
}

@Component({
  selector: 'app-standings',
  imports: [
    ReactiveFormsModule,
    Navbar,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTableModule,
  ],
  templateUrl: './standings.html',
  styleUrl: './standings.scss',
})
export class Standings {
  private tournamentService = inject(TournamentService);
  private teamService = inject(TeamService);
  private matchService = inject(MatchService);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);

  tournaments: Torneo[] = [];
  teams: Equipo[] = [];
  matches: Partido[] = [];
  tournamentControl = new FormControl<string>('');
  displayedColumns = ['position', 'team', 'region', 'played', 'wins', 'losses', 'points'];
  loadingTournaments = true;
  loadingTeams = true;
  loadingMatches = true;

  constructor() {
    this.tournamentService
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: tournaments => {
          this.tournaments = tournaments;
          this.loadingTournaments = false;
          if (!this.tournamentControl.value && tournaments[0]?.id) {
            this.tournamentControl.setValue(tournaments[0].id);
          }
          this.cdr.detectChanges();
        },
        error: error => {
          console.error('[RespawnHQ Standings] Error cargando torneos:', error);
          this.loadingTournaments = false;
          this.cdr.detectChanges();
          this.snackBar.open('No se pudieron cargar los torneos.', 'Cerrar', { duration: 4000 });
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
          console.error('[RespawnHQ Standings] Error cargando equipos:', error);
          this.loadingTeams = false;
          this.cdr.detectChanges();
          this.snackBar.open('No se pudieron cargar los equipos.', 'Cerrar', { duration: 4000 });
        },
      });

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
          console.error('[RespawnHQ Standings] Error cargando partidos:', error);
          this.loadingMatches = false;
          this.cdr.detectChanges();
          this.snackBar.open('No se pudieron cargar los partidos.', 'Cerrar', { duration: 4000 });
        },
      });
  }

  get loading(): boolean {
    return this.loadingTournaments || this.loadingTeams || this.loadingMatches;
  }

  get selectedTournament(): Torneo | undefined {
    return this.tournaments.find(tournament => tournament.id === this.tournamentControl.value);
  }

  get standings(): StandingRow[] {
    const tournamentId = this.tournamentControl.value;
    if (!tournamentId) return [];

    const tournamentTeams = this.teams.filter(team => team.torneoId === tournamentId);
    const rows = tournamentTeams.map(team => {
      const finalizedMatches = this.matches.filter(match => {
        return match.torneoId === tournamentId
          && match.estado === 'finalizado'
          && (match.equipoAId === team.id || match.equipoBId === team.id);
      });

      const wins = finalizedMatches.filter(match => {
        const isTeamA = match.equipoAId === team.id;
        const teamScore = isTeamA ? match.marcadorA : match.marcadorB;
        const opponentScore = isTeamA ? match.marcadorB : match.marcadorA;
        return teamScore > opponentScore;
      }).length;

      const losses = finalizedMatches.filter(match => {
        const isTeamA = match.equipoAId === team.id;
        const teamScore = isTeamA ? match.marcadorA : match.marcadorB;
        const opponentScore = isTeamA ? match.marcadorB : match.marcadorA;
        return teamScore < opponentScore;
      }).length;

      return {
        team,
        played: finalizedMatches.length,
        wins,
        losses,
        points: wins * 3,
      };
    });

    return rows.sort((a, b) => b.points - a.points || b.wins - a.wins || a.team.nombre.localeCompare(b.team.nombre));
  }
}
