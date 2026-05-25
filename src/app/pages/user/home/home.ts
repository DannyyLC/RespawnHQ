import { ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Timestamp } from 'firebase/firestore';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Navbar } from '../../../components/navbar/navbar';
import { Noticia } from '../../../models/noticia.model';
import { Torneo } from '../../../models/torneo.model';
import { NewsService } from '../../../services/news';
import { TournamentService } from '../../../services/tournament';

type TournamentStatus = Torneo['estado'];

@Component({
  selector: 'app-home',
  imports: [Navbar, MatCardModule, MatChipsModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private tournamentService = inject(TournamentService);
  private newsService = inject(NewsService);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);

  tournaments: Torneo[] = [];
  news: Noticia[] = [];
  loadingTournaments = true;
  loadingNews = true;

  statusLabels: Record<TournamentStatus, string> = {
    proximo: 'Proximo',
    en_curso: 'En curso',
    finalizado: 'Finalizado',
  };

  constructor() {
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
          console.error('[RespawnHQ Home] Error cargando torneos:', error);
          this.loadingTournaments = false;
          this.cdr.detectChanges();
          this.snackBar.open('No se pudieron cargar los torneos.', 'Cerrar', { duration: 4000 });
        },
      });

    this.newsService
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: news => {
          this.news = news
            .slice()
            .sort((a, b) => this.toDate(b.fecha).getTime() - this.toDate(a.fecha).getTime());
          this.loadingNews = false;
          this.cdr.detectChanges();
        },
        error: error => {
          console.error('[RespawnHQ Home] Error cargando noticias:', error);
          this.loadingNews = false;
          this.cdr.detectChanges();
          this.snackBar.open('No se pudieron cargar las noticias.', 'Cerrar', { duration: 4000 });
        },
      });
  }

  get featuredTournament(): Torneo | null {
    return this.tournaments.find(tournament => tournament.estado === 'en_curso')
      ?? this.tournaments.find(tournament => tournament.estado === 'proximo')
      ?? this.tournaments[0]
      ?? null;
  }

  get otherTournaments(): Torneo[] {
    const featuredId = this.featuredTournament?.id;
    return this.tournaments.filter(tournament => tournament.id !== featuredId);
  }

  statusLabel(status: TournamentStatus): string {
    return this.statusLabels[status];
  }

  formatDate(value: Timestamp | Date): string {
    return this.toDate(value).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  private toDate(value: Timestamp | Date): Date {
    if (value instanceof Date) return value;
    return value.toDate();
  }
}
