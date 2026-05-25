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
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { Navbar } from '../../../components/navbar/navbar';
import { Noticia } from '../../../models/noticia.model';
import { NewsService } from '../../../services/news';

@Component({
  selector: 'app-confirm-news-delete-dialog',
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Eliminar noticia</h2>
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
export class ConfirmNewsDeleteDialog {
  dialogRef = inject(MatDialogRef<ConfirmNewsDeleteDialog>);
}

@Component({
  selector: 'app-news',
  imports: [
    ReactiveFormsModule,
    Navbar,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './news.html',
  styleUrl: './news.scss',
})
export class News {
  @ViewChild(FormGroupDirective) private formDirective?: FormGroupDirective;

  private fb = inject(FormBuilder);
  private newsService = inject(NewsService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);

  news: Noticia[] = [];
  displayedColumns = ['titulo', 'autor', 'fecha', 'imagenUrl', 'acciones'];
  loading = true;
  saving = false;
  editingId: string | null = null;

  form = this.fb.group({
    titulo: ['', Validators.required],
    contenido: ['', Validators.required],
    imagenUrl: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
    fecha: [new Date() as Date | null, Validators.required],
    autor: ['', Validators.required],
  });

  constructor() {
    this.newsService
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: news => {
          this.news = news
            .slice()
            .sort((a, b) => this.toDate(b.fecha).getTime() - this.toDate(a.fecha).getTime());
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: error => {
          console.error('[RespawnHQ News] Error cargando noticias:', error);
          this.loading = false;
          this.cdr.detectChanges();
          this.snackBar.open('No se pudieron cargar las noticias.', 'Cerrar', { duration: 4000 });
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
    const newsItem: Omit<Noticia, 'id'> = {
      titulo: formValue.titulo!,
      contenido: formValue.contenido!,
      imagenUrl: formValue.imagenUrl!,
      fecha: formValue.fecha!,
      autor: formValue.autor!,
    };

    this.saving = true;
    try {
      if (this.editingId) {
        await this.newsService.update(this.editingId, newsItem);
        this.snackBar.open('Noticia actualizada exitosamente.', 'Cerrar', { duration: 3000 });
      } else {
        await this.newsService.create(newsItem);
        this.snackBar.open('Noticia creada exitosamente.', 'Cerrar', { duration: 3000 });
      }
      this.resetForm();
    } catch (error) {
      console.error('[RespawnHQ News] Error guardando noticia:', error);
      this.snackBar.open('No se pudo guardar la noticia.', 'Cerrar', { duration: 4000 });
    } finally {
      this.saving = false;
    }
  }

  editNews(newsItem: Noticia): void {
    this.editingId = newsItem.id ?? null;
    this.form.setValue({
      titulo: newsItem.titulo,
      contenido: newsItem.contenido,
      imagenUrl: newsItem.imagenUrl,
      fecha: this.toDate(newsItem.fecha),
      autor: newsItem.autor,
    });
  }

  confirmDelete(newsItem: Noticia): void {
    if (!newsItem.id) return;

    const ref = this.dialog.open(ConfirmNewsDeleteDialog, {
      width: '360px',
    });

    ref.afterClosed().subscribe(async confirmed => {
      if (!confirmed || !newsItem.id) return;

      try {
        await this.newsService.delete(newsItem.id);
        if (this.editingId === newsItem.id) {
          this.resetForm();
        }
        this.snackBar.open('Noticia eliminada exitosamente.', 'Cerrar', { duration: 3000 });
      } catch (error) {
        console.error('[RespawnHQ News] Error eliminando noticia:', error);
        this.snackBar.open('No se pudo eliminar la noticia.', 'Cerrar', { duration: 4000 });
      }
    });
  }

  resetForm(): void {
    this.editingId = null;
    const defaults = {
      titulo: '',
      contenido: '',
      imagenUrl: '',
      fecha: new Date(),
      autor: '',
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

  private toDate(value: Timestamp | Date): Date {
    if (value instanceof Date) return value;
    return value.toDate();
  }
}
