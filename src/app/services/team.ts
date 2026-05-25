import { Injectable } from '@angular/core';
import { FirestoreCrudService } from './firestore-crud.service';
import { Equipo } from '../models/equipo.model';

@Injectable({ providedIn: 'root' })
export class TeamService extends FirestoreCrudService<Equipo> {
  constructor() {
    super('equipos');
  }
}
