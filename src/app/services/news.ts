import { Injectable } from '@angular/core';
import { FirestoreCrudService } from './firestore-crud.service';
import { Noticia } from '../models/noticia.model';

@Injectable({ providedIn: 'root' })
export class NewsService extends FirestoreCrudService<Noticia> {
  constructor() {
    super('noticias');
  }
}
