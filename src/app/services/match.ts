import { Injectable } from '@angular/core';
import { FirestoreCrudService } from './firestore-crud.service';
import { Partido } from '../models/partido.model';

@Injectable({ providedIn: 'root' })
export class MatchService extends FirestoreCrudService<Partido> {
  constructor() {
    super('partidos');
  }
}
